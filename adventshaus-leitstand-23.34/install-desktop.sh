#!/usr/bin/env bash
# Einmalig installieren: zwei Desktop-Knöpfe mit dem tatsächlichen Ordnerpfad.
HERE="$(cd "$(dirname "$0")" && pwd)"
mkdir -p "$HOME/.config/adventshaus" 2>/dev/null
if [ ! -f "$HOME/.config/adventshaus/gist-token" ]; then
  touch "$HOME/.config/adventshaus/gist-token" 2>/dev/null
  chmod 600 "$HOME/.config/adventshaus/gist-token" 2>/dev/null
fi
DESK="$HOME/Schreibtisch"
[ -d "$DESK" ] || DESK="$HOME/Desktop"
mkdir -p "$DESK" 2>/dev/null
FILE="$DESK/Adventshaus-Leitstand.desktop"
cat > "$FILE" <<EOF
[Desktop Entry]
Type=Application
Name=Adventshaus · Leitstand
GenericName=KI-Übergabe
Comment=Startet den Leitstand (Helfer + Browser) – nur lokal
Exec=bash "$HERE/start.sh"
Icon=applications-system
Terminal=false
Categories=Utility;
EOF
chmod +x "$FILE" 2>/dev/null
STOPFILE="$DESK/Adventshaus-Leitstand-beenden.desktop"
cat > "$STOPFILE" <<EOF
[Desktop Entry]
Type=Application
Name=Adventshaus · Leitstand beenden
GenericName=Prozess stoppen
Comment=Beendet den Leitstand-Helfer sicher (das Spiel bleibt laufen)
Exec=bash "$HERE/stop.sh"
Icon=application-exit
Terminal=false
Categories=Utility;
EOF
chmod +x "$STOPFILE" 2>/dev/null
if command -v gio >/dev/null 2>&1; then
  for F in "$FILE" "$STOPFILE"; do
    gio set "$F" metadata::trusted true 2>/dev/null || true
    gio set "$F" kde::trusted true 2>/dev/null || true
  done
fi
echo "==> Fertig. Zwei Icons auf dem Schreibtisch (Ordner: $HERE)"
echo "Falls ein Doppelklick nichts tut: Rechtsklick → „Launch erlauben“ → Doppelklick."
