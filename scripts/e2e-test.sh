#!/bin/bash
set -e
export HOME=/tmp/fakehome
LEGIONI_DIR=/legioni
PROJECT=/tmp/fakeproj
PASS=0
FAIL=0

pass() { echo "  PASS: $1"; PASS=$((PASS+1)); }
fail() { echo "  FAIL: $1"; FAIL=$((FAIL+1)); }

setup_team_store() {
  rm -rf $HOME/.legioni
  mkdir -p $HOME/.legioni/roles $HOME/.legioni/lessons
  cp $LEGIONI_DIR/defaults/roles/* $HOME/.legioni/roles/
  cat > $HOME/.legioni/config.json << 'EOF'
{"provider":"opencode-free","models":{"orchestrator":"opencode/deepseek-v4-flash-free","architect":"opencode/deepseek-v4-flash-free","reviewer":"opencode/deepseek-v4-flash-free","implementer":"opencode/north-mini-code-free","test-strategist":"opencode/north-mini-code-free","db-expert":"opencode/north-mini-code-free"}}
EOF
}

setup_project() {
  rm -rf $PROJECT
  mkdir -p $PROJECT
  cd $PROJECT
}

clean_output() {
  rm -rf $HOME/.config
  rm -f $PROJECT/.roorules $PROJECT/opencode.json
  rm -rf $PROJECT/.roo $PROJECT/.legioni
}

# ============================================================
echo ""
echo "=== TEST SUITE: legioni zoocode support ==="
echo ""

# ----------------------------------------------------------
echo "--- GROUP 1: install --host opencode ---"
setup_team_store; setup_project; clean_output
node $LEGIONI_DIR/dist/cli.js install --host opencode 2>&1
[ -d "$HOME/.config/opencode/agents/" ] && pass "opencode agents exist" || fail "opencode agents missing"
[ ! -f "$HOME/.config/Code/User/settings/custom_modes.yaml" ] && pass "no zoocode file" || fail "zoocode file should not exist"
[ -f "$PROJECT/opencode.json" ] && pass "opencode.json exists" || fail "opencode.json missing"

# ----------------------------------------------------------
echo "--- GROUP 2: install --host zoocode ---"
setup_team_store; setup_project; clean_output
node $LEGIONI_DIR/dist/cli.js install --host zoocode 2>&1
[ -f "$HOME/.config/Code/User/settings/custom_modes.yaml" ] && pass "custom_modes.yaml exists" || fail "custom_modes.yaml missing"
[ ! -d "$HOME/.config/opencode/agents/" ] && pass "no opencode agents" || fail "opencode agents should not exist"
[ -f "$PROJECT/.roo/rules/legioni.md" ] && pass ".roo/rules/legioni.md exists" || fail ".roo/rules/legioni.md missing"

# ----------------------------------------------------------
echo "--- GROUP 3: install default (both) ---"
setup_team_store; setup_project; clean_output
node $LEGIONI_DIR/dist/cli.js install 2>&1
[ -d "$HOME/.config/opencode/agents/" ] && pass "opencode agents exist" || fail "opencode agents missing"
[ -f "$HOME/.config/Code/User/settings/custom_modes.yaml" ] && pass "custom_modes.yaml exists" || fail "custom_modes.yaml missing"
COUNT=$(ls "$HOME/.config/opencode/agents/" | wc -l)
[ "$COUNT" -eq 6 ] && pass "6 opencode agent files" || fail "expected 6 agents, got $COUNT"
MODECOUNT=$(grep -c '^\s*- slug:' "$HOME/.config/Code/User/settings/custom_modes.yaml" 2>/dev/null || echo 0)
[ "$MODECOUNT" -eq 6 ] && pass "6 zoocode modes" || fail "expected 6 modes, got $MODECOUNT"

# ----------------------------------------------------------
echo "--- GROUP 4: content correctness ---"
setup_team_store; setup_project; clean_output
node $LEGIONI_DIR/dist/cli.js install --host zoocode 2>&1

YAML="$HOME/.config/Code/User/settings/custom_modes.yaml"
while read line; do
  if echo "$line" | grep -q '^PASS:'; then
    pass "${line#PASS: }"
  else
    fail "${line#FAIL: }"
  fi
done < <(node $LEGIONI_DIR/scripts/verify-groups.js "$YAML")

# ----------------------------------------------------------
echo "--- GROUP 5: merge with existing modes ---"
setup_team_store; setup_project; clean_output
node $LEGIONI_DIR/dist/cli.js install --host zoocode 2>&1

# Add a fake non-legioni mode
cat > $HOME/.config/Code/User/settings/custom_modes.yaml << 'YAMLEOF'
customModes:
  - slug: my-custom
    name: My Custom Mode
    roleDefinition: |
      I am a custom mode.
    groups:
      - read
YAMLEOF

node $LEGIONI_DIR/dist/cli.js install --host zoocode 2>&1
grep -q 'my-custom' "$HOME/.config/Code/User/settings/custom_modes.yaml" && pass "existing mode preserved" || fail "existing mode lost"
grep -q 'orchestrator' "$HOME/.config/Code/User/settings/custom_modes.yaml" && pass "legioni mode added" || fail "legioni mode missing"
TOTALMODES=$(grep -c '^\s*- slug:' "$HOME/.config/Code/User/settings/custom_modes.yaml" 2>/dev/null || echo 0)
[ "$TOTALMODES" -ge 7 ] && pass "at least 7 modes (6 legioni + 1 custom)" || fail "only $TOTALMODES modes found"

# ----------------------------------------------------------
echo "--- GROUP 6: round-trip YAML idempotency ---"
setup_team_store; setup_project; clean_output
node $LEGIONI_DIR/dist/cli.js install --host zoocode 2>&1
FIRST=$(md5sum "$HOME/.config/Code/User/settings/custom_modes.yaml" | cut -d' ' -f1)
node $LEGIONI_DIR/dist/cli.js install --host zoocode 2>&1
SECOND=$(md5sum "$HOME/.config/Code/User/settings/custom_modes.yaml" | cut -d' ' -f1)
[ "$FIRST" = "$SECOND" ] && pass "YAML idempotent (reinstall unchanged)" || fail "YAML changed on reinstall ($FIRST != $SECOND)"

# ----------------------------------------------------------
echo "--- GROUP 7: JSON legacy migration ---"
setup_team_store; setup_project; clean_output
mkdir -p "$(dirname "$HOME/.config/Code/User/settings/custom_modes.json")"
cat > "$HOME/.config/Code/User/settings/custom_modes.json" << 'JSONEOF'
{
  "customModes": [
    {
      "slug": "legacy-mode",
      "name": "Legacy Mode",
      "roleDefinition": "I am from JSON",
      "groups": ["read"]
    }
  ]
}
JSONEOF
node $LEGIONI_DIR/dist/cli.js install --host zoocode 2>&1
[ -f "$HOME/.config/Code/User/settings/custom_modes.yaml" ] && pass "YAML created from JSON migration" || fail "YAML not created"
grep -q 'legacy-mode' "$HOME/.config/Code/User/settings/custom_modes.yaml" && pass "legacy JSON mode preserved" || fail "legacy JSON mode lost"
grep -q 'orchestrator' "$HOME/.config/Code/User/settings/custom_modes.yaml" && pass "legioni modes added alongside legacy" || fail "legioni modes missing"
[ -f "$HOME/.config/Code/User/settings/custom_modes.json.legioni-bak" ] && pass "old JSON backed up" || fail "old JSON not backed up"

# ----------------------------------------------------------
echo "--- GROUP 8: corrupted YAML handling ---"
setup_team_store; setup_project; clean_output
mkdir -p "$(dirname "$HOME/.config/Code/User/settings/custom_modes.yaml")"
echo "this is not yaml ::: {{{ broken" > "$HOME/.config/Code/User/settings/custom_modes.yaml"
node $LEGIONI_DIR/dist/cli.js install --host zoocode 2>&1
grep -q 'slug: orchestrator' "$HOME/.config/Code/User/settings/custom_modes.yaml" 2>/dev/null && pass "recovered from corrupted YAML" || fail "failed to recover from corrupted YAML"

# ----------------------------------------------------------
echo "--- GROUP 9: init --host opencode ---"
setup_team_store; setup_project; clean_output
node $LEGIONI_DIR/dist/cli.js init --host opencode 2>&1
[ -d "$HOME/.config/opencode/agents/" ] && pass "init opencode agents exist" || fail "init opencode agents missing"
[ ! -f "$HOME/.config/Code/User/settings/custom_modes.yaml" ] && pass "init no zoocode file" || fail "init zoocode file should not exist"

# ----------------------------------------------------------
echo "--- GROUP 10: init --host zoocode ---"
setup_team_store; setup_project; clean_output
node $LEGIONI_DIR/dist/cli.js init --host zoocode 2>&1
[ -f "$HOME/.config/Code/User/settings/custom_modes.yaml" ] && pass "init zoocode modes exist" || fail "init zoocode modes missing"
[ ! -d "$HOME/.config/opencode/agents/" ] && pass "init no opencode agents" || fail "init opencode agents should not exist"

# ----------------------------------------------------------
echo "--- GROUP 11: init default (both) ---"
setup_team_store; setup_project; clean_output
node $LEGIONI_DIR/dist/cli.js init 2>&1
[ -d "$HOME/.config/opencode/agents/" ] && pass "init both: opencode exist" || fail "init both: opencode missing"
[ -f "$HOME/.config/Code/User/settings/custom_modes.yaml" ] && pass "init both: zoocode exist" || fail "init both: zoocode missing"

# ----------------------------------------------------------
echo "--- GROUP 12: update --host opencode ---"
setup_team_store; setup_project; clean_output
mkdir -p "$PROJECT/.git/info"
node $LEGIONI_DIR/dist/cli.js update --host opencode 2>&1
[ -d "$HOME/.config/opencode/agents/" ] && pass "update opencode agents exist" || fail "update opencode agents missing"
[ ! -f "$HOME/.config/Code/User/settings/custom_modes.yaml" ] && pass "update no zoocode file" || fail "update zoocode file should not exist"

# ----------------------------------------------------------
echo "--- GROUP 13: update --host zoocode ---"
setup_team_store; setup_project; clean_output
mkdir -p "$PROJECT/.git/info"
node $LEGIONI_DIR/dist/cli.js update --host zoocode 2>&1
[ -f "$HOME/.config/Code/User/settings/custom_modes.yaml" ] && pass "update zoocode modes exist" || fail "update zoocode modes missing"
[ ! -d "$HOME/.config/opencode/agents/" ] && pass "update no opencode agents" || fail "update opencode agents should not exist"

# ----------------------------------------------------------
echo "--- GROUP 14: YAML block scalar indentation ---"
setup_team_store; setup_project; clean_output
node $LEGIONI_DIR/dist/cli.js install --host zoocode 2>&1
# Content lines in block scalar must be at >=6 spaces deep
BAD=$(grep -n '^  [a-zA-Z#\`]' "$HOME/.config/Code/User/settings/custom_modes.yaml" | grep -v '^\d\+:  - slug' | grep -v '^  customModes' | head -5)
if [ -z "$BAD" ]; then
  pass "no under-indented YAML content"
else
  fail "under-indented YAML found: $BAD"
fi

# ----------------------------------------------------------
echo ""
echo "================================================"
echo "RESULTS: $PASS passed, $FAIL failed"
echo "================================================"
if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
