/**
 * Generates CLAUDE.md — Project context file for all agents
 *
 * This is the most important generated file. Every agent reads it
 * to understand the project, stack, conventions, team topology,
 * and the 8-phase quality pipeline.
 */

import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { processContext } from '../context/confluence.mjs';

/**
 * @param {object} config - Configuration from wizard
 * @param {object} opts - { dryRun: boolean }
 */
export async function generateClaudeMd(config, opts = {}) {
  const outputPath = resolve(config.cwd, 'CLAUDE.md');
  const content = await buildClaudeMd(config);

  if (opts.dryRun) {
    return { preview: outputPath };
  }

  writeFileSync(outputPath, content, 'utf-8');
  return { path: outputPath };
}

/**
 * Build the full CLAUDE.md markdown string.
 *
 * @param {object} config - Wizard config (new V0 shape)
 * @returns {Promise<string>} Markdown content
 */
async function buildClaudeMd(config) {
  const { project, repos, conventions, agents } = config;

  // ── Process context (load files, validate URLs) ──────────────────
  const ctx = project.context
    ? await processContext(project.context, config.cwd)
    : { confluenceUrl: null, loadedFiles: [], manual: '', businessRules: '', technicalRules: '' };

  let md = '';

  // ── 1. Project Overview ──────────────────────────────────────────
  md += buildProjectOverview(project, ctx);

  // ── 2. Project Context ───────────────────────────────────────────
  md += buildProjectContext(ctx);

  // ── 3. Repository Structure ──────────────────────────────────────
  md += buildRepositoryStructure(repos);

  // ── 4. Conventions ───────────────────────────────────────────────
  md += buildConventions(conventions);

  // ── 5. Agents ────────────────────────────────────────────────────
  md += buildAgents(agents);

  // ── 6. Quality Pipeline ──────────────────────────────────────────
  md += buildPipeline();

  // ── 7. Delegation Protocol ───────────────────────────────────────
  md += buildDelegationProtocol();

  return md;
}

/* ================================================================
 * Section builders
 * ================================================================ */

function buildProjectOverview(project, ctx) {
  let md = `# CLAUDE.md

## Project Overview

- **Project**: ${project.name}
- **Organization**: ${project.organization}
- **Description**: ${project.description}
`;

  if (ctx.confluenceUrl) {
    md += `- **Confluence**: ${ctx.confluenceUrl} (use Confluence MCP to access)\n`;
  }

  md += `
---

`;
  return md;
}

function buildProjectContext(ctx) {
  const hasBusinessRules = ctx.businessRules && ctx.businessRules.trim().length > 0;
  const hasTechnicalRules = ctx.technicalRules && ctx.technicalRules.trim().length > 0;
  const hasManual = ctx.manual && ctx.manual.trim().length > 0;
  const hasFiles = ctx.loadedFiles && ctx.loadedFiles.length > 0;
  const hasConfluence = ctx.confluenceUrl;

  // Skip the entire section if there's nothing to show
  if (!hasBusinessRules && !hasTechnicalRules && !hasManual && !hasFiles && !hasConfluence) {
    return '';
  }

  let md = `## Project Context

`;

  if (hasBusinessRules) {
    md += `### Business Rules

${ctx.businessRules.trim()}

`;
  }

  if (hasTechnicalRules) {
    md += `### Technical Rules

${ctx.technicalRules.trim()}

`;
  }

  if (hasManual) {
    md += `### Additional Context

${ctx.manual.trim()}

`;
  }

  if (hasFiles) {
    md += `### Reference Documents

`;
    for (const file of ctx.loadedFiles) {
      md += `#### ${file.path}
${file.content}

`;
    }
  }

  if (hasConfluence) {
    md += `> 💡 If a Confluence MCP is configured, agents can access live documentation at:
> ${ctx.confluenceUrl}

`;
  }

  md += `---

`;
  return md;
}

function buildRepositoryStructure(repos) {
  if (!repos || repos.length === 0) {
    return '';
  }

  let md = `## Repository Structure

`;

  for (const repo of repos) {
    md += `### ${repo.name} — \`${repo.path}\`

- **Stack**: ${repo.stack}
- **Package Manager**: ${repo.package_manager}

`;
  }

  md += `---

`;
  return md;
}

function buildConventions(conventions) {
  if (!conventions) {
    return '';
  }

  let md = `## Conventions

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

  md += `---

`;
  return md;
}

function buildAgents(agents) {
  if (!agents || agents.length === 0) {
    return '';
  }

  let md = `## Agents

| Agent | ID | Role | Description |
|-------|-----|------|-------------|
`;

  for (const agent of agents) {
    md += `| ${agent.name} | \`${agent.slug}\` | ${agent.role} | ${agent.description} |\n`;
  }

  md += `
---

`;
  return md;
}

function buildPipeline() {
  return `## Quality Pipeline

The development pipeline follows 8 phases. The Tech Lead orchestrates this automatically after receiving a task.

### Phase 1 — Implementation
**Agent**: Developer
The Developer implements the feature, writes tests, and follows project patterns.

### Phase 2 — Business Rules Validation
**Agent**: Business Analyst
Validates the implementation against business rules and requirements.

### Phase 3 — Quality Review
**Agent**: Quality Guard
Reviews code quality, test coverage, patterns, security, and token efficiency.

### Phase 4 — Branch Verification
**Agent**: Sentinel
Checks the develop branch for conflicts. If conflicts exist, Developer resolves them.

### Phase 5 — Commit Approval
**Actor**: Human
The human reviews the validation chain results and approves the commit.

### Phase 6 — PR + Merge
**Actor**: Human (on GitHub)
The human reviews and merges the PR on GitHub.

### Phase 7 — Deploy Monitoring
**Agent**: Sentinel
Monitors CI/CD pipeline logs. Reports infrastructure errors to human, code errors to Developer.

### Phase 8 — Promotion
**Actor**: Human + Sentinel
After human validation in the environment, promotes to next stage (dev → homolog → prod).

---

`;
}

function buildDelegationProtocol() {
  return `## Delegation Protocol

The **Tech Lead** orchestrates all work. To delegate to an agent:

\`\`\`
maestri ask "<Agent Name>" "<Task description with full context>"
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
- The pipeline phases are followed in order for every task
`;
}
