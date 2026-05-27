/**
 * devcrew status — Show current DevCrew configuration
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import chalk from 'chalk';

export async function status() {
  const cwd = process.cwd();

  console.log(chalk.bold.cyan('\n🚀 DevCrew Status\n'));

  // Check project.yaml
  const projectYamlPath = resolve(cwd, 'project.yaml');
  if (existsSync(projectYamlPath)) {
    console.log(chalk.green('  ✔ project.yaml') + chalk.dim(' — project configuration found'));
  } else {
    console.log(chalk.dim('  ○ project.yaml — not found'));
  }

  // Check CLAUDE.md
  const claudeMdPath = resolve(cwd, 'CLAUDE.md');
  if (existsSync(claudeMdPath)) {
    console.log(chalk.green('  ✔ CLAUDE.md') + chalk.dim(' — project context found'));
  } else {
    console.log(chalk.dim('  ○ CLAUDE.md — not found'));
  }

  // Check .claude/settings.json
  const settingsPath = resolve(cwd, '.claude', 'settings.json');
  if (existsSync(settingsPath)) {
    console.log(chalk.green('  ✔ .claude/settings.json') + chalk.dim(' — permissions configured'));
  } else {
    console.log(chalk.dim('  ○ .claude/settings.json — not found'));
  }

  // Check .claude/WORKFLOW.md
  const workflowPath = resolve(cwd, '.claude', 'WORKFLOW.md');
  if (existsSync(workflowPath)) {
    console.log(chalk.green('  ✔ .claude/WORKFLOW.md') + chalk.dim(' — workflow defined'));
  } else {
    console.log(chalk.dim('  ○ .claude/WORKFLOW.md — not found'));
  }

  // Check .claude/agents/
  const agentsDir = resolve(cwd, '.claude', 'agents');
  if (existsSync(agentsDir)) {
    const agents = readdirSync(agentsDir).filter((f) => f.endsWith('.md'));
    console.log(chalk.green(`  ✔ .claude/agents/`) + chalk.dim(` — ${agents.length} agents: ${agents.map((a) => a.replace('.md', '')).join(', ')}`));
  } else {
    console.log(chalk.dim('  ○ .claude/agents/ — not found'));
  }

  // Summary
  const hasAll = existsSync(claudeMdPath) && existsSync(settingsPath) && existsSync(workflowPath) && existsSync(agentsDir);

  console.log('');
  if (hasAll) {
    console.log(chalk.green.bold('  ✅ DevCrew is fully configured!'));
    console.log(chalk.dim('  Open Maestri to start working with your AI team.'));
  } else if (existsSync(projectYamlPath)) {
    console.log(chalk.yellow('  ⚠ project.yaml found but setup incomplete.'));
    console.log(chalk.dim('  Run: devcrew init'));
  } else {
    console.log(chalk.yellow('  ⚠ DevCrew is not configured in this directory.'));
    console.log(chalk.dim('  Run: devcrew init --architect  (to create from scratch)'));
    console.log(chalk.dim('  Run: devcrew init              (if project.yaml exists)'));
  }
  console.log('');
}
