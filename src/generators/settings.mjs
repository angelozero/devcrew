/**
 * Generates .claude/settings.json — Claude Code project-level settings
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * @param {object} config - Configuration from wizard
 * @param {object} opts - { dryRun: boolean }
 */
export async function generateSettings(config, opts = {}) {
  const claudeDir = resolve(config.cwd, '.claude');
  const outputPath = resolve(claudeDir, 'settings.json');

  const settings = {
    permissions: {
      allow: [
        'Bash(*)',
        'Edit(*)',
        'Write(*)',
        'Read(*)',
        'Grep(*)',
        'Glob(*)',
        'WebFetch(*)',
        'TodoRead(*)',
        'TodoWrite(*)',
      ],
    },
  };

  if (opts.dryRun) {
    return { preview: outputPath };
  }

  mkdirSync(claudeDir, { recursive: true });
  writeFileSync(outputPath, JSON.stringify(settings, null, 2) + '\n', 'utf-8');
  return { path: outputPath };
}
