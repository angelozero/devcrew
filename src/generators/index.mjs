/**
 * Generator orchestrator — runs all generators in sequence
 */

import chalk from 'chalk';
import ora from 'ora';
import { generateProjectYaml } from './project-yaml.mjs';
import { generateClaudeMd } from './claude-md.mjs';
import { generateSettings } from './settings.mjs';
import { generateWorkflow } from './workflow.mjs';
import { generateAgents } from './agents.mjs';
import { generateMaestriWorkspace } from './maestri.mjs';

/**
 * Run all generators based on the config from the wizard
 *
 * @param {object} config - Configuration from wizard
 * @param {object} opts - Options { dryRun: boolean }
 */
export async function generate(config, opts = {}) {
  const { dryRun } = opts;
  const steps = [];

  // Architect mode generates project.yaml
  if (config.mode === 'architect' || config.mode === 'standalone') {
    steps.push({
      label: 'project.yaml',
      fn: () => generateProjectYaml(config, { dryRun }),
    });
  }

  steps.push(
    {
      label: 'CLAUDE.md',
      fn: () => generateClaudeMd(config, { dryRun }),
    },
    {
      label: '.claude/settings.json',
      fn: () => generateSettings(config, { dryRun }),
    },
    {
      label: '.claude/WORKFLOW.md',
      fn: () => generateWorkflow(config, { dryRun }),
    },
    {
      label: `.claude/agents/ (${config.agents.length} agents)`,
      fn: () => generateAgents(config, { dryRun }),
    },
    {
      label: 'Maestri workspace',
      fn: () => generateMaestriWorkspace(config, { dryRun }),
    },
  );

  console.log(chalk.bold('\n📦 Generating files...\n'));

  for (const step of steps) {
    const spinner = ora({ text: step.label, prefixText: '  ' }).start();
    try {
      const result = await step.fn();
      if (dryRun) {
        spinner.info(chalk.dim(`${step.label} (dry run — would generate)`));
        if (result?.preview) {
          console.log(chalk.dim(`    → ${result.preview}`));
        }
      } else {
        spinner.succeed(step.label);
      }
    } catch (err) {
      spinner.fail(`${step.label}: ${err.message}`);
    }
  }

  console.log('');
  if (dryRun) {
    console.log(chalk.yellow('  🔍 Dry run complete — no files were written.'));
  } else {
    console.log(chalk.green.bold('  ✅ DevCrew setup complete!'));
    console.log('');
    console.log(chalk.dim('  Next steps:'));
    if (config.mode === 'architect') {
      console.log(chalk.dim('    1. Review and enrich the generated CLAUDE.md'));
      console.log(chalk.dim('    2. Commit project.yaml to your repo'));
      console.log(chalk.dim('    3. Share with your team — they run: devcrew init'));
      console.log(chalk.dim('    4. Open Maestri to start working with your AI team'));
    } else {
      console.log(chalk.dim('    1. Open Maestri to start working with your AI team'));
      console.log(chalk.dim('    2. Click on the Tech Lead terminal to begin'));
    }
  }
  console.log('');
}
