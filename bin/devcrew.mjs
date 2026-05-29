#!/usr/bin/env node

/**
 * DevCrew CLI — AI Team Setup for Any Project (V1)
 *
 * Usage:
 *   devcrew init [--dry-run]   Scaffold an AI-powered dev team (auto-detects repo)
 *   devcrew update [--force]   Re-scan repo and update workspace
 *   devcrew status             Show current DevCrew configuration
 */

import { createRequire } from 'node:module';
import { Command } from 'commander';
import { init } from '../src/commands/init.mjs';
import { status } from '../src/commands/status.mjs';

const require = createRequire(import.meta.url);
const pkg = require('../package.json');

const program = new Command();

program
  .name('devcrew')
  .description('AI Team Setup for Any Project — scaffold an AI-powered development team with one command')
  .version(pkg.version);

program
  .command('init')
  .description('Initialize DevCrew in the current project (auto-detects repo info)')
  .option('-d, --dry-run', 'Preview what would be generated without writing files')
  .action(async (opts) => {
    await init({ dryRun: opts.dryRun });
  });

program
  .command('status')
  .description('Show current DevCrew configuration status')
  .action(async () => {
    await status();
  });

program
  .command('update')
  .description('Re-scan repo and update DevCrew workspace (preserves agent customizations)')
  .option('-f, --force', 'Overwrite existing agent files (ignores customizations)')
  .action(async (opts) => {
    const { update } = await import('../src/commands/update.mjs');
    await update({ force: opts.force });
  });

program.parse();
