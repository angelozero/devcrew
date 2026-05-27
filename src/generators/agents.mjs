/**
 * Generates .claude/agents/ — Creates agent definition files
 *
 * Agents are now fully dynamic. Instead of copying from hardcoded templates,
 * each agent is generated based on the member definition from the wizard.
 * The user defines their own roles (Backend Dev, Data Engineer, DevOps, etc.)
 * and each gets a tailored agent file.
 */

import { writeFileSync, readFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const TEMPLATES_DIR = resolve(__dirname, '..', 'templates', 'agents');

/**
 * @param {object} config - Configuration from wizard
 * @param {object} opts - { dryRun: boolean }
 */
export async function generateAgents(config, opts = {}) {
  const agentsDir = resolve(config.cwd, '.claude', 'agents');

  if (opts.dryRun) {
    return { preview: `${agentsDir}/ (${config.team.members.length} agents)` };
  }

  mkdirSync(agentsDir, { recursive: true });

  const created = [];

  for (const member of config.team.members) {
    const outputPath = resolve(agentsDir, `${member.slug}.md`);

    // Try to use a pre-built template if one exists for this slug
    const templatePath = resolve(TEMPLATES_DIR, `${member.slug}.md`);
    let content;

    if (existsSync(templatePath)) {
      content = readFileSync(templatePath, 'utf-8');
      // Replace template variables
      content = content.replace(/\{\{project_name\}\}/g, config.project.name);
      content = content.replace(/\{\{organization\}\}/g, config.project.organization);
      content = content.replace(/\{\{front_name\}\}/g, config.selectedFront || config.fronts[0]?.name || config.project.name);
    } else {
      // Generate a dynamic agent based on the member definition
      content = generateDynamicAgent(member, config);
    }

    writeFileSync(outputPath, content, 'utf-8');
    created.push(member.slug);
  }

  return { path: agentsDir, agents: created };
}

/**
 * Generate a dynamic agent definition based on member info.
 * This is the key change — agents are no longer hardcoded.
 * The agent gets its role, description, and context from the wizard.
 */
function generateDynamicAgent(member, config) {
  const { project, conventions } = config;

  // Find the repo this member works on
  let repoContext = '';
  if (member.repoKey) {
    for (const front of config.fronts) {
      const repo = front.repos.find((r) => r.name === member.repoKey.repoName);
      if (repo) {
        repoContext = `
## Your Repository

- **Repo**: \`${repo.localPath || repo.path}\`
- **Stack**: ${repo.stack}
- **Package Manager**: ${repo.package_manager}

When working, always operate within this repository's context and follow its patterns.
`;
        break;
      }
    }
  }

  const isOrchestrator = member.slug === 'tech-lead';

  return `---
name: ${member.name}
model: sonnet
---

# ${member.name}

You are the **${member.name}** for the project **${project.name}** (${project.organization}).

**Your role**: ${member.description}

## Loading Project Context

Before starting any task:
1. Read \`CLAUDE.md\` in the project root for full project context
2. Read \`.claude/WORKFLOW.md\` for team topology and delegation rules
3. Explore the existing codebase to understand patterns and conventions
${repoContext}
## How You Work

${isOrchestrator ? generateOrchestratorInstructions(config) : generateMemberInstructions(member, config)}

## Conventions

- Follow the project conventions described in CLAUDE.md
- Commit format: ${conventions.commitFormat}
- Target branch: \`${conventions.defaultBranch}\`
${conventions.codingStandards?.length > 0 ? `- Standards: ${conventions.codingStandards.join(', ')}` : ''}
- Testing: ${conventions.testStrategy}

## Communication

${isOrchestrator
    ? `- Delegate tasks to team members via \`maestri ask "<Name>" "<Task>"\`
- Always include full context when delegating
- Review outputs from all members before creating PRs
- Consolidate feedback and make final decisions`
    : `- Report completion to the orchestrator with a summary of changes
- If you encounter blockers, report them immediately
- If requirements are unclear, ask for clarification before implementing
- Include file paths and key decisions in your response`}

## Absolute Rules

1. **Read CLAUDE.md first** — always load project context before starting
2. **Follow existing patterns** — don't invent new patterns unless asked
3. **Follow project conventions** — naming, structure, formatting
4. **Don't modify unrelated code** — keep changes focused
${isOrchestrator
    ? `5. **Never skip review** — always review member outputs before PR
6. **Never delegate without context** — members need full information`
    : `5. **Always write tests** — no feature is complete without tests
6. **Handle errors properly** — never swallow exceptions`}
`;
}

function generateOrchestratorInstructions(config) {
  const others = config.team.members.slice(1);
  const memberList = others.map((m) => `- **${m.name}** — ${m.description}`).join('\n');

  return `You are the **orchestrator** of the AI development team. You:
- Receive requirements and break them down into tasks
- Delegate tasks to specialized members via Maestri
- Ensure code quality, conventions, and architecture are followed
- Review outputs from all members before creating PRs
- Make architectural decisions

### Your Team

${memberList}

### How to Delegate

\`\`\`bash
maestri ask "<Member Name>" "<Task with full context>"
\`\`\`

### Delegation Template

\`\`\`
Task: [clear description]
Context: [why this is needed]
Acceptance Criteria:
- [criterion 1]
- [criterion 2]
Constraints:
- [follow existing patterns in X]
- [use Y library]
\`\`\``;
}

function generateMemberInstructions(member, config) {
  return `You are a specialized team member. Your focus: **${member.description}**

### Implementation Checklist

1. **Understand the requirement** — read the full task description
2. **Explore existing patterns** — look at similar implementations in the codebase
3. **Implement the solution** — following project conventions
4. **Write tests** — cover happy path, error cases, and edge cases
5. **Handle errors** — proper error handling and validation
6. **Report back** — summarize what was done, files changed, decisions made

### Quality Standards

- Always write tests for new code
- Follow the project's existing patterns and conventions
- Handle error cases and edge cases
- Use the project's existing libraries and utilities
- Keep changes focused — one task at a time`;
}
