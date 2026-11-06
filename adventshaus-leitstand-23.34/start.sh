#!/usr/bin/env bash
# Adventshaus · Leitstand — Start (nur lokal, 127.0.0.1)
HERE="$(cd "$(dirname "$0")" && pwd)"
if [ ! -f "$HERE/leitstand.py" ]; then
  echo "FEHLER: leitstand.py liegt nicht neben start.sh (Ordner: $HERE)."
  exit 1
fi
cd "$HERE" || exit 1
echo "==> Leitstand-Ordner: $HERE"
if ! command -v python3 >/dev/null 2>&1; then
  echo "FEHLER: Python 3 fehlt. Installieren (Debian/Ubuntu): sudo apt install python3"
  exit 1
fi
mkdir -p "$HOME/.config/adventshaus" 2>/dev/null
if [ ! -f "$HOME/.config/adventshaus/gist-token" ]; then
  touch "$HOME/.config/adventshaus/gist-token" 2>/dev/null
  chmod 600 "$HOME/.config/adventshaus/gist-token" 2>/dev/null
  echo "==> Token-Datei angelegt (leer): ~/.config/adventshaus/gist-token"
fi
VER="$(grep -o 'HELPER_VERSION = "[^"]*"' leitstand.py | head -1 | sed 's/.*"\(.*\)"/\1/')"
echo "==> Leitstand-Version: ${VER:-unbekannt}  (Ordner: $HERE)"
echo "==> Starte Helfer … der Browser öffnet sich. Dieses Fenster bleibt offen (Strg+C beendet)."
exec python3 -u leitstand.py
