/**
 * Generates .claude/WORKFLOW.md — Team topology, quality pipeline, and delegation rules (V1)
 *
 * V1 config shape:
 *   config.project.name
 *   config.repo.stack, config.repo.packageManager
 *   config.agents[] with role field
 *   config.cwd as the single working directory
 *
 * No more config.repos[] flat list
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * @param {object} config - Configuration from wizard (V1 shape)
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
  const { project, agents } = config;

  let md = `# Agent Workflow — ${project.name}

`;

  // ── 1. Agents Table ──────────────────────────────────────────────
  md += buildAgentsTable(agents);

  // ── 2. Agent Topology ────────────────────────────────────────────
  md += buildTopology(agents);

  // ── 3. Quality Pipeline ──────────────────────────────────────────
  md += buildPipeline(agents);

  // ── 4. Delegation Protocol ───────────────────────────────────────
  md += buildDelegationProtocol(agents);

  // ── 5. Terminal → Working Directory Mapping ───────────────────────
  md += buildTerminalMapping(config);

  return md;
}

/* ================================================================
 * Section builders
 * ================================================================ */

function buildAgentsTable(agents) {
  let md = `## Agents

| Agent | Slug | Role | Maestri Terminal |
|-------|------|------|-----------------|
`;

  for (const agent of agents) {
    md += `| ${agent.name} | \`${agent.slug}\` | ${agent.role} | ${agent.name} |\n`;
  }

  md += `
---

`;
  return md;
}

function buildTopology(agents) {
  const orchestrator = agents.find((a) => a.role === 'orchestrator');
  const others = agents.filter((a) => a.role !== 'orchestrator');

  let md = `## Agent Topology

\`\`\`
`;

  if (orchestrator) {
    md += `  ● ${orchestrator.name} (${orchestrator.role})\n`;
    others.forEach((agent, i) => {
      const connector = i === others.length - 1 ? '└' : '├';
      md += `     ${connector}── ● ${agent.name} (${agent.role})\n`;
    });
  } else {
    for (const agent of agents) {
      md += `  ● ${agent.name} (${agent.role})\n`;
    }
  }

  md += `\`\`\`

---

`;
  return md;
}

function buildPipeline(agents) {
  // Find agents by role for pipeline references
  const executor = agents.find((a) => a.role === 'executor');
  const monitor = agents.find((a) => a.role === 'monitor');
  const orchestrator = agents.find((a) => a.role === 'orchestrator');

  // Get all validators for the validation phases
  const validators = agents.filter((a) => a.role === 'validator');
  const businessValidator = validators.find((a) =>
    a.slug.includes('biz') || a.slug.includes('business') || a.slug.includes('analyst'),
  ) || validators[0];
  const qualityValidator = validators.find((a) =>
    a.slug.includes('quality') || a.slug.includes('guard') || a.slug.includes('review'),
  ) || validators[1] || validators[0];

  const executorName = executor?.name || 'Developer';
  const monitorName = monitor?.name || 'Sentinel';
  const orchestratorName = orchestrator?.name || 'Tech Lead';
  const bizValidatorName = businessValidator?.name || 'Business Analyst';
  const qualityValidatorName = qualityValidator?.name || 'Quality Guard';

  let md = `## Quality Pipeline

The development pipeline follows 8 phases. The **${orchestratorName}** orchestrates this automatically after receiving a task.

### Phase 1 — Implementation
**Agent**: ${executorName}
The ${executorName} implements the feature, writes tests, and follows project patterns.

\`\`\`bash
maestri ask "${executorName}" "Implement [feature]. Context: [full context]. Acceptance criteria: [criteria]."
\`\`\`

### Phase 2 — Business Rules Validation
**Agent**: ${bizValidatorName}
Validates the implementation against business rules and requirements.

\`\`\`bash
maestri ask "${bizValidatorName}" "Validate the implementation of [feature] against business rules. Check: [specific rules]."
\`\`\`

### Phase 3 — Quality Review
**Agent**: ${qualityValidatorName}
Reviews code quality, test coverage, patterns, security, and token efficiency.

\`\`\`bash
maestri ask "${qualityValidatorName}" "Review the implementation of [feature]. Check quality, tests, patterns, and security."
\`\`\`

### Phase 4 — Branch Verification
**Agent**: ${monitorName}
Checks the target branch for conflicts. If conflicts exist, ${executorName} resolves them.

\`\`\`bash
maestri ask "${monitorName}" "Check the target branch for conflicts with the current implementation."
\`\`\`

### Phase 5 — Commit Approval
**Actor**: Human
The human reviews the validation chain results and approves the commit.

> ⏸️ Pipeline pauses here — the ${orchestratorName} presents a summary and waits for human approval.

### Phase 6 — PR + Merge
**Actor**: Human (on GitHub)
The human reviews and merges the PR on GitHub.

### Phase 7 — Deploy Monitoring
**Agent**: ${monitorName}
Monitors CI/CD pipeline logs. Reports infrastructure errors to human, code errors to ${executorName}.

\`\`\`bash
maestri ask "${monitorName}" "Monitor the CI/CD pipeline for the latest deployment. Report any failures."
\`\`\`

### Phase 8 — Promotion
**Actor**: Human + ${monitorName}
After human validation in the environment, promotes to next stage (dev → homolog → prod).

---

`;
  return md;
}

function buildDelegationProtocol(agents) {
  const orchestrator = agents.find((a) => a.role === 'orchestrator');
  const orchestratorName = orchestrator?.name || 'Tech Lead';

  let md = `## Delegation Protocol

The **${orchestratorName}** is the orchestrator. All task delegation flows through them.

### How to Delegate

Use Maestri's inter-terminal communication:

\`\`\`bash
maestri ask "<Agent Name>" "<Task with full context>"
\`\`\`

### Delegation Template

\`\`\`
Task: [clear description]
Context: [why this is needed, relevant files, dependencies]
Acceptance Criteria:
- [criterion 1]
- [criterion 2]
Constraints:
- [follow existing patterns in X]
- [use Y library]
\`\`\`

### Delegation Rules

1. **Always include full context** — the agent doesn't know what you discussed before
2. **One task per delegation** — keep tasks focused and atomic
3. **Include acceptance criteria** — what "done" looks like
4. **Specify constraints** — dependencies, patterns to follow, files to modify
5. **Wait for completion** — check the agent's response before delegating more
6. **Follow the pipeline** — phases must be executed in order

---

`;
  return md;
}

function buildTerminalMapping(config) {
  const { agents } = config;

  let md = `## Terminal → Working Directory Mapping

All agents work from the project root: \`${config.cwd}\`

| Terminal | Working Directory | Agent Command |
|----------|------------------|---------------|
`;

  for (const agent of agents) {
    md += `| ${agent.name} | \`${config.cwd}\` | \`claude --agent ${agent.slug}\` |\n`;
  }

  md += '\n';
  return md;
}
