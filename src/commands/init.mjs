/**
 * devcrew init — Main entry point for project setup
 *
 * Routes to architect mode (--architect) or developer mode (default).
 * If project.yaml exists and no --architect flag, uses developer mode.
 * If no project.yaml and no --architect flag, falls back to standalone wizard.
 *
 * V0 model: 1 workspace template with 5 default AI agents.
 * Config uses repos[] (flat), agents[] (with roles), and project.context.
 */

import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import chalk from 'chalk';
import { architectWizard } from '../wizard/architect.mjs';
import { developerWizard } from '../wizard/developer.mjs';
import { generate } from '../generators/index.mjs';

const BANNER = `
${chalk.bold.cyan('🚀 DevCrew')} — AI Team Setup for Any Project
`;

export async function init(options = {}) {
  console.log(BANNER);

  const cwd = process.cwd();
  const projectYamlPath = resolve(cwd, 'project.yaml');
  const hasProjectYaml = existsSync(projectYamlPath);

  let config;

  if (options.architect) {
    // Architect / Tech Lead mode — pioneer mode
    console.log(chalk.yellow('🏗️  Architect Mode') + ' — Define project structure, agents, and generate project.yaml\n');
    config = await architectWizard(cwd);
  } else if (hasProjectYaml) {
    // Developer mode — project.yaml exists
    console.log(chalk.green('👨‍💻 Developer Mode') + ' — Found project.yaml, loading configuration...\n');
    config = await developerWizard(cwd, projectYamlPath);
  } else {
    // Standalone mode — no project.yaml, no --architect
    console.log(chalk.blue('📦 Standalone Mode') + ' — No project.yaml found, starting interactive setup...\n');
    config = await architectWizard(cwd, { standalone: true });
  }

  if (!config) {
    console.log(chalk.red('\n✖ Setup cancelled.'));
    return;
  }

  // Generate all files
  if (options.dryRun) {
    console.log(chalk.yellow('\n🔍 Dry run — showing what would be generated:\n'));
    await generate(config, { dryRun: true });
  } else {
    await generate(config, { dryRun: false });
  }
}
