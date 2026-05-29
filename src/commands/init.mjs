/**
 * devcrew init — Main entry point for project setup (V1)
 *
 * V1 model: "Tool, not process"
 * - Scans the repo automatically (no more Architect/Developer personas)
 * - Presents detected info to the user
 * - Asks only what cannot be inferred
 * - Generates the full workspace in one pass
 *
 * No project.yaml. No --architect flag. Just: devcrew init
 */

import chalk from 'chalk';
import { scanRepo } from '../scanner/repo-scanner.mjs';
import { initWizard } from '../wizard/init-wizard.mjs';
import { generate } from '../generators/index.mjs';

const BANNER = `
${chalk.bold.cyan('🚀 DevCrew')} — AI Team Setup for Any Project
`;

export async function init(options = {}) {
  console.log(BANNER);

  const cwd = process.cwd();

  // ── 1. Scan the repo ──────────────────────────────────────────────
  console.log(chalk.dim('  Scanning your repository...\n'));
  const detected = await scanRepo(cwd);

  // ── 2. Run the wizard (minimal questions) ─────────────────────────
  const config = await initWizard(cwd, detected);

  if (!config) {
    console.log(chalk.red('\n✖ Setup cancelled.'));
    return;
  }

  // ── 3. Generate all files ─────────────────────────────────────────
  if (options.dryRun) {
    console.log(chalk.yellow('\n🔍 Dry run — showing what would be generated:\n'));
    await generate(config, { dryRun: true });
  } else {
    await generate(config, { dryRun: false });
  }
}
