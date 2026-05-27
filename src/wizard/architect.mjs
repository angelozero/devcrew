/**
 * Architect Wizard — Pioneer mode for Tech Lead / Architect
 *
 * Collects project information across 5 rounds:
 *   1. Project Identity
 *   2. Fronts / Squads (multi-front support)
 *   3. Team Members (fully dynamic — user defines roles)
 *   4. Conventions
 *   5. Confirmation
 *
 * IMPORTANT: Roles are NOT hardcoded. The user defines their own team
 * members with custom names, descriptions, and repo assignments.
 * A team could be "Backend Dev + QA" or "Data Engineer + ML Engineer + DevOps"
 * — whatever the project needs.
 */

import inquirer from 'inquirer';
import chalk from 'chalk';

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

/**
 * @param {string} cwd - Current working directory
 * @param {object} opts - Options (standalone: boolean)
 * @returns {object|null} Config object or null if cancelled
 */
export async function architectWizard(cwd, opts = {}) {
  const isStandalone = opts.standalone || false;

  // ── Round 1: Project Identity ──────────────────────────────────────
  console.log(chalk.bold.underline('Round 1 — Project Identity\n'));

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
    {
      type: 'input',
      name: 'confluenceUrl',
      message: 'Confluence / Documentation URL (optional):',
      default: '',
    },
  ]);

  // ── Round 2: Fronts / Squads ───────────────────────────────────────
  console.log(chalk.bold.underline('\nRound 2 — Fronts / Squads\n'));

  let fronts = [];

  if (isStandalone) {
    const front = await collectFrontInfo(1, identity.projectName);
    fronts.push(front);
  } else {
    const { frontCount } = await inquirer.prompt([
      {
        type: 'number',
        name: 'frontCount',
        message: 'How many fronts/squads does this project have?',
        default: 1,
        validate: (v) => (v >= 1 && v <= 20) || 'Must be between 1 and 20',
      },
    ]);

    for (let i = 0; i < frontCount; i++) {
      console.log(chalk.dim(`\n--- Front ${i + 1} of ${frontCount} ---\n`));
      const front = await collectFrontInfo(i + 1);
      fronts.push(front);
    }
  }

  // ── Round 3: Team Members (fully dynamic) ──────────────────────────
  console.log(chalk.bold.underline('\nRound 3 — Team Members\n'));
  console.log(chalk.dim('Define the members of your AI team. Each member becomes a Maestri terminal.'));
  console.log(chalk.dim('A "Tech Lead" orchestrator is always included.\n'));

  const members = [
    {
      name: 'Tech Lead',
      slug: 'tech-lead',
      description: 'Orchestrates work, delegates tasks, reviews code',
      repoKey: null, // works from project root
      color: ROLE_COLOR_PALETTE[0],
    },
  ];

  let addMore = true;
  let memberIndex = 1;

  while (addMore) {
    console.log(chalk.dim(`\n--- Member ${memberIndex + 1} ---\n`));

    const member = await inquirer.prompt([
      {
        type: 'input',
        name: 'name',
        message: 'Member name (e.g., Backend Dev, Data Engineer, DevOps):',
        validate: (v) => v.trim().length > 0 || 'Name is required',
      },
      {
        type: 'input',
        name: 'description',
        message: 'What does this member do? (brief description):',
        validate: (v) => v.trim().length > 0 || 'Description is required',
      },
    ]);

    // Ask which repo this member works on (from the fronts defined earlier)
    const allRepos = [];
    for (const front of fronts) {
      for (const repo of front.repos) {
        allRepos.push({
          name: `${front.name} → ${repo.name} (${repo.stack})`,
          value: { frontName: front.name, repoName: repo.name },
        });
      }
    }
    allRepos.push({ name: '(Project root — no specific repo)', value: null });

    const { repoKey } = await inquirer.prompt([
      {
        type: 'list',
        name: 'repoKey',
        message: 'Which repository does this member work on?',
        choices: allRepos,
      },
    ]);

    const slug = member.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const color = ROLE_COLOR_PALETTE[memberIndex % ROLE_COLOR_PALETTE.length];

    members.push({
      name: member.name.trim(),
      slug,
      description: member.description.trim(),
      repoKey,
      color,
    });

    memberIndex++;

    const { continueAdding } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'continueAdding',
        message: 'Add another team member?',
        default: memberIndex < 4, // default yes for first few
      },
    ]);

    addMore = continueAdding;
  }

  // ── Round 4: Conventions ───────────────────────────────────────────
  console.log(chalk.bold.underline('\nRound 4 — Conventions\n'));

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
      filter: (v) => v.split(',').map((s) => s.trim()).filter(Boolean),
    },
    {
      type: 'input',
      name: 'testStrategy',
      message: 'Test strategy:',
      default: 'unit + integration + e2e',
    },
  ]);

  // ── Round 5: Confirmation ──────────────────────────────────────────
  console.log(chalk.bold.underline('\nRound 5 — Confirmation\n'));

  const config = {
    mode: isStandalone ? 'standalone' : 'architect',
    cwd,
    project: {
      name: identity.projectName.trim(),
      organization: identity.organization.trim(),
      description: identity.description.trim(),
      confluence: identity.confluenceUrl.trim() || null,
    },
    fronts,
    conventions: {
      defaultBranch: conventions.defaultBranch.trim(),
      commitFormat: conventions.commitFormat,
      codingStandards: conventions.codingStandards,
      testStrategy: conventions.testStrategy.trim(),
    },
    team: {
      members,
    },
  };

  printSummary(config);

  const { proceed } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'proceed',
      message: 'Proceed?',
      default: true,
    },
  ]);

  return proceed ? config : null;
}

/**
 * Collect information about a single front/squad.
 * Repos are now fully dynamic — user adds as many as needed.
 */
async function collectFrontInfo(index, defaultName) {
  const frontIdentity = await inquirer.prompt([
    {
      type: 'input',
      name: 'name',
      message: 'Front name:',
      default: defaultName || `Front ${index}`,
      validate: (v) => v.trim().length > 0 || 'Front name is required',
    },
    {
      type: 'input',
      name: 'description',
      message: 'Brief description:',
      default: '',
    },
  ]);

  // Collect repos dynamically
  console.log(chalk.dim('\n  Add the repositories for this front:\n'));

  const repos = [];
  let addMoreRepos = true;

  while (addMoreRepos) {
    const repo = await inquirer.prompt([
      {
        type: 'input',
        name: 'name',
        message: `  Repo name (e.g., api, web, mobile, data-pipeline):`,
        validate: (v) => v.trim().length > 0 || 'Repo name is required',
      },
      {
        type: 'input',
        name: 'path',
        message: `  Repo path (local or relative):`,
        validate: (v) => v.trim().length > 0 || 'Path is required',
      },
      {
        type: 'input',
        name: 'stack',
        message: `  Tech stack (e.g., Java + Spring Boot, React + TypeScript):`,
        validate: (v) => v.trim().length > 0 || 'Stack is required',
      },
      {
        type: 'input',
        name: 'packageManager',
        message: `  Package manager (maven/gradle/npm/yarn/pnpm/pip/cargo):`,
        default: 'npm',
      },
    ]);

    repos.push({
      name: repo.name.trim(),
      path: repo.path.trim(),
      stack: repo.stack.trim(),
      package_manager: repo.packageManager.trim(),
    });

    const { continueAdding } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'continueAdding',
        message: '  Add another repository to this front?',
        default: false,
      },
    ]);

    addMoreRepos = continueAdding;
  }

  return {
    name: frontIdentity.name.trim(),
    description: frontIdentity.description.trim(),
    repos,
  };
}

/**
 * Print a visual summary of the configuration
 */
function printSummary(config) {
  const { project, fronts, team } = config;

  console.log(chalk.bold('DevCrew will generate:\n'));

  if (config.mode !== 'developer') {
    console.log(`  📄 ${chalk.cyan('project.yaml')}            — Project configuration (share with your team)`);
  }
  console.log(`  📁 ${chalk.cyan('CLAUDE.md')}               — Project context for all agents`);
  console.log(`  📁 ${chalk.cyan('.claude/WORKFLOW.md')}     — Team topology and delegation rules`);
  console.log(`  📁 ${chalk.cyan('.claude/settings.json')}   — Permissions and config`);
  console.log(`  📁 ${chalk.cyan('.claude/agents/')}         — ${team.members.length} agent definitions`);
  console.log(`  📁 ${chalk.cyan('Maestri workspace')}       — Connected terminals`);

  console.log(`\n  Project: ${chalk.bold(project.name)}`);
  console.log(`  Organization: ${project.organization}`);
  console.log(`  Fronts: ${fronts.length} (${fronts.map((f) => f.name).join(', ')})`);

  // Draw team topology
  const maxLen = Math.max(project.name.length + 4, 44);
  const border = '─'.repeat(maxLen);

  console.log(`\n  ┌${border}┐`);
  console.log(`  │${project.name.padStart((maxLen + project.name.length) / 2).padEnd(maxLen)}│`);
  console.log(`  │${''.padEnd(maxLen)}│`);

  const techLead = team.members[0];
  const others = team.members.slice(1);

  if (techLead) {
    console.log(`  │  🟣 ${techLead.name} ──┬${'─'.repeat(Math.max(0, maxLen - techLead.name.length - 12))}│`);
    others.forEach((member, i) => {
      const connector = i === others.length - 1 ? '└' : '├';
      const line = `       │         ${connector}── ● ${member.name}`;
      console.log(`  │${line.padEnd(maxLen)}│`);
    });
  }

  console.log(`  └${border}┘`);

  // Show repos per front
  console.log(chalk.dim('\n  Repositories:'));
  for (const front of fronts) {
    if (fronts.length > 1) console.log(chalk.dim(`    ${front.name}:`));
    for (const repo of front.repos) {
      console.log(chalk.dim(`      ${repo.name}: ${repo.path} (${repo.stack})`));
    }
  }
  console.log('');
}
