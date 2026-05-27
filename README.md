# 🚀 DevCrew — AI Team Setup for Any Project

🇧🇷 [Leia em Português](README.pt-BR.md)

**DevCrew** scaffolds an AI-powered development team on your machine. One command, answer some questions, and your entire AI team is ready to work via [Maestri](https://maestri.app).

> Just like a project template gives you architecture and boilerplate — **DevCrew gives you an AI team, pre-configured with your project context, ready to execute tasks.**

## Key Concept: Fully Dynamic Teams

DevCrew does **not** force you into fixed roles like "Backend Dev" or "Frontend Dev". You define your own team members during setup — they can be anything:

- Backend Dev + Frontend Dev + QA
- Data Engineer + ML Engineer + DevOps
- API Developer + Mobile Dev + Security Analyst
- Or any combination your project needs

## Quick Start

```bash
# Install globally
npm install -g devcrew

# Set up your AI team
devcrew init --architect    # Architect/Tech Lead: define project structure
devcrew init                # Developer: consume existing project.yaml

# Check status
devcrew status
```

## How It Works

### Two-Phase Adoption

```
Phase 1: ARCHITECT / TECH LEAD (pioneers)
┌─────────────────────────────────────────────────────┐
│  devcrew init --architect                           │
│  Define project, fronts/squads, team members, repos │
│  Output: project.yaml + full AI team setup          │
└─────────────────────────────────────────────────────┘
                        ↓
Phase 2: DEVELOPER (consumer)
┌─────────────────────────────────────────────────────┐
│  devcrew init                                       │
│  Select your front, point to local repos            │
│  Output: personalized AI team, ready to code        │
└─────────────────────────────────────────────────────┘
```

### What Gets Generated

| File | Description |
|------|-------------|
| `project.yaml` | Project configuration (share with team) |
| `CLAUDE.md` | Project context for all agents |
| `.claude/agents/` | One agent per team member |
| `.claude/WORKFLOW.md` | Team topology and delegation rules |
| `.claude/settings.json` | Claude Code permissions |
| Maestri workspace | Connected terminals, ready to use |

### Dynamic Team Members

You define your team during the wizard. Each member becomes:
- A **Maestri terminal** with its own working directory
- An **agent definition** (`.claude/agents/<slug>.md`) with role-specific instructions
- A **connection** to the orchestrator (Tech Lead)

The first member is always the **orchestrator** (Tech Lead) who delegates to all others.

## Multi-Front Support

Large projects with multiple squads/fronts are fully supported:

```yaml
# project.yaml
fronts:
  - name: "Pharmacy"
    repos:
      - name: api
        path: hospital-pharmacy-api
        stack: "Java + Spring Boot"
      - name: web
        path: hospital-pharmacy-web
        stack: "React + TypeScript"

  - name: "Doctors"
    repos:
      - name: api
        path: hospital-doctors-api
        stack: "Node.js + Express"
```

Each developer selects their front during `devcrew init` and gets a personalized setup.

## Prerequisites

- [Node.js](https://nodejs.org/) >= 18
- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) CLI installed
- [Maestri](https://maestri.app) (macOS) for multi-terminal AI orchestration

## Usage Examples

### Example 1: Simple Project

```bash
cd /path/to/my-project
devcrew init --architect

# Wizard asks:
# 1. Project name, org, description
# 2. Fronts and repos (dynamic)
# 3. Team members (you define them!)
# 4. Conventions (branch, commits, tests)
# 5. Confirmation

# Done! Open Maestri and start working.
```

### Example 2: Multi-Front Project

```bash
cd /path/to/hospital-project
devcrew init --architect

# Define 3 fronts: Pharmacy, Doctors, Patients
# Define team: Tech Lead, API Dev, Web Dev, QA
# Generates project.yaml

# Share with your team
git add project.yaml && git commit -m "chore: add DevCrew config"

# Each developer runs:
devcrew init
# Selects their front, points to local repos
```

### Example 3: Dry Run

```bash
devcrew init --architect --dry-run
# Preview what would be generated without writing files
```

## Working with Maestri

After setup, open Maestri and you'll see your workspace with connected terminals:

```
  ● Tech Lead (orchestrator)
     ├── ● API Developer
     ├── ● Web Developer
     └── ● QA Tester
```

Click on the **Tech Lead** terminal and start giving instructions. The Tech Lead will delegate to the appropriate team members.

## Evolving Your Setup

The initial setup is a **starting point**. You can evolve it:

- **Manually in Maestri**: Add/remove terminals, rearrange connections
- **Re-run the wizard**: `devcrew init --architect` to regenerate with changes
- **Edit files directly**: Modify `CLAUDE.md`, agent files, or `WORKFLOW.md`
- **Future**: Auto-extract context from Confluence/documentation

## License

MIT — [Angelo Zero](https://github.com/angelozero)
