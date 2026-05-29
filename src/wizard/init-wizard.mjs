/**
 * init-wizard.mjs — Unified wizard for DevCrew V1
 *
 * DevCrew V1 model: "Tool, not process"
 * - Scans the repo automatically
 * - Presents what was detected
 * - Asks ONLY what cannot be inferred
 * - Auto-detected values are accepted silently — only missing values are prompted
 * - No Architect/Developer personas — one flow for everyone
 *
 * Minimal questions:
 *   1. Show detected info, ask ONLY for missing fields
 *   2. Commit format (always asked — human decision)
 *   3. Conventions (only missing ones)
 *   4. External context (Confluence URL, related repos)
 *   5. Business/technical rules (optional)
 *   6. Agents (5 defaults + optional customization)
 *   7. Confirmation
 */

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
    name: 'PO',
    slug: 'po',
    description: 'Validates implementation against business rules, requirements, and UI mockups',
    role: 'validator',
    color: '#FF9500',
  },
  {
    name: 'QA',
    slug: 'qa',
    description: 'Reviews code quality, test coverage, patterns, security; opens PRs and evaluates merge safety',
    role: 'validator',
    color: '#34C759',
  },
  {
    name: 'DevOps',
    slug: 'devops',
    description: 'Monitors CI/CD pipeline logs after deploy; classifies errors as infrastructure or code',
    role: 'monitor',
    color: '#FF3B30',
  },
];

const ROLE_COLOR_PALETTE = [
  '#AF52DE', '#34C759', '#007AFF', '#FF9500',
  '#FFCC00', '#FF3B30', '#5AC8FA', '#FF2D55',
  '#64D2FF', '#30D158',
];

// ── Main Wizard ──────────────────────────────────────────────────────────────

/**
 * Run the unified init wizard.
 *
 * @param {string} cwd - Current working directory
 * @param {object} detected - Auto-detected project info from repo-scanner
 * @returns {object|null} Config object or null if cancelled
 */
export async function initWizard(cwd, detected) {
  // ── Step 1: Show detected info, ask ONLY for missing fields ────────
  console.log(chalk.bold.underline('\n📡 Detected from your repo:\n'));

  printDetected(detected);

  console.log('');

  // Build list of project info questions — only ask what wasn't detected
  const projectQuestions = [];

  if (!detected.name) {
    projectQuestions.push({
      type: 'input',
      name: 'name',
      message: 'Project name:',
      default: '',
      validate: (v) => v.trim().length > 0 || 'Project name is required',
    });
  }

  if (!detected.description) {
    projectQuestions.push({
      type: 'input',
      name: 'description',
      message: 'Project description:',
      default: '',
    });
  }

  if (!detected.stack) {
    projectQuestions.push({
      type: 'input',
      name: 'stack',
      message: 'Tech stack:',
      default: '',
      validate: (v) => v.trim().length > 0 || 'Tech stack is required',
    });
  }

  if (!detected.packageManager) {
    projectQuestions.push({
      type: 'input',
      name: 'packageManager',
      message: 'Package manager:',
      default: '',
    });
  }

  let projectAnswers = {};
  if (projectQuestions.length > 0) {
    console.log(chalk.dim('  Fill in the missing values below:\n'));
    projectAnswers = await inquirer.prompt(projectQuestions);
  } else {
    console.log(chalk.green('  ✔ All project info detected automatically.\n'));
  }

  // Merge: detected values take priority, user answers fill the gaps
  const projectInfo = {
    name: detected.name || projectAnswers.name || '',
    description: detected.description || projectAnswers.description || '',
    stack: detected.stack || projectAnswers.stack || '',
    packageManager: detected.packageManager || projectAnswers.packageManager || '',
  };

  // ── Step 2: Conventions ───────────────────────────────────────────
  console.log(chalk.bold.underline('\n⚙️  Conventions\n'));

  // Show auto-detected conventions
  if (detected.defaultBranch) {
    console.log(`  ${chalk.green('✔')} Default branch: ${chalk.white(detected.defaultBranch)}`);
  }
  if (detected.detectedStandards.length > 0) {
    console.log(`  ${chalk.green('✔')} Coding standards: ${chalk.white(detected.detectedStandards.join(', '))}`);
  }
  if (detected.hasTests) {
    const testLabel = detected.testFramework
      ? `${detected.testFramework} — unit + integration`
      : 'unit + integration';
    console.log(`  ${chalk.green('✔')} Test strategy: ${chalk.white(testLabel)}`);
  }

  const hasAutoConventions = detected.defaultBranch || detected.detectedStandards.length > 0 || detected.hasTests;
  if (hasAutoConventions) console.log('');

  // Build convention questions — only ask what wasn't detected
  const conventionQuestions = [];

  if (!detected.defaultBranch) {
    conventionQuestions.push({
      type: 'input',
      name: 'defaultBranch',
      message: 'Default branch for PRs:',
      default: 'main',
    });
  }

  // Commit format is ALWAYS asked — it's a human decision
  conventionQuestions.push(
    {
      type: 'list',
      name: 'commitFormat',
      message: 'Commit message format:',
      choices: [
        { name: 'Conventional  (type(scope): subject)', value: 'conventional' },
        { name: 'Angular       (type(scope): subject)', value: 'angular' },
        { name: 'Simple        (plain subject line)', value: 'simple' },
        { name: 'Custom        (I will type my own format)', value: 'custom' },
      ],
      default: 'conventional',
    },
    {
      type: 'input',
      name: 'customCommitFormat',
      message: 'Describe your commit format:',
      when: (ans) => ans.commitFormat === 'custom',
      validate: (v) => v.trim().length > 0 || 'Commit format is required',
    },
  );

  if (detected.detectedStandards.length === 0) {
    conventionQuestions.push({
      type: 'input',
      name: 'codingStandards',
      message: 'Coding standards (comma-separated, optional):',
      default: '',
    });
  }

  if (!detected.hasTests) {
    conventionQuestions.push({
      type: 'input',
      name: 'testStrategy',
      message: 'Test strategy:',
      default: 'unit + integration',
    });
  }

  const conventionAnswers = await inquirer.prompt(conventionQuestions);

  // Merge: detected values take priority, user answers fill the gaps
  const conventions = {
    ...conventionAnswers,
    defaultBranch: detected.defaultBranch || conventionAnswers.defaultBranch || 'main',
    codingStandards: detected.detectedStandards.length > 0
      ? detected.detectedStandards.join(', ')
      : (conventionAnswers.codingStandards || ''),
    testStrategy: detected.hasTests
      ? (detected.testFramework ? `${detected.testFramework} — unit + integration` : 'unit + integration')
      : (conventionAnswers.testStrategy || 'unit + integration'),
  };

  // ── Step 3: External Context ──────────────────────────────────────
  console.log(chalk.bold.underline('\n🔗 External Context (optional)\n'));
  console.log(chalk.dim('  Add links and context that agents will use to understand your project.\n'));

  const contextAnswers = await inquirer.prompt([
    {
      type: 'input',
      name: 'confluenceUrl',
      message: 'Confluence / Wiki URL (press Enter to skip):',
      default: '',
      validate: (v) => {
        if (!v.trim()) return true;
        try { new URL(v.trim()); return true; } catch { return 'Please enter a valid URL'; }
      },
    },
    {
      type: 'input',
      name: 'relatedRepos',
      message: 'Related repo URLs (comma-separated, press Enter to skip):',
      default: '',
    },
    {
      type: 'list',
      name: 'additionalContextChoice',
      message: 'Additional project context:',
      choices: [
        { name: 'Skip — no additional context', value: 'skip' },
        { name: 'Paste text directly', value: 'text' },
        { name: 'Load from .md file(s)', value: 'files' },
      ],
      default: 'skip',
    },
    {
      type: 'editor',
      name: 'manualContext',
      message: 'Paste your project context (opens editor):',
      when: (ans) => ans.additionalContextChoice === 'text',
    },
    {
      type: 'input',
      name: 'contextFiles',
      message: 'Path(s) to .md files (comma-separated, relative to project root):',
      when: (ans) => ans.additionalContextChoice === 'files',
    },
    {
      type: 'input',
      name: 'businessRules',
      message: 'Business rules (optional, press Enter to skip):',
      default: '',
    },
    {
      type: 'input',
      name: 'technicalRules',
      message: 'Technical rules (optional, press Enter to skip):',
      default: '',
    },
  ]);

  // ── Step 4: Agents ────────────────────────────────────────────────
  console.log(chalk.bold.underline('\n🤖 Agents\n'));
  console.log(chalk.dim('  DevCrew comes with 5 default agents:\n'));

  for (const agent of DEFAULT_AGENTS) {
    const roleIcon = getRoleIcon(agent.role);
    console.log(`  ${roleIcon} ${chalk.bold(agent.name)} ${chalk.dim(`(${agent.role})`)} — ${agent.description}`);
  }

  console.log('');

  const { acceptDefaults } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'acceptDefaults',
      message: 'Use all 5 default agents?',
      default: true,
    },
  ]);

  let agents = [...DEFAULT_AGENTS];

  if (!acceptDefaults) {
    agents = await customizeAgents(DEFAULT_AGENTS);
  }

  // ── Step 5: Confirmation ──────────────────────────────────────────
  const commitFormat = conventions.commitFormat === 'custom'
    ? conventions.customCommitFormat
    : conventions.commitFormat;

  const codingStandards = conventions.codingStandards
    ? conventions.codingStandards.split(',').map((s) => s.trim()).filter(Boolean)
    : [];

  const relatedRepos = contextAnswers.relatedRepos
    ? contextAnswers.relatedRepos.split(',').map((s) => s.trim()).filter(Boolean)
    : [];

  const contextFiles = contextAnswers.contextFiles
    ? contextAnswers.contextFiles.split(',').map((s) => s.trim()).filter(Boolean)
    : [];

  const finalConventions = {
    ...conventions,
    commitFormat,
    codingStandards,
  };

  console.log(chalk.bold.underline('\n✅ Summary\n'));
  printSummary({
    projectInfo,
    conventions: finalConventions,
    contextAnswers: { ...contextAnswers, relatedRepos, contextFiles },
    agents,
    cwd,
  });

  const { confirmed } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirmed',
      message: 'Generate DevCrew workspace with these settings?',
      default: true,
    },
  ]);

  if (!confirmed) return null;

  // ── Build and return config ───────────────────────────────────────
  return {
    cwd,
    project: {
      name: projectInfo.name.trim(),
      description: projectInfo.description.trim(),
      context: {
        confluenceUrl: contextAnswers.confluenceUrl.trim() || null,
        relatedRepos,
        manual: contextAnswers.manualContext?.trim() || '',
        files: contextFiles,
        businessRules: contextAnswers.businessRules.trim(),
        technicalRules: contextAnswers.technicalRules.trim(),
      },
    },
    repo: {
      stack: projectInfo.stack.trim(),
      packageManager: projectInfo.packageManager.trim() || null,
      hasTests: detected.hasTests,
      testFramework: detected.testFramework,
      detectedStandards: detected.detectedStandards,
    },
    conventions: {
      defaultBranch: finalConventions.defaultBranch.trim(),
      commitFormat,
      codingStandards,
      testStrategy: finalConventions.testStrategy.trim(),
    },
    agents,
  };
}

/* ================================================================
 * Agent customization
 * ================================================================ */

async function customizeAgents(defaultAgents) {
  // Let user choose which defaults to keep
  const { keepSlugs } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'keepSlugs',
      message: 'Select agents to keep:',
      choices: defaultAgents.map((a) => ({
        name: `${getRoleIcon(a.role)} ${a.name} (${a.role}) — ${a.description}`,
        value: a.slug,
        checked: true,
      })),
    },
  ]);

  let agents = defaultAgents.filter((a) => keepSlugs.includes(a.slug));

  // Add custom agents
  let addMore = true;
  let colorIndex = 0;

  while (addMore) {
    const { addAgent } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'addAgent',
        message: 'Add a custom agent?',
        default: false,
      },
    ]);

    if (!addAgent) {
      addMore = false;
      break;
    }

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
        message: 'Agent description (what does it do?):',
        validate: (v) => v.trim().length > 0 || 'Description is required',
      },
      {
        type: 'list',
        name: 'role',
        message: 'Agent role:',
        choices: [
          { name: '🟣 orchestrator — coordinates other agents', value: 'orchestrator' },
          { name: '🟢 executor    — implements tasks', value: 'executor' },
          { name: '🔵 validator   — reviews and validates', value: 'validator' },
          { name: '🔴 monitor     — monitors pipelines and branches', value: 'monitor' },
        ],
      },
    ]);

    const slug = custom.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const color = ROLE_COLOR_PALETTE[colorIndex % ROLE_COLOR_PALETTE.length];
    colorIndex++;

    agents.push({
      name: custom.name.trim(),
      slug,
      description: custom.description.trim(),
      role: custom.role,
      color,
    });
  }

  return agents;
}

/* ================================================================
 * Display helpers
 * ================================================================ */

function printDetected(detected) {
  const found = (label, value) =>
    console.log(`  ${chalk.green('✔')} ${chalk.cyan(label.padEnd(18))} ${chalk.white(value)}`);
  const missing = (label) =>
    console.log(`  ${chalk.yellow('?')} ${chalk.cyan(label.padEnd(18))} ${chalk.yellow('will ask')}`);

  detected.name ? found('Project name:', detected.name) : missing('Project name:');
  detected.description ? found('Description:', truncate(detected.description, 55)) : missing('Description:');
  detected.stack ? found('Tech stack:', detected.stack) : missing('Tech stack:');
  detected.packageManager ? found('Pkg manager:', detected.packageManager) : missing('Pkg manager:');
  detected.defaultBranch ? found('Default branch:', detected.defaultBranch) : missing('Default branch:');
  detected.hasTests
    ? found('Tests:', `detected${detected.testFramework ? ` (${detected.testFramework})` : ''}`)
    : missing('Tests:');
  detected.detectedStandards.length > 0
    ? found('Standards:', detected.detectedStandards.join(', '))
    : missing('Standards:');
  if (detected.architectureDoc) {
    found('Architecture:', 'ARCHITECTURE.md found');
  }
}

function printSummary({ projectInfo, conventions, contextAnswers, agents, cwd }) {
  console.log(`  ${chalk.bold('Project:')}     ${projectInfo.name}`);
  if (projectInfo.description) {
    console.log(`  ${chalk.bold('Description:')} ${truncate(projectInfo.description, 60)}`);
  }
  console.log(`  ${chalk.bold('Stack:')}       ${projectInfo.stack}`);
  if (projectInfo.packageManager) {
    console.log(`  ${chalk.bold('Pkg manager:')} ${projectInfo.packageManager}`);
  }
  console.log(`  ${chalk.bold('Branch:')}      ${conventions.defaultBranch}`);
  console.log(`  ${chalk.bold('Commits:')}     ${conventions.commitFormat}`);
  console.log(`  ${chalk.bold('Tests:')}       ${conventions.testStrategy}`);
  if (conventions.codingStandards.length > 0) {
    console.log(`  ${chalk.bold('Standards:')}   ${conventions.codingStandards.join(', ')}`);
  }
  if (contextAnswers.confluenceUrl) {
    console.log(`  ${chalk.bold('Confluence:')}  ${contextAnswers.confluenceUrl}`);
  }
  if (contextAnswers.relatedRepos.length > 0) {
    console.log(`  ${chalk.bold('Related repos:')} ${contextAnswers.relatedRepos.join(', ')}`);
  }
  console.log('');
  console.log(`  ${chalk.bold('Agents:')}`);
  for (const agent of agents) {
    console.log(`    ${getRoleIcon(agent.role)} ${agent.name} ${chalk.dim(`(${agent.role})`)}`);
  }
  console.log('');
  console.log(`  ${chalk.bold('Output directory:')} ${cwd}`);
  console.log('');
  console.log(chalk.dim('  Files to be generated:'));
  console.log(chalk.dim('    CLAUDE.md'));
  console.log(chalk.dim('    .claude/settings.json'));
  console.log(chalk.dim('    .claude/WORKFLOW.md'));
  console.log(chalk.dim(`    .claude/agents/ (${agents.length} agents)`));
  console.log(chalk.dim('    ~/.maestri/workspaces/<id>/workspace.json'));
  console.log('');
}

function getRoleIcon(role) {
  switch (role) {
    case 'orchestrator': return '🟣';
    case 'executor':     return '🟢';
    case 'validator':    return '🔵';
    case 'monitor':      return '🔴';
    default:             return '⚪';
  }
}

function truncate(str, maxLen) {
  if (!str) return '';
  return str.length > maxLen ? str.slice(0, maxLen - 3) + '...' : str;
}
