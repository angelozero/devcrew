#!/usr/bin/env node

/**
 * DevCrew CLI — AI Team Setup for Any Project
 *
 * Usage:
 *   devcrew init [--architect] [--dry-run]   Scaffold an AI-powered dev team
 *   devcrew status                           Show current DevCrew configuration
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
  .description('Initialize DevCrew in the current project')
  .option('-a, --architect', 'Run in Architect / Tech Lead mode (pioneer)')
  .option('-d, --dry-run', 'Preview what would be generated without writing files')
  .action(async (opts) => {
    await init({ architect: opts.architect, dryRun: opts.dryRun });
  });

program
  .command('status')
  .description('Show current DevCrew configuration status')
  .action(async () => {
    await status();
  });

program.parse();
