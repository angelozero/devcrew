/**
 * Generates Maestri workspace — uses Maestri's own CLI API via Unix socket
 *
 * APPROACH (discovered through extensive reverse-engineering):
 *   Maestri validates workspace.json structurally — adding/removing nodes externally
 *   is rejected with "newer version" error. However:
 *
 *   ✅ Modifying EXISTING field values (name, command, color, etc.) via sed works
 *   ✅ Maestri exposes an HTTP API on a Unix socket for terminal management
 *   ✅ The `recruit` command creates new terminals and auto-connects them
 *
 * FLOW:
 *   1. Find existing workspace with 1 terminal (user creates this manually)
 *   2. Modify the terminal's properties via sed (name → Tech Lead, command, isManager, etc.)
 *   3. Ensure Maestri is running and the workspace is open
 *   4. Find the Unix socket path via `lsof`
 *   5. Use the socket API to `recruit` the remaining 4 agents
 *   6. Result: 5 terminals in hub layout with connections
 *
 * PREREQUISITES:
 *   - User must create a workspace in Maestri with 1 Claude Code terminal
 *   - Maestri must be installed at /Applications/Maestri.app
 */

import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { execSync } from 'node:child_process';

const MAESTRI_DIR = join(homedir(), '.maestri');
const WORKSPACES_DIR = join(MAESTRI_DIR, 'workspaces');

/**
 * Agent color palette — maps agent slugs to hex colors
 */
const AGENT_COLORS = {
  'tech-lead': '#AF52DE',      // purple
  'developer': '#007AFF',      // blue
  'po': '#FF9500',             // orange
  'qa': '#34C759',             // green
  'devops': '#FF3B30',         // red
};

/**
 * @param {object} config - Configuration from wizard (V1 shape)
 * @param {object} opts - { dryRun: boolean }
 * @returns {object} Result with path, workspaceId, workspaceName — or error info
 */
export async function generateMaestriWorkspace(config, opts = {}) {
  const workspaceName = config.project.name;

  if (opts.dryRun) {
    return { preview: `Maestri workspace "${workspaceName}" — will configure via Maestri CLI API` };
  }

  // ── 1. Find an existing Maestri workspace with at least 1 terminal ──
  const source = findSourceWorkspace();

  if (!source) {
    return {
      skipped: true,
      reason: 'no-workspace',
      message: [
        'No Maestri workspace with a terminal was found.',
        '',
        'To set up the AI team workspace:',
        '',
        '  1. Open Maestri',
        '  2. Create a new workspace (any name)',
        '  3. Add one Claude Code terminal to it',
        '  4. Close Maestri completely (Cmd+Q)',
        '  5. Re-run: devcrew init',
        '',
        'DevCrew will configure that terminal and recruit the rest of the team.',
      ].join('\n'),
    };
  }

  // ── 2. Identify the orchestrator and sub-agents ─────────────────────
  const { agents } = config;
  const orchestrator = agents.find((a) => a.role === 'orchestrator') || agents[0];
  const subAgents = agents.filter((a) => a !== orchestrator);

  // ── 3. Read workspace to get the template terminal's current values ─
  const workspace = JSON.parse(readFileSync(source.workspacePath, 'utf-8'));
  const templateNode = workspace.payload.nodes.find(
    (n) => n.content?.terminal?._0
  );

  if (!templateNode) {
    return {
      skipped: true,
      reason: 'no-terminal',
      message: [
        `Found workspace "${workspace.payload.name}" but it has no terminal nodes.`,
        '',
        'Please open it in Maestri, add one Claude Code terminal, close Maestri,',
        'then re-run: devcrew init',
      ].join('\n'),
    };
  }

  const term = templateNode.content.terminal._0;

  // ── 4. Modify workspace.json via sed — only change existing values ──
  //    This is the ONLY safe way to modify workspace.json externally.
  //    Adding/removing nodes causes Maestri to reject the file.
  const sedCommands = buildSedCommands(source.workspacePath, {
    oldWorkspaceName: workspace.payload.name,
    newWorkspaceName: workspaceName,
    oldTerminalName: term.name,
    newTerminalName: orchestrator.name,
    oldCommand: term.command || '',
    newCommand: `claude --agent ${orchestrator.slug}`,
    oldColor: term.color || '#007AFF',
    newColor: AGENT_COLORS[orchestrator.slug] || '#AF52DE',
    oldIsManager: 'false',
    newIsManager: 'true',
    oldWorkingDirectory: term.workingDirectory || homedir(),
    newWorkingDirectory: config.cwd,
  });

  for (const cmd of sedCommands) {
    try {
      execSync(cmd, { stdio: 'pipe' });
    } catch (err) {
      return {
        skipped: true,
        reason: 'sed-failed',
        message: `Failed to modify workspace.json: ${err.message}`,
      };
    }
  }

  // ── 5. Ensure Maestri is running ───────────────────────────────────
  if (!isMaestriRunning()) {
    try {
      execSync('open -a Maestri', { stdio: 'pipe' });
      await sleep(3000);
    } catch (err) {
      return {
        skipped: true,
        reason: 'maestri-launch-failed',
        message: `Could not launch Maestri: ${err.message}`,
      };
    }
  }

  // ── 6. Find the Unix socket ────────────────────────────────────────
  let socketPath = null;
  const maxRetries = 10;

  for (let i = 0; i < maxRetries; i++) {
    socketPath = findMaestriSocket();
    if (socketPath) break;
    await sleep(1000);
  }

  if (!socketPath) {
    return {
      skipped: true,
      reason: 'no-socket',
      message: [
        'Could not find Maestri\'s Unix socket.',
        'Make sure Maestri is running and has the workspace open.',
        '',
        'Then re-run: devcrew init',
      ].join('\n'),
    };
  }

  // ── 7. Get the terminal ID from the (now modified) workspace ───────
  const updatedWorkspace = JSON.parse(readFileSync(source.workspacePath, 'utf-8'));
  const updatedTerm = updatedWorkspace.payload.nodes.find(
    (n) => n.content?.terminal?._0
  )?.content?.terminal?._0;

  if (!updatedTerm) {
    return {
      skipped: true,
      reason: 'terminal-lost',
      message: 'Terminal node disappeared after modification. Please try again.',
    };
  }

  const terminalId = updatedTerm.id;

  // ── 8. Verify we can talk to the socket ────────────────────────────
  let listResult;
  for (let i = 0; i < maxRetries; i++) {
    listResult = maestriCli(socketPath, terminalId, ['list']);
    if (listResult && !listResult.includes('Invalid terminal ID')) break;
    await sleep(1000);
    socketPath = findMaestriSocket() || socketPath;
  }

  if (!listResult || listResult.includes('Invalid terminal ID')) {
    return {
      skipped: true,
      reason: 'terminal-not-active',
      message: [
        'The workspace terminal is not active in Maestri.',
        '',
        'Please open the workspace in Maestri, then re-run: devcrew init',
      ].join('\n'),
    };
  }

  // ── 9. Recruit sub-agents ──────────────────────────────────────────
  const recruited = [];

  for (const agent of subAgents) {
    // Check if already recruited (idempotent)
    const currentList = maestriCli(socketPath, terminalId, ['list']);
    if (currentList && currentList.includes(`"${agent.name}"`)) {
      recruited.push(agent.name);
      continue;
    }

    const result = maestriCli(socketPath, terminalId, [
      'recruit',
      agent.name,
      '--preset', 'Claude Code',
      '--command', `claude --agent ${agent.slug}`,
    ]);

    if (result && result.includes('Recruited')) {
      recruited.push(agent.name);
    } else {
      console.warn(`  ⚠ Could not recruit "${agent.name}": ${result || 'no response'}`);
    }

    await sleep(500);
  }

  return {
    path: source.workspacePath,
    workspaceId: source.workspaceId,
    workspaceName,
    recruited,
    terminalId,
  };
}

// ═══════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════

/**
 * Build sed commands to modify workspace.json field values in-place.
 * Only modifies EXISTING values — never adds or removes JSON structure.
 *
 * Apple's JSONSerialization escapes forward slashes in strings as \/.
 * All sed commands use | as delimiter to avoid conflicts with / and \/.
 */
function buildSedCommands(filePath, changes) {
  const cmds = [];
  const f = escapeForShell(filePath);

  // Convert a JS string to how it appears in Apple JSON (with \/ for /)
  function appleStr(s) {
    // JSON.stringify gives us "value", then we escape / as \/
    return JSON.stringify(s).replace(/\//g, '\\\\/');
  }

  // Build a sed replacement using | as delimiter
  function sedCmd(key, oldVal, newVal) {
    return `sed -i '' 's|${key} : ${oldVal}|${key} : ${newVal}|g' ${f}`;
  }

  // Workspace name
  if (changes.oldWorkspaceName !== changes.newWorkspaceName) {
    cmds.push(sedCmd('"name"', appleStr(changes.oldWorkspaceName), appleStr(changes.newWorkspaceName)));
  }

  // Terminal name
  if (changes.oldTerminalName !== changes.newTerminalName) {
    cmds.push(sedCmd('"name"', appleStr(changes.oldTerminalName), appleStr(changes.newTerminalName)));
  }

  // Command
  if (changes.oldCommand !== changes.newCommand) {
    cmds.push(sedCmd('"command"', appleStr(changes.oldCommand), appleStr(changes.newCommand)));
  }

  // Color
  if (changes.oldColor !== changes.newColor) {
    cmds.push(sedCmd('"color"', appleStr(changes.oldColor), appleStr(changes.newColor)));
  }

  // isManager — always set to true for the orchestrator
  cmds.push(sedCmd('"isManager"', changes.oldIsManager, changes.newIsManager));

  // Working directory
  if (changes.oldWorkingDirectory !== changes.newWorkingDirectory) {
    cmds.push(sedCmd('"workingDirectory"', appleStr(changes.oldWorkingDirectory), appleStr(changes.newWorkingDirectory)));
  }

  return cmds;
}

/**
 * Call Maestri CLI via Unix socket.
 *
 * @param {string} socketPath - Path to maestri.sock
 * @param {string} terminalId - Terminal UUID to act as
 * @param {string[]} args - CLI arguments
 * @returns {string|null} Response text or null on error
 */
function maestriCli(socketPath, terminalId, args) {
  try {
    const jsonBody = JSON.stringify({ args });
    const result = execSync(
      `curl -sf --max-time 10 --unix-socket ${escapeForShell(socketPath)} ` +
      `http://localhost/cli ` +
      `-X POST ` +
      `-H "Content-Type: application/json" ` +
      `-H "X-Terminal-ID: ${terminalId}" ` +
      `-d ${escapeForShell(jsonBody)}`,
      { stdio: 'pipe', encoding: 'utf-8', timeout: 15000 }
    );
    return result.trim();
  } catch (err) {
    return err.stdout?.trim() || err.stderr?.trim() || null;
  }
}

/**
 * Find Maestri's Unix socket path by querying lsof.
 * The socket is at a temp path like /var/folders/.../maestri-XXXX/maestri.sock
 *
 * @returns {string|null}
 */
function findMaestriSocket() {
  try {
    const pid = execSync(
      'pgrep -f "Maestri.app/Contents/MacOS/Maestri"',
      { stdio: 'pipe', encoding: 'utf-8' }
    ).trim().split('\n')[0];

    if (!pid) return null;

    const lsofOutput = execSync(
      `lsof -U -a -p ${pid} 2>/dev/null`,
      { stdio: 'pipe', encoding: 'utf-8' }
    );

    const match = lsofOutput.match(/(\S+maestri\.sock)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

/**
 * Check if Maestri is currently running.
 */
function isMaestriRunning() {
  try {
    execSync('pgrep -f "Maestri.app/Contents/MacOS/Maestri"', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Scan ~/.maestri/workspaces/ for an existing workspace with at least 1 terminal node.
 * Prefers the most recently modified workspace.
 *
 * @returns {{ workspaceId: string, workspaceDir: string, workspacePath: string } | null}
 */
function findSourceWorkspace() {
  if (!existsSync(WORKSPACES_DIR)) {
    return null;
  }

  const entries = readdirSync(WORKSPACES_DIR, { withFileTypes: true });
  let best = null;
  let bestMtime = 0;

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (entry.name.startsWith('.')) continue;

    const workspaceDir = join(WORKSPACES_DIR, entry.name);
    const workspacePath = join(workspaceDir, 'workspace.json');

    if (!existsSync(workspacePath)) continue;

    try {
      const raw = readFileSync(workspacePath, 'utf-8');
      const ws = JSON.parse(raw);

      const hasTerminal = ws.payload?.nodes?.some(
        (n) => n.content?.terminal?._0
      );

      if (hasTerminal) {
        const { mtimeMs } = statSync(workspacePath);
        if (mtimeMs > bestMtime) {
          bestMtime = mtimeMs;
          best = { workspaceId: entry.name, workspaceDir, workspacePath };
        }
      }
    } catch {
      continue;
    }
  }

  return best;
}

/**
 * Escape a string for use in a shell command argument (single-quote wrapping).
 */
function escapeForShell(str) {
  return `'${str.replace(/'/g, "'\\''")}'`;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
