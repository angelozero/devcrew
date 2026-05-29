# DevCrew

**AI Team Setup for Any Project** — scaffold an AI-powered development team with one command.

DevCrew sets up a complete [Claude Code](https://docs.anthropic.com/en/docs/claude-code) + [Maestri](https://maestri.app) workspace inside your project. It auto-detects your repo's stack, conventions, and structure — then asks only what it can't infer.

---

## How It Works

```
cd your-project
node /path/to/devcrew/bin/devcrew.mjs init
```

DevCrew will:

1. **Scan your repo** — reads `package.json`, `README.md`, `ARCHITECTURE.md`, lock files, git branch, test files, and linting configs
2. **Show what it detected** — presents the detected info so you can confirm or correct it
3. **Ask only what's missing** — commit format, Confluence URL, business rules, agent customization
4. **Generate your workspace** — creates all files needed to run your AI team

---

## Prerequisites

Before running DevCrew, make sure you have:

- **Node.js >= 18** — [download here](https://nodejs.org)
- **npm** — comes with Node.js
- **git** — for branch detection
- **Claude Code** — installed and authenticated
- **Maestri** — installed (for the visual workspace)

---

## Quick Start (First Time)

### Step 1 — Install DevCrew dependencies

```bash
cd /path/to/devcrew
npm install
```

> Do this once. You don't need to install DevCrew globally.

### Step 2 — Go to YOUR project directory

```bash
cd /path/to/your-project
```

> ⚠️ **Important**: Run DevCrew from inside your project directory, not from the DevCrew directory itself. DevCrew reads your project files and generates workspace files in the current directory.

### Step 3 — Run init

```bash
node /path/to/devcrew/bin/devcrew.mjs init
```

### Step 4 — Follow the wizard

The wizard will:
- Show what it detected from your repo
- Let you confirm or correct the values
- Ask for commit format, test strategy, and optional context
- Show the 5 default agents and let you customize if needed
- Ask for final confirmation before generating

### Step 5 — Open Maestri

After generation, open Maestri. Your new workspace will appear with all agent terminals ready to use.

---

## What Gets Generated

Running `devcrew init` creates these files inside your project:

```
your-project/
├── CLAUDE.md                    ← Project context for all agents
└── .claude/
    ├── settings.json            ← Claude Code permissions
    ├── WORKFLOW.md              ← 8-phase pipeline + delegation rules
    └── agents/
        ├── tech-lead.md         ← Orchestrator agent
        ├── developer.md         ← Executor agent
        ├── biz-analyst.md       ← Business validator agent
        ├── quality-guard.md     ← Quality reviewer agent
        └── sentinel.md          ← Branch + CI/CD monitor agent
```

And in your home directory:

```
~/.maestri/workspaces/<id>/workspace.json   ← Maestri visual workspace
```

---

## The 5 Default Agents

| Agent | Role | What It Does |
|-------|------|-------------|
| 🟣 **Tech Lead** | orchestrator | Receives tasks, delegates to sub-agents, runs the 8-phase pipeline |
| 🟢 **Developer** | executor | Implements features, writes tests, resolves conflicts |
| 🔵 **Business Analyst** | validator | Validates implementation against business rules |
| 🟠 **Quality Guard** | validator | Reviews code quality, security, test coverage |
| 🔴 **Sentinel** | monitor | Checks branch conflicts, monitors CI/CD pipeline |

---

## The 8-Phase Quality Pipeline

Every task goes through this pipeline automatically:

| Phase | Actor | What Happens |
|-------|-------|-------------|
| 1 | Developer | Implements the feature + writes tests |
| 2 | Business Analyst | Validates against business rules |
| 3 | Quality Guard | Reviews code quality + security |
| 4 | Sentinel | Checks branch for conflicts |
| 5 | **Human** | Reviews summary → approves commit |
| 6 | **Human** | Reviews and merges PR on GitHub |
| 7 | Sentinel | Monitors CI/CD pipeline after deploy |
| 8 | **Human** + Sentinel | Validates in environment → promotes |

---

## Commands

### `devcrew init`

Initialize DevCrew in the current project.

```bash
node /path/to/devcrew/bin/devcrew.mjs init
node /path/to/devcrew/bin/devcrew.mjs init --dry-run   # preview without writing
```

### `devcrew status`

Check if DevCrew is configured in the current directory.

```bash
node /path/to/devcrew/bin/devcrew.mjs status
```

### `devcrew update`

Re-scan the repo and update the workspace (preserves agent customizations).

```bash
node /path/to/devcrew/bin/devcrew.mjs update
node /path/to/devcrew/bin/devcrew.mjs update --force   # overwrite agent files too
```

---

## Example Session

```
$ cd ~/projects/my-api
$ node ~/tools/devcrew/bin/devcrew.mjs init

🚀 DevCrew — AI Team Setup for Any Project

  Scanning your repository...

📡 Detected from your repo:

  Project name:        my-api
  Description:         REST API for user management
  Tech stack:          Node.js + TypeScript + Express
  Package manager:     npm
  Default branch:      main
  Tests:               ✔ detected (Jest)
  Coding standards:    ESLint, Prettier, TypeScript
  Architecture doc:    ✔ ARCHITECTURE.md found

  You can confirm or correct the detected values below.

✔ Project name: my-api
✔ Project description: REST API for user management
✔ Tech stack: Node.js + TypeScript + Express
✔ Package manager: npm

⚙️  Conventions

✔ Default branch for PRs: main
✔ Commit message format: Conventional (type(scope): subject)
✔ Coding standards: ESLint, Prettier, TypeScript
✔ Test strategy: Jest — unit + integration

🔗 External Context (optional)

✔ Confluence / Wiki URL: https://myteam.atlassian.net/wiki
✔ Related repo URLs: (skipped)
✔ Additional project context: Skip

🤖 Agents

  🟣 Tech Lead (orchestrator) — Orchestrates all work...
  🟢 Developer (executor) — Implements features...
  🔵 Business Analyst (validator) — Validates implementation...
  🟠 Quality Guard (validator) — Reviews code quality...
  🔴 Sentinel (monitor) — Checks branch for conflicts...

✔ Use all 5 default agents? Yes

✅ Summary

  Project:      my-api
  Description:  REST API for user management
  Stack:        Node.js + TypeScript + Express
  Branch:       main
  Commits:      conventional
  Tests:        Jest — unit + integration
  Standards:    ESLint, Prettier, TypeScript
  Confluence:   https://myteam.atlassian.net/wiki

  Agents:
    🟣 Tech Lead (orchestrator)
    🟢 Developer (executor)
    🔵 Business Analyst (validator)
    🟠 Quality Guard (validator)
    🔴 Sentinel (monitor)

✔ Generate DevCrew workspace with these settings? Yes

📦 Generating files...

  ✔ CLAUDE.md
  ✔ .claude/settings.json
  ✔ .claude/WORKFLOW.md
  ✔ .claude/agents/ (5 agents)
  ✔ Maestri workspace

  ✅ DevCrew setup complete!

  Next steps:
    1. Review the generated CLAUDE.md and enrich it if needed
    2. Open Maestri to start working with your AI team
    3. Click on the Tech Lead terminal to begin
```

---

## Troubleshooting

### "Command not found: devcrew"

DevCrew is not published to npm yet. Run it directly:

```bash
node /path/to/devcrew/bin/devcrew.mjs init
```

### "Cannot find module"

Run `npm install` inside the DevCrew directory first:

```bash
cd /path/to/devcrew && npm install
```

### "Not a git repository"

DevCrew tries to detect your default branch via git. If your project isn't a git repo, it will fall back to `main`. You can correct the branch name in the wizard.

### Nothing was detected

If DevCrew can't detect your stack, it will show empty fields. Just type the values manually in the wizard — all fields accept free-text input.

### Maestri workspace not appearing

Check that Maestri is installed and that `~/.maestri/` exists. DevCrew writes to `~/.maestri/workspaces/` and registers the workspace in `~/.maestri/manifest.json`.

---

## Project Structure (DevCrew itself)

```
devcrew/
├── bin/
│   └── devcrew.mjs          ← CLI entry point
├── src/
│   ├── index.mjs            ← Public API
│   ├── scanner/
│   │   └── repo-scanner.mjs ← Auto-detects repo info
│   ├── commands/
│   │   ├── init.mjs         ← init command
│   │   ├── status.mjs       ← status command
│   │   └── update.mjs       ← update command
│   ├── wizard/
│   │   └── init-wizard.mjs  ← Interactive wizard (minimal questions)
│   ├── generators/
│   │   ├── index.mjs        ← Generator orchestrator
│   │   ├── claude-md.mjs    ← Generates CLAUDE.md
│   │   ├── settings.mjs     ← Generates .claude/settings.json
│   │   ├── workflow.mjs     ← Generates .claude/WORKFLOW.md
│   │   ├── agents.mjs       ← Generates .claude/agents/*.md
│   │   └── maestri.mjs      ← Generates Maestri workspace
│   ├── context/
│   │   └── confluence.mjs   ← Context processor
│   └── templates/
│       └── agents/          ← Pre-built agent templates
└── package.json
```

---

## License

MIT — Copyright 2025 Angelo Zero
