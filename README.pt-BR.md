# DevCrew

**Configuração de Time de IA para Qualquer Projeto** — monte um time de desenvolvimento com IA com um único comando.

O DevCrew configura um workspace completo de [Claude Code](https://docs.anthropic.com/en/docs/claude-code) + [Maestri](https://maestri.app) dentro do seu projeto. Ele detecta automaticamente a stack, convenções e estrutura do seu repositório — e pergunta apenas o que não consegue inferir.

---

## Como Funciona

```
cd seu-projeto
node /caminho/para/devcrew/bin/devcrew.mjs init
```

O DevCrew vai:

1. **Escanear seu repositório** — lê `package.json`, `README.md`, `ARCHITECTURE.md`, lock files, branch git, arquivos de teste e configs de lint
2. **Mostrar o que detectou** — apresenta as informações detectadas para você confirmar ou corrigir
3. **Perguntar apenas o que falta** — formato de commit, URL do Confluence, regras de negócio, customização de agentes
4. **Gerar seu workspace** — cria todos os arquivos necessários para rodar seu time de IA

---

## Pré-requisitos

Antes de rodar o DevCrew, certifique-se de ter:

- **Node.js >= 18** — [baixe aqui](https://nodejs.org)
- **npm** — vem com o Node.js
- **git** — para detecção de branch
- **Claude Code** — instalado e autenticado
- **Maestri** — instalado (para o workspace visual)

---

## Início Rápido (Primeira Vez)

### Passo 1 — Instale as dependências do DevCrew

```bash
cd /caminho/para/devcrew
npm install
```

> Faça isso uma vez só. Não é necessário instalar o DevCrew globalmente.

### Passo 2 — Vá para o diretório DO SEU PROJETO

```bash
cd /caminho/para/seu-projeto
```

> ⚠️ **Importante**: Execute o DevCrew de dentro do diretório do seu projeto, não do diretório do DevCrew. O DevCrew lê os arquivos do seu projeto e gera os arquivos do workspace no diretório atual.

### Passo 3 — Execute o init

```bash
node /caminho/para/devcrew/bin/devcrew.mjs init
```

### Passo 4 — Siga o wizard

O wizard vai:
- Mostrar o que detectou do seu repositório
- Deixar você confirmar ou corrigir os valores
- Perguntar sobre formato de commit, estratégia de testes e contexto opcional
- Mostrar os 5 agentes padrão e deixar você customizar se quiser
- Pedir confirmação final antes de gerar

### Passo 5 — Abra o Maestri

Após a geração, abra o Maestri. Seu novo workspace aparecerá com todos os terminais de agentes prontos para uso.

---

## O Que É Gerado

Executar `devcrew init` cria estes arquivos dentro do seu projeto:

```
seu-projeto/
├── CLAUDE.md                    ← Contexto do projeto para todos os agentes
└── .claude/
    ├── settings.json            ← Permissões do Claude Code
    ├── WORKFLOW.md              ← Pipeline de 8 fases + regras de delegação
    └── agents/
        ├── tech-lead.md         ← Agente orquestrador
        ├── developer.md         ← Agente executor
        ├── biz-analyst.md       ← Agente validador de negócio
        ├── quality-guard.md     ← Agente revisor de qualidade
        └── sentinel.md          ← Agente monitor de branch + CI/CD
```

E no seu diretório home:

```
~/.maestri/workspaces/<id>/workspace.json   ← Workspace visual do Maestri
```

---

## Os 5 Agentes Padrão

| Agente | Papel | O Que Faz |
|--------|-------|-----------|
| 🟣 **Tech Lead** | orchestrator | Recebe tarefas, delega para sub-agentes, executa o pipeline de 8 fases |
| 🟢 **Developer** | executor | Implementa features, escreve testes, resolve conflitos |
| 🔵 **Business Analyst** | validator | Valida implementação contra regras de negócio |
| 🟠 **Quality Guard** | validator | Revisa qualidade de código, segurança, cobertura de testes |
| 🔴 **Sentinel** | monitor | Verifica conflitos de branch, monitora pipeline CI/CD |

---

## O Pipeline de Qualidade de 8 Fases

Cada tarefa passa por este pipeline automaticamente:

| Fase | Ator | O Que Acontece |
|------|------|----------------|
| 1 | Developer | Implementa a feature + escreve testes |
| 2 | Business Analyst | Valida contra regras de negócio |
| 3 | Quality Guard | Revisa qualidade de código + segurança |
| 4 | Sentinel | Verifica conflitos de branch |
| 5 | **Humano** | Revisa resumo → aprova commit |
| 6 | **Humano** | Revisa e faz merge do PR no GitHub |
| 7 | Sentinel | Monitora pipeline CI/CD após deploy |
| 8 | **Humano** + Sentinel | Valida no ambiente → promove |

---

## Comandos

### `devcrew init`

Inicializa o DevCrew no projeto atual.

```bash
node /caminho/para/devcrew/bin/devcrew.mjs init
node /caminho/para/devcrew/bin/devcrew.mjs init --dry-run   # preview sem escrever
```

### `devcrew status`

Verifica se o DevCrew está configurado no diretório atual.

```bash
node /caminho/para/devcrew/bin/devcrew.mjs status
```

### `devcrew update`

Re-escaneia o repositório e atualiza o workspace (preserva customizações dos agentes).

```bash
node /caminho/para/devcrew/bin/devcrew.mjs update
node /caminho/para/devcrew/bin/devcrew.mjs update --force   # sobrescreve arquivos de agentes também
```

---

## Exemplo de Sessão

```
$ cd ~/projetos/minha-api
$ node ~/ferramentas/devcrew/bin/devcrew.mjs init

🚀 DevCrew — AI Team Setup for Any Project

  Scanning your repository...

📡 Detected from your repo:

  Project name:        minha-api
  Description:         API REST para gerenciamento de usuários
  Tech stack:          Node.js + TypeScript + Express
  Package manager:     npm
  Default branch:      main
  Tests:               ✔ detected (Jest)
  Coding standards:    ESLint, Prettier, TypeScript
  Architecture doc:    ✔ ARCHITECTURE.md found

  You can confirm or correct the detected values below.

✔ Project name: minha-api
✔ Project description: API REST para gerenciamento de usuários
✔ Tech stack: Node.js + TypeScript + Express
✔ Package manager: npm

⚙️  Conventions

✔ Default branch for PRs: main
✔ Commit message format: Conventional (type(scope): subject)
✔ Coding standards: ESLint, Prettier, TypeScript
✔ Test strategy: Jest — unit + integration

🔗 External Context (optional)

✔ Confluence / Wiki URL: https://meutime.atlassian.net/wiki
✔ Related repo URLs: (pulado)
✔ Additional project context: Skip

🤖 Agents

  🟣 Tech Lead (orchestrator) — Orquestra todo o trabalho...
  🟢 Developer (executor) — Implementa features...
  🔵 Business Analyst (validator) — Valida implementação...
  🟠 Quality Guard (validator) — Revisa qualidade de código...
  🔴 Sentinel (monitor) — Verifica conflitos de branch...

✔ Use all 5 default agents? Yes

✅ Summary

  Project:      minha-api
  Stack:        Node.js + TypeScript + Express
  Branch:       main
  Commits:      conventional
  Tests:        Jest — unit + integration

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
  ✔ .claude/agents/ (5 agentes)
  ✔ Maestri workspace

  ✅ DevCrew setup complete!
```

---

## Solução de Problemas

### "Command not found: devcrew"

O DevCrew ainda não está publicado no npm. Execute diretamente:

```bash
node /caminho/para/devcrew/bin/devcrew.mjs init
```

### "Cannot find module"

Execute `npm install` dentro do diretório do DevCrew primeiro:

```bash
cd /caminho/para/devcrew && npm install
```

### "Not a git repository"

O DevCrew tenta detectar seu branch padrão via git. Se seu projeto não for um repositório git, ele usará `main` como fallback. Você pode corrigir o nome do branch no wizard.

### Nada foi detectado

Se o DevCrew não conseguir detectar sua stack, os campos aparecerão vazios. Digite os valores manualmente no wizard — todos os campos aceitam texto livre.

### Workspace do Maestri não aparece

Verifique se o Maestri está instalado e que `~/.maestri/` existe. O DevCrew escreve em `~/.maestri/workspaces/` e registra o workspace em `~/.maestri/manifest.json`.

---

## Licença

MIT — Copyright 2025 Angelo Zero
