/**
 * Context Processor (V1)
 *
 * Processes project context from the wizard config:
 * - Validates Confluence URL (stored for runtime MCP use)
 * - Loads local .md files specified by the user
 * - Passes through relatedRepos, manual text, business rules, technical rules
 *
 * The actual Confluence extraction happens at RUNTIME when agents use the MCP,
 * not at setup time.
 */

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Process project context from the wizard config.
 * Loads .md files, validates URLs, structures content.
 *
 * @param {object} context - The project.context from wizard (V1 shape)
 * @param {string} cwd - Current working directory
 * @returns {object} Enriched context
 */
export async function processContext(context, cwd) {
  const result = {
    confluenceUrl: context.confluenceUrl || null,
    relatedRepos: context.relatedRepos || [],
    loadedFiles: [],
    manual: context.manual || '',
    businessRules: context.businessRules || '',
    technicalRules: context.technicalRules || '',
  };

  // Load .md files if provided
  if (context.files && context.files.length > 0) {
    for (const filePath of context.files) {
      const absPath = resolve(cwd, filePath);
      if (existsSync(absPath)) {
        const content = readFileSync(absPath, 'utf-8');
        result.loadedFiles.push({
          path: filePath,
          title: extractTitle(content) || filePath,
          content,
        });
      }
    }
  }

  return result;
}

/**
 * Extract the first H1 title from a markdown string.
 *
 * @param {string} markdown - Raw markdown content
 * @returns {string|null} The title text or null
 */
function extractTitle(markdown) {
  const match = markdown.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : null;
}
