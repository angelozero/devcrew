/**
 * repo-scanner.mjs — Auto-detects project information from the current repo
 *
 * DevCrew V1: "Convention over configuration"
 * Scans the repo and returns everything it can detect automatically.
 * The wizard only asks for what cannot be inferred.
 *
 * Detection strategy (in priority order):
 *   1. package.json / pom.xml / build.gradle / requirements.txt / Cargo.toml / go.mod
 *   2. README.md / ARCHITECTURE.md
 *   3. Lock files (package-lock.json, yarn.lock, pnpm-lock.yaml, etc.)
 *   4. Config files (.eslintrc, .prettierrc, tsconfig.json, .editorconfig)
 *   5. Test files / directories
 *   6. Git (current branch)
 *   7. Directory name as final fallback
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve, basename } from 'node:path';
import { execSync } from 'node:child_process';

/**
 * Scan the current repo and return detected project information.
 *
 * @param {string} cwd - Current working directory
 * @returns {object} Detected project info with confidence levels
 */
export async function scanRepo(cwd) {
  const detected = {
    name: null,
    description: null,
    stack: null,
    packageManager: null,
    defaultBranch: null,
    hasTests: false,
    testFramework: null,
    detectedStandards: [],
    architectureDoc: null,
    readmeContent: null,
  };

  // ── 1. Read package.json (Node.js projects) ──────────────────────
  const pkgPath = resolve(cwd, 'package.json');
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
      detected.name = pkg.name || null;
      detected.description = pkg.description || null;

      // Detect stack from dependencies
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      detected.stack = detectNodeStack(deps);

      // Detect test framework
      const testInfo = detectTestFramework(deps, cwd);
      detected.hasTests = testInfo.hasTests;
      detected.testFramework = testInfo.framework;

      // Detect coding standards from devDependencies
      detected.detectedStandards = detectCodingStandards(deps, cwd);
    } catch {
      // Malformed package.json — skip
    }
  }

  // ── 2. Read pom.xml (Java/Maven) ─────────────────────────────────
  if (!detected.stack && existsSync(resolve(cwd, 'pom.xml'))) {
    detected.stack = detectJavaStack(cwd, 'maven');
    if (!detected.name) detected.name = extractMavenArtifactId(cwd);
    if (!detected.description) detected.description = extractMavenDescription(cwd);
  }

  // ── 3. Read build.gradle (Java/Gradle) ───────────────────────────
  if (!detected.stack && existsSync(resolve(cwd, 'build.gradle'))) {
    detected.stack = detectJavaStack(cwd, 'gradle');
  }
  if (!detected.stack && existsSync(resolve(cwd, 'build.gradle.kts'))) {
    detected.stack = detectJavaStack(cwd, 'gradle');
  }

  // ── 4. Python ─────────────────────────────────────────────────────
  if (!detected.stack) {
    if (existsSync(resolve(cwd, 'requirements.txt')) || existsSync(resolve(cwd, 'pyproject.toml'))) {
      detected.stack = detectPythonStack(cwd);
    }
  }

  // ── 5. Rust ───────────────────────────────────────────────────────
  if (!detected.stack && existsSync(resolve(cwd, 'Cargo.toml'))) {
    detected.stack = 'Rust';
  }

  // ── 6. Go ─────────────────────────────────────────────────────────
  if (!detected.stack && existsSync(resolve(cwd, 'go.mod'))) {
    detected.stack = 'Go';
  }

  // ── 7. Package manager detection ─────────────────────────────────
  detected.packageManager = detectPackageManager(cwd);

  // ── 8. Default branch from git ───────────────────────────────────
  detected.defaultBranch = detectGitBranch(cwd);

  // ── 9. Read README.md ─────────────────────────────────────────────
  const readmePath = resolve(cwd, 'README.md');
  if (existsSync(readmePath)) {
    const readmeContent = readFileSync(readmePath, 'utf-8');
    detected.readmeContent = readmeContent;

    // Use README description if not found in package.json
    if (!detected.description) {
      detected.description = extractReadmeDescription(readmeContent);
    }

    // Use README title as name fallback
    if (!detected.name) {
      detected.name = extractReadmeTitle(readmeContent);
    }
  }

  // ── 10. Read ARCHITECTURE.md ──────────────────────────────────────
  const archPath = resolve(cwd, 'ARCHITECTURE.md');
  if (existsSync(archPath)) {
    detected.architectureDoc = readFileSync(archPath, 'utf-8');

    // Use architecture overview as description if still missing
    if (!detected.description) {
      detected.description = extractArchitectureOverview(detected.architectureDoc);
    }
  }

  // ── 11. Directory name as final fallback ──────────────────────────
  if (!detected.name) {
    detected.name = basename(cwd);
  }

  return detected;
}

/* ================================================================
 * Stack detection helpers
 * ================================================================ */

function detectNodeStack(deps) {
  const frameworks = [];

  // Frontend frameworks
  if (deps['react'] || deps['react-dom']) frameworks.push('React');
  if (deps['vue'] || deps['@vue/core']) frameworks.push('Vue.js');
  if (deps['@angular/core']) frameworks.push('Angular');
  if (deps['svelte']) frameworks.push('Svelte');
  if (deps['next']) frameworks.push('Next.js');
  if (deps['nuxt'] || deps['nuxt3']) frameworks.push('Nuxt.js');
  if (deps['gatsby']) frameworks.push('Gatsby');

  // Backend frameworks
  if (deps['express']) frameworks.push('Express');
  if (deps['fastify']) frameworks.push('Fastify');
  if (deps['koa']) frameworks.push('Koa');
  if (deps['hapi'] || deps['@hapi/hapi']) frameworks.push('Hapi');
  if (deps['nestjs'] || deps['@nestjs/core']) frameworks.push('NestJS');

  // Templating
  if (deps['ejs']) frameworks.push('EJS');
  if (deps['pug']) frameworks.push('Pug');
  if (deps['handlebars']) frameworks.push('Handlebars');

  // TypeScript
  const hasTypeScript = deps['typescript'] || deps['ts-node'];

  // Database
  if (deps['mongoose'] || deps['mongodb']) frameworks.push('MongoDB');
  if (deps['pg'] || deps['postgres']) frameworks.push('PostgreSQL');
  if (deps['mysql'] || deps['mysql2']) frameworks.push('MySQL');
  if (deps['sequelize']) frameworks.push('Sequelize');
  if (deps['prisma'] || deps['@prisma/client']) frameworks.push('Prisma');
  if (deps['typeorm']) frameworks.push('TypeORM');

  const base = hasTypeScript ? 'Node.js + TypeScript' : 'Node.js';

  if (frameworks.length === 0) return base;
  return `${base} + ${frameworks.join(' + ')}`;
}

function detectJavaStack(cwd, buildTool) {
  const frameworks = [];

  // Check pom.xml for Spring
  const pomPath = resolve(cwd, 'pom.xml');
  if (existsSync(pomPath)) {
    const pom = readFileSync(pomPath, 'utf-8');
    if (pom.includes('spring-boot')) frameworks.push('Spring Boot');
    else if (pom.includes('spring')) frameworks.push('Spring');
    if (pom.includes('quarkus')) frameworks.push('Quarkus');
    if (pom.includes('micronaut')) frameworks.push('Micronaut');
  }

  const buildTool_ = buildTool === 'maven' ? 'Maven' : 'Gradle';
  const base = `Java + ${buildTool_}`;
  if (frameworks.length === 0) return base;
  return `${base} + ${frameworks.join(' + ')}`;
}

function detectPythonStack(cwd) {
  const frameworks = [];

  const reqPath = resolve(cwd, 'requirements.txt');
  if (existsSync(reqPath)) {
    const req = readFileSync(reqPath, 'utf-8').toLowerCase();
    if (req.includes('django')) frameworks.push('Django');
    if (req.includes('flask')) frameworks.push('Flask');
    if (req.includes('fastapi')) frameworks.push('FastAPI');
    if (req.includes('langchain')) frameworks.push('LangChain');
    if (req.includes('sqlalchemy')) frameworks.push('SQLAlchemy');
  }

  const pyprojectPath = resolve(cwd, 'pyproject.toml');
  if (existsSync(pyprojectPath)) {
    const pyproject = readFileSync(pyprojectPath, 'utf-8').toLowerCase();
    if (pyproject.includes('django')) frameworks.push('Django');
    if (pyproject.includes('flask')) frameworks.push('Flask');
    if (pyproject.includes('fastapi')) frameworks.push('FastAPI');
    if (pyproject.includes('langchain')) frameworks.push('LangChain');
  }

  const base = 'Python';
  if (frameworks.length === 0) return base;
  return `${base} + ${[...new Set(frameworks)].join(' + ')}`;
}

/* ================================================================
 * Package manager detection
 * ================================================================ */

function detectPackageManager(cwd) {
  if (existsSync(resolve(cwd, 'pnpm-lock.yaml'))) return 'pnpm';
  if (existsSync(resolve(cwd, 'yarn.lock'))) return 'yarn';
  if (existsSync(resolve(cwd, 'package-lock.json'))) return 'npm';
  if (existsSync(resolve(cwd, 'bun.lockb'))) return 'bun';
  if (existsSync(resolve(cwd, 'pom.xml'))) return 'maven';
  if (existsSync(resolve(cwd, 'build.gradle')) || existsSync(resolve(cwd, 'build.gradle.kts'))) return 'gradle';
  if (existsSync(resolve(cwd, 'Pipfile'))) return 'pipenv';
  if (existsSync(resolve(cwd, 'poetry.lock'))) return 'poetry';
  if (existsSync(resolve(cwd, 'requirements.txt'))) return 'pip';
  if (existsSync(resolve(cwd, 'Cargo.toml'))) return 'cargo';
  if (existsSync(resolve(cwd, 'go.mod'))) return 'go modules';
  return null;
}

/* ================================================================
 * Test detection
 * ================================================================ */

function detectTestFramework(deps, cwd) {
  const frameworks = [];

  if (deps['jest'] || deps['@jest/core']) frameworks.push('Jest');
  if (deps['vitest']) frameworks.push('Vitest');
  if (deps['mocha']) frameworks.push('Mocha');
  if (deps['jasmine']) frameworks.push('Jasmine');
  if (deps['ava']) frameworks.push('Ava');
  if (deps['tap']) frameworks.push('Tap');
  if (deps['@playwright/test']) frameworks.push('Playwright');
  if (deps['cypress']) frameworks.push('Cypress');
  if (deps['supertest']) frameworks.push('Supertest');

  // Check for test directories
  const testDirs = ['test', 'tests', '__tests__', 'spec', 'e2e'];
  const hasTestDir = testDirs.some((dir) => existsSync(resolve(cwd, dir)));

  // Check for test files in src
  let hasTestFiles = false;
  try {
    const srcPath = resolve(cwd, 'src');
    if (existsSync(srcPath)) {
      hasTestFiles = findTestFiles(srcPath);
    }
    if (!hasTestFiles) {
      hasTestFiles = findTestFiles(cwd, 1); // shallow check at root
    }
  } catch {
    // ignore
  }

  const hasTests = frameworks.length > 0 || hasTestDir || hasTestFiles;

  return {
    hasTests,
    framework: frameworks.length > 0 ? frameworks.join(' + ') : (hasTests ? 'custom' : null),
  };
}

function findTestFiles(dir, maxDepth = 3, currentDepth = 0) {
  if (currentDepth > maxDepth) return false;
  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
      if (entry.isFile()) {
        if (/\.(test|spec)\.(js|ts|mjs|cjs|jsx|tsx)$/.test(entry.name)) return true;
      } else if (entry.isDirectory() && currentDepth < maxDepth) {
        if (findTestFiles(resolve(dir, entry.name), maxDepth, currentDepth + 1)) return true;
      }
    }
  } catch {
    // ignore
  }
  return false;
}

/* ================================================================
 * Coding standards detection
 * ================================================================ */

function detectCodingStandards(deps, cwd) {
  const standards = [];

  if (deps['eslint'] || existsSync(resolve(cwd, '.eslintrc')) || existsSync(resolve(cwd, '.eslintrc.js')) || existsSync(resolve(cwd, '.eslintrc.json')) || existsSync(resolve(cwd, '.eslintrc.yml'))) {
    standards.push('ESLint');
  }
  if (deps['prettier'] || existsSync(resolve(cwd, '.prettierrc')) || existsSync(resolve(cwd, '.prettierrc.js')) || existsSync(resolve(cwd, '.prettierrc.json'))) {
    standards.push('Prettier');
  }
  if (deps['typescript'] || existsSync(resolve(cwd, 'tsconfig.json'))) {
    standards.push('TypeScript');
  }
  if (existsSync(resolve(cwd, '.editorconfig'))) {
    standards.push('EditorConfig');
  }

  return standards;
}

/* ================================================================
 * Git detection
 * ================================================================ */

function detectGitBranch(cwd) {
  try {
    const branch = execSync('git rev-parse --abbrev-ref HEAD', {
      cwd,
      stdio: ['pipe', 'pipe', 'pipe'],
      encoding: 'utf-8',
    }).trim();
    if (branch && branch !== 'HEAD') return branch;
  } catch {
    // Not a git repo or git not available
  }

  // Try to detect default branch from remote
  try {
    const ref = execSync('git symbolic-ref refs/remotes/origin/HEAD', {
      cwd,
      stdio: ['pipe', 'pipe', 'pipe'],
      encoding: 'utf-8',
    }).trim();
    const match = ref.match(/refs\/remotes\/origin\/(.+)/);
    if (match) return match[1];
  } catch {
    // ignore
  }

  return null;
}

/* ================================================================
 * README / ARCHITECTURE.md parsing
 * ================================================================ */

function extractReadmeTitle(content) {
  const match = content.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : null;
}

function extractReadmeDescription(content) {
  // Skip the H1 title line, then find the first non-empty paragraph
  const lines = content.split('\n');
  let pastTitle = false;
  let description = '';

  for (const line of lines) {
    if (!pastTitle) {
      if (line.startsWith('# ')) {
        pastTitle = true;
      }
      continue;
    }

    const trimmed = line.trim();
    if (trimmed.length === 0) {
      if (description.length > 0) break; // End of first paragraph
      continue;
    }

    // Skip badges, HTML, and headings
    if (trimmed.startsWith('![') || trimmed.startsWith('<') || trimmed.startsWith('#') || trimmed.startsWith('[![')) {
      continue;
    }

    description += (description ? ' ' : '') + trimmed;
    if (description.length > 200) break;
  }

  return description.trim() || null;
}

function extractArchitectureOverview(content) {
  // Look for "Overview" section
  const overviewMatch = content.match(/##\s+\d*\.?\s*Overview\s*\n+([\s\S]+?)(?=\n##|\n---|\n\*\*\*|$)/i);
  if (overviewMatch) {
    return overviewMatch[1].trim().split('\n')[0].trim();
  }
  return null;
}

function extractMavenArtifactId(cwd) {
  try {
    const pom = readFileSync(resolve(cwd, 'pom.xml'), 'utf-8');
    const match = pom.match(/<artifactId>([^<]+)<\/artifactId>/);
    return match ? match[1].trim() : null;
  } catch {
    return null;
  }
}

function extractMavenDescription(cwd) {
  try {
    const pom = readFileSync(resolve(cwd, 'pom.xml'), 'utf-8');
    const match = pom.match(/<description>([^<]+)<\/description>/);
    return match ? match[1].trim() : null;
  } catch {
    return null;
  }
}
