# AGENTS.md - Synkra AIOX (Codex CLI)

Este arquivo define as instrucoes do projeto para o Codex CLI.

<!-- AIOX-MANAGED-START: core -->
## Core Rules

1. Siga a Constitution em `.aiox-core/constitution.md`
2. Priorize `CLI First -> Observability Second -> UI Third`
3. Trabalhe por stories em `docs/stories/`
4. Nao invente requisitos fora dos artefatos existentes
<!-- AIOX-MANAGED-END: core -->

<!-- AIOX-MANAGED-START: quality -->
## Quality Gates

- Rode `npm run lint`
- Rode `npm run typecheck`
- Rode `npm test`
- Atualize checklist e file list da story antes de concluir
<!-- AIOX-MANAGED-END: quality -->

<!-- AIOX-MANAGED-START: codebase -->
## Project Map

- Core framework: `.aiox-core/`
- CLI entrypoints: `bin/`
- Shared packages: `packages/`
- Tests: `tests/`
- Docs: `docs/`
<!-- AIOX-MANAGED-END: codebase -->

<!-- AIOX-MANAGED-START: commands -->
## Common Commands

- `npm run sync:ide`
- `npm run sync:ide:check`
- `npm run sync:ide:codex`
- `npm run sync:skills:codex`
- `npm run sync:skills:codex:global` (opcional; neste repo o padrao e local-first)
- `npm run validate:structure`
- `npm run validate:agents`
<!-- AIOX-MANAGED-END: commands -->

<!-- AIOX-MANAGED-START: codex-integration -->
## Codex Integration

Fonte de verdade para o Codex neste repo:
- Canonico: `.aiox-core/development/agents/*.md`
- Espelhado para fallback do Codex: `.codex/agents/*.md`
- Skills de ativacao: `.codex/skills/aiox-*/SKILL.md`

Paridade com o setup do Claude:
- Regras base do projeto vivem em `.claude/CLAUDE.md`
- Regras contextuais vivem em `.claude/rules/*.md`
- Comandos de agentes do Claude vivem em `.claude/commands/AIOX/agents/*.md`

No Codex, hooks e permissoes do Claude nao executam de forma nativa.
Portar a intencao dessas configuracoes por:
- `AGENTS.md` para regras globais do projeto
- `.codex/agents/*.md` para fallback de personas
- `.codex/skills/*/SKILL.md` para ativacao
- validadores em `.aiox-core/infrastructure/scripts/`

Sempre que houver drift entre Claude e Codex, execute:
- `npm run sync:ide`
- `npm run sync:ide:codex`
- `npm run sync:skills:codex`
- `npm run validate:structure`
<!-- AIOX-MANAGED-END: codex-integration -->

<!-- AIOX-MANAGED-START: boundary -->
## Framework Boundary

- L1 Framework Core: nao modificar `.aiox-core/core/`, `.aiox-core/constitution.md`, `bin/aiox.js`, `bin/aiox-init.js`
- L2 Framework Templates: nao modificar artefatos base em `.aiox-core/development/{tasks,templates,checklists,workflows}` e `.aiox-core/infrastructure/` sem intencao explicita de framework
- L3 Project Config: modificar com criterio `.aiox-core/data/`, `core-config.yaml`, memorias de agentes
- L4 Project Runtime: trabalho normal do projeto em `docs/stories/`, `packages/`, `tests/`, apps e servicos
<!-- AIOX-MANAGED-END: boundary -->

<!-- AIOX-MANAGED-START: rules-parity -->
## Claude Rules Parity

Considere as seguintes rules do Claude como politicas tambem validas no Codex:
- `.claude/rules/agent-authority.md`
- `.claude/rules/agent-handoff.md`
- `.claude/rules/agent-memory-imports.md`
- `.claude/rules/ids-principles.md`
- `.claude/rules/mcp-usage.md`
- `.claude/rules/story-lifecycle.md`
- `.claude/rules/workflow-execution.md`

Aplicacao pratica no Codex:
- respeitar autoridade do `@devops` para push, PR e gestao de MCP
- seguir lifecycle de story: `Draft -> Ready -> InProgress -> InReview -> Done`
- usar MCP apenas quando a ferramenta nativa nao cobrir bem o caso
- tratar handoff e memoria como artefatos de contexto, nao como instrucoes opcionais
<!-- AIOX-MANAGED-END: rules-parity -->

<!-- AIOX-MANAGED-START: shortcuts -->
## Agent Shortcuts

Preferencia de ativacao no Codex CLI:
1. Use `/skills` e selecione `aiox-<agent-id>` vindo de `.codex/skills` (ex.: `aiox-architect`)
2. Se preferir, use os atalhos abaixo (`@architect`, `/architect`, etc.)

Interprete os atalhos abaixo carregando o arquivo correspondente em `.aiox-core/development/agents/` (fallback: `.codex/agents/`), renderize o greeting via `generate-greeting.js` e assuma a persona ate `*exit`:

- `@architect`, `/architect`, `/architect.md` -> `.aiox-core/development/agents/architect.md`
- `@dev`, `/dev`, `/dev.md` -> `.aiox-core/development/agents/dev.md`
- `@qa`, `/qa`, `/qa.md` -> `.aiox-core/development/agents/qa.md`
- `@pm`, `/pm`, `/pm.md` -> `.aiox-core/development/agents/pm.md`
- `@po`, `/po`, `/po.md` -> `.aiox-core/development/agents/po.md`
- `@sm`, `/sm`, `/sm.md` -> `.aiox-core/development/agents/sm.md`
- `@analyst`, `/analyst`, `/analyst.md` -> `.aiox-core/development/agents/analyst.md`
- `@devops`, `/devops`, `/devops.md` -> `.aiox-core/development/agents/devops.md`
- `@data-engineer`, `/data-engineer`, `/data-engineer.md` -> `.aiox-core/development/agents/data-engineer.md`
- `@ux-design-expert`, `/ux-design-expert`, `/ux-design-expert.md` -> `.aiox-core/development/agents/ux-design-expert.md`
- `@squad-creator`, `/squad-creator`, `/squad-creator.md` -> `.aiox-core/development/agents/squad-creator.md`
- `@aiox-master`, `/aiox-master`, `/aiox-master.md` -> `.aiox-core/development/agents/aiox-master.md`
<!-- AIOX-MANAGED-END: shortcuts -->
