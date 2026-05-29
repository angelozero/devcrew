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
4. **Generate your workspace** — creates all files and configures Maestri with your AI team

---

## Prerequisites

Before running DevCrew, make sure you have:

- **Node.js >= 18** — [download here](https://nodejs.org)
- **npm** — comes with Node.js
- **git** — for branch detection
- **Claude Code** — installed and authenticated
- **Maestri** — installed (for the visual workspace)
- **curl** — pre-installed on macOS (used to communicate with Maestri)

---

## Quick Start (First Time)

### Step 1 — Install DevCrew dependencies

```bash
cd /path/to/devcrew
npm install
```

> Do this once. You don't need to install DevCrew globally.

### Step 2 — Prepare a Maestri workspace

Maestri only accepts workspaces it has created itself. DevCrew needs an existing workspace with one terminal as a starting point.

1. Open **Maestri**
2. Create a **new workspace** (any name — DevCrew will rename it)
3. Add **one Claude Code terminal** to the canvas
4. **Close Maestri** completely (Cmd+Q)

> ⚠️ **Important**: Close Maestri before running DevCrew. DevCrew modifies the workspace file, then launches Maestri and uses its API to recruit the remaining agents.

### Step 3 — Go to YOUR project directory

```bash
cd /path/to/your-project
```

> ⚠️ **Important**: Run DevCrew from inside your project directory, not from the DevCrew directory itself. DevCrew reads your project files and generates workspace files in the current directory.

### Step 4 — Run init

```bash
node /path/to/devcrew/bin/devcrew.mjs init
```

### Step 5 — Follow the wizard

The wizard will:
- Show what it detected from your repo
- Let you confirm or correct the values
- Ask for commit format, test strategy, and optional context
- Show the 5 default agents and let you customize if needed
- Ask for final confirmation before generating

DevCrew will then:
1. Generate all agent files in your project
2. Configure the Maestri workspace terminal as **Tech Lead** (orchestrator)
3. Launch Maestri automatically
4. Recruit the remaining 4 agents via Maestri's CLI API
5. Connect all agents to the Tech Lead in a **hub/star layout**

When it finishes, Maestri will be open with all 5 agent terminals ready to use.

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

And configures your Maestri workspace:

```
~/.maestri/workspaces/<id>/workspace.json   ← 5 terminals in hub layout with connections
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
  ✔ Maestri workspace (5 terminals configured)

  ✅ DevCrew setup complete!

  Your AI team is ready in Maestri:
    → Tech Lead (orchestrator) connected to all sub-agents
    → Click on the Tech Lead terminal to begin
```

> If no Maestri workspace is found, DevCrew will generate all agent files but show instructions for the Maestri setup step. Just follow them and re-run `devcrew init`.

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

### Maestri workspace — "skipped" or "no workspace found"

DevCrew needs an existing Maestri workspace with at least one terminal. To fix:

1. Open Maestri
2. Create a new workspace
3. Add one Claude Code terminal
4. Close Maestri completely (Cmd+Q)
5. Re-run `devcrew init`

### Maestri workspace — "terminal not active"

DevCrew launched Maestri but couldn't communicate with the workspace terminal. Make sure:

1. The workspace is open in Maestri (not just the app — the workspace itself)
2. Close Maestri, then re-run `devcrew init` (it will relaunch Maestri)

### Maestri workspace — could not recruit agents

If some agents failed to recruit, you can re-run `devcrew init` — it will detect existing agents and only recruit the missing ones.

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
│   │   └── maestri.mjs      ← Configures Maestri workspace via CLI API
│   ├── context/
│   │   └── confluence.mjs   ← Context processor
│   └── templates/
│       └── agents/          ← Pre-built agent templates
└── package.json
```

---

## License

MIT — Copyright 2025 Angelo Zero
