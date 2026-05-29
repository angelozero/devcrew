/**
 * Generates CLAUDE.md — Project context file for all agents (V1)
 *
 * V1 config shape:
 *   config.project.name, config.project.description
 *   config.project.context.confluenceUrl, relatedRepos, manual, files, businessRules, technicalRules
 *   config.repo.stack, config.repo.packageManager
 *   config.conventions.*
 *   config.agents[]
 *
 * No more config.repos[] or config.project.organization
 */

import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { processContext } from '../context/confluence.mjs';

/**
 * @param {object} config - Configuration from wizard (V1 shape)
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
 */
async function buildClaudeMd(config) {
  const { project, repo, conventions, agents } = config;

  // ── Process context (load files, validate URLs) ──────────────────
  const ctx = project.context
    ? await processContext(project.context, config.cwd)
    : { confluenceUrl: null, relatedRepos: [], loadedFiles: [], manual: '', businessRules: '', technicalRules: '' };

  let md = '';

  // ── 1. Project Overview ──────────────────────────────────────────
  md += buildProjectOverview(project, repo, ctx);

  // ── 2. Project Context ───────────────────────────────────────────
  md += buildProjectContext(ctx);

  // ── 3. Conventions ───────────────────────────────────────────────
  md += buildConventions(conventions);

  // ── 4. Agents ────────────────────────────────────────────────────
  md += buildAgents(agents);

  // ── 5. Quality Pipeline ──────────────────────────────────────────
  md += buildPipeline();

  // ── 6. Delegation Protocol ───────────────────────────────────────
  md += buildDelegationProtocol();

  return md;
}

/* ================================================================
 * Section builders
 * ================================================================ */

function buildProjectOverview(project, repo, ctx) {
  let md = `# CLAUDE.md

## Project Overview

- **Project**: ${project.name}
`;

  if (project.description) {
    md += `- **Description**: ${project.description}\n`;
  }

  if (repo?.stack) {
    md += `- **Stack**: ${repo.stack}\n`;
  }

  if (repo?.packageManager) {
    md += `- **Package Manager**: ${repo.packageManager}\n`;
  }

  if (ctx.confluenceUrl) {
    md += `- **Confluence**: ${ctx.confluenceUrl} (use Confluence MCP to access)\n`;
  }

  if (ctx.relatedRepos && ctx.relatedRepos.length > 0) {
    md += `- **Related Repos**:\n`;
    for (const repoUrl of ctx.relatedRepos) {
      md += `  - ${repoUrl}\n`;
    }
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

The development pipeline follows 7 phases (Phase 0 through Phase 6). The Tech Lead orchestrates this automatically after receiving a task.

### Phase 0 — Readiness Gate ⛩️
**Agent**: Tech Lead
Before ANY implementation begins, the Tech Lead validates that the task is "ready":
- Is there a feature specification? Are business rules defined? Are acceptance criteria explicit?
- If UI task: Is there a visual mockup? Does it show the component in context?
- Are there existing patterns to follow?

**Decision**: ✅ READY → proceed | ⚠️ PARTIALLY READY → ask human | ❌ NOT READY → stop, report missing items

### Phase 1 — Implementation
**Agent**: Developer
The Developer implements the feature, writes tests, and follows project patterns. Reports back to the Tech Lead when done.

### Phase 2 — Quality Review + PR
**Agent**: QA
Reviews code quality, test coverage, patterns, security, and token efficiency. If approved, opens a PR to the target branch and evaluates merge safety. Reports back to the Tech Lead.
If changes requested → Developer fixes → re-run Phase 2.

### Phase 3 — Business & Implementation Validation
**Agent**: PO
Validates the implementation against business rules, feature specification, and visual mockups (if applicable). Reports back to the Tech Lead.
If validation fails → Developer fixes → re-run from Phase 2.

### Phase 4 — Human Approval
**Actor**: Human
The Tech Lead presents a summary of all validation results and the PR status. The human reviews and merges the PR on GitHub.

### Phase 5 — Deploy Monitoring
**Agent**: DevOps
Monitors CI/CD pipeline logs after merge. Classifies errors as:
- 🏗️ Infrastructure → Tech Lead escalates to human
- 💻 Code → Tech Lead sends to Developer for fix → re-run from Phase 2

### Phase 6 — Promotion (Optional)
**Actor**: Human + DevOps
After human validates in the environment, promotes to next stage (dev → homolog → prod).

---

`;
}

function buildDelegationProtocol() {
  return `## Delegation Protocol

The **Tech Lead** orchestrates all work. All agents report back to the Tech Lead — no agent delegates directly to another.

\`\`\`
Human ──→ Tech Lead ──→ Agent ──→ Tech Lead ──→ Next Agent ──→ ...
\`\`\`

To delegate to an agent:

\`\`\`
maestri ask "<Agent Name>" "<Task description with full context>"
\`\`\`

Always include:
1. What needs to be done
2. Feature specification and mockup references (if applicable)
3. Acceptance criteria
4. Any constraints or dependencies

### Agent Communication

- Agents read this CLAUDE.md for project context
- Each agent has its own .md file in \`.claude/agents/\`
- The Tech Lead delegates via Maestri connections
- Agents report back to the Tech Lead when done — then WAIT for next instructions
- The pipeline phases are followed in order for every task
- Any code change always restarts validation from Phase 2 (QA)

### Readiness Gate Rule

The Tech Lead must NEVER delegate implementation to the Developer without first confirming readiness (Phase 0). If documentation, mockups, or business rules are missing, the Tech Lead reports to the human and waits.
`;
}
