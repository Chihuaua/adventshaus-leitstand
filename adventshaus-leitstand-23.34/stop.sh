#!/usr/bin/env bash
# Beendet NUR den Python-Leitstand, nicht das Spiel oder andere Programme.
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"
cd "$HERE" || exit 1
ist_helfer() {
  [ -r "/proc/$1/cmdline" ] || return 1
  CMD="$(tr '\0' ' ' < "/proc/$1/cmdline" 2>/dev/null)"
  case "$CMD" in
    *leitstand.py*) case "$CMD" in python*|*/python*) return 0 ;; *) return 1 ;; esac ;;
    *) return 1 ;;
  esac
}
BEENDET=""
if [ -f leitstand.pid ]; then
  PID="$(tr -dc '0-9' < leitstand.pid 2>/dev/null)"
  if [ -n "$PID" ] && kill -0 "$PID" 2>/dev/null && ist_helfer "$PID"; then
    kill "$PID" 2>/dev/null
    i=0; while [ $i -lt 5 ] && kill -0 "$PID" 2>/dev/null; do sleep 1; i=$((i+1)); done
    kill -9 "$PID" 2>/dev/null
    BEENDET="$PID"
  fi
  rm -f leitstand.pid
fi
for P in $(pgrep -f "leitst[a]nd[.]py" 2>/dev/null); do
  [ "$P" = "$$" ] && continue
  ist_helfer "$P" || continue
  kill "$P" 2>/dev/null
  BEENDET="$BEENDET $P"
done
sleep 1
for P in $(pgrep -f "leitst[a]nd[.]py" 2>/dev/null); do
  [ "$P" = "$$" ] && continue
  ist_helfer "$P" || continue
  kill -9 "$P" 2>/dev/null
done
sleep 1
REST=""
for P in $(pgrep -f "leitst[a]nd[.]py" 2>/dev/null); do
  ist_helfer "$P" && REST="$REST $P"
done
if [ -z "${REST// /}" ]; then
  TEXT="Adventshaus · Leitstand ist beendet. ${BEENDET}"
else
  TEXT="Achtung: der Helfer läuft noch:$REST"
fi
echo "$TEXT"
if [ -n "${DISPLAY:-}" ]; then
  if command -v zenity >/dev/null 2>&1; then
    zenity --info --title="Adventshaus · Leitstand" --width=340 --text="$TEXT" 2>/dev/null && exit 0
  fi
  if command -v kdialog >/dev/null 2>&1; then
    kdialog --title "Adventshaus · Leitstand" --msgbox "$TEXT" 2>/dev/null && exit 0
  fi
  if command -v xmessage >/dev/null 2>&1; then
    xmessage -center -timeout 15 "$TEXT" 2>/dev/null && exit 0
  fi
  for T in gnome-terminal konsole xterm; do
    if command -v "$T" >/dev/null 2>&1; then
      "$T" -- bash -c "printf '%s\n\n' '$TEXT'; read -r -p 'Enter schließt …'" 2>/dev/null \
        || "$T" -e bash -c "printf '%s\n\n' '$TEXT'; read -r -p 'Enter schließt …'" 2>/dev/null
      exit 0
    fi
  done
fi
echo "Hinweis: kein Fenster möglich – Meldung nur hier."
