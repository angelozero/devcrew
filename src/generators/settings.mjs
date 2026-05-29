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
    // Disable plugins that conflict with Maestri-based agent delegation.
    // The superpowers plugin's "subagent-driven-development" skill overrides
    // the Tech Lead's pipeline by using Claude Code's Task tool instead of
    // Maestri's inter-terminal communication (maestri ask).
    enabledPlugins: {
      'superpowers@claude-plugins-official': false,
    },
  };

  if (opts.dryRun) {
    return { preview: outputPath };
  }

  mkdirSync(claudeDir, { recursive: true });
  writeFileSync(outputPath, JSON.stringify(settings, null, 2) + '\n', 'utf-8');
  return { path: outputPath };
}
