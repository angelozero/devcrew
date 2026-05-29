/**
 * Generator orchestrator — runs all generators in sequence (V1)
 *
 * V1: No project.yaml generator. Single flow for all users.
 */

import chalk from 'chalk';
import ora from 'ora';
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

  const steps = [
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
      longLabel: 'Maestri workspace (launching app & recruiting agents...)',
      fn: () => generateMaestriWorkspace(config, { dryRun }),
    },
  ];

  console.log(chalk.bold('\n📦 Generating files...\n'));

  let maestriResult = null;

  for (const step of steps) {
    const spinner = ora({ text: step.label, prefixText: '  ' }).start();
    try {
      // For long-running steps, update the spinner text
      if (step.longLabel && !dryRun) {
        spinner.text = step.longLabel;
      }

      const result = await step.fn();

      if (dryRun) {
        spinner.info(chalk.dim(`${step.label} (dry run — would generate)`));
        if (result?.preview) {
          console.log(chalk.dim(`    → ${result.preview}`));
        }
      } else if (result?.skipped) {
        // Maestri workspace couldn't be configured
        spinner.warn(chalk.yellow(`${step.label} — skipped`));
        maestriResult = result;
      } else if (result?.recruited) {
        // Maestri workspace configured with recruited agents
        const count = result.recruited.length + 1; // +1 for orchestrator
        spinner.succeed(`Maestri workspace (${count} terminals configured)`);
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
  } else if (maestriResult?.skipped) {
    console.log(chalk.green.bold('  ✅ Agent files generated successfully!'));
    console.log('');
    console.log(chalk.yellow.bold('  ⚠️  Maestri workspace requires a manual step:'));
    console.log('');
    for (const line of maestriResult.message.split('\n')) {
      console.log(chalk.dim(`  ${line}`));
    }
  } else {
    console.log(chalk.green.bold('  ✅ DevCrew setup complete!'));
    console.log('');
    console.log(chalk.dim('  Your AI team is ready in Maestri:'));
    console.log(chalk.dim('    → Tech Lead (orchestrator) connected to all sub-agents'));
    console.log(chalk.dim('    → Click on the Tech Lead terminal to begin'));
  }
  console.log('');
}
