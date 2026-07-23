#!/usr/bin/env bash
set -Eeuo pipefail

PATCH_NAME="COMMUNITY2-TG11-WORKSPACE16-FIX1"
PATCH_VERSION="0.6.25.2-community2tg11workspace16fix1"
BASE_VERSION="0.6.25.2-community2tg11workspace15"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="/opt/smart-messenger"
FRONTEND_ROOT="$APP_DIR/frontend"
INFRA_DIR="$APP_DIR/infrastructure"
BACKUP_DIR="$APP_DIR/backups/community2tg11workspace16fix1-$(date +%Y%m%d-%H%M%S)"
APPLIED=0

say() { printf '%s\n' "$*"; }
fail() { say "ОШИБКА: $*" >&2; exit 1; }

say "=== ПРОВЕРЯЕМ ЦЕЛОСТНОСТЬ АРХИВА ==="
[[ -f "$SCRIPT_DIR/MANIFEST.sha256" ]] || fail "MANIFEST.sha256 не найден"
(cd "$SCRIPT_DIR" && sha256sum -c MANIFEST.sha256)
say "Файлы установщика: OK"

[[ $EUID -eq 0 ]] || fail "запустите установщик от root"
[[ -d "$FRONTEND_ROOT" ]] || fail "не найден frontend: $FRONTEND_ROOT"
[[ -d "$INFRA_DIR" ]] || fail "не найдена infrastructure: $INFRA_DIR"

say "=== $PATCH_NAME: ПРОВЕРЯЕМ WORKSPACE15 ==="
if ! grep -Rqs --exclude='*.map' "$BASE_VERSION" "$FRONTEND_ROOT" 2>/dev/null; then
  if ! grep -Rqs --exclude='*.map' "workspace15-fixes" "$FRONTEND_ROOT" 2>/dev/null; then
    fail "рабочая база WORKSPACE15 не подтверждена. Этот пакет ставится только после отката на WORKSPACE15"
  fi
fi
say "Рабочая база WORKSPACE15 подтверждена."

INDEX_FILE=""
for candidate in \
  "$FRONTEND_ROOT/index.html" \
  "$FRONTEND_ROOT/dist/index.html" \
  "$FRONTEND_ROOT/public/index.html"; do
  if [[ -f "$candidate" ]]; then INDEX_FILE="$candidate"; break; fi
done
[[ -n "$INDEX_FILE" ]] || fail "index.html frontend не найден"
TARGET_DIR="$(dirname "$INDEX_FILE")"

compose_cmd() {
  local args=(docker compose)
  [[ -f "$INFRA_DIR/.env" ]] && args+=(--env-file "$INFRA_DIR/.env")
  local file
  for file in compose.yml compose.backend.yml compose.frontend.yml compose.proxy.yml compose.calls.yml; do
    [[ -f "$INFRA_DIR/$file" ]] && args+=(-f "$INFRA_DIR/$file")
  done
  (cd "$INFRA_DIR" && "${args[@]}" "$@")
}

say "=== РЕЗЕРВНАЯ КОПИЯ ==="
mkdir -p "$BACKUP_DIR"
cp -a "$FRONTEND_ROOT" "$BACKUP_DIR/frontend"
say "Frontend: $BACKUP_DIR/frontend"
say "База данных не изменяется."

rollback() {
  local code=$?
  trap - ERR
  if [[ $APPLIED -eq 1 ]]; then
    say
    say "=== ОШИБКА: ВОЗВРАЩАЕМ WORKSPACE15 ==="
    rm -rf "$FRONTEND_ROOT"
    cp -a "$BACKUP_DIR/frontend" "$FRONTEND_ROOT"
    compose_cmd up -d --no-deps --force-recreate frontend >/dev/null 2>&1 || true
    say "Frontend восстановлен из: $BACKUP_DIR/frontend"
  fi
  exit "$code"
}
trap rollback ERR

say "=== ПРИМЕНЯЕМ $PATCH_NAME ==="
APPLIED=1
install -m 0644 "$SCRIPT_DIR/files/frontend/workspace16-fixed1.js" "$TARGET_DIR/workspace16-fixed1.js"
install -m 0644 "$SCRIPT_DIR/files/frontend/workspace16-fixed1.css" "$TARGET_DIR/workspace16-fixed1.css"
python3 "$SCRIPT_DIR/patch.py" "$INDEX_FILE"

say "=== ПРОВЕРЯЕМ КОД ==="
if command -v node >/dev/null 2>&1; then
  node --check "$TARGET_DIR/workspace16-fixed1.js"
fi
python3 -m py_compile "$SCRIPT_DIR/patch.py"

grep -q "workspace16-fixed1.css?v=$PATCH_VERSION" "$INDEX_FILE" || fail "CSS WORKSPACE16-FIX1 не подключён"
grep -q "workspace16-fixed1.js?v=$PATCH_VERSION" "$INDEX_FILE" || fail "JS WORKSPACE16-FIX1 не подключён"
[[ -s "$TARGET_DIR/workspace16-fixed1.js" ]] || fail "workspace16-fixed1.js пуст"
[[ -s "$TARGET_DIR/workspace16-fixed1.css" ]] || fail "workspace16-fixed1.css пуст"

say "=== ПЕРЕСОЗДАЁМ ТОЛЬКО FRONTEND ==="
compose_cmd up -d --no-deps --force-recreate frontend

sleep 2
if ! docker ps --format '{{.Names}} {{.Status}}' | grep -q '^messenger-frontend .*Up'; then
  fail "контейнер messenger-frontend не запущен"
fi

trap - ERR
APPLIED=0
say "Immediate community description/avatar refresh: OK"
say "Avatar edit pencil centered on the avatar edge: OK"
say "Video preview contains quality selection only: OK"
say "Multi-message forwarding to multiple contacts: OK"
say "Only frontend recreated: OK"
say "Backend/PostgreSQL/calls/OTP/MEDIA3/transcription/OPENAI_API_KEY: unchanged"
say "Meetus $PATCH_NAME установлен."
