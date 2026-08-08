# Trekking Potato — Agent Bootstrap

> Mandatory entry point for every agent. Governance version: `TP-GOV-2.0.0`.

## 1. Authority and roles

Authority order:

1. Explicit controller instruction for the current turn
2. `GOAL.md` for the active Goal
3. `docs/governance/MASTER_PLAN.md` for long-term product direction
4. The GitHub Issue referenced by `docs/tasks/ACTIVE_TASK.md`
5. Product, architecture, testing, and workflow documents
6. `docs/decision-log.md`
7. Existing code behavior

The human user and the Sol XHigh controller are project controllers. The implementation agent is a bounded executor. New bounded implementation work must be routed through the custom Agent named `luna-worker`, configured by `~/.codex/agents/luna-worker.toml` for `gpt-5.6-luna` at `max` reasoning. Terra remains part of the historical record but is not an automatic fallback; using Terra again requires explicit human authorization. An executor cannot approve or merge its own work.

## 2. Mandatory reading order

Before implementation or review, read:

1. `AGENTS.md`
2. `GOAL.md`
3. `docs/current-status.md`
4. `docs/governance/MASTER_PLAN.md`
5. `docs/governance/AGENT_EXECUTION_PROTOCOL.md`
6. `docs/governance/PLAN_SYNC_PROTOCOL.md`
7. `docs/tasks/ACTIVE_TASK.md`
8. The Issue and project documents named by the active task

If these sources conflict, stop the affected work and report the conflict to Sol XHigh. Do not choose silently.

## 3. Session handshake

Before modifying implementation code, report:

```text
Governance version:
Goal ID and status:
Active milestone:
Active Issue and mode:
Current branch and base commit:
Working tree status:
Required documents read:
Baseline commands run:
Blocking inconsistencies:
```

No file hash or SHA-256 handshake is required. Git commit IDs may be recorded only where they identify a real branch, review, or handoff state.

## 4. Hard rules

- One active Issue, one primary objective, one focused PR.
- Modify only the task contract allowlist. Escalate necessary scope changes before editing.
- Preserve unrelated user changes; never discard, hide, stash, or reformat them.
- Do not mix feature work, broad refactors, dependency upgrades, and visual polish.
- Add or update behavior tests before claiming completion.
- Passing tests means ready for Sol XHigh review, not accepted.
- Safety-critical facts come from deterministic rules, trusted APIs, or verified route data—not solely from an LLM.
- Do not deploy, publish, delete data, perform irreversible migrations, or alter production configuration without human approval.
- Do not hide failed tests, known defects, uncertainty, or risk.

## 5. Proportional engineering

- Validate realistic input and trust boundaries, but do not build speculative defenses for effectively impossible cases.
- Do not add hashing or SHA-based mechanisms unless a concrete, major risk threatens core functionality and the controller approves the exception.
- Prefer a few explainable invariants over repetitive defensive branches.
- Rubrics are review aids, not mechanical scoring systems or substitutes for judgment.
- Avoid abstractions, dependencies, and compatibility layers that are not required by the active Issue.

## 6. Completion and escalation

Executors deliver `READY_FOR_CONTROLLER_REVIEW`. Sol XHigh returns one of `APPROVED`, `CHANGES_REQUESTED`, `BLOCKED`, or `ESCALATE_TO_HUMAN`. Only Sol XHigh may decide that a PR is mergeable; only the project controller may accept the Goal-level result.
