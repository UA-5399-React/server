#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Manual test runner — POST /admin/products/import
# Usage: bash test/import/run-tests.sh [base_url]
# Default base_url: http://localhost:3001
# ---------------------------------------------------------------------------

BASE="${1:-http://localhost:3001}"
DATA="$(dirname "$0")/data"
COOKIES="/tmp/import-test-cookies.txt"
PASS=0
FAIL=0

# Clear stale cookies from previous runs
rm -f "$COOKIES" /tmp/import-test-customer.txt

# ── colours ─────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

pass() { echo -e "${GREEN}  ✓ PASS${RESET} — $1"; ((PASS++)); }
fail() { echo -e "${RED}  ✗ FAIL${RESET} — $1"; echo -e "${RED}    Got: $2${RESET}"; ((FAIL++)); }
section() { echo -e "\n${CYAN}${BOLD}── $1 ──${RESET}"; }

# ── helpers ──────────────────────────────────────────────────────────────────
status_code() {
  curl -s -o /dev/null -w "%{http_code}" -b "$COOKIES" "$@"
}

post_import() {
  curl -s -b "$COOKIES" -X POST "$BASE/admin/products/import" "$@"
}

json_field() {
  # $1 = json string, $2 = field name
  echo "$1" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('$2','__MISSING__'))" 2>/dev/null
}

# ── 0. Check server is up ────────────────────────────────────────────────────
section "0. Server health"
HTTP=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/products" 2>/dev/null)
if [[ "$HTTP" == "200" ]]; then
  pass "Server is reachable at $BASE"
else
  echo -e "${RED}  Server not reachable at $BASE (got HTTP $HTTP). Start with: pnpm run start:dev${RESET}"
  exit 1
fi

# ── 1. Authentication ─────────────────────────────────────────────────────────
section "1. Authentication"

# 1a. No auth → 401
CODE=$(status_code -X POST "$BASE/admin/products/import")
[[ "$CODE" == "401" ]] && pass "No auth → 401" || fail "No auth → 401" "HTTP $CODE"

# 1b. Login as admin
LOGIN=$(curl -s -c "$COOKIES" -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@admin.com","password":"admin123"}' 2>/dev/null)
if echo "$LOGIN" | grep -q "success"; then
  pass "Admin login succeeded"
else
  echo -e "${RED}  Admin login failed — check credentials / seeded DB${RESET}"
  exit 1
fi

# 1c. Customer role → 403
CUST_COOKIES="/tmp/import-test-customer.txt"
curl -s -c "$CUST_COOKIES" -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"customer@test.com","password":"customer123"}' > /dev/null 2>&1

CODE=$(status_code -b "$CUST_COOKIES" -X POST "$BASE/admin/products/import" \
  -F "file=@$DATA/01-all-valid.csv;type=text/csv")
[[ "$CODE" == "403" ]] && pass "Customer role → 403 Forbidden" || fail "Customer role → 403 Forbidden" "HTTP $CODE"

# ── 2. File format validation ─────────────────────────────────────────────────
section "2. File format"

# 2a. .txt → 400
RESP=$(post_import -F "file=@$DATA/05-wrong-format.txt;type=text/plain")
CODE=$(echo "$RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('statusCode',''))" 2>/dev/null)
[[ "$CODE" == "400" ]] && pass ".txt file → 400 Bad Request" || fail ".txt file → 400 Bad Request" "$RESP"

MSG=$(echo "$RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('message',''))" 2>/dev/null)
[[ "$MSG" == *"Unsupported file format"* ]] && pass "Error message mentions 'Unsupported file format'" || fail "Error message mentions 'Unsupported file format'" "$MSG"

# 2b. No file at all → should return error (not 500)
RESP=$(post_import)
CODE=$(echo "$RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('statusCode',''))" 2>/dev/null)
[[ "$CODE" != "500" ]] && pass "No file → non-500 response (got $CODE)" || fail "No file → non-500 response" "got 500"

# ── 3. CSV — happy path ───────────────────────────────────────────────────────
section "3. CSV — all valid rows"

RESP=$(post_import -F "file=@$DATA/01-all-valid.csv;type=text/csv")
IMPORTED=$(json_field "$RESP" "imported")
FAILED=$(echo "$RESP" | python3 -c "import sys,json; print(len(json.load(sys.stdin).get('failed',[])))" 2>/dev/null)

[[ "$IMPORTED" == "4" ]] && pass "CSV: 4 rows imported" || fail "CSV: 4 rows imported" "got imported=$IMPORTED"
[[ "$FAILED" == "0" ]] && pass "CSV: 0 rows failed" || fail "CSV: 0 rows failed" "got failed=$FAILED"

# ── 4. CSV — mixed rows ────────────────────────────────────────────────────────
section "4. CSV — mixed valid/invalid rows"

RESP=$(post_import -F "file=@$DATA/02-mixed-valid-invalid.csv;type=text/csv")
IMPORTED=$(json_field "$RESP" "imported")
FAILED=$(echo "$RESP" | python3 -c "import sys,json; print(len(json.load(sys.stdin).get('failed',[])))" 2>/dev/null)
ROWS=$(echo "$RESP" | python3 -c "import sys,json; print([f['row'] for f in json.load(sys.stdin).get('failed',[])])" 2>/dev/null)
REASONS=$(echo "$RESP" | python3 -c "import sys,json; print([f['reason'] for f in json.load(sys.stdin).get('failed',[])])" 2>/dev/null)

[[ "$IMPORTED" == "4" ]] && pass "CSV mixed: 4 valid rows imported" || fail "CSV mixed: 4 valid rows imported" "got $IMPORTED"
[[ "$FAILED" == "5" ]] && pass "CSV mixed: 5 rows failed" || fail "CSV mixed: 5 rows failed" "got $FAILED — rows: $ROWS"
[[ "$ROWS" == *"3"* ]] && pass "CSV mixed: row 3 (missing title) is in failed" || fail "CSV mixed: row 3 in failed" "$ROWS"
[[ "$ROWS" == *"6"* ]] && pass "CSV mixed: row 6 (bad price) is in failed" || fail "CSV mixed: row 6 in failed" "$ROWS"
[[ "$ROWS" == *"7"* ]] && pass "CSV mixed: row 7 (missing status) is in failed" || fail "CSV mixed: row 7 in failed" "$ROWS"
[[ "$ROWS" == *"8"* ]] && pass "CSV mixed: row 8 (wrong status 'published') is in failed" || fail "CSV mixed: row 8 in failed" "$ROWS"
[[ "$ROWS" == *"10"* ]] && pass "CSV mixed: row 10 (negative price) is in failed" || fail "CSV mixed: row 10 in failed" "$ROWS"
[[ "$REASONS" == *"title"* ]] && pass "CSV mixed: reason mentions 'title'" || fail "CSV mixed: reason mentions 'title'" "$REASONS"
[[ "$REASONS" == *"price"* ]] && pass "CSV mixed: reason mentions 'price'" || fail "CSV mixed: reason mentions 'price'" "$REASONS"
[[ "$REASONS" == *"status"* ]] && pass "CSV mixed: reason mentions 'status'" || fail "CSV mixed: reason mentions 'status'" "$REASONS"

# ── 5. CSV — all invalid ──────────────────────────────────────────────────────
section "5. CSV — all rows invalid"

RESP=$(post_import -F "file=@$DATA/03-all-invalid.csv;type=text/csv")
IMPORTED=$(json_field "$RESP" "imported")
FAILED=$(echo "$RESP" | python3 -c "import sys,json; print(len(json.load(sys.stdin).get('failed',[])))" 2>/dev/null)

[[ "$IMPORTED" == "0" ]] && pass "CSV all-invalid: 0 imported" || fail "CSV all-invalid: 0 imported" "got $IMPORTED"
[[ "$FAILED" == "5" ]] && pass "CSV all-invalid: 5 failures reported" || fail "CSV all-invalid: 5 failures" "got $FAILED"

# ── 6. CSV — headers only (empty) ─────────────────────────────────────────────
section "6. CSV — empty file (headers only)"

RESP=$(post_import -F "file=@$DATA/04-empty-headers-only.csv;type=text/csv")
IMPORTED=$(json_field "$RESP" "imported")
FAILED=$(echo "$RESP" | python3 -c "import sys,json; print(len(json.load(sys.stdin).get('failed',[])))" 2>/dev/null)

[[ "$IMPORTED" == "0" ]] && pass "Empty CSV: 0 imported" || fail "Empty CSV: 0 imported" "got $IMPORTED"
[[ "$FAILED" == "0" ]] && pass "Empty CSV: 0 failed" || fail "Empty CSV: 0 failed" "got $FAILED"

# ── 7. XLSX — happy path ──────────────────────────────────────────────────────
section "7. XLSX — all valid rows"

RESP=$(post_import \
  -F "file=@$DATA/06-all-valid.xlsx;type=application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
IMPORTED=$(json_field "$RESP" "imported")
FAILED=$(echo "$RESP" | python3 -c "import sys,json; print(len(json.load(sys.stdin).get('failed',[])))" 2>/dev/null)

[[ "$IMPORTED" == "4" ]] && pass "XLSX: 4 rows imported" || fail "XLSX: 4 rows imported" "got $IMPORTED"
[[ "$FAILED" == "0" ]] && pass "XLSX: 0 rows failed" || fail "XLSX: 0 rows failed" "got $FAILED"

# ── 8. XLSX — mixed rows ──────────────────────────────────────────────────────
section "8. XLSX — mixed valid/invalid rows"

RESP=$(post_import \
  -F "file=@$DATA/07-mixed-valid-invalid.xlsx;type=application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
IMPORTED=$(json_field "$RESP" "imported")
FAILED=$(echo "$RESP" | python3 -c "import sys,json; print(len(json.load(sys.stdin).get('failed',[])))" 2>/dev/null)
ROWS=$(echo "$RESP" | python3 -c "import sys,json; print([f['row'] for f in json.load(sys.stdin).get('failed',[])])" 2>/dev/null)

[[ "$IMPORTED" == "3" ]] && pass "XLSX mixed: 3 valid rows imported" || fail "XLSX mixed: 3 valid rows imported" "got $IMPORTED"
[[ "$FAILED" == "4" ]] && pass "XLSX mixed: 4 rows failed" || fail "XLSX mixed: 4 rows failed" "got $FAILED"
[[ "$ROWS" == *"3"* ]] && pass "XLSX mixed: row 3 (no title) in failed" || fail "XLSX mixed: row 3 in failed" "$ROWS"
[[ "$ROWS" == *"5"* ]] && pass "XLSX mixed: row 5 (bad price) in failed" || fail "XLSX mixed: row 5 in failed" "$ROWS"
[[ "$ROWS" == *"6"* ]] && pass "XLSX mixed: row 6 (no status) in failed" || fail "XLSX mixed: row 6 in failed" "$ROWS"
[[ "$ROWS" == *"7"* ]] && pass "XLSX mixed: row 7 (wrong status) in failed" || fail "XLSX mixed: row 7 in failed" "$ROWS"

# ── 9. DB persistence check ───────────────────────────────────────────────────
section "9. DB persistence — imported products exist"

RESP=$(curl -s -b "$COOKIES" "$BASE/products?search=XLSX+Widget+Alpha&status=active" 2>/dev/null)
COUNT=$(echo "$RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('total',0))" 2>/dev/null)
[[ "$COUNT" -ge "1" ]] 2>/dev/null && pass "DB: 'XLSX Widget Alpha' found in products" || fail "DB: 'XLSX Widget Alpha' found" "total=$COUNT"

RESP=$(curl -s -b "$COOKIES" "$BASE/products?search=Widget+Alpha&status=active" 2>/dev/null)
COUNT=$(echo "$RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('total',0))" 2>/dev/null)
[[ "$COUNT" -ge "1" ]] 2>/dev/null && pass "DB: 'Widget Alpha' (CSV) found in products" || fail "DB: 'Widget Alpha' (CSV) found" "total=$COUNT"

# ── summary ──────────────────────────────────────────────────────────────────
TOTAL=$((PASS + FAIL))
echo ""
echo -e "${BOLD}────────────────────────────────────────${RESET}"
echo -e "${BOLD}Results: $TOTAL tests — ${GREEN}$PASS passed${RESET}${BOLD}, ${RED}$FAIL failed${RESET}"
echo -e "${BOLD}────────────────────────────────────────${RESET}"

[[ "$FAIL" -eq 0 ]] && exit 0 || exit 1
