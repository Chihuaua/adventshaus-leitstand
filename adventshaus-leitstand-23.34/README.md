# Adventshaus · Leitstand — Version 23.34

Eigenständiges Leitstand-Fenster für den KI-Ablauf am Adventshaus.
Die GUI funktioniert ohne Node-Build; der Python-Helfer lauscht nur auf
127.0.0.1 und führt ausschließlich feste Aktionen aus.

## Inhalt des ZIP
- index.html: aktuelle GUI, inline JavaScript, funktioniert auch per Doppelklick
- style.css: dieselbe Gestaltung als Referenzdatei
- leitstand.js: dieselbe Aktionslogik als Referenzdatei
- leitstand.py: lokaler Helfer mit fester API und Git-/Gist-Aktionen
- start.sh / stop.sh / install-desktop.sh: Start, sicheres Beenden, Desktop-Knöpfe
- einstellungen.json: Projektpfade, Kennung, Port, Spiel-Adresse
- README.md und HISTORIE.md: Anleitung und vollständiger Änderungsverlauf

## Start ohne Terminal-Befehle
1. ZIP vollständig entpacken. Die Dateien müssen zusammen in einem Ordner liegen.
2. Einmalig install-desktop.sh ausführen. Danach gibt es zwei Desktop-Knöpfe.
3. „Adventshaus · Leitstand“ doppelklicken. Der Browser öffnet
   http://127.0.0.1:8790/. Beenden über den zweiten Desktop-Knopf.

Alternativ: bash start.sh oder python3 leitstand.py im entpackten Ordner.
Voraussetzung: Python 3; für Spiel/Build zusätzlich Node/npm, für Pull Requests gh.

## Eigene Einstellungen
Wer von den mitgelieferten Pfaden abweicht, sichert vor dem Überschreiben seine
einstellungen.json und seine HAND-Notiz in docs/UEBERGABE.md. Wer wie bisher den
kompletten Ordner und die Desktop-Knöpfe löscht und danach neu installiert, kann
das weiter tun; die Token-Datei liegt außerhalb und bleibt erhalten:
~/.config/adventshaus/gist-token (Rechte 600). Token niemals in die ZIP legen.

## Demo und Echtbetrieb
Doppelklick auf index.html ohne Helfer: gelber Demo-Banner, nur Simulation.
Mit Helfer: grüner Banner mit Version und Ordner; die Knöpfe rufen die echte API.
Nach jedem Dateiaustausch Helfer beenden und neu starten. Versionsnummer prüfen.

## ZIP und Entwickler-Info
„ZIP laden“ erzeugt aus den eingebetteten Quellen erneut das vollständige Paket
mit Helfer und fortlaufender Versionsnummer. „Entwickler-Info (TXT)“ enthält den
vollständigen Quellcode aller Komponenten und die gesamte HISTORIE.md.
