# 🚀 DevCrew — Setup de Time de IA para Qualquer Projeto

🇺🇸 [Read in English](README.md)

**DevCrew** monta um time de desenvolvimento com IA na sua máquina. Um comando, responda algumas perguntas, e seu time inteiro de IA está pronto para trabalhar via [Maestri](https://maestri.app).

> Assim como um template de projeto te dá arquitetura e boilerplate — **DevCrew te dá um time de IA, pré-configurado com o contexto do seu projeto, pronto para executar tarefas.**

## Conceito-Chave: Times Totalmente Dinâmicos

DevCrew **não** te prende a papéis fixos como "Dev Backend" ou "Dev Frontend". Você define seus próprios membros durante o setup — podem ser qualquer coisa:

- Dev Backend + Dev Frontend + QA
- Engenheiro de Dados + Engenheiro ML + DevOps
- Dev API + Dev Mobile + Analista de Segurança
- Ou qualquer combinação que seu projeto precise

## Início Rápido

```bash
# Instalar globalmente
npm install -g devcrew

# Montar seu time de IA
devcrew init --architect    # Arquiteto/Tech Lead: define estrutura do projeto
devcrew init                # Desenvolvedor: consome project.yaml existente

# Verificar status
devcrew status
```

## Como Funciona

### Adoção em Duas Fases

```
Fase 1: ARQUITETO / TECH LEAD (pioneiros)
┌─────────────────────────────────────────────────────┐
│  devcrew init --architect                           │
│  Define projeto, frentes/squads, membros, repos     │
│  Saída: project.yaml + setup completo do time IA    │
└─────────────────────────────────────────────────────┘
                        ↓
Fase 2: DESENVOLVEDOR (consumidor)
┌─────────────────────────────────────────────────────┐
│  devcrew init                                       │
│  Seleciona sua frente, aponta para repos locais     │
│  Saída: time de IA personalizado, pronto pra codar  │
└─────────────────────────────────────────────────────┘
```

### O Que É Gerado

| Arquivo | Descrição |
|---------|-----------|
| `project.yaml` | Configuração do projeto (compartilhe com o time) |
| `CLAUDE.md` | Contexto do projeto para todos os agentes |
| `.claude/agents/` | Um agente por membro do time |
| `.claude/WORKFLOW.md` | Topologia do time e regras de delegação |
| `.claude/settings.json` | Permissões do Claude Code |
| Workspace Maestri | Terminais conectados, prontos para usar |

### Membros Dinâmicos do Time

Você define seu time durante o wizard. Cada membro se torna:
- Um **terminal no Maestri** com seu próprio diretório de trabalho
- Uma **definição de agente** (`.claude/agents/<slug>.md`) com instruções específicas do papel
- Uma **conexão** com o orquestrador (Tech Lead)

O primeiro membro é sempre o **orquestrador** (Tech Lead) que delega para todos os outros.

## Suporte Multi-Frente

Projetos grandes com múltiplos squads/frentes são totalmente suportados:

```yaml
# project.yaml
fronts:
  - name: "Farmácia"
    repos:
      - name: api
        path: hospital-farmacia-api
        stack: "Java + Spring Boot"
      - name: web
        path: hospital-farmacia-web
        stack: "React + TypeScript"

  - name: "Médicos"
    repos:
      - name: api
        path: hospital-medicos-api
        stack: "Node.js + Express"
```

Cada desenvolvedor seleciona sua frente durante `devcrew init` e recebe um setup personalizado.

## Pré-requisitos

- [Node.js](https://nodejs.org/) >= 18
- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) CLI instalado
- [Maestri](https://maestri.app) (macOS) para orquestração multi-terminal com IA

## Exemplos de Uso

### Exemplo 1: Projeto Simples

```bash
cd /caminho/do/meu-projeto
devcrew init --architect

# O wizard pergunta:
# 1. Nome do projeto, organização, descrição
# 2. Frentes e repositórios (dinâmico)
# 3. Membros do time (você define!)
# 4. Convenções (branch, commits, testes)
# 5. Confirmação

# Pronto! Abra o Maestri e comece a trabalhar.
```

### Exemplo 2: Projeto Multi-Frente

```bash
cd /caminho/do/projeto-hospital
devcrew init --architect

# Define 3 frentes: Farmácia, Médicos, Pacientes
# Define time: Tech Lead, Dev API, Dev Web, QA
# Gera project.yaml

# Compartilhe com seu time
git add project.yaml && git commit -m "chore: add DevCrew config"

# Cada desenvolvedor roda:
devcrew init
# Seleciona sua frente, aponta para repos locais
```

### Exemplo 3: Dry Run

```bash
devcrew init --architect --dry-run
# Visualiza o que seria gerado sem escrever arquivos
```

## Trabalhando com Maestri

Após o setup, abra o Maestri e você verá seu workspace com terminais conectados:

```
  ● Tech Lead (orquestrador)
     ├── ● Dev API
     ├── ● Dev Web
     └── ● QA Tester
```

Clique no terminal do **Tech Lead** e comece a dar instruções. O Tech Lead vai delegar para os membros apropriados do time.

## Evoluindo Seu Setup

O setup inicial é um **ponto de partida**. Você pode evoluí-lo:

- **Manualmente no Maestri**: Adicione/remova terminais, reorganize conexões
- **Re-rode o wizard**: `devcrew init --architect` para regenerar com mudanças
- **Edite arquivos diretamente**: Modifique `CLAUDE.md`, arquivos de agente, ou `WORKFLOW.md`
- **Futuro**: Extração automática de contexto do Confluence/documentação

## Licença

MIT — [Angelo Zero](https://github.com/angelozero)
