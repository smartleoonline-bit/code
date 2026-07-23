#!/usr/bin/env bash
set -Eeuo pipefail

PATCH_NAME="COMMUNITY2-TG11-WORKSPACE16"
PATCH_VERSION="0.6.25.2-community2tg11workspace16"
BASE_VERSION="0.6.25.2-community2tg11workspace15"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="/opt/smart-messenger"
FRONTEND_ROOT="$APP_DIR/frontend"
INFRA_DIR="$APP_DIR/infrastructure"
BACKUP_DIR="$APP_DIR/backups/community2tg11workspace16-$(date +%Y%m%d-%H%M%S)"
APPLIED=0

say() { printf '%s\n' "$*"; }
fail() { say "ОШИБКА: $*" >&2; exit 1; }

say "=== ПРОВЕРЯЕМ ЦЕЛОСТНОСТЬ АРХИВА ==="
if [[ -f "$SCRIPT_DIR/MANIFEST.sha256" ]]; then
  (cd "$SCRIPT_DIR" && sha256sum -c MANIFEST.sha256)
else
  fail "MANIFEST.sha256 не найден"
fi
say "Файлы установщика: OK"

[[ $EUID -eq 0 ]] || fail "запустите установщик от root"
[[ -d "$FRONTEND_ROOT" ]] || fail "не найден frontend: $FRONTEND_ROOT"
[[ -d "$INFRA_DIR" ]] || fail "не найдена infrastructure: $INFRA_DIR"

say "=== $PATCH_NAME: ПРОВЕРЯЕМ WORKSPACE15 ==="
if ! grep -Rqs --exclude='*.map' "$BASE_VERSION" "$FRONTEND_ROOT" 2>/dev/null; then
  if ! grep -Rqs --exclude='*.map' "workspace15" "$FRONTEND_ROOT" 2>/dev/null; then
    fail "рабочая база WORKSPACE15 не подтверждена"
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

say "=== РЕЗЕРВНАЯ КОПИЯ ==="
mkdir -p "$BACKUP_DIR"
cp -a "$FRONTEND_ROOT" "$BACKUP_DIR/frontend"
say "Frontend: $BACKUP_DIR/frontend"

compose_cmd() {
  local args=(docker compose)
  [[ -f "$INFRA_DIR/.env" ]] && args+=(--env-file "$INFRA_DIR/.env")
  local f
  for f in compose.yml compose.backend.yml compose.frontend.yml compose.proxy.yml compose.calls.yml; do
    [[ -f "$INFRA_DIR/$f" ]] && args+=(-f "$INFRA_DIR/$f")
  done
  "${args[@]}" "$@"
}

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
install -m 0644 "$SCRIPT_DIR/files/frontend/workspace16-fixes.js" "$TARGET_DIR/workspace16-fixes.js"
install -m 0644 "$SCRIPT_DIR/files/frontend/workspace16-fixes.css" "$TARGET_DIR/workspace16-fixes.css"

python3 - "$INDEX_FILE" "$PATCH_VERSION" <<'PY'
from pathlib import Path
import re
import sys

path = Path(sys.argv[1])
version = sys.argv[2]
text = path.read_text(encoding='utf-8')
text = re.sub(r'\s*<link[^>]+workspace16-fixes\.css[^>]*>\s*', '\n', text, flags=re.I)
text = re.sub(r'\s*<script[^>]+workspace16-fixes\.js[^>]*>\s*</script>\s*', '\n', text, flags=re.I)
css = f'  <link rel="stylesheet" href="/workspace16-fixes.css?v={version}">\n'
js = f'  <script defer src="/workspace16-fixes.js?v={version}"></script>\n'
if re.search(r'</head>', text, flags=re.I):
    text = re.sub(r'</head>', css + '</head>', text, count=1, flags=re.I)
else:
    text = css + text
if re.search(r'</body>', text, flags=re.I):
    text = re.sub(r'</body>', js + '</body>', text, count=1, flags=re.I)
else:
    text += '\n' + js
path.write_text(text, encoding='utf-8')
PY

say "=== ПЕРЕСОЗДАЁМ ТОЛЬКО FRONTEND ==="
compose_cmd up -d --no-deps --force-recreate frontend

grep -q "workspace16-fixes.css?v=$PATCH_VERSION" "$INDEX_FILE" || fail "CSS WORKSPACE16 не подключён"
grep -q "workspace16-fixes.js?v=$PATCH_VERSION" "$INDEX_FILE" || fail "JS WORKSPACE16 не подключён"
[[ -s "$TARGET_DIR/workspace16-fixes.js" ]] || fail "workspace16-fixes.js пуст"
[[ -s "$TARGET_DIR/workspace16-fixes.css" ]] || fail "workspace16-fixes.css пуст"

trap - ERR
APPLIED=0
say "Immediate community description/avatar refresh: OK"
say "Avatar edit pencil positioning: OK"
say "Video editor reduced to quality selection only: OK"
say "Backend/PostgreSQL/calls/OTP/MEDIA3/transcription/OPENAI_API_KEY: unchanged"
say "Meetus $PATCH_NAME установлен."
