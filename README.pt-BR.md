# 🚀 DevCrew

**Setup de Time de IA para Qualquer Projeto** — Monte um workspace de desenvolvimento com IA em um único comando.

O DevCrew gera um ambiente completo de desenvolvimento com IA usando [Claude Code](https://docs.anthropic.com/en/docs/claude-code) + [Maestri](https://maestri.app), com 5 agentes especializados que automatizam todo o pipeline de desenvolvimento.

## O Que Ele Faz

Um comando configura:
- 📄 **CLAUDE.md** — Contexto do projeto (com integração Confluence)
- 🤖 **5 Agentes de IA** — Tech Lead, Developer, Business Analyst, Quality Guard, Sentinel
- 📋 **Pipeline de Qualidade** — Workflow automatizado de 8 fases
- 🔗 **Workspace Maestri** — Terminais conectados para orquestração de agentes
- ⚙️ **Config Claude Code** — Permissões e definições de workflow

## Os 5 Agentes Padrão

| Agente | Papel | O Que Faz |
|--------|-------|-----------|
| 🟣 Tech Lead | Orquestrador | Recebe tarefas, delega, executa o pipeline |
| 🟢 Developer | Executor | Implementa features, escreve testes, faz commits |
| 📋 Business Analyst | Validador | Valida contra regras de negócio |
| 🔍 Quality Guard | Validador | Revisa qualidade, segurança, cobertura de testes |
| 👁️ Sentinel | Monitor | Verifica branches, monitora logs de CI/CD |

## O Pipeline de Qualidade

```
Humano → Tech Lead → Developer → Biz Analyst → Quality Guard → Sentinel → Humano (aprova) → PR → Deploy
```

1. **Implementação** — Developer constrói a feature
2. **Validação de Negócio** — Biz Analyst verifica regras
3. **Revisão de Qualidade** — Quality Guard revisa o código
4. **Verificação de Branch** — Sentinel verifica a develop
5. **Aprovação de Commit** — Humano aprova
6. **PR + Merge** — Humano no GitHub
7. **Monitoramento de Deploy** — Sentinel acompanha CI/CD
8. **Promoção** — Humano valida, promove para o próximo ambiente

## Início Rápido

### Para o Tech Lead (primeira vez)

```bash
npx devcrew init --architect
```

Passa por 5 rodadas:
1. Identidade do projeto + convenções
2. Repositórios
3. Contexto do projeto (Confluence, docs, regras)
4. Agentes (aceitar padrões ou customizar)
5. Confirmação

### Para Desenvolvedores (após setup do Tech Lead)

```bash
git pull  # pegar o project.yaml
npx devcrew init
```

### Atualizando (quando project.yaml muda)

```bash
npx devcrew update          # merge inteligente — preserva suas customizações
npx devcrew update --force  # sobrescreve arquivos de agentes
```

### Verificar Status

```bash
npx devcrew status
```

## Como Funciona

1. Tech Lead roda `devcrew init --architect` → responde o wizard → gera `project.yaml` + todos os arquivos de config
2. Tech Lead faz commit do `project.yaml` no repositório
3. Cada desenvolvedor roda `devcrew init` → lê o `project.yaml` → gera seu workspace local
4. Todos abrem o Maestri → falam com o terminal do Tech Lead → a IA cuida do resto

## Flexibilidade

- **Adicione agentes customizados** durante o setup ou depois
- **Evolua o workspace** com `devcrew update`
- **Autonomia do dev** — desenvolvedores podem criar seus próprios agentes
- **Qualquer stack** — funciona com qualquer linguagem, framework ou toolchain
- **Integração Confluence** — carrega contexto do projeto automaticamente (requer Confluence MCP)

## Requisitos

- Node.js >= 18
- [Claude Code](https://docs.anthropic.com/en/docs/claude-code)
- [Maestri](https://maestri.app)

## Licença

MIT

---

🇺🇸 [Read in English](README.md)
