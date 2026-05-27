/**
 * Generates .claude/WORKFLOW.md — Team topology and delegation rules
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * @param {object} config - Configuration from wizard
 * @param {object} opts - { dryRun: boolean }
 */
export async function generateWorkflow(config, opts = {}) {
  const claudeDir = resolve(config.cwd, '.claude');
  const outputPath = resolve(claudeDir, 'WORKFLOW.md');
  const content = buildWorkflow(config);

  if (opts.dryRun) {
    return { preview: outputPath };
  }

  mkdirSync(claudeDir, { recursive: true });
  writeFileSync(outputPath, content, 'utf-8');
  return { path: outputPath };
}

function buildWorkflow(config) {
  const { project, fronts, team } = config;

  let md = `# Agent Workflow — ${project.name}${config.selectedFront ? ` (${config.selectedFront})` : ''}

## Team Members

| Member | Agent ID | Maestri Terminal |
|--------|----------|-----------------|
`;

  for (const member of team.members) {
    md += `| ${member.name} | \`${member.slug}\` | ${member.name} |\n`;
  }

  md += `
## Agent Topology

\`\`\`
`;

  // Draw topology
  const techLead = team.members[0];
  const others = team.members.slice(1);

  if (techLead) {
    md += `  ● ${techLead.name} (orchestrator)\n`;
    others.forEach((member, i) => {
      const connector = i === others.length - 1 ? '└' : '├';
      md += `     ${connector}── ● ${member.name}\n`;
    });
  }

  md += `\`\`\`

## Delegation Protocol

The **${techLead?.name || 'Tech Lead'}** is the orchestrator. All task delegation flows through them.

### How to Delegate

Use Maestri's inter-terminal communication:

\`\`\`bash
maestri ask "<Member Name>" "<Task with full context>"
\`\`\`

### Delegation Rules

1. **Always include full context** — the agent doesn't know what you discussed before
2. **One task per delegation** — keep tasks focused and atomic
3. **Include acceptance criteria** — what "done" looks like
4. **Specify constraints** — dependencies, patterns to follow, files to modify
5. **Wait for completion** — check the agent's response before delegating more

## Flow

### New Feature
1. Orchestrator receives the requirement
2. Orchestrator breaks it down into tasks per member
3. Orchestrator delegates to members (in parallel if independent)
4. Orchestrator reviews all outputs
5. Orchestrator creates PR

### Bug Fix
1. Orchestrator analyzes the bug
2. Orchestrator delegates to the appropriate member
3. Member fixes and writes regression test
4. Orchestrator reviews and creates PR

## Maestri Terminals

Each member runs in its own Maestri terminal with:
- Its own working directory (pointing to the correct repo)
- Its own agent definition (\`.claude/agents/<slug>.md\`)
- Access to the shared CLAUDE.md for project context

`;

  // Add repo mapping
  const selectedFront = config.selectedFront
    ? fronts.find((f) => f.name === config.selectedFront) || fronts[0]
    : fronts[0];

  if (selectedFront?.repos) {
    md += `### Terminal → Repository Mapping

| Terminal | Working Directory | Agent |
|----------|------------------|-------|
`;

    for (const member of team.members) {
      let workDir = config.cwd;
      if (member.repoKey) {
        const repo = selectedFront.repos.find((r) => r.name === member.repoKey.repoName);
        if (repo) {
          workDir = repo.localPath || repo.path;
        }
      }
      md += `| ${member.name} | \`${workDir}\` | \`--agent ${member.slug}\` |\n`;
    }
  }

  return md;
}
