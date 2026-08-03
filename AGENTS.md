# Trekking Potato — Agent Bootstrap

> This file is the mandatory entry point for every coding agent working in this repository.
> Governance version: `TP-GOV-1.0.0`

## 1. Authority model

- The human user and the controller assistant are the **project controllers**.
- Coding agents are **bounded executors**.
- An executor may investigate or implement only the task explicitly authorized in `docs/tasks/ACTIVE_TASK.md`.
- An executor must never select the next backlog item, expand scope, or declare a task accepted.

## 2. Mandatory reading order

Before inspecting or changing implementation code, read these files in order:

1. `AGENTS.md`
2. `docs/governance/MASTER_PLAN.md`
3. `docs/governance/AGENT_EXECUTION_PROTOCOL.md`
4. `docs/governance/PLAN_SYNC_PROTOCOL.md`
5. `docs/tasks/ACTIVE_TASK.md`
6. The project documents explicitly named by the active task

`docs/governance/MASTER_PLAN.md` is the single source of truth for product direction and priority.
Do not copy its full content into another instruction file.

## 3. Required session handshake

Before modifying code, report:

```text
Governance version:
MASTER_PLAN SHA-256:
ACTIVE_TASK SHA-256:
Active task ID:
Authorized mode: INVESTIGATION | IMPLEMENTATION | REVIEW_FIX
Current branch:
Working tree status:
Baseline commands run:
Blocking inconsistencies:
```

If any required file is missing, the active task is ambiguous, hashes differ from the controller-provided values, or the worktree contains unexplained changes, stop without modifying code.

## 4. Hard rules

- One active task, one primary objective.
- Do not overwrite, discard, stash, or reformat unrelated user changes.
- Do not modify files outside the active task allowlist unless a necessary dependency is documented first.
- Do not mix refactors, visual polish, dependency upgrades, and bug fixes in one task.
- Add or update tests before claiming implementation completion.
- Passing tests means “ready for controller review,” not “accepted.”
- The executor cannot change task status to `VERIFIED` or `DONE`.
- Safety-critical facts must come from deterministic rules, trusted APIs, or verified route data—not solely from an LLM.

## 5. Conflict resolution

Priority order:

1. Explicit instruction from the project controllers for the current turn
2. `docs/tasks/ACTIVE_TASK.md`
3. `docs/governance/AGENT_EXECUTION_PROTOCOL.md`
4. `docs/governance/MASTER_PLAN.md`
5. Existing project documentation
6. Existing code behavior

When documents and code disagree, do not silently choose. Record the drift and follow the active task boundary.
