/**
 * Generates CLAUDE.md — Project context file for all agents
 *
 * This is the most important generated file. Every agent reads it
 * to understand the project, stack, conventions, and team topology.
 */

import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * @param {object} config - Configuration from wizard
 * @param {object} opts - { dryRun: boolean }
 */
export async function generateClaudeMd(config, opts = {}) {
  const outputPath = resolve(config.cwd, 'CLAUDE.md');
  const content = buildClaudeMd(config);

  if (opts.dryRun) {
    return { preview: outputPath };
  }

  writeFileSync(outputPath, content, 'utf-8');
  return { path: outputPath };
}

function buildClaudeMd(config) {
  const { project, fronts, conventions, team } = config;
  const selectedFront = config.selectedFront
    ? fronts.find((f) => f.name === config.selectedFront) || fronts[0]
    : fronts[0];

  let md = `# CLAUDE.md

## Project Overview

- **Project**: ${project.name}
- **Organization**: ${project.organization}
- **Description**: ${project.description}
${project.confluence ? `- **Documentation**: ${project.confluence}` : ''}
${config.selectedFront ? `- **Front/Squad**: ${config.selectedFront}` : ''}

---

## Repository Structure

`;

  // Add repos for the selected front (or all fronts in architect mode)
  const frontsToDocument = config.selectedFront ? [selectedFront] : fronts;

  for (const front of frontsToDocument) {
    if (fronts.length > 1) {
      md += `### Front: ${front.name}\n\n`;
      if (front.description) {
        md += `${front.description}\n\n`;
      }
    }

    for (const repo of front.repos) {
      md += `#### ${repo.name} — \`${repo.localPath || repo.path}\`\n\n`;
      md += `- **Stack**: ${repo.stack}\n`;
      md += `- **Package Manager**: ${repo.package_manager}\n`;
      md += `\n`;
    }
  }

  // Conventions
  md += `---

## Conventions

### Commit Messages

`;

  switch (conventions.commitFormat) {
    case 'conventional':
    case 'angular':
      md += `Format: \`type(scope): subject\`

Types: feat, fix, docs, style, refactor, test, chore, perf, ci, build

Examples:
- \`feat(appointments): add listing endpoint\`
- \`fix(auth): handle expired token gracefully\`
- \`test(appointments): add integration tests\`
`;
      break;
    case 'simple':
      md += `Format: Simple subject line describing the change.\n`;
      break;
    default:
      md += `Format: ${conventions.commitFormat}\n`;
  }

  md += `
### PR Workflow

- Target branch: \`${conventions.defaultBranch}\`
- All PRs require code review
- Tests must pass before merge

### Testing Strategy

${conventions.testStrategy}

`;

  if (conventions.codingStandards && conventions.codingStandards.length > 0) {
    md += `### Coding Standards

${conventions.codingStandards.map((s) => `- ${s}`).join('\n')}

`;
  }

  // Team
  md += `---

## Team

| Member | Agent ID | Description |
|--------|----------|-------------|
`;

  for (const member of team.members) {
    md += `| ${member.name} | \`${member.slug}\` | ${member.description} |\n`;
  }

  md += `
### Delegation Protocol

The **Tech Lead** orchestrates all work. To delegate:

\`\`\`
maestri ask "<Member Name>" "<Task description with full context>"
\`\`\`

Always include:
1. What needs to be done
2. Acceptance criteria
3. Any constraints or dependencies

### Agent Communication

- Agents read this CLAUDE.md for project context
- Each agent has its own .md file in \`.claude/agents/\`
- The Tech Lead delegates via Maestri connections
- Agents report back to the Tech Lead when done

`;

  // Multi-front note
  if (fronts.length > 1 && !config.selectedFront) {
    md += `---

## Project Fronts

This project has ${fronts.length} fronts/squads:

${fronts.map((f) => `- **${f.name}**${f.description ? `: ${f.description}` : ''}`).join('\n')}

Each developer runs \`devcrew init\` and selects their front to get a personalized setup.
`;
  }

  return md;
}
