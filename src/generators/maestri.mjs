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

import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';

const MAESTRI_DIR = join(homedir(), '.maestri');
const WORKSPACES_DIR = join(MAESTRI_DIR, 'workspaces');
const PREFERENCES_PATH = join(MAESTRI_DIR, 'preferences.json');

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

  // ── 5b. Open the workspace file in Maestri to ensure it's active ──
  //    The recruit API requires the workspace to be actively open in the UI.
  //    Just launching Maestri isn't enough — we must open the workspace file.
  try {
    execSync(`open -a Maestri ${escapeForShell(source.workspacePath)}`, { stdio: 'pipe' });
    await sleep(2000);
  } catch {
    // Non-fatal — workspace might already be open
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
  //    The recruit API requires the workspace to be actively loaded in the UI.
  //    If we get "Workspace not found", re-open the workspace file and retry.
  const recruited = [];
  let workspaceRetried = false;

  for (const agent of subAgents) {
    // Check if already recruited (idempotent)
    const currentList = maestriCli(socketPath, terminalId, ['list']);
    if (currentList && currentList.includes(`"${agent.name}"`)) {
      recruited.push(agent.name);
      continue;
    }

    let result = maestriCli(socketPath, terminalId, [
      'recruit',
      agent.name,
      '--preset', 'Claude Code',
      '--command', `claude --agent ${agent.slug}`,
    ]);

    // If workspace not found, try re-opening the workspace file and retry
    if (result && result.includes('Workspace not found') && !workspaceRetried) {
      workspaceRetried = true;
      try {
        execSync(`open -a Maestri ${escapeForShell(source.workspacePath)}`, { stdio: 'pipe' });
        await sleep(3000);
      } catch {
        // Non-fatal
      }

      // Retry recruitment for this agent
      result = maestriCli(socketPath, terminalId, [
        'recruit',
        agent.name,
        '--preset', 'Claude Code',
        '--command', `claude --agent ${agent.slug}`,
      ]);
    }

    if (result && result.includes('Recruited')) {
      recruited.push(agent.name);
    } else {
      console.warn(`  ⚠ Could not recruit "${agent.name}": ${result || 'no response'}`);
    }

    await sleep(500);
  }

  // ── 10. Assign roles to all terminals ─────────────────────────────
  //    Maestri uses "role presets" (stored in preferences.json) to bind
  //    agent instructions to terminals. Each role has a `prompt` field
  //    containing the full agent .md content.
  //
  //    CRITICAL: Maestri watches workspace.json and overwrites external
  //    changes via autosave. We MUST quit Maestri before modifying
  //    workspace.json, then reopen it.
  //
  //    Steps:
  //    a) Read each agent's .md template from .claude/agents/
  //    b) Create/update role presets in preferences.json (safe while running)
  //    c) Quit Maestri (so it flushes workspace.json to disk)
  //    d) Assign assignedRoleId to each terminal node in workspace.json
  //    e) Re-open workspace in Maestri to load the changes
  try {
    const roleAssignments = assignRolesToTerminals(
      source.workspacePath,
      config.cwd,
      agents,
    );

    if (roleAssignments.success) {
      console.log(`  ✅ Assigned roles to ${roleAssignments.assigned.length} terminals`);
    }
  } catch (err) {
    console.warn(`  ⚠ Could not assign roles to terminals: ${err.message}`);
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
// Role Assignment
// ═══════════════════════════════════════════════════════════════════════

/**
 * Assign agent roles to Maestri terminals.
 *
 * Maestri's role system:
 *   - `preferences.json` → `payload.rolePresets[]` — global role definitions
 *     Each role has: { id, name, color, icon, prompt }
 *     The `prompt` field contains the full agent .md content
 *   - `workspace.json` → each node's `content.terminal._0.assignedRoleId`
 *     Links a terminal to a role preset by UUID
 *
 * @param {string} workspacePath - Path to workspace.json
 * @param {string} projectDir - Path to the project directory (where .claude/agents/ lives)
 * @param {object[]} agents - Agent config array from wizard
 * @returns {{ success: boolean, assigned: string[] }}
 */
function assignRolesToTerminals(workspacePath, projectDir, agents) {
  // ── a) Read agent .md files ──────────────────────────────────────
  const agentPrompts = {};
  for (const agent of agents) {
    const mdPath = join(projectDir, '.claude', 'agents', `${agent.slug}.md`);
    if (existsSync(mdPath)) {
      agentPrompts[agent.slug] = readFileSync(mdPath, 'utf-8');
    }
  }

  // ── b) Create/update role presets in preferences.json ────────────
  //    Safe to modify while Maestri is running — preferences are only
  //    read at startup, not watched.
  if (!existsSync(PREFERENCES_PATH)) {
    return { success: false, assigned: [] };
  }

  const prefs = JSON.parse(readFileSync(PREFERENCES_PATH, 'utf-8'));
  if (!prefs.payload.rolePresets) {
    prefs.payload.rolePresets = [];
  }

  // Map: agent slug → role ID (reuse existing or create new)
  const roleIdMap = {};

  for (const agent of agents) {
    const prompt = agentPrompts[agent.slug];
    if (!prompt) continue;

    // Check if a role preset already exists for this agent name
    let existing = prefs.payload.rolePresets.find(
      (r) => r.name === agent.name
    );

    if (existing) {
      // Update the prompt content
      existing.prompt = prompt;
      existing.color = AGENT_COLORS[agent.slug] || existing.color;
      roleIdMap[agent.slug] = existing.id;
    } else {
      // Create a new role preset
      const roleId = randomUUID().toUpperCase();
      prefs.payload.rolePresets.push({
        color: AGENT_COLORS[agent.slug] || '#007AFF',
        icon: 'person.text.rectangle',
        id: roleId,
        name: agent.name,
        prompt,
      });
      roleIdMap[agent.slug] = roleId;
    }
  }

  // Write updated preferences
  writeFileSync(PREFERENCES_PATH, JSON.stringify(prefs, null, 2), 'utf-8');

  // ── c) Quit Maestri so it flushes workspace.json to disk ─────────
  //    CRITICAL: Maestri watches workspace.json and overwrites external
  //    changes via autosave. We must quit it before modifying the file.
  try {
    execSync('osascript -e \'tell application "Maestri" to quit\'', { stdio: 'pipe' });
  } catch {
    // Maestri might not be running — that's fine
  }

  // Wait for Maestri to fully quit and flush the file
  for (let i = 0; i < 10; i++) {
    if (!isMaestriRunning()) break;
    execSync('sleep 0.5', { stdio: 'pipe' });
  }

  // ── d) Assign assignedRoleId to terminal nodes in workspace.json ─
  //    Now safe to modify — Maestri is not running.
  const workspace = JSON.parse(readFileSync(workspacePath, 'utf-8'));
  const assigned = [];

  for (const node of workspace.payload.nodes) {
    const term = node.content?.terminal?._0;
    if (!term) continue;

    // Match terminal to agent by command (e.g., "claude --agent tech-lead")
    const matchedAgent = agents.find((a) => {
      const expectedCmd = `claude --agent ${a.slug}`;
      return term.command === expectedCmd;
    });

    // Also match by name as fallback
    const matchedByName = matchedAgent || agents.find((a) => term.name === a.name);
    const agent = matchedAgent || matchedByName;

    if (agent && roleIdMap[agent.slug]) {
      term.assignedRoleId = roleIdMap[agent.slug];
      assigned.push(agent.name);
    }
  }

  // Write updated workspace
  writeFileSync(workspacePath, JSON.stringify(workspace, null, 2), 'utf-8');

  // ── e) Re-open workspace in Maestri ──────────────────────────────
  try {
    execSync(`open -a Maestri ${escapeForShell(workspacePath)}`, { stdio: 'pipe' });
  } catch {
    // Non-fatal — user can open manually
  }

  return { success: assigned.length > 0, assigned };
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
