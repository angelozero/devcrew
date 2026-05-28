/**
 * devcrew update — Update DevCrew configuration from project.yaml
 *
 * Reads the latest project.yaml and updates generated files
 * without destroying user customizations.
 *
 * Behavior:
 *   - CLAUDE.md          → always regenerated (source of truth)
 *   - .claude/WORKFLOW.md → always regenerated
 *   - .claude/settings.json → only created if missing
 *   - .claude/agents/     → smart merge (new agents added, existing preserved)
 *   - Maestri workspace   → updated with new agents
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import yaml from 'js-yaml';
import { generateClaudeMd } from '../generators/claude-md.mjs';
import { generateSettings } from '../generators/settings.mjs';
import { generateWorkflow } from '../generators/workflow.mjs';
import { generateAgents } from '../generators/agents.mjs';
import { generateMaestriWorkspace } from '../generators/maestri.mjs';

/**
 * Main update command entry point
 *
 * @param {object} options
 * @param {boolean} [options.force] - Overwrite existing agent files
 */
export async function update(options = {}) {
  const cwd = process.cwd();
  const projectYamlPath = resolve(cwd, 'project.yaml');

  console.log(chalk.bold.cyan('\n🔄 DevCrew Update\n'));

  // ── 1. Check project.yaml exists ──────────────────────────────────
  if (!existsSync(projectYamlPath)) {
    console.log(chalk.red('  ✖ No project.yaml found in current directory.'));
    console.log(chalk.dim('  Run: devcrew init --architect  (to create from scratch)'));
    return;
  }

  // ── 2. Read project.yaml ──────────────────────────────────────────
  let projectConfig;
  try {
    const raw = readFileSync(projectYamlPath, 'utf-8');
    projectConfig = yaml.load(raw);
  } catch (err) {
    console.log(chalk.red(`  ✖ Failed to read project.yaml: ${err.message}`));
    return;
  }

  // ── 3. Detect current state ───────────────────────────────────────
  const state = detectCurrentState(cwd);

  // ── 4. Build config from project.yaml ─────────────────────────────
  const config = buildConfigFromYaml(projectConfig, cwd);

  // ── 5. Show current state ─────────────────────────────────────────
  console.log(chalk.bold('  Current state:\n'));
  console.log(`    CLAUDE.md:             ${state.hasClaudeMd ? chalk.green('✔ exists') : chalk.dim('○ missing')}`);
  console.log(`    .claude/settings.json: ${state.hasSettings ? chalk.green('✔ exists') : chalk.dim('○ missing')}`);
  console.log(`    .claude/WORKFLOW.md:   ${state.hasWorkflow ? chalk.green('✔ exists') : chalk.dim('○ missing')}`);
  console.log(`    .claude/agents/:       ${state.existingAgents.length > 0 ? chalk.green(`✔ ${state.existingAgents.length} agents`) : chalk.dim('○ none')}`);

  if (state.existingAgents.length > 0) {
    console.log(chalk.dim(`      ${state.existingAgents.join(', ')}`));
  }

  // ── 6. Calculate changes ──────────────────────────────────────────
  const newAgents = config.agents.filter(a => !state.existingAgents.includes(a.slug));
  const existingAgents = config.agents.filter(a => state.existingAgents.includes(a.slug));
  const customAgents = state.existingAgents.filter(
    slug => !config.agents.find(a => a.slug === slug),
  );

  console.log(chalk.bold('\n  Changes to apply:\n'));
  console.log(`    ${chalk.cyan('↻')} CLAUDE.md — will be regenerated`);
  console.log(`    ${chalk.cyan('↻')} .claude/WORKFLOW.md — will be regenerated`);

  if (!state.hasSettings) {
    console.log(`    ${chalk.green('+')} .claude/settings.json — will be created`);
  } else {
    console.log(`    ${chalk.dim('=')} .claude/settings.json — preserved (already exists)`);
  }

  if (newAgents.length > 0) {
    for (const agent of newAgents) {
      console.log(`    ${chalk.green('+')} .claude/agents/${agent.slug}.md — new agent`);
    }
  }

  if (existingAgents.length > 0) {
    for (const agent of existingAgents) {
      if (options.force) {
        console.log(`    ${chalk.yellow('↻')} .claude/agents/${agent.slug}.md — will be overwritten (--force)`);
      } else {
        console.log(`    ${chalk.dim('=')} .claude/agents/${agent.slug}.md — preserved (customizations kept)`);
      }
    }
  }

  if (customAgents.length > 0) {
    for (const slug of customAgents) {
      console.log(`    ${chalk.blue('⊕')} .claude/agents/${slug}.md — user-created (preserved)`);
    }
  }

  // ── 7. Confirm ────────────────────────────────────────────────────
  const { proceed } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'proceed',
      message: '\nApply changes?',
      default: true,
    },
  ]);

  if (!proceed) {
    console.log(chalk.red('\n  ✖ Update cancelled.'));
    return;
  }

  // ── 8. Apply changes ─────────────────────────────────────────────
  await generateUpdate(config, {
    force: options.force || false,
    existingAgents: state.existingAgents,
    hasSettings: state.hasSettings,
  });
}

// ── Helpers ───────────────────────────────────────────────────────────

/**
 * Detect what DevCrew files already exist in the workspace.
 *
 * @param {string} cwd - Current working directory
 * @returns {{ hasClaudeMd: boolean, hasSettings: boolean, hasWorkflow: boolean, existingAgents: string[] }}
 */
function detectCurrentState(cwd) {
  const claudeDir = resolve(cwd, '.claude');
  const agentsDir = resolve(claudeDir, 'agents');

  return {
    hasClaudeMd: existsSync(resolve(cwd, 'CLAUDE.md')),
    hasSettings: existsSync(resolve(claudeDir, 'settings.json')),
    hasWorkflow: existsSync(resolve(claudeDir, 'WORKFLOW.md')),
    existingAgents: existsSync(agentsDir)
      ? readdirSync(agentsDir)
          .filter(f => f.endsWith('.md'))
          .map(f => f.replace('.md', ''))
      : [],
  };
}

/**
 * Transform project.yaml structure into the internal config format
 * expected by all generators.
 *
 * @param {object} projectConfig - Parsed project.yaml content
 * @param {string} cwd - Current working directory
 * @returns {object} Internal config object
 */
function buildConfigFromYaml(projectConfig, cwd) {
  return {
    mode: 'update',
    cwd,
    project: {
      name: projectConfig.project.name,
      organization: projectConfig.project.organization,
      description: projectConfig.project.description,
      context: projectConfig.project.context || {
        confluenceUrl: null,
        extracted: [],
        manual: '',
        files: [],
        businessRules: '',
        technicalRules: '',
      },
    },
    repos: projectConfig.repos || [],
    conventions: {
      defaultBranch: projectConfig.conventions?.default_branch || 'develop',
      commitFormat: projectConfig.conventions?.commit_format || 'conventional',
      codingStandards: projectConfig.conventions?.coding_standards || [],
      testStrategy: projectConfig.conventions?.test_strategy || 'unit + integration',
    },
    agents: (projectConfig.agents || []).map(a => ({
      name: a.name,
      slug: a.slug,
      description: a.description,
      role: a.role || 'executor',
      color: a.color || '#8E8E93',
    })),
  };
}

/**
 * Run generators selectively based on what needs updating.
 *
 * @param {object} config - Internal config object
 * @param {object} opts
 * @param {boolean} opts.force - Overwrite existing agent files
 * @param {string[]} opts.existingAgents - Slugs of agents already on disk
 * @param {boolean} opts.hasSettings - Whether settings.json already exists
 */
async function generateUpdate(config, opts) {
  const spinner = ora({ prefixText: '  ' });

  // Always regenerate CLAUDE.md
  spinner.start('Updating CLAUDE.md');
  await generateClaudeMd(config);
  spinner.succeed('CLAUDE.md updated');

  // Always regenerate WORKFLOW.md
  spinner.start('Updating .claude/WORKFLOW.md');
  await generateWorkflow(config);
  spinner.succeed('.claude/WORKFLOW.md updated');

  // Settings — only if missing
  if (!opts.hasSettings) {
    spinner.start('Creating .claude/settings.json');
    await generateSettings(config);
    spinner.succeed('.claude/settings.json created');
  }

  // Agents — smart merge
  spinner.start('Updating agents');
  await generateAgentsSelective(config, opts);
  spinner.succeed('Agents updated');

  // Maestri — update workspace
  spinner.start('Updating Maestri workspace');
  await generateMaestriWorkspace(config);
  spinner.succeed('Maestri workspace updated');

  console.log('');
  console.log(chalk.green.bold('  ✅ DevCrew update complete!'));
  console.log('');
}

/**
 * Generate only new agents (unless --force overwrites all).
 *
 * - force=true  → regenerate every agent defined in project.yaml
 * - force=false → only generate agents whose slug doesn't exist on disk
 * - User-created agents (on disk but not in project.yaml) are never touched
 *
 * @param {object} config - Internal config object
 * @param {object} opts
 * @param {boolean} opts.force
 * @param {string[]} opts.existingAgents
 */
async function generateAgentsSelective(config, opts) {
  if (opts.force) {
    // Force mode: regenerate all agents from project.yaml
    await generateAgents(config);
    return;
  }

  // Selective mode: only generate agents that don't exist yet
  const newAgents = config.agents.filter(a => !opts.existingAgents.includes(a.slug));

  if (newAgents.length === 0) {
    return; // Nothing new to generate
  }

  // Create a modified config with only new agents
  const newConfig = { ...config, agents: newAgents };
  await generateAgents(newConfig);
}
