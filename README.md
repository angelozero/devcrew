# 🚀 DevCrew

**AI Team Setup for Any Project** — Scaffold an AI-powered development workspace with one command.

DevCrew generates a complete AI development environment using [Claude Code](https://docs.anthropic.com/en/docs/claude-code) + [Maestri](https://maestri.app), with 5 specialized agents that automate the full development pipeline.

## What It Does

One command sets up:
- 📄 **CLAUDE.md** — Project context (with Confluence integration)
- 🤖 **5 AI Agents** — Tech Lead, Developer, Business Analyst, Quality Guard, Sentinel
- 📋 **Quality Pipeline** — 8-phase automated development workflow
- 🔗 **Maestri Workspace** — Connected terminals for agent orchestration
- ⚙️ **Claude Code Config** — Permissions and workflow definitions

## The 5 Default Agents

| Agent | Role | What It Does |
|-------|------|-------------|
| 🟣 Tech Lead | Orchestrator | Receives tasks, delegates, runs the pipeline |
| 🟢 Developer | Executor | Implements features, writes tests, handles commits |
| 📋 Business Analyst | Validator | Validates against business rules |
| 🔍 Quality Guard | Validator | Reviews quality, security, test coverage |
| 👁️ Sentinel | Monitor | Checks branches, monitors CI/CD logs |

## The Quality Pipeline

```
Human → Tech Lead → Developer → Biz Analyst → Quality Guard → Sentinel → Human (approve) → PR → Deploy
```

1. **Implementation** — Developer builds the feature
2. **Business Validation** — Biz Analyst checks rules
3. **Quality Review** — Quality Guard reviews code
4. **Branch Check** — Sentinel verifies develop
5. **Commit Approval** — Human approves
6. **PR + Merge** — Human on GitHub
7. **Deploy Monitoring** — Sentinel watches CI/CD
8. **Promotion** — Human validates, promotes to next env

## Quick Start

### For the Tech Lead (first time)

```bash
npx devcrew init --architect
```

Walks through 5 rounds:
1. Project identity + conventions
2. Repositories
3. Project context (Confluence, docs, rules)
4. Agents (accept defaults or customize)
5. Confirmation

### For Developers (after Tech Lead setup)

```bash
git pull  # get project.yaml
npx devcrew init
```

### Updating (when project.yaml changes)

```bash
npx devcrew update          # smart merge — preserves your customizations
npx devcrew update --force  # overwrite agent files
```

### Check Status

```bash
npx devcrew status
```

## How It Works

1. Tech Lead runs `devcrew init --architect` → answers wizard → generates `project.yaml` + all config files
2. Tech Lead commits `project.yaml` to the repo
3. Each developer runs `devcrew init` → reads `project.yaml` → generates their local workspace
4. Everyone opens Maestri → talks to the Tech Lead terminal → AI handles the rest

## Flexibility

- **Add custom agents** during setup or later
- **Evolve the workspace** with `devcrew update`
- **Dev autonomy** — developers can create their own agents
- **Any stack** — works with any language, framework, or toolchain
- **Confluence integration** — auto-loads project context (requires Confluence MCP)

## Requirements

- Node.js >= 18
- [Claude Code](https://docs.anthropic.com/en/docs/claude-code)
- [Maestri](https://maestri.app)

## License

MIT

---

🇧🇷 [Leia em Português](README.pt-BR.md)
