#!/usr/bin/env bash
set -euo pipefail

required=(
  "AGENTS.md"
  "docs/governance/MASTER_PLAN.md"
  "docs/governance/AGENT_EXECUTION_PROTOCOL.md"
  "docs/governance/PLAN_SYNC_PROTOCOL.md"
  "docs/tasks/ACTIVE_TASK.md"
)

for file in "${required[@]}"; do
  if [[ ! -f "$file" ]]; then
    echo "SYNC_BLOCKED: missing $file" >&2
    exit 1
  fi
done

hash_file() {
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$1" | awk '{print $1}'
  else
    shasum -a 256 "$1" | awk '{print $1}'
  fi
}

plan_version=$(grep -E '^- Plan version:' docs/governance/MASTER_PLAN.md | head -1 | sed 's/.*`\([^`]*\)`.*/\1/')
task_id=$(grep -E '^- Task ID:' docs/tasks/ACTIVE_TASK.md | head -1 | sed 's/.*`\([^`]*\)`.*/\1/')
mode=$(grep -E '^- Authorized mode:' docs/tasks/ACTIVE_TASK.md | head -1 | sed 's/.*`\([^`]*\)`.*/\1/')

echo "Governance version: TP-GOV-1.0.0"
echo "Plan version: ${plan_version:-UNKNOWN}"
echo "MASTER_PLAN SHA-256: $(hash_file docs/governance/MASTER_PLAN.md)"
echo "ACTIVE_TASK SHA-256: $(hash_file docs/tasks/ACTIVE_TASK.md)"
echo "Active task ID: ${task_id:-UNKNOWN}"
echo "Authorized mode: ${mode:-UNKNOWN}"
