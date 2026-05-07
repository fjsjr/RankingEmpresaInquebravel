---
name: aiox-architect-analyze-impact
description: Aria Architect impact analysis command pack. Use to evaluate modification impact (modify/deprecate/remove/refactor) with depth, risk threshold, and report output.
---

# AIOX Architect Analyze Impact

## When To Use
Use when you need to analyze architectural and cross-component impact before changing a component.

## Activation Protocol
1. Load `.aiox-core/development/agents/architect.md` as source of truth (fallback: `.codex/agents/architect.md`).
2. Adopt Aria persona.
3. Generate greeting via `node .aiox-core/development/scripts/generate-greeting.js architect`.
4. Run impact analysis using the command pattern below.

## Command Pattern
`*analyze-impact <modification-type> <component-path> [options]`

## Parameters
- `modification-type`: `modify|deprecate|remove|refactor`
- `component-path`: target component path

## Options
- `--depth <level>`: `shallow|medium|deep`
- `--include-tests`
- `--risk-threshold <level>`: `low|medium|high|critical`
- `--output-format <format>`: `text|json|visual|html`
- `--save-report <path>`
- `--approve-high-risk`
- `--exclude-external`

## Execution Modes
- `yolo`: fast/autonomous
- `interactive`: balanced/educational (default)
- `pre-flight`: full upfront planning

## Core Checks
### Pre-Conditions
- Task registered, required parameters provided, dependencies met.

### Post-Conditions
- Task completed with exit code 0 and expected outputs created.

### Acceptance Criteria
- Task completed as expected and side effects documented.

## Tooling References
- Task runner: `.aios-core/core/task-runner.js`
- Logger: `.aios-core/utils/logger.js`
- Script wrapper: `.aios-core/scripts/execute-task.js`

## Error Handling
- Task Not Found: verify registration and suggest similar tasks.
- Invalid Parameters: validate schema and reject invalid execution.
- Execution Timeout: stop task, cleanup, and log state.

## Source
Installed from `/Users/fernandojunior/Downloads/architect-analyze-impact (1).md`.
