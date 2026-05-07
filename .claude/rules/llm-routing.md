# LLM Routing Rules

## Model Selection Matrix

Route tasks to the appropriate model tier for cost/quality optimization.

| Tier | Model | Use For |
|------|-------|---------|
| **Haiku** | claude-haiku-4-5 | Pre-flight checks, file copy, config validation, report generation, simple Q&A |
| **Sonnet** | claude-sonnet-4-6 | Pipeline orchestration, error diagnosis, smart config merge, code review, standard dev |
| **Opus** | claude-opus-4-6 | Complex debugging (unknown root cause), architecture decisions, multi-file refactors |

## Routing Guidelines

### Use Haiku when:
- Task is mechanical/repetitive (copy, validate, format)
- Output is deterministic (config generation, template rendering)
- Context window needs are small (< 10K tokens)
- Speed matters more than depth

### Use Sonnet when:
- Task requires understanding but not invention
- Standard development work (implement feature from story)
- Code review and quality checks
- Error diagnosis with known patterns

### Use Opus when:
- Root cause is unknown and requires deep analysis
- Architecture decisions with trade-offs
- Multi-file refactors spanning 5+ files
- Complex debugging across system boundaries
- Planning and design work

## Agent-Model Defaults

| Agent | Default Model | Escalate To |
|-------|--------------|-------------|
| @dev | Sonnet | Opus (complex bugs) |
| @qa | Sonnet | Opus (architecture review) |
| @architect | Opus | — |
| @pm | Sonnet | — |
| @po | Sonnet | — |
| @sm | Sonnet | — |
| @analyst | Sonnet | Opus (deep research) |
| @data-engineer | Sonnet | Opus (schema design) |
| @devops | Sonnet | — |
| @bootstrap-engineer | Sonnet | — |
