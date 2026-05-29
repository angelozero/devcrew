# DevCrew — Project Context & Decision History

> **Purpose**: This document captures the complete conversation history, design decisions, and rationale behind the DevCrew project. It should be read by any AI agent working on this project to understand the full context of what was built, why, and what decisions were made.

---

## Table of Contents

1. [Product Vision & Origin](#1-product-vision--origin)
2. [Evolution History (Chronological)](#2-evolution-history-chronological)
3. [Key Design Decisions (with Rationale)](#3-key-design-decisions-with-rationale)
4. [Current Architecture](#4-current-architecture)
5. [Tech Stack](#5-tech-stack)
6. [What's NOT Implemented Yet (Future / V1)](#6-whats-not-implemented-yet-future--v1)
7. [User Preferences & Communication Style](#7-user-preferences--communication-style)
8. [Testing Approach](#8-testing-approach)

---

## 1. Product Vision & Origin

DevCrew originated from the **einstein-workflow** project — a Claude Code plugin located at `/Users/angelo/Projects/Template/einstein-workflow/`. The einstein-workflow was a collection of agents, commands, hooks, rules, skills, and worker scripts designed to enhance Claude Code's capabilities within a specific project context.

The goal was to **"productize"** einstein-workflow into a **generic, technology-agnostic AI team setup framework**. Instead of being a static plugin tied to one project, DevCrew would become a CLI tool that any team could use to bootstrap an AI-assisted development workspace — regardless of their tech stack, team size, or project type.

The name **"DevCrew"** was chosen to reflect the concept of assembling an AI development crew that works alongside human developers.

- **Project location**: `/Users/angelo/Projects/Product/devcrew/`
- **Published at**: `github.com/angelozero/devcrew`

---

## 2. Evolution History (Chronological)

### Phase 0: Initial Implementation

The first version was a direct extraction and generalization of einstein-workflow concepts:

- Created the CLI tool using **commander**, **inquirer**, **chalk**, **ora**, and **js-yaml**
- Implemented a **two-persona model**:
  - **Architect** (pioneer) — the Tech Lead who creates the workspace template
  - **Developer** (consumer) — team members who consume the generated `project.yaml`
- Supported **multi-front** configurations with hardcoded roles (`backend-dev`, `frontend-dev`, `mobile-dev`)
- Built **6 generators**:
  1. `project-yaml` — shared configuration file
  2. `claude-md` — project context document for AI agents
  3. `settings` — Claude Code permissions (`.claude/settings.json`)
  4. `workflow` — pipeline and delegation rules
  5. `agents` — individual agent instruction files
  6. `maestri` — Maestri workspace generation with Schema v2
- Maestri workspace generation followed Schema v2 format with terminals, connections, and manifest registration

### Phase 0.5: Fixes

A series of targeted fixes addressed issues discovered after the initial implementation:

- **Fix 1**: Restored the missing `bin/` directory after project transfer from template to product location
- **Fix 2**: Made roles **fully dynamic** — removed hardcoded `AVAILABLE_ROLES` and `STACK_OPTIONS` constants. The wizard now accepts any role or stack the user types, making DevCrew truly technology-agnostic
- **Fix 3**: Reframed the Maestri workspace as an **initial structure that evolves** — not a final, rigid layout. The generated workspace is a starting point that teams customize over time
- **Fix 4**: Created a **bilingual README** — `README.md` in English and `README.pt-BR.md` in Portuguese
- Replaced the Python-focused `.gitignore` (leftover from template) with a proper **Node.js `.gitignore`**

### Phase 1 (V0): Complete Refactor

This was the pivotal phase. The user described a **real-world scenario** that fundamentally changed the entire model:

**The scenario**: A team building AI agents with Python + LangChain. Each developer receives a task from the Tech Lead, and the AI should handle the entire development pipeline automatically — from implementation through testing, validation, PR, deploy monitoring, and promotion.

**The user's key insight** (original quote in Portuguese):

> *"O primeiro prompt de desenvolvimento é do dev, ele pede para criar a solução para a tarefa dele, dali pra frente a IA orquestra tudo sozinha"*
>
> (The first development prompt is from the dev — they ask to create the solution for their task, from there the AI orchestrates everything on its own)

This led to **3 fundamental principles** that now govern the entire project:

1. **Flexible and Evolutive, not Complete** — The workspace is a starting point, not a final product. Teams evolve it as they learn what works.
2. **Dev has Autonomy** — Developers can create their own agents beyond the defaults. The framework doesn't constrain what agents exist.
3. **AI Orchestrates After First Prompt** — One prompt from the human, then AI handles the full pipeline (implementation → validation → review → deploy monitoring).

---

## 3. Key Design Decisions (with Rationale)

### Decision 1: 1 Workspace Template, Not N Workspaces

| Aspect | Detail |
|--------|--------|
| **Before** | The wizard asked "how many developers?" and generated N different workspaces |
| **After** | One workspace template that everyone clones and uses |
| **User's words** | *"O workspace é pra qualquer um do time, não há a necessidade de saber quantos devs"* |
| **Rationale** | The workspace serves anyone on the team. There's no need to know how many developers exist — each person clones the same template and uses it with their own Claude Code instance |

### Decision 2: Agents, Not People

| Aspect | Detail |
|--------|--------|
| **Before** | `team.members[]` represented people (Backend Dev 1, Backend Dev 2) |
| **After** | `agents[]` represents AI agents with roles (Tech Lead, Developer, Business Analyst, Quality Guard, Sentinel) |
| **Rationale** | The workspace is a template. The "members" are AI agents that help ANY human developer, not specific people. A human developer invokes the Tech Lead agent, which then orchestrates the other agents |

### Decision 3: Flat `repos[]`, Not `fronts[].repos[]`

| Aspect | Detail |
|--------|--------|
| **Before** | Repos were nested inside "fronts" (squads/teams) |
| **After** | Flat `repos[]` array at the top level |
| **Rationale** | Simplified model. One workspace can have multiple repos. The concept of "fronts" (squads) was removed because the workspace is team-agnostic — it's a template, not a team-specific configuration |

### Decision 4: 5 Default Agents with Defined Roles

The user approved these 5 agents as the **minimum viable set** for ensuring quality in an automated pipeline:

| Agent | Role Type | Responsibility |
|-------|-----------|----------------|
| **Tech Lead** | `orchestrator` | Receives tasks from human, delegates to other agents, runs the full pipeline |
| **Developer** | `executor` | Implements features, writes tests, handles commits and code changes |
| **Business Analyst** | `validator` | Validates implementation against business rules and requirements |
| **Quality Guard** | `validator` | Reviews code quality, security, test coverage; performs PR review |
| **Sentinel** | `monitor` | Checks develop branch state before PR; monitors CI/CD pipeline logs after deploy |

### Decision 5: 8-Phase Quality Pipeline

The pipeline was designed based on the user's real-world workflow. Each phase has a responsible agent and clear entry/exit criteria:

| Phase | Name | Responsible Agent | Description |
|-------|------|-------------------|-------------|
| 1 | Implementation | Developer | Write code, tests, and documentation |
| 2 | Business Rules Validation | Business Analyst | Verify implementation matches business requirements |
| 3 | Quality Review | Quality Guard | Review code quality, security, test coverage |
| 4 | Branch Verification | Sentinel | Check develop branch for conflicts or issues |
| 5 | Commit Approval | **Human** | Human reviews and approves the commit |
| 6 | PR + Merge | **Human** | Human reviews PR on GitHub and merges |
| 7 | Deploy Monitoring | Sentinel | Monitor CI/CD pipeline logs for errors |
| 8 | Promotion | **Human** + Sentinel | Human validates in environment; Sentinel assists |

### Decision 6: Human Intervention Points

The user defined **exactly** when humans intervene in the automated pipeline. Everything else is handled by AI agents:

| Intervention Point | Description |
|--------------------|-------------|
| **Initial prompt** | Human gives the task to Tech Lead — this is the only "development" prompt |
| **Commit approval** | Human approves after the full validation chain (Biz Analyst → Quality Guard → Sentinel) |
| **PR merge** | Human reviews and merges on GitHub (the review itself is done by Quality Guard) |
| **Post-deploy validation** | Human tests in the deployed environment |
| **Architecture decisions** | AI consults human when facing architectural uncertainty |
| **Infrastructure errors** | Sentinel reports infrastructure issues to human (AI can't fix infra) |

### Decision 7: Confluence Integration in V0

The user insisted on Confluence integration from the very first version:

> *"Essa integração precisa ser uma opção viável para quem for trazer a estrutura inicial, sem isso toda e qualquer informação do projeto será necessária ser informada manualmente"*
>
> (This integration needs to be a viable option for whoever is bringing the initial structure — without it, all project information would need to be entered manually)

**Implementation approach**:
- The Confluence MCP (Model Context Protocol) must be **pre-installed** by the Tech Lead before running DevCrew
- DevCrew stores the Confluence URL and structures context for agents to use at runtime
- **Fallback**: manual context input or loading `.md` files with project documentation
- DevCrew does NOT extract Confluence content at setup time — it stores the URL so agents can query it at runtime via MCP

### Decision 8: `devcrew update` for Evolution

The user emphasized developer autonomy:

> *"O dev ter autonomia para implementação dos agentes que forem necessários além do que ele já vai ter por padrão"*
>
> (The dev should have autonomy to implement whatever agents they need beyond the defaults they already get)

**Implementation**:
- `devcrew update` reads the updated `project.yaml` and applies changes to the workspace
- **Smart merge strategy**:
  - New agents defined in `project.yaml` → created
  - Existing agents that match defaults → preserved (not overwritten)
  - User-created agents (not in `project.yaml`) → **never touched**
- `--force` flag available to overwrite existing agent files when intentional

### Decision 9: Sentinel Combines Two Functions

Instead of creating separate agents for branch checking and CI/CD monitoring, the Sentinel agent handles both:

| Function | Pipeline Phase | What It Does |
|----------|---------------|--------------|
| Branch checking | Phase 4 (before PR) | Checks develop branch for conflicts, failing tests, or issues |
| CI/CD monitoring | Phase 7 (after deploy) | Monitors pipeline logs for errors after merge |

**Error classification by Sentinel**:
- **Infrastructure errors** → Report to human (AI cannot fix infrastructure)
- **Code errors** → Report to Developer agent for automated fix

### Decision 10: Quality Guard Does PR Review

> *"O review deveria ser um agente olhando pra isso e não um humano"*
>
> (The review should be an agent looking at this, not a human)

- **Quality Guard** performs the code review (quality, security, patterns, test coverage)
- The **human** only does the final approve/merge action on GitHub
- This removes the bottleneck of waiting for human code review while maintaining human oversight on the merge decision

---

## 4. Current Architecture

### Project Structure

```
devcrew/
├── bin/devcrew.mjs              — CLI entry point (commander)
├── src/
│   ├── index.mjs                — Public API exports
│   ├── commands/
│   │   ├── init.mjs             — devcrew init (routes to architect/developer wizard)
│   │   ├── status.mjs           — devcrew status (checks generated files)
│   │   └── update.mjs           — devcrew update (smart merge from project.yaml)
│   ├── wizard/
│   │   ├── architect.mjs        — 5-round wizard for Tech Lead
│   │   ├── developer.mjs        — Consumer wizard (reads project.yaml)
│   │   └── validator.mjs        — Input validation utilities
│   ├── context/
│   │   └── confluence.mjs       — Context processor (loads .md files, validates URLs)
│   ├── generators/
│   │   ├── index.mjs            — Orchestrator (runs all generators in sequence)
│   │   ├── project-yaml.mjs     — Generates project.yaml
│   │   ├── claude-md.mjs        — Generates CLAUDE.md (7 sections including pipeline)
│   │   ├── settings.mjs         — Generates .claude/settings.json
│   │   ├── workflow.mjs         — Generates .claude/WORKFLOW.md (pipeline + delegation)
│   │   ├── agents.mjs           — Generates .claude/agents/*.md (template or dynamic)
│   │   └── maestri.mjs          — Generates Maestri workspace + registers in manifest
│   └── templates/
│       └── agents/              — Pre-built agent templates (5 files, ~968 lines total)
│           ├── tech-lead.md     — Orchestrator with full pipeline instructions
│           ├── developer.md     — Executor with implementation checklist
│           ├── biz-analyst.md   — Validator with business rules checklist
│           ├── quality-guard.md — Validator with quality/security review
│           └── sentinel.md      — Monitor with branch check + CI/CD monitoring
├── package.json
├── README.md                    — English
├── README.pt-BR.md              — Portuguese
└── CONTEXT.md                   — This file
```

### Data Model (Config Object)

The central configuration object that flows through the entire system:

```javascript
{
  mode: 'architect' | 'developer' | 'standalone' | 'update',
  cwd: string,                    // Target project directory
  project: {
    name: string,                 // Project name
    organization: string,         // Organization name
    description: string,          // Project description
    context: {
      confluenceUrl: string | null,  // Confluence space URL (for MCP)
      extracted: Array,              // Runtime only, not serialized to YAML
      manual: string,                // Free-text context from user
      files: string[],              // Paths to .md files with project docs
      businessRules: string,         // Business rules description
      technicalRules: string,        // Technical constraints/rules
    },
  },
  repos: Array<{
    name: string,                 // Repository name
    path: string,                 // Relative path
    stack: string,                // Technology stack (free-text)
    package_manager: string,      // Package manager used
  }>,
  conventions: {
    defaultBranch: string,        // e.g., "main" or "develop"
    commitFormat: string,         // e.g., "conventional-commits"
    codingStandards: string[],    // e.g., ["eslint", "prettier"]
    testStrategy: string,         // e.g., "unit + integration"
  },
  agents: Array<{
    name: string,                 // Display name (e.g., "Tech Lead")
    slug: string,                 // File-safe name (e.g., "tech-lead")
    description: string,          // What this agent does
    role: string,                 // Role type (orchestrator, executor, validator, monitor)
    color: string,                // Terminal color for Maestri workspace
  }>,
}
```

### CLI Commands

```bash
# Tech Lead creates the workspace template (5-round wizard)
devcrew init --architect

# Developer consumes existing project.yaml (reads config, generates local files)
devcrew init

# Preview what would be generated without writing files
devcrew init --dry-run

# Smart merge: apply changes from updated project.yaml
devcrew update

# Force overwrite existing agent files
devcrew update --force

# Check current configuration state and generated files
devcrew status
```

### Generated Files (in target project)

When DevCrew runs against a target project, it generates:

```
target-project/
├── project.yaml              — Shared config (committed to repo, consumed by all team members)
├── CLAUDE.md                 — Project context document for all AI agents
├── .claude/
│   ├── settings.json         — Claude Code permissions (allowed commands, directories)
│   ├── WORKFLOW.md           — Pipeline phases + delegation rules between agents
│   └── agents/
│       ├── tech-lead.md      — Orchestrator instructions
│       ├── developer.md      — Executor instructions
│       ├── biz-analyst.md    — Business validation instructions
│       ├── quality-guard.md  — Quality/security review instructions
│       └── sentinel.md       — Branch check + CI/CD monitoring instructions
└── (Maestri workspace registered in ~/.maestri/ for local use)
```

### Architect Wizard Flow (5 Rounds)

The `--architect` wizard guides the Tech Lead through 5 rounds of configuration:

1. **Round 1 — Project Identity**: Name, organization, description
2. **Round 2 — Context Sources**: Confluence URL, manual context, .md file paths, business rules, technical rules
3. **Round 3 — Repositories**: Add repos with name, path, stack, package manager
4. **Round 4 — Conventions**: Default branch, commit format, coding standards, test strategy
5. **Round 5 — Agents**: Configure AI agents (defaults provided, can add/remove/customize)

---

## 5. Tech Stack

| Category | Technology | Purpose |
|----------|-----------|---------|
| **Runtime** | Node.js >= 18 | ESM modules throughout |
| **CLI framework** | commander | Command parsing, flags, subcommands |
| **Interactive prompts** | inquirer | Wizard questions with validation |
| **Terminal styling** | chalk | Colored output |
| **Spinners** | ora | Loading indicators during generation |
| **YAML processing** | js-yaml | Read/write project.yaml |
| **Template engine** | Handlebars | Listed as dependency; templates currently use simple `{{var}}` replacement |

---

## 6. What's NOT Implemented Yet (Future / V1)

| Feature | Target | Notes |
|---------|--------|-------|
| MCP for CI/CD pipeline (Azure Pipelines, GitHub Actions) | V1 | Sentinel currently relies on manual log input or future MCP integration |
| Declarative `pipeline.yaml` (executable workflow) | V1 | Pipeline is currently instructions in agent templates, not machine-executable |
| Real token usage monitoring | V1 | Currently just instructions to agents to be efficient with tokens |
| Automatic Confluence extraction at setup time | V1 | Currently stores URL for runtime MCP use; no extraction during `devcrew init` |
| Cross-machine Maestri integration | Not planned | Maestri limitation — each instance is local to the machine |
| npm publish (`npx devcrew`) | Not done | Package is local-only, not published to npm registry |

---

## 7. User Preferences & Communication Style

Understanding the project owner's preferences is important for any AI agent working on this project:

- **Language**: Angelo prefers **Portuguese for discussion** but **English for code and documentation**
- **Simplicity**: Values simple, didactic explanations. Prefers clarity over cleverness
- **Ownership**: Wants *"propriedade absoluta"* (absolute ownership) — full understanding of every decision before presenting to the team
- **Real-world first**: Thinks in real-world scenarios first, then abstracts to product features. The Phase 1 refactor was entirely driven by a concrete team scenario
- **Evolutionary design**: Prefers incremental evolution over big-bang releases. The product should be *"flexível e evolutivo"* (flexible and evolutive)
- **Autonomy**: Strongly values developer autonomy — the framework should enable, not constrain

---

## 8. Testing Approach

All testing was performed during development to verify correctness:

| Test Type | What Was Verified |
|-----------|-------------------|
| **Syntax check** | All modules verified with `node --check` for syntax errors |
| **Import verification** | 14/14 modules import correctly with no missing dependencies |
| **Generator integration** | Mock config → temp directory → verify all expected files are generated with correct content |
| **CLI commands** | `--help`, `--version`, `status`, `init --help`, `update --help` all produce expected output |
| **Maestri workspace** | Schema v2 compliance, terminals array, connections array, manifest registration in `~/.maestri/` |
| **Cleanup** | Test artifacts (temp directories, generated files) removed after each test run |

---

## Appendix: Key Quotes (Original Portuguese)

These quotes from the project owner were pivotal in shaping design decisions:

1. > *"O primeiro prompt de desenvolvimento é do dev, ele pede para criar a solução para a tarefa dele, dali pra frente a IA orquestra tudo sozinha"*
   — Led to the "AI Orchestrates After First Prompt" principle

2. > *"O workspace é pra qualquer um do time, não há a necessidade de saber quantos devs"*
   — Led to Decision 1: single workspace template

3. > *"Essa integração precisa ser uma opção viável para quem for trazer a estrutura inicial, sem isso toda e qualquer informação do projeto será necessária ser informada manualmente"*
   — Led to Decision 7: Confluence integration in V0

4. > *"O dev ter autonomia para implementação dos agentes que forem necessários além do que ele já vai ter por padrão"*
   — Led to Decision 8: `devcrew update` with smart merge

5. > *"O review deveria ser um agente olhando pra isso e não um humano"*
   — Led to Decision 10: Quality Guard does PR review

---

**This document should be read by any AI agent working on this project to understand the full context, decisions, and rationale behind the current implementation.**

---

## Phase 2 — V1 Redesign: "Tool, Not Process"

**Date**: 2026-05
**Trigger**: First real-world test of DevCrew on the `coffe-shop` project (Node.js + Express + EJS)

### The Problem Discovered

When running `devcrew init --architect` inside an existing project, the wizard asked 20+ questions — most of which were already answered by the repo itself:

- Project name → already in `package.json`
- Description → already in `package.json` and `README.md`
- Tech stack → detectable from `package.json` dependencies
- Package manager → detectable from lock files (`package-lock.json`, `yarn.lock`, etc.)
- Repo path → it's `process.cwd()`
- Repo name → it's the directory name or `package.json` name

The user's insight: **"O IntelliJ não pergunta qual time você está ou qual o seu contexto, ele apenas roda seu projeto e dali pra frente você faz o resto."**

### The New Mental Model

DevCrew V1 is a **tool**, not a **team process**.

| V0 (Process) | V1 (Tool) |
|-------------|-----------|
| Architect configures → commits project.yaml → Developer consumes | Developer runs `devcrew init` → tool detects → generates |
| 2 personas (Architect, Developer) | 1 flow for everyone |
| project.yaml as shared artifact | No shared artifact |
| 20+ wizard questions | Minimal questions (only what can't be inferred) |
| `--architect` flag | No flags needed |

### Key Decisions Made in V1

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | **Eliminate project.yaml** | No shared artifact needed — each dev generates their own workspace from the repo |
| 2 | **Eliminate Architect/Developer personas** | One flow for everyone — the tool detects the context |
| 3 | **Auto-detect from repo** | `package.json`, `README.md`, `ARCHITECTURE.md`, lock files, git, test files, lint configs |
| 4 | **Show detected info first** | User confirms or corrects — "convention over configuration" |
| 5 | **Ask only what can't be inferred** | Commit format, Confluence URL, related repos, business rules, agent customization |
| 6 | **Add `relatedRepos` to context** | Links to related repos (GitHub, Bitbucket) for agent context |
| 7 | **Redefine `devcrew update`** | No longer syncs from project.yaml — re-scans the repo and updates workspace |
| 8 | **Remove `--architect` flag** | Unnecessary — single flow |
| 9 | **README must answer "where do I run this?"** | First-time user question that was missing from V0 docs |
| 10 | **README must include example session** | Show exactly what the wizard looks like |

### New Architecture

**New module**: `src/scanner/repo-scanner.mjs`
- Detects: project name, description, stack, package manager, default branch, tests, coding standards, architecture docs
- Multi-language: Node.js, Java (Maven/Gradle), Python, Rust, Go
- Returns structured object with all detected values

**Removed**: `src/wizard/architect.mjs`, `src/wizard/developer.mjs`
**Created**: `src/wizard/init-wizard.mjs` — single unified wizard

**Removed**: `src/generators/project-yaml.mjs`
**Modified**: All generators adapted to new V1 config shape (no `repos[]`, no `organization`)

### New Config Object (V1)

```javascript
{
  cwd: string,
  project: {
    name: string,
    description: string,
    context: {
      confluenceUrl: string | null,
      relatedRepos: string[],        // NEW in V1
      manual: string,
      files: string[],
      businessRules: string,
      technicalRules: string
    }
  },
  repo: {                            // singular (was repos[])
    stack: string,
    packageManager: string | null,
    hasTests: boolean,
    testFramework: string | null,
    detectedStandards: string[]
  },
  conventions: {
    defaultBranch: string,
    commitFormat: string,
    codingStandards: string[],
    testStrategy: string
  },
  agents: [{ name, slug, description, role, color }]
}
```

### Quotes That Drove V1 Decisions

1. > *"O IntelliJ não pergunta qual time você está ou qual o seu contexto, ele apenas roda seu projeto e dali pra frente você faz o resto"*
   — Led to the "Tool, not Process" mental model

2. > *"Essa info já está na documentação do projeto, seja em um readme, ou no próprio nome do repo"*
   — Led to auto-detection from package.json, README.md, ARCHITECTURE.md

3. > *"Já estamos no repositório do próprio projeto, não faz sentido"*
   — Led to elimination of Round 2 (Repositories) entirely

4. > *"Aqui eu não deveria informar isso tendo em vista que esse projeto já existe"*
   — Led to stack/package manager auto-detection from lock files and package.json

5. > *"Aqui seria legal colocar o link ou os links dos projetos seja de um Bitbucket seja de um GitHub"*
   — Led to addition of `relatedRepos` field in context

### Files Changed in V1

| Action | File |
|--------|------|
| CREATE | `src/scanner/repo-scanner.mjs` |
| CREATE | `src/wizard/init-wizard.mjs` |
| REMOVE (logical) | `src/wizard/architect.mjs` (kept on disk, no longer used) |
| REMOVE (logical) | `src/wizard/developer.mjs` (kept on disk, no longer used) |
| REMOVE (logical) | `src/generators/project-yaml.mjs` (kept on disk, no longer used) |
| MODIFY | `src/commands/init.mjs` |
| MODIFY | `src/commands/update.mjs` |
| MODIFY | `src/commands/status.mjs` |
| MODIFY | `src/generators/index.mjs` |
| MODIFY | `src/generators/claude-md.mjs` |
| MODIFY | `src/generators/workflow.mjs` |
| MODIFY | `src/generators/agents.mjs` |
| MODIFY | `src/context/confluence.mjs` |
| MODIFY | `bin/devcrew.mjs` |
| MODIFY | `src/index.mjs` |
| REWRITE | `README.md` |
| REWRITE | `README.pt-BR.md` |

### Pilot Project

The V1 redesign was validated against the `coffe-shop` project:
- **Stack**: Node.js + Express + EJS
- **Package manager**: npm (detected from `package-lock.json`)
- **Description**: detected from `package.json` → `"A simple coffee shop CRUD application with Node.js, Express, and EJS"`
- **Architecture**: `ARCHITECTURE.md` present with full documentation
- **Tests**: none (correctly detected as `hasTests: false`)
