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

  // ── 4. Pipeline Flow Diagram ─────────────────────────────────────
  md += buildFlowDiagram(agents);

  // ── 5. Delegation Protocol ───────────────────────────────────────
  md += buildDelegationProtocol(agents);

  // ── 6. Error Handling Loop ───────────────────────────────────────
  md += buildErrorHandling(agents);

  // ── 7. Terminal → Working Directory Mapping ───────────────────────
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
  const qualityValidator = validators.find((a) =>
    a.slug.includes('qa') || a.slug.includes('quality') || a.slug.includes('review'),
  ) || validators[0];
  const businessValidator = validators.find((a) =>
    a.slug.includes('po') || a.slug.includes('product') || a.slug.includes('business'),
  ) || validators[1] || validators[0];

  const executorName = executor?.name || 'Developer';
  const monitorName = monitor?.name || 'DevOps';
  const orchestratorName = orchestrator?.name || 'Tech Lead';
  const qualityValidatorName = qualityValidator?.name || 'QA';
  const bizValidatorName = businessValidator?.name || 'PO';

  let md = `## Quality Pipeline

The development pipeline follows 7 phases (Phase 0 through Phase 6). The **${orchestratorName}** orchestrates this automatically after receiving a task.

### Phase 0 — Readiness Gate ⛩️
**Agent**: ${orchestratorName}
Before ANY implementation begins, the ${orchestratorName} validates that the task is "ready":

- **Documentation**: Is there a feature spec? Are business rules defined? Are acceptance criteria explicit?
- **UI/Frontend** (if applicable): Is there a visual mockup or wireframe? Does it show the component in context? Are interaction behaviors documented?
- **Technical**: Are files to modify identifiable? Are there existing patterns to follow?

**Decision**:
- ✅ **READY** → Proceed to Phase 1
- ⚠️ **PARTIALLY READY** → Ask human if they want to proceed or provide missing items
- ❌ **NOT READY** → Report missing items to human, STOP until provided

> ⛩️ **This gate is mandatory.** The ${orchestratorName} must NEVER delegate to the ${executorName} without confirming readiness.

\`\`\`bash
# The ${orchestratorName} checks docs/, CLAUDE.md, and feature specs before proceeding
\`\`\`

### Phase 1 — Implementation
**Agent**: ${executorName}
The ${executorName} implements the feature, writes tests, and follows project patterns. Reports back to the ${orchestratorName} when done.

\`\`\`bash
maestri ask "${executorName}" "Implement [feature]. Context: [full context]. Acceptance criteria: [criteria]. Report back when done."
\`\`\`

### Phase 2 — Quality Review + PR
**Agent**: ${qualityValidatorName}
Reviews code quality, test coverage, patterns, security, and token efficiency. If approved, opens a PR to the target branch and evaluates merge safety.

\`\`\`bash
maestri ask "${qualityValidatorName}" "Review the implementation of [feature]. If quality is acceptable, open a PR and evaluate merge safety."
\`\`\`

**If changes requested**: ${orchestratorName} sends issues to ${executorName} for fixing, then re-runs Phase 2.

### Phase 3 — Business & Implementation Validation
**Agent**: ${bizValidatorName}
Validates the implementation against business rules, feature specification, and visual mockups (if applicable). Reports back to the ${orchestratorName}.

\`\`\`bash
maestri ask "${bizValidatorName}" "Validate the implementation of [feature]. Check business rules, feature spec compliance, and visual fidelity."
\`\`\`

**If validation fails**: ${orchestratorName} sends issues to ${executorName} for fixing, then re-runs from Phase 2.

### Phase 4 — Human Approval
**Actor**: Human
The ${orchestratorName} presents a summary of all validation results and the PR status. The human reviews and merges the PR on GitHub.

> ⏸️ Pipeline pauses here — the ${orchestratorName} presents a summary and waits for human approval.

### Phase 5 — Deploy Monitoring
**Agent**: ${monitorName}
After the human confirms the PR was merged, monitors CI/CD pipeline logs. Classifies errors as:
- 🏗️ **Infrastructure** → ${orchestratorName} escalates to human
- 💻 **Code** → ${orchestratorName} sends to ${executorName} for fix, then restarts from Phase 2

\`\`\`bash
maestri ask "${monitorName}" "Monitor the CI/CD pipeline for the latest deployment. Classify any errors as infrastructure or code."
\`\`\`

### Phase 6 — Promotion (Optional)
**Actor**: Human + ${monitorName}
After human validates in the environment, promotes to next stage (dev → homolog → prod).

---

`;
  return md;
}

function buildFlowDiagram(agents) {
  const executor = agents.find((a) => a.role === 'executor');
  const monitor = agents.find((a) => a.role === 'monitor');

  const validators = agents.filter((a) => a.role === 'validator');
  const qualityValidator = validators.find((a) =>
    a.slug.includes('qa') || a.slug.includes('quality') || a.slug.includes('review'),
  ) || validators[0];
  const businessValidator = validators.find((a) =>
    a.slug.includes('po') || a.slug.includes('product') || a.slug.includes('business'),
  ) || validators[1] || validators[0];

  const executorName = executor?.name || 'Developer';
  const monitorName = monitor?.name || 'DevOps';
  const qualityValidatorName = qualityValidator?.name || 'QA';
  const bizValidatorName = businessValidator?.name || 'PO';

  let md = `## Pipeline Flow Diagram

\`\`\`
Human gives task
       │
       ▼
┌─────────────────┐
│  Phase 0        │──── ❌ NOT READY ──→ Report to Human, STOP
│  Readiness Gate │
└────────┬────────┘
         │ ✅ READY
         ▼
┌─────────────────┐
│  Phase 1        │
│  ${executorName.padEnd(15)} │──→ Implements feature + tests
└────────┬────────┘
         │ "Done"
         ▼
┌─────────────────┐
│  Phase 2        │──── ❌ CHANGES ──→ ${executorName} fixes ──→ ↩ Phase 2
│  ${qualityValidatorName.padEnd(15)} │    REQUESTED
│  (Review + PR)  │
└────────┬────────┘
         │ ✅ APPROVED + PR opened
         ▼
┌─────────────────┐
│  Phase 3        │──── ❌ FAIL ──→ ${executorName} fixes ──→ ↩ Phase 2
│  ${bizValidatorName.padEnd(15)} │
└────────┬────────┘
         │ ✅ PASS
         ▼
┌─────────────────┐
│  Phase 4        │
│  Human Approval │──→ Human merges PR on GitHub
└────────┬────────┘
         │ Merged
         ▼
┌─────────────────┐
│  Phase 5        │──── 🏗️ Infra Error ──→ Report to Human, WAIT
│  ${monitorName.padEnd(15)} │──── 💻 Code Error ──→ ${executorName} fix ──→ ↩ Phase 2
│  (Monitoring)   │
└────────┬────────┘
         │ ✅ ALL CLEAR
         ▼
    ✅ COMPLETE
\`\`\`

---

`;
  return md;
}

function buildDelegationProtocol(agents) {
  const orchestrator = agents.find((a) => a.role === 'orchestrator');
  const orchestratorName = orchestrator?.name || 'Tech Lead';

  let md = `## Delegation Protocol

The **${orchestratorName}** is the orchestrator. All task delegation flows through them.

### ⛔ The ${orchestratorName} Does NOT Write Code

The ${orchestratorName} MUST NOT write, edit, or modify any code, tests, CSS, HTML, or project files. It is an orchestrator — its only tool for getting work done is \`maestri ask\`. If code needs to be written, the ${orchestratorName} delegates to the **Developer**. No exceptions.

### Communication Flow

All agents report back to the **${orchestratorName}** after completing their task. No agent delegates directly to another agent. The ${orchestratorName} decides what happens next based on each agent's report.

\`\`\`
Human ──→ ${orchestratorName} ──→ Agent ──→ ${orchestratorName} ──→ Next Agent ──→ ...
                  ↑                              │
                  └──────────────────────────────┘
\`\`\`

### How to Delegate

Use Maestri's inter-terminal communication:

\`\`\`bash
maestri ask "<Agent Name>" "<Task with full context>"
\`\`\`

### Delegation Template

\`\`\`
Task: [clear description]
Context: [why this is needed, relevant files, dependencies]
Feature Spec: [path to feature doc or inline spec]
Visual Mockup: [path to mockup, if applicable]
Acceptance Criteria:
- [criterion 1]
- [criterion 2]
Constraints:
- [follow existing patterns in X]
- [use Y library]
\`\`\`

### Delegation Rules

1. **Phase 0 first** — always validate readiness before delegating implementation
2. **Always include full context** — the agent doesn't know what you discussed before
3. **One task per delegation** — keep tasks focused and atomic
4. **Include acceptance criteria** — what "done" looks like
5. **Include feature spec and mockup references** — agents need the full picture
6. **Specify constraints** — dependencies, patterns to follow, files to modify
7. **Wait for completion** — check the agent's response before delegating to the next
8. **Follow the pipeline** — phases must be executed in order
9. **Re-validate after fixes** — any code change restarts from Phase 2

---

`;
  return md;
}

function buildErrorHandling(agents) {
  const executor = agents.find((a) => a.role === 'executor');
  const orchestrator = agents.find((a) => a.role === 'orchestrator');

  const executorName = executor?.name || 'Developer';
  const orchestratorName = orchestrator?.name || 'Tech Lead';

  let md = `## Error Handling & Fix Cycles

When any phase reports issues, the ${orchestratorName} manages the fix cycle:

### After QA Requests Changes (Phase 2)
1. ${orchestratorName} sends specific issues to ${executorName}
2. ${executorName} fixes and reports back
3. ${orchestratorName} re-runs Phase 2 (QA re-reviews)
4. Repeat until Phase 2 passes

### After PO Fails (Phase 3)
1. ${orchestratorName} sends specific issues to ${executorName}
2. ${executorName} fixes and reports back
3. ${orchestratorName} re-runs from **Phase 2** (full re-validation)
4. Repeat until Phase 3 passes

### After DevOps Reports Code Errors (Phase 5)
1. ${orchestratorName} sends error details to ${executorName}
2. ${executorName} creates a fix branch and implements corrections
3. ${orchestratorName} re-runs from **Phase 2** (full re-validation cycle)
4. The full cycle repeats: Phase 2 → Phase 3 → Phase 4 → Phase 5

### After DevOps Reports Infrastructure Errors (Phase 5)
1. ${orchestratorName} reports to the human with error details
2. ${orchestratorName} waits for human to resolve and confirm
3. Pipeline resumes from Phase 5 (re-monitor)

### Key Rule
**Any code change always restarts from Phase 2.** Never skip validation phases after a fix.

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
