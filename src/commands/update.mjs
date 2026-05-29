/**
 * devcrew update — Re-scan repo and update DevCrew workspace (V1)
 *
 * V1 model: No project.yaml. Re-scans the repo to detect changes,
 * then selectively updates generated files.
 *
 * Behavior:
 *   - CLAUDE.md          → always regenerated
 *   - .claude/WORKFLOW.md → always regenerated
 *   - .claude/settings.json → only created if missing
 *   - .claude/agents/     → smart merge (new agents added, existing preserved)
 *   - Maestri workspace   → updated with current agent list
 */

import { existsSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import { scanRepo } from '../scanner/repo-scanner.mjs';
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

  console.log(chalk.bold.cyan('\n🔄 DevCrew Update\n'));

  // ── 1. Check DevCrew is initialized ──────────────────────────────
  const claudeMdPath = resolve(cwd, 'CLAUDE.md');
  if (!existsSync(claudeMdPath)) {
    console.log(chalk.red('  ✖ DevCrew is not initialized in this directory.'));
    console.log(chalk.dim('  Run: devcrew init'));
    return;
  }

  // ── 2. Re-scan the repo ───────────────────────────────────────────
  console.log(chalk.dim('  Re-scanning your repository...\n'));
  const detected = await scanRepo(cwd);

  // ── 3. Detect current state ───────────────────────────────────────
  const state = detectCurrentState(cwd);

  // ── 4. Show current state ─────────────────────────────────────────
  console.log(chalk.bold('  Current workspace state:\n'));
  console.log(`    CLAUDE.md:             ${state.hasClaudeMd ? chalk.green('✔ exists') : chalk.dim('○ missing')}`);
  console.log(`    .claude/settings.json: ${state.hasSettings ? chalk.green('✔ exists') : chalk.dim('○ missing')}`);
  console.log(`    .claude/WORKFLOW.md:   ${state.hasWorkflow ? chalk.green('✔ exists') : chalk.dim('○ missing')}`);
  console.log(`    .claude/agents/:       ${state.existingAgents.length > 0 ? chalk.green(`✔ ${state.existingAgents.length} agents`) : chalk.dim('○ none')}`);

  if (state.existingAgents.length > 0) {
    console.log(chalk.dim(`      ${state.existingAgents.join(', ')}`));
  }

  // ── 5. Show what was detected ─────────────────────────────────────
  console.log(chalk.bold('\n  Re-scan results:\n'));
  if (detected.name) console.log(`    Project:       ${detected.name}`);
  if (detected.stack) console.log(`    Stack:         ${detected.stack}`);
  if (detected.packageManager) console.log(`    Pkg manager:   ${detected.packageManager}`);
  if (detected.defaultBranch) console.log(`    Branch:        ${detected.defaultBranch}`);

  // ── 6. Show changes to apply ──────────────────────────────────────
  console.log(chalk.bold('\n  Changes to apply:\n'));
  console.log(`    ${chalk.cyan('↻')} CLAUDE.md — will be regenerated`);
  console.log(`    ${chalk.cyan('↻')} .claude/WORKFLOW.md — will be regenerated`);

  if (!state.hasSettings) {
    console.log(`    ${chalk.green('+')} .claude/settings.json — will be created`);
  } else {
    console.log(`    ${chalk.dim('=')} .claude/settings.json — preserved (already exists)`);
  }

  if (state.existingAgents.length > 0) {
    for (const slug of state.existingAgents) {
      if (options.force) {
        console.log(`    ${chalk.yellow('↻')} .claude/agents/${slug}.md — will be overwritten (--force)`);
      } else {
        console.log(`    ${chalk.dim('=')} .claude/agents/${slug}.md — preserved (customizations kept)`);
      }
    }
  }

  console.log(`    ${chalk.cyan('↻')} Maestri workspace — will be updated`);

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

  // ── 8. Build a minimal config from detected info ──────────────────
  // We need a config object for the generators. Since there's no project.yaml,
  // we reconstruct from what's on disk + what was detected.
  const config = await buildConfigFromDisk(cwd, detected, state);

  // ── 9. Apply changes ──────────────────────────────────────────────
  await applyUpdate(config, {
    force: options.force || false,
    existingAgents: state.existingAgents,
    hasSettings: state.hasSettings,
  });
}

// ── Helpers ───────────────────────────────────────────────────────────

/**
 * Detect what DevCrew files already exist in the workspace.
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
          .filter((f) => f.endsWith('.md'))
          .map((f) => f.replace('.md', ''))
      : [],
  };
}

/**
 * Build a config object from what's on disk + detected info.
 * Reads agent slugs from .claude/agents/ to reconstruct the agents list.
 */
async function buildConfigFromDisk(cwd, detected, state) {
  // Reconstruct agents from existing agent files
  const agents = state.existingAgents.map((slug) => ({
    name: slugToName(slug),
    slug,
    description: '',
    role: inferRole(slug),
    color: inferColor(slug),
  }));

  return {
    cwd,
    project: {
      name: detected.name || 'Unknown Project',
      description: detected.description || '',
      context: {
        confluenceUrl: null,
        relatedRepos: [],
        manual: '',
        files: [],
        businessRules: '',
        technicalRules: '',
      },
    },
    repo: {
      stack: detected.stack || '',
      packageManager: detected.packageManager || null,
      hasTests: detected.hasTests,
      testFramework: detected.testFramework,
      detectedStandards: detected.detectedStandards,
    },
    conventions: {
      defaultBranch: detected.defaultBranch || 'main',
      commitFormat: 'conventional',
      codingStandards: detected.detectedStandards,
      testStrategy: detected.hasTests
        ? (detected.testFramework ? `${detected.testFramework} — unit + integration` : 'unit + integration')
        : 'unit + integration',
    },
    agents,
  };
}

/**
 * Run generators selectively based on what needs updating.
 */
async function applyUpdate(config, opts) {
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

  // Agents — smart merge (only regenerate if --force)
  if (opts.force) {
    spinner.start('Regenerating agents (--force)');
    await generateAgents(config);
    spinner.succeed('Agents regenerated');
  } else {
    spinner.info(chalk.dim('Agents preserved (use --force to overwrite)'));
  }

  // Maestri — update workspace
  spinner.start('Updating Maestri workspace');
  await generateMaestriWorkspace(config);
  spinner.succeed('Maestri workspace updated');

  console.log('');
  console.log(chalk.green.bold('  ✅ DevCrew update complete!'));
  console.log('');
}

/* ================================================================
 * Slug → metadata helpers (for reconstructing agents from disk)
 * ================================================================ */

function slugToName(slug) {
  return slug
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function inferRole(slug) {
  if (slug.includes('lead') || slug.includes('orchestrat')) return 'orchestrator';
  if (slug.includes('dev') || slug.includes('implement') || slug.includes('engineer')) return 'executor';
  if (slug.includes('qa') || slug.includes('po') || slug.includes('guard') || slug.includes('quality') || slug.includes('analyst') || slug.includes('biz') || slug.includes('review')) return 'validator';
  if (slug.includes('devops') || slug.includes('sentinel') || slug.includes('monitor') || slug.includes('watch')) return 'monitor';
  return 'executor';
}

function inferColor(slug) {
  const colorMap = {
    'tech-lead': '#AF52DE',
    'developer': '#007AFF',
    'po': '#FF9500',
    'qa': '#34C759',
    'devops': '#FF3B30',
  };
  return colorMap[slug] || '#8E8E93';
}
