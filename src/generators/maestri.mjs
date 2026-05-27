/**
 * Generates Maestri workspace — workspace.json + manifest registration
 *
 * Creates a Maestri workspace with:
 * - One terminal per team member (claude_code type)
 * - Text labels for each terminal
 * - Connections from orchestrator (Tech Lead) to all other members
 * - Registers workspace in ~/.maestri/manifest.json
 *
 * The workspace is an INITIAL structure. It can be evolved:
 * - Manually by the user in Maestri (add/remove terminals, connections)
 * - By re-running devcrew init with updated project.yaml
 * - By reading documentation (Confluence, etc.) in future versions
 */

import { writeFileSync, readFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { homedir } from 'node:os';
import { randomUUID } from 'node:crypto';

const MAESTRI_DIR = join(homedir(), '.maestri');
const MANIFEST_PATH = join(MAESTRI_DIR, 'manifest.json');

/**
 * @param {object} config - Configuration from wizard
 * @param {object} opts - { dryRun: boolean }
 */
export async function generateMaestriWorkspace(config, opts = {}) {
  const { project, fronts, team } = config;
  const selectedFront = config.selectedFront
    ? fronts.find((f) => f.name === config.selectedFront) || fronts[0]
    : fronts[0];

  const workspaceName = config.selectedFront
    ? `${project.name} — ${config.selectedFront}`
    : project.name;

  if (opts.dryRun) {
    return { preview: `Maestri workspace "${workspaceName}" in ~/.maestri/workspaces/` };
  }

  const workspaceId = generateUUID();
  const workspaceDir = join(MAESTRI_DIR, 'workspaces', workspaceId);
  const workspacePath = join(workspaceDir, 'workspace.json');

  mkdirSync(workspaceDir, { recursive: true });

  const workspace = buildWorkspace(config, selectedFront);
  writeFileSync(workspacePath, JSON.stringify(workspace, null, 2), 'utf-8');

  registerInManifest(workspaceId, workspaceName);

  return { path: workspacePath, workspaceId, workspaceName };
}

/**
 * Build the workspace JSON matching Maestri's schema v2.
 * Layout: Orchestrator at top center, other members in a row below.
 */
function buildWorkspace(config, selectedFront) {
  const { team } = config;
  const now = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');

  const nodes = [];
  const connections = [];
  const terminalIds = {};

  const terminalWidth = 800;
  const terminalHeight = 500;
  const labelHeight = 40;
  const hGap = 100;
  const vGap = 300;
  const startX = 10000;
  const startY = 9200;

  const orchestrator = team.members[0];
  const others = team.members.slice(1);
  const totalWidth = Math.max(1, others.length) * (terminalWidth + hGap) - hGap;
  const orchX = startX + (totalWidth - terminalWidth) / 2;
  const orchY = startY;

  let zIndex = 10;

  // Create orchestrator terminal + label
  if (orchestrator) {
    const termId = generateUUID();
    terminalIds[orchestrator.slug] = termId;

    nodes.push(createTextLabel(
      orchestrator.name,
      [orchX + terminalWidth / 2 - (orchestrator.name.length * 7), orchY - labelHeight - 10],
      now, zIndex++,
    ));

    nodes.push(createTerminal({
      terminalId: termId,
      nodeId: generateUUID(),
      name: orchestrator.name,
      color: orchestrator.color || '#AF52DE',
      workingDirectory: config.cwd,
      command: `claude --agent ${orchestrator.slug}`,
      position: [orchX, orchY],
      size: [terminalWidth, terminalHeight],
      createdAt: now,
      zIndex: zIndex++,
    }));
  }

  // Create other member terminals in a row below
  const rowY = orchY + terminalHeight + vGap;

  others.forEach((member, i) => {
    const x = startX + i * (terminalWidth + hGap);
    const termId = generateUUID();
    terminalIds[member.slug] = termId;

    const workDir = getWorkingDirectory(config, selectedFront, member);

    nodes.push(createTextLabel(
      member.name,
      [x + terminalWidth / 2 - (member.name.length * 7), rowY - labelHeight - 10],
      now, zIndex++,
    ));

    nodes.push(createTerminal({
      terminalId: termId,
      nodeId: generateUUID(),
      name: member.name,
      color: member.color || '#8E8E93',
      workingDirectory: workDir,
      command: `claude --agent ${member.slug}`,
      position: [x, rowY],
      size: [terminalWidth, terminalHeight],
      createdAt: now,
      zIndex: zIndex++,
    }));

    // Connection from orchestrator to this member
    if (terminalIds[orchestrator?.slug]) {
      connections.push(createConnection(
        terminalIds[orchestrator.slug],
        termId,
        [orchX + terminalWidth / 2, orchY + terminalHeight],
        [x + terminalWidth / 2, rowY],
        now,
      ));
    }
  });

  return {
    payload: {
      canvasOrigin: [startX - 200, startY - 200],
      canvasZoom: 0.6,
      connections,
      nodes,
      noteConnections: [],
      noteToNoteConnections: [],
      portalConnections: [],
      portalToPortalConnections: [],
      syncConfigFiles: false,
      workingDirectory: config.cwd,
    },
    schemaVersion: 2,
    type: 'workspace',
  };
}

function createTerminal({ terminalId, nodeId, name, color, workingDirectory, command, position, size, createdAt, zIndex }) {
  return {
    content: {
      terminal: {
        _0: {
          agentType: 'claude_code',
          autoScrollLocked: false,
          color,
          command,
          icon: 'seal',
          id: terminalId,
          isManager: false,
          lastActiveAt: createdAt,
          monitorWithOmbro: true,
          name,
          scrollbackFile: `${terminalId}.scrollback`,
          scrollbackLineCount: 0,
          shellPath: '/bin/zsh',
          shortcutMode: { kind: 'automatic' },
          status: 'idle',
          workingDirectory,
        },
      },
    },
    createdAt,
    frame: [position, size],
    id: nodeId,
    isLocked: false,
    lastModifiedAt: createdAt,
    zIndex,
  };
}

function createTextLabel(text, position, createdAt, zIndex) {
  return {
    content: {
      textBlock: {
        _0: {
          fontSize: 24,
          isMonospaced: true,
          text,
        },
      },
    },
    createdAt,
    frame: [position, [text.length * 15, 40]],
    id: generateUUID(),
    isLocked: false,
    lastModifiedAt: createdAt,
    zIndex,
  };
}

function createConnection(terminalIdA, terminalIdB, pointA, pointB, createdAt) {
  const ropePoints = [];
  const steps = 20;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    ropePoints.push([
      pointA[0] + (pointB[0] - pointA[0]) * t,
      pointA[1] + (pointB[1] - pointA[1]) * t,
    ]);
  }

  return {
    createdAt,
    id: generateUUID(),
    ropePoints,
    terminalIdA,
    terminalIdB,
  };
}

/**
 * Determine working directory for a member based on their repoKey
 */
function getWorkingDirectory(config, selectedFront, member) {
  if (!member.repoKey || !selectedFront?.repos) return config.cwd;

  const repo = selectedFront.repos.find((r) => r.name === member.repoKey.repoName);
  if (repo) {
    const repoPath = repo.localPath || repo.path;
    if (repoPath.startsWith('/')) return repoPath;
    return resolve(config.cwd, repoPath);
  }

  return config.cwd;
}

function registerInManifest(workspaceId, workspaceName) {
  let manifest;

  try {
    if (existsSync(MANIFEST_PATH)) {
      manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf-8'));
    }
  } catch {
    // If manifest is corrupted, create a new one
  }

  if (!manifest) {
    manifest = {
      app: 'Maestro',
      appVersion: '0.27.7',
      dataFormat: 'json',
      files: {
        appState: 'app-state.json',
        preferences: 'preferences.json',
        sidebarLayout: 'sidebar-layout.json',
      },
      schemaVersion: 1,
      workspaces: [],
    };
  }

  const existing = manifest.workspaces.find((w) => w.id === workspaceId);
  if (!existing) {
    manifest.workspaces.push({
      id: workspaceId,
      name: workspaceName,
      path: `workspaces/${workspaceId}/workspace.json`,
    });
  }

  writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), 'utf-8');
}

function generateUUID() {
  return randomUUID().toUpperCase();
}
