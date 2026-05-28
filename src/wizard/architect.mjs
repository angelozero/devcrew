/**
 * Architect Wizard — Pioneer mode for Tech Lead / Architect
 *
 * Collects project information across 5 rounds:
 *   1. Project Identity + Conventions
 *   2. Repositories (flat list, no more fronts/squads)
 *   3. Project Context (Confluence, manual docs, business/technical rules)
 *   4. Agents (5 defaults + customization)
 *   5. Confirmation
 *
 * Returns a config object with the new V0 data model:
 *   - repos[] instead of fronts[]
 *   - agents[] instead of team.members[]
 *   - project.context for Confluence/manual context
 */

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import inquirer from 'inquirer';
import chalk from 'chalk';

// ── Default Agents ───────────────────────────────────────────────────────────

const DEFAULT_AGENTS = [
  {
    name: 'Tech Lead',
    slug: 'tech-lead',
    description: 'Orchestrates all work, delegates to sub-agents, coordinates the full pipeline',
    role: 'orchestrator',
    color: '#AF52DE',
  },
  {
    name: 'Developer',
    slug: 'developer',
    description: 'Implements features, resolves conflicts, writes code and tests',
    role: 'executor',
    color: '#34C759',
  },
  {
    name: 'Business Analyst',
    slug: 'biz-analyst',
    description: 'Validates implementation against business rules and requirements',
    role: 'validator',
    color: '#007AFF',
  },
  {
    name: 'Quality Guard',
    slug: 'quality-guard',
    description: 'Reviews code quality, test coverage, patterns, security, and does PR review',
    role: 'validator',
    color: '#FF9500',
  },
  {
    name: 'Sentinel',
    slug: 'sentinel',
    description: 'Checks develop branch for conflicts before PR and monitors CI/CD pipeline logs after deploy',
    role: 'monitor',
    color: '#FF3B30',
  },
];

const ROLE_COLOR_PALETTE = [
  '#AF52DE', // Purple
  '#34C759', // Green
  '#007AFF', // Blue
  '#FF9500', // Orange
  '#FFCC00', // Yellow
  '#FF3B30', // Red
  '#5AC8FA', // Cyan
  '#FF2D55', // Pink
  '#64D2FF', // Light Blue
  '#30D158', // Mint
];

// ── Main Wizard ──────────────────────────────────────────────────────────────

/**
 * @param {string} cwd - Current working directory
 * @param {object} opts - Options (standalone: boolean)
 * @returns {object|null} Config object or null if cancelled
 */
export async function architectWizard(cwd, opts = {}) {
  const isStandalone = opts.standalone || false;

  // ── Round 1: Project Identity + Conventions ────────────────────────
  console.log(chalk.bold.underline('\nRound 1 — Project Identity\n'));

  const identity = await inquirer.prompt([
    {
      type: 'input',
      name: 'projectName',
      message: 'Project name:',
      validate: (v) => v.trim().length > 0 || 'Project name is required',
    },
    {
      type: 'input',
      name: 'organization',
      message: 'Organization / Team:',
      validate: (v) => v.trim().length > 0 || 'Organization is required',
    },
    {
      type: 'input',
      name: 'description',
      message: 'Brief description:',
      validate: (v) => v.trim().length > 0 || 'Description is required',
    },
  ]);

  // Conventions (embedded in Round 1 to keep flow natural)
  console.log(chalk.dim('\n  Conventions:\n'));

  const conventions = await inquirer.prompt([
    {
      type: 'input',
      name: 'defaultBranch',
      message: 'Default branch for PRs:',
      default: 'develop',
    },
    {
      type: 'list',
      name: 'commitFormat',
      message: 'Commit message format:',
      choices: [
        { name: 'Conventional (type(scope): subject)', value: 'conventional' },
        { name: 'Angular (type(scope): subject)', value: 'angular' },
        { name: 'Simple (subject only)', value: 'simple' },
        { name: 'Custom', value: 'custom' },
      ],
      default: 'conventional',
    },
    {
      type: 'input',
      name: 'codingStandards',
      message: 'Coding standards (comma-separated, optional):',
      default: 'Clean Architecture, Always write tests',
      filter: (v) =>
        v
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
    },
    {
      type: 'input',
      name: 'testStrategy',
      message: 'Test strategy:',
      default: 'unit + integration + e2e',
    },
  ]);

  // ── Round 2: Repositories ──────────────────────────────────────────
  console.log(chalk.bold.underline('\nRound 2 — Repositories\n'));
  console.log(chalk.dim('Add the repositories that make up this project.\n'));

  const repos = await collectRepos();

  // ── Round 3: Project Context ───────────────────────────────────────
  console.log(chalk.bold.underline('\nRound 3 — Project Context\n'));
  console.log(chalk.dim('Provide context sources so agents understand your project better.\n'));

  const context = await collectContext();

  // ── Round 4: Agents ────────────────────────────────────────────────
  console.log(chalk.bold.underline('\nRound 4 — Agents\n'));

  const agents = await collectAgents();

  // ── Round 5: Confirmation ──────────────────────────────────────────
  console.log(chalk.bold.underline('\nRound 5 — Confirmation\n'));

  const config = {
    mode: isStandalone ? 'standalone' : 'architect',
    cwd,
    project: {
      name: identity.projectName.trim(),
      organization: identity.organization.trim(),
      description: identity.description.trim(),
      context,
    },
    repos,
    conventions: {
      defaultBranch: conventions.defaultBranch.trim(),
      commitFormat: conventions.commitFormat,
      codingStandards: conventions.codingStandards,
      testStrategy: conventions.testStrategy.trim(),
    },
    agents,
  };

  printSummary(config);

  const { proceed } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'proceed',
      message: 'Proceed with generation?',
      default: true,
    },
  ]);

  return proceed ? config : null;
}

// ── Round 2 Helper: Collect Repositories ─────────────────────────────────────

/**
 * Dynamically collect a flat list of repositories.
 * User adds repos one by one until they're done.
 *
 * @returns {Array<{name: string, path: string, stack: string, package_manager: string}>}
 */
async function collectRepos() {
  const repos = [];
  let addMore = true;
  let repoIndex = 0;

  while (addMore) {
    if (repoIndex > 0) {
      console.log(chalk.dim(`\n--- Repository ${repoIndex + 1} ---\n`));
    }

    const repo = await inquirer.prompt([
      {
        type: 'input',
        name: 'name',
        message: 'Repository name (e.g., api, web, mobile):',
        validate: (v) => v.trim().length > 0 || 'Repo name is required',
      },
      {
        type: 'input',
        name: 'path',
        message: 'Local path (absolute or relative):',
        validate: (v) => v.trim().length > 0 || 'Path is required',
      },
      {
        type: 'input',
        name: 'stack',
        message: 'Tech stack (e.g., Java + Spring Boot, React + TypeScript):',
        validate: (v) => v.trim().length > 0 || 'Stack is required',
      },
      {
        type: 'input',
        name: 'packageManager',
        message: 'Package manager (maven/gradle/npm/yarn/pnpm/pip/cargo):',
        default: 'npm',
      },
    ]);

    repos.push({
      name: repo.name.trim(),
      path: repo.path.trim(),
      stack: repo.stack.trim(),
      package_manager: repo.packageManager.trim(),
    });

    repoIndex++;

    const { continueAdding } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'continueAdding',
        message: 'Add another repository?',
        default: false,
      },
    ]);

    addMore = continueAdding;
  }

  return repos;
}

// ── Round 3 Helper: Collect Project Context ──────────────────────────────────

/**
 * Collect project context from multiple sources:
 * - Confluence URL (stored for later extraction in Phase 2)
 * - Manual context text or .md file path
 * - Business rules
 * - Technical rules
 *
 * @returns {object} context object
 */
async function collectContext() {
  // 1. Confluence URL
  const { confluenceUrl } = await inquirer.prompt([
    {
      type: 'input',
      name: 'confluenceUrl',
      message: 'Confluence / Wiki URL (optional, press Enter to skip):',
      default: '',
      validate: (v) => {
        if (!v || v.trim().length === 0) return true;
        try {
          new URL(v.trim());
          return true;
        } catch {
          return 'Must be a valid URL';
        }
      },
    },
  ]);

  // 2. Manual context — text or .md file
  const { manualContextType } = await inquirer.prompt([
    {
      type: 'list',
      name: 'manualContextType',
      message: 'Additional project context:',
      choices: [
        { name: 'Skip — no additional context', value: 'skip' },
        { name: 'Paste text directly', value: 'text' },
        { name: 'Load from a .md file', value: 'file' },
      ],
    },
  ]);

  let manualContext = '';
  const contextFiles = [];

  if (manualContextType === 'text') {
    const { contextText } = await inquirer.prompt([
      {
        type: 'editor',
        name: 'contextText',
        message: 'Paste or type your project context (opens editor):',
      },
    ]);
    manualContext = contextText.trim();
  } else if (manualContextType === 'file') {
    let addMoreFiles = true;

    while (addMoreFiles) {
      const { filePath } = await inquirer.prompt([
        {
          type: 'input',
          name: 'filePath',
          message: 'Path to .md file:',
          validate: (v) => {
            const p = v.trim();
            if (p.length === 0) return 'File path is required';
            const resolved = resolve(p);
            if (!existsSync(resolved)) return `File not found: ${resolved}`;
            return true;
          },
        },
      ]);

      const resolvedPath = resolve(filePath.trim());
      try {
        const content = readFileSync(resolvedPath, 'utf-8');
        manualContext += (manualContext ? '\n\n---\n\n' : '') + content;
        contextFiles.push(filePath.trim());
        console.log(chalk.green(`  ✔ Loaded ${filePath.trim()} (${content.length} chars)`));
      } catch (err) {
        console.log(chalk.red(`  ✖ Failed to read file: ${err.message}`));
      }

      const { continueAdding } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'continueAdding',
          message: 'Load another .md file?',
          default: false,
        },
      ]);

      addMoreFiles = continueAdding;
    }
  }

  // 3. Business rules
  const { businessRules } = await inquirer.prompt([
    {
      type: 'input',
      name: 'businessRules',
      message: 'Business rules (optional, press Enter to skip):',
      default: '',
    },
  ]);

  // 4. Technical rules
  const { technicalRules } = await inquirer.prompt([
    {
      type: 'input',
      name: 'technicalRules',
      message: 'Technical rules (optional, press Enter to skip):',
      default: '',
    },
  ]);

  return {
    confluenceUrl: confluenceUrl.trim() || null,
    extracted: [], // populated by Phase 2 (Confluence extraction)
    manual: manualContext,
    files: contextFiles,
    businessRules: businessRules.trim(),
    technicalRules: technicalRules.trim(),
  };
}

// ── Round 4 Helper: Collect Agents ───────────────────────────────────────────

/**
 * Show default agents and let user accept, remove, or add custom ones.
 *
 * @returns {Array<{name: string, slug: string, description: string, role: string, color: string}>}
 */
async function collectAgents() {
  // Show default agents
  console.log(chalk.dim('Default agents for your project:\n'));

  const roleIcons = {
    orchestrator: '🟣',
    executor: '🟢',
    validator: '🔵',
    monitor: '🔴',
  };

  for (const agent of DEFAULT_AGENTS) {
    const icon = roleIcons[agent.role] || '⚪';
    console.log(`  ${icon} ${chalk.bold(agent.name)} ${chalk.dim(`(${agent.role})`)}`);
    console.log(`     ${chalk.dim(agent.description)}`);
  }
  console.log('');

  const { agentAction } = await inquirer.prompt([
    {
      type: 'list',
      name: 'agentAction',
      message: 'How would you like to configure agents?',
      choices: [
        { name: 'Accept all defaults (recommended)', value: 'accept' },
        { name: 'Customize — remove some or add new agents', value: 'customize' },
      ],
    },
  ]);

  if (agentAction === 'accept') {
    return [...DEFAULT_AGENTS];
  }

  // Customize: let user pick which defaults to keep
  const { keepAgents } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'keepAgents',
      message: 'Select which default agents to keep:',
      choices: DEFAULT_AGENTS.map((a) => ({
        name: `${a.name} — ${a.description}`,
        value: a.slug,
        checked: true,
      })),
    },
  ]);

  const agents = DEFAULT_AGENTS.filter((a) => keepAgents.includes(a.slug));

  // Add custom agents
  const { addCustom } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'addCustom',
      message: 'Add custom agents?',
      default: false,
    },
  ]);

  if (addCustom) {
    let addMore = true;
    let customIndex = 0;

    while (addMore) {
      console.log(chalk.dim(`\n--- Custom Agent ${customIndex + 1} ---\n`));

      const custom = await inquirer.prompt([
        {
          type: 'input',
          name: 'name',
          message: 'Agent name:',
          validate: (v) => v.trim().length > 0 || 'Name is required',
        },
        {
          type: 'input',
          name: 'description',
          message: 'What does this agent do?',
          validate: (v) => v.trim().length > 0 || 'Description is required',
        },
        {
          type: 'list',
          name: 'role',
          message: 'Agent role:',
          choices: [
            { name: 'Orchestrator — coordinates and delegates', value: 'orchestrator' },
            { name: 'Executor — implements and builds', value: 'executor' },
            { name: 'Validator — reviews and validates', value: 'validator' },
            { name: 'Monitor — watches and alerts', value: 'monitor' },
          ],
        },
      ]);

      const slug = custom.name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

      const colorIndex = (agents.length + customIndex) % ROLE_COLOR_PALETTE.length;

      agents.push({
        name: custom.name.trim(),
        slug,
        description: custom.description.trim(),
        role: custom.role,
        color: ROLE_COLOR_PALETTE[colorIndex],
      });

      customIndex++;

      const { continueAdding } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'continueAdding',
          message: 'Add another custom agent?',
          default: false,
        },
      ]);

      addMore = continueAdding;
    }
  }

  return agents;
}

// ── Summary Printer ──────────────────────────────────────────────────────────

/**
 * Print a visual summary of the configuration before confirmation.
 *
 * @param {object} config - The assembled config object
 */
function printSummary(config) {
  const { project, repos, agents, conventions } = config;

  console.log(chalk.bold('DevCrew will generate:\n'));

  if (config.mode !== 'developer') {
    console.log(`  📄 ${chalk.cyan('project.yaml')}            — Project configuration (share with your team)`);
  }
  console.log(`  📁 ${chalk.cyan('CLAUDE.md')}               — Project context for all agents`);
  console.log(`  📁 ${chalk.cyan('.claude/WORKFLOW.md')}     — Team topology and delegation rules`);
  console.log(`  📁 ${chalk.cyan('.claude/settings.json')}   — Permissions and config`);
  console.log(`  📁 ${chalk.cyan('.claude/agents/')}         — ${agents.length} agent definitions`);
  console.log(`  📁 ${chalk.cyan('Maestri workspace')}       — Connected terminals`);

  // Project info
  console.log(`\n  Project: ${chalk.bold(project.name)}`);
  console.log(`  Organization: ${project.organization}`);
  console.log(`  Repos: ${repos.length} (${repos.map((r) => r.name).join(', ')})`);

  // Conventions
  console.log(`\n  Branch: ${chalk.dim(conventions.defaultBranch)}`);
  console.log(`  Commits: ${chalk.dim(conventions.commitFormat)}`);
  console.log(`  Tests: ${chalk.dim(conventions.testStrategy)}`);

  // Context summary
  if (project.context.confluenceUrl) {
    console.log(`\n  📎 Confluence: ${chalk.dim(project.context.confluenceUrl)}`);
  }
  if (project.context.manual) {
    const preview = project.context.manual.substring(0, 80);
    console.log(`  📝 Manual context: ${chalk.dim(preview + (project.context.manual.length > 80 ? '...' : ''))}`);
  }
  if (project.context.files.length > 0) {
    console.log(`  📂 Context files: ${chalk.dim(project.context.files.join(', '))}`);
  }
  if (project.context.businessRules) {
    console.log(`  📋 Business rules: ${chalk.dim(project.context.businessRules.substring(0, 60) + (project.context.businessRules.length > 60 ? '...' : ''))}`);
  }
  if (project.context.technicalRules) {
    console.log(`  🔧 Technical rules: ${chalk.dim(project.context.technicalRules.substring(0, 60) + (project.context.technicalRules.length > 60 ? '...' : ''))}`);
  }

  // Agent topology
  const roleIcons = {
    orchestrator: '🟣',
    executor: '🟢',
    validator: '🔵',
    monitor: '🔴',
  };

  const maxLen = Math.max(project.name.length + 4, 50);
  const border = '─'.repeat(maxLen);

  console.log(`\n  ┌${border}┐`);
  console.log(`  │${project.name.padStart((maxLen + project.name.length) / 2).padEnd(maxLen)}│`);
  console.log(`  │${''.padEnd(maxLen)}│`);

  const orchestrator = agents.find((a) => a.role === 'orchestrator');
  const others = agents.filter((a) => a.role !== 'orchestrator');

  if (orchestrator) {
    const icon = roleIcons[orchestrator.role] || '⚪';
    console.log(`  │  ${icon} ${orchestrator.name} ──┬${'─'.repeat(Math.max(0, maxLen - orchestrator.name.length - 12))}│`);
    others.forEach((agent, i) => {
      const connector = i === others.length - 1 ? '└' : '├';
      const agentIcon = roleIcons[agent.role] || '⚪';
      const line = `       │         ${connector}── ${agentIcon} ${agent.name}`;
      console.log(`  │${line.padEnd(maxLen)}│`);
    });
  } else {
    // No orchestrator — just list all agents
    agents.forEach((agent) => {
      const icon = roleIcons[agent.role] || '⚪';
      const line = `  ${icon} ${agent.name} (${agent.role})`;
      console.log(`  │${line.padEnd(maxLen)}│`);
    });
  }

  console.log(`  └${border}┘`);

  // Repos
  console.log(chalk.dim('\n  Repositories:'));
  for (const repo of repos) {
    console.log(chalk.dim(`    ${repo.name}: ${repo.path} (${repo.stack}, ${repo.package_manager})`));
  }
  console.log('');
}
