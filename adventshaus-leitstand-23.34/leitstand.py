#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Adventshaus · Leitstand — lokaler Helfer, nur 127.0.0.1 und feste Aktionen."""
import json, os, re, time, subprocess, hashlib, webbrowser, signal, shutil, tempfile
import http.server, socketserver, urllib.request, urllib.error, urllib.parse

HERE = os.path.dirname(os.path.abspath(__file__))
HOME = os.path.expanduser("~")
TOKEN_PATH = os.path.join(HOME, ".config", "adventshaus", "gist-token")
KNOPF = os.path.join(HOME, "adventshaus-knopf.sh")
GIST_ID = "f28cc85bf67f8a7f2fa6251a2092a33c"
GIST_API = "https://api.github.com/gists/" + GIST_ID
GIST_URL = "https://gist.github.com/Chihuaua/" + GIST_ID
REPO_URL = "https://github.com/Chihuaua/adventshaus"
CONFIG = os.path.join(HERE, "einstellungen.json")
PID_FILE = os.path.join(HERE, "leitstand.pid")
HELPER_VERSION = "23.34"
GUI_HINT = "23.34"
GAME_PROC = None
GAME_LOG = os.path.join(tempfile.gettempdir(), "adventshaus-spiel.log")


def load_config():
    d = {"projekt": "~/projekte/adventshaus", "sicherung": "~/sicherung/adventshaus.git",
         "ablage": "~/adventshaus-postfach", "kennung": "KI-B", "port": 8790,
         "spiel_url": "http://localhost:5173/"}
    try:
        with open(CONFIG, encoding="utf-8") as f:
            d.update(json.load(f))
    except Exception:
        pass
    for k in ("projekt", "sicherung", "ablage"):
        d[k] = os.path.expanduser(str(d[k]))
    return d


CFG = load_config()


def read_token():
    try:
        with open(TOKEN_PATH, encoding="utf-8") as f:
            return f.read().strip()
    except Exception:
        return ""


def scrub(text, token=""):
    text = text if isinstance(text, str) else str(text)
    if token:
        text = text.replace(token, "Authorization: ***")
    return re.sub(r"gh[pousr]_[A-Za-z0-9]+", "gh***", text)


def run(cmd, cwd=None, input_text=None, token="", timeout=180, limit=4000):
    try:
        r = subprocess.run(cmd, cwd=cwd, input=input_text, capture_output=True,
                           text=True, timeout=timeout)
        out = scrub((r.stdout or "") + (r.stderr or ""), token).strip()
        if limit is not None:
            out = out[:limit]
        return {"ok": r.returncode == 0, "code": r.returncode, "out": out}
    except subprocess.TimeoutExpired:
        return {"ok": False, "code": -1, "out": "Zeitüberschreitung nach %s s" % timeout}
    except Exception as e:
        return {"ok": False, "code": -1, "out": scrub(str(e), token)}


def git_klar(text):
    if not text:
        return ""
    t = re.split(r"Hinweis:|hint:|Disable this message", str(text).replace("\n", " "))[0].strip()
    pfade = []
    for p in re.findall(r"[\w./-]+\.(?:md|ts|tsx|js|jsx|json|css|html|py|sh|mjs)", t):
        if p not in pfade:
            pfade.append(p)
    betroffen = (" Betroffen: " + ", ".join(pfade[:3]) + ".") if pfade else ""
    muster = [
        (r"bereitgestellt|already (exists|present)|would be overwritten|bereits vorhanden",
         "Der Patch führt eine Datei als neu ein, die es im Projekt schon gibt.",
         "Die KI muss den Patch auf den aktuellen Stand neu aufsetzen."),
        (r"konnte nicht angewendet|nicht angewendet|Anwendung des Patches fehlgeschlagen|does not apply|Patch failed|CONFLICT|Konflikt",
         "Der Patch passt nicht zum aktuellen Stand.", "Die KI muss ihn neu aufsetzen."),
        (r"another git am|am process already running|rebase-apply",
         "Es steckt noch ein unvollendeter Patch-Vorgang im Projekt.",
         "„Stand prüfen“ räumt das beim nächsten Aufruf auf."),
        (r"not a git repository|Kein Git-Repository",
         "Der Projektordner ist kein Git-Repository.", "Pfad „projekt“ in einstellungen.json prüfen."),
        (r"must be run in a work tree|Arbeitsverzeichnis",
         "Diese Operation braucht ein Arbeitsverzeichnis; der Ordner ist ein Bare-Repository.",
         "Sicherungspfad prüfen."),
        (r"nothing to commit|nichts zu committen", "Es gibt nichts zu speichern.", ""),
        (r"Permission denied|Zugriff verweigert", "Keine Schreibberechtigung.", "Ordnerrechte prüfen."),
        (r"could not resolve host|Could not resolve", "Kein Internetzugang zu GitHub.", "Verbindung prüfen."),
        (r"timed out|Timeout|Zeitüberschreitung", "Ein Schritt hat zu lange gedauert.", "Verbindung prüfen und erneut versuchen."),
    ]
    for pat, klar, loesung in muster:
        if re.search(pat, t, re.I):
            return klar + betroffen + ((" " + loesung) if loesung else "")
    kurz = re.sub(r"^(?:Fehler|error|fatal):\s*", "", t).strip()
    return "Git meldet: " + kurz[:160] + betroffen


def _git_ident(proj):
    if run(["git", "config", "user.email"], cwd=proj)["out"].strip():
        return ["git"]
    return ["git", "-c", "user.email=leitstand@lokal", "-c", "user.name=Leitstand"]


def _commit_ident(proj):
    return _git_ident(proj) + ["commit"]


def git_geraeumig(proj):
    try:
        gd = run(["git", "rev-parse", "--git-dir"], cwd=proj)["out"].strip()
        if not gd:
            return False
        pfad = gd if os.path.isabs(gd) else os.path.join(proj, gd)
        if os.path.isdir(os.path.join(pfad, "rebase-apply")):
            return run(_git_ident(proj) + ["am", "--abort"], cwd=proj)["ok"]
    except Exception:
        pass
    return False


def _origin_main_kurz(proj, token=""):
    r = run(["git", "ls-remote", "origin", "refs/heads/main"], cwd=proj, token=token, timeout=20)
    if r["ok"] and r["out"].strip():
        return r["out"].split()[0][:7]
    return run(["git", "rev-parse", "--short", "HEAD"], cwd=proj, token=token)["out"].strip()


def _gist_lesen(token):
    req = urllib.request.Request(GIST_API, headers={
        "Authorization": "Bearer " + token, "Accept": "application/vnd.github+json",
        "User-Agent": "Adventshaus-Leitstand"})
    return json.load(urllib.request.urlopen(req, timeout=45))


def _gist_schreiben(files, token):
    req = urllib.request.Request(GIST_API, data=json.dumps({"files": files}).encode(),
        method="PATCH", headers={"Authorization": "Bearer " + token,
        "Accept": "application/vnd.github+json", "User-Agent": "Adventshaus-Leitstand"})
    return json.load(urllib.request.urlopen(req, timeout=60))


def _http_fehler(e, token=""):
    try:
        detail = e.read().decode(errors="ignore")[:240]
    except Exception:
        detail = ""
    return "HTTP %s%s" % (e.code, (": " + scrub(detail, token)) if detail else "")


def _token_fehlt():
    return {"ok": False, "out": "Token fehlt: ~/.config/adventshaus/gist-token.",
            "loesung": "Reiter Einstellungen → Token einfügen → Speichern."}


def act_status():
    return {"helfer": True, "version": HELPER_VERSION, "token": bool(read_token()),
            "knopf": os.path.exists(KNOPF), "ordner": HERE,
            "cfg": {k: CFG.get(k) for k in ("projekt", "sicherung", "ablage", "kennung", "spiel_url")}}


def postfach_basis_check(token, proj):
    if not token:
        return {"ok": True, "out": "kein Token – Postfach-Prüfung übersprungen"}
    try:
        data = _gist_lesen(token)
        try:
            meta = json.loads(((data.get("files") or {}).get("aktuell.json") or {}).get("content") or "{}")
        except Exception:
            meta = {}
        if not meta.get("basis"):
            return {"ok": True, "out": "kein Patch im Postfach"}
        origin = _origin_main_kurz(proj, token)
        basis = str(meta.get("basis", "")).strip()
        if basis == origin:
            return {"ok": True, "out": "Basis %s passt zu GitHub-main" % basis}
        return {"ok": False, "out": "Basis %s ≠ GitHub-main %s – Patch veraltet." % (basis, origin),
                "loesung": "Kein Risiko: Der nächste Patch überschreibt ihn. Optional „Alten Patch entfernen“.",
                "link": GIST_URL, "linkText": "Postfach öffnen"}
    except Exception as e:
        return {"ok": True, "out": "Postfach nicht prüfbar: " + scrub(str(e), token)[:100]}


def act_pruefen():
    proj, token = CFG["projekt"], read_token()
    git_geraeumig(proj)
    steps = [
        ["git status", run(["git", "status", "--porcelain", "-uall"], cwd=proj, token=token)],
        ["HEAD", run(["git", "rev-parse", "--short", "HEAD"], cwd=proj, token=token)],
        ["GitHub main", run(["git", "ls-remote", "origin", "refs/heads/main"], cwd=proj, token=token, timeout=20)],
    ]
    if os.path.isdir(CFG["sicherung"]):
        steps.append(["Sicherung", run(["git", "-C", CFG["sicherung"], "rev-parse", "--short", "refs/heads/main"], token=token)])
    else:
        steps.append(["Sicherung", {"ok": False, "out": "nicht gefunden: " + CFG["sicherung"],
                                    "loesung": "Pfad „sicherung“ in einstellungen.json prüfen."}])
    if os.path.exists(os.path.join(proj, "tools", "check.sh")):
        steps.append(["check.sh", run(["bash", "tools/check.sh"], cwd=proj, token=token)])
    steps.append(["Postfach-Basis", postfach_basis_check(token, proj)])
    return {"ok": all(s[1]["ok"] for s in steps), "steps": [{"name": n, **v} for n, v in steps]}


def _filtere_bereits_vorhandene(patch_text, proj):
    entfernt, rest = [], []
    for b in re.split(r"(?=^diff --git )", patch_text, flags=re.M):
        if not b.strip():
            rest.append(b)
            continue
        m = re.search(r"\+\+\+ b/(\S+)", b)
        if not m:
            rest.append(b)
            continue
        pfad = m.group(1)
        if pfad == "docs/UEBERGABE.md" or ("--- /dev/null" in b and os.path.exists(os.path.join(proj, pfad))):
            entfernt.append(pfad)
        else:
            rest.append(b)
    return "".join(rest), entfernt


def act_ablegen():
    token = read_token()
    if not token:
        return _token_fehlt()
    proj = CFG["projekt"]
    git_geraeumig(proj)
    st = run(["git", "status", "--porcelain", "-uall"], cwd=proj, token=token)
    if not st["ok"]:
        return {"ok": False, "out": "Projekt-Status nicht lesbar: " + git_klar(st["out"]),
                "loesung": "Pfad „projekt“ prüfen – aktuell: " + proj}
    if st["out"].strip():
        zeilen = [z for z in st["out"].splitlines() if z.strip()]
        namen = [z.split(None, 1)[-1] for z in zeilen[:8]]
        return {"ok": False, "out": "Stand nicht sauber – %d offene Änderung(en): %s" % (len(zeilen), ", ".join(namen)),
                "loesung": "Knopf „Offene Änderungen speichern“ drücken, danach erneut ins Postfach legen."}
    patch = run(["git", "format-patch", "-1", "--stdout"], cwd=proj, token=token, limit=None)
    if not patch["ok"] or not patch["out"]:
        return {"ok": False, "out": "Kein Patch erzeugt: " + git_klar(patch["out"])}
    patch_text, entfernt = _filtere_bereits_vorhandene(patch["out"], proj)
    if not re.search(r"^diff --git ", patch_text, flags=re.M):
        return {"ok": True, "info": True,
                "out": "Nichts abgelegt – nur bereits vorhandene Dateien im Patch: " + ", ".join(entfernt)}
    sha16 = hashlib.sha256(patch_text.encode()).hexdigest()[:16]
    basis = run(["git", "rev-parse", "--short", "HEAD"], cwd=proj, token=token)["out"].strip()
    titel = run(["git", "log", "-1", "--pretty=%s"], cwd=proj, token=token)["out"].strip()
    meta = {"datei": "aktuell.patch", "sha256": sha16, "titel": titel, "basis": basis}
    try:
        _gist_schreiben({"aktuell.patch": {"content": patch_text},
                         "aktuell.json": {"content": json.dumps(meta, ensure_ascii=False)}}, token)
        hinweis = (" Entfernt: " + ", ".join(entfernt)) if entfernt else ""
        return {"ok": True, "out": "Patch im Postfach abgelegt. Prüfsumme %s, Basis %s.%s" % (sha16, basis, hinweis)}
    except urllib.error.HTTPError as e:
        return {"ok": False, "out": "Ablegen fehlgeschlagen: " + _http_fehler(e, token)}


def act_uebernehmen():
    token = read_token()
    if not token:
        return _token_fehlt()
    proj = CFG["projekt"]
    if os.path.exists(KNOPF) and os.access(KNOPF, os.X_OK):
        k = run(["bash", KNOPF], cwd=proj, token=token)
        return {"ok": k["ok"], "out": "Per vorhandenem Knopf übernommen." if k["ok"] else "Knopf fehlerhaft.",
                "detail": k["out"], "quelle": "knopf"}
    try:
        data = _gist_lesen(token)
    except urllib.error.HTTPError as e:
        return {"ok": False, "out": "Postfach nicht lesbar: " + _http_fehler(e, token)}
    files = data.get("files") or {}
    original = (files.get("aktuell.patch") or {}).get("content") or ""
    try:
        meta = json.loads((files.get("aktuell.json") or {}).get("content") or "{}")
    except Exception:
        meta = {}
    if not original:
        return {"ok": False, "out": "Kein aktuell.patch im Postfach.",
                "loesung": "KI-Patch mit „Patch eintragen“ ablegen."}
    if hashlib.sha256(original.encode()).hexdigest()[:16] != meta.get("sha256"):
        return {"ok": False, "out": "Prüfsumme stimmt nicht – nichts wurde verändert.",
                "loesung": "Patch neu ablegen lassen.", "link": GIST_URL, "linkText": "Postfach öffnen"}
    origin = _origin_main_kurz(proj, token)
    lokal = run(["git", "rev-parse", "--short", "HEAD"], cwd=proj, token=token)["out"].strip()
    basis = str(meta.get("basis") or "").strip()
    if basis and basis not in (origin, lokal):
        return {"ok": False, "basisfehler": True,
                "out": "Veralteter Patch: Basis %s, GitHub-main %s, lokal %s." % (basis, origin, lokal),
                "loesung": "KI um neuen Patch bitten oder geprüft „Basis korrigieren“ verwenden.",
                "link": GIST_URL, "linkText": "Postfach öffnen"}
    git_geraeumig(proj)
    patch, vorhanden = _filtere_bereits_vorhandene(original, proj)
    if not re.search(r"^diff --git ", patch, flags=re.M):
        return {"ok": True, "info": True,
                "out": "Nur bereits vorhandene Dateien im Patch: %s – nichts Neues zu übernehmen." % ", ".join(vorhanden)}
    vorab = run(["git", "apply", "--check", "-"], cwd=proj, input_text=patch, token=token)
    if not vorab["ok"]:
        return {"ok": False, "out": git_klar(vorab["out"]),
                "loesung": "Nichts wurde verändert. Die KI muss den Patch neu aufsetzen.",
                "link": GIST_URL, "linkText": "Postfach öffnen"}
    thema = re.sub(r"[^a-z0-9]+", "-", str(meta.get("titel") or "patch").lower()).strip("-")[:24] or "patch"
    branch = "ki/" + thema
    ausgang = run(["git", "rev-parse", "--abbrev-ref", "HEAD"], cwd=proj, token=token)["out"].strip() or "main"
    if not run(["git", "checkout", "-B", branch], cwd=proj, token=token)["ok"]:
        return {"ok": False, "out": "Zweig konnte nicht erstellt werden: " + branch}
    am = run(["git", "am"], cwd=proj, input_text=patch, token=token)
    if not am["ok"]:
        run(["git", "am", "--abort"], cwd=proj, token=token)
        run(["git", "checkout", ausgang], cwd=proj, token=token)
        return {"ok": False, "out": git_klar(am["out"]),
                "loesung": "Zurück auf „%s“; die KI muss den Patch neu aufsetzen." % ausgang}
    tsc = run(["./node_modules/.bin/tsc", "--noEmit"], cwd=proj, token=token)
    build = run(["npm", "run", "build"], cwd=proj, token=token)
    if not (tsc["ok"] and build["ok"]):
        return {"ok": False, "branch": branch,
                "out": "Patch auf %s angewendet, aber Typen %s / Build %s." % (branch, "OK" if tsc["ok"] else "Fehler", "OK" if build["ok"] else "Fehler"),
                "detail": tsc["out"][-500:] + "\n" + build["out"][-500:],
                "loesung": "Kein PR geöffnet. Buildfehler im Zweig prüfen; Ausgangsstand bleibt über den Zweig erreichbar."}
    push = run(["git", "push", "-u", "origin", branch], cwd=proj, token=token, timeout=60)
    if not push["ok"]:
        return {"ok": False, "branch": branch, "out": "Build OK, aber Push fehlgeschlagen: " + git_klar(push["out"])}
    pr = run(["gh", "pr", "create", "--base", "main", "--head", branch, "--fill"], cwd=proj, token=token, timeout=45)
    m = re.search(r"https://\S+?/pull/\d+", pr["out"])
    pr_url = m.group(0) if m else (REPO_URL + "/compare/main..." + urllib.parse.quote(branch, safe=""))
    hinweis = (" Entfernt: " + ", ".join(vorhanden)) if vorhanden else ""
    return {"ok": True, "branch": branch, "quelle": "referenz", "pr_url": pr_url,
            "out": "Zweig %s · Typen OK · Build OK · %s.%s" % (branch, "PR geöffnet" if pr["ok"] else "PR-Vergleich geöffnet", hinweis),
            "detail": pr["out"]}


def act_sichern():
    token, sicher, proj = read_token(), CFG["sicherung"], CFG["projekt"]
    git_geraeumig(proj)
    if not os.path.isdir(sicher):
        return {"ok": False, "out": "Sicherung nicht gefunden: " + sicher,
                "loesung": "Pfad „sicherung“ in einstellungen.json prüfen."}
    if not run(["git", "-C", sicher, "rev-parse", "--git-dir"], token=token)["ok"]:
        return {"ok": False, "out": "Sicherung ist kein Git-Repository: " + sicher}
    fetch = run(["git", "-C", sicher, "fetch", "origin"], token=token, timeout=30)
    if not fetch["ok"]:
        return {"ok": False, "out": "Sicherung nicht aktualisierbar: " + git_klar(fetch["out"])}
    bare = run(["git", "-C", sicher, "rev-parse", "--is-bare-repository"], token=token)["out"].strip() == "true"
    if bare:
        res = run(["git", "-C", sicher, "fetch", "origin", "+refs/heads/main:refs/heads/main"], token=token, timeout=30)
    else:
        res = run(["git", "-C", sicher, "reset", "--hard", "origin/main"], token=token)
    ueber = os.path.join(proj, "docs", "UEBERGABE.md")
    hand = ""
    if os.path.exists(ueber):
        with open(ueber, encoding="utf-8") as fp:
            m = re.search(r"<!--\s*HAND:.*", fp.read(), re.S)
            hand = m.group(0) if m else ""
    main = run(["git", "rev-parse", "--short", "HEAD"], cwd=proj, token=token)["out"].strip()
    auto = "## Stand (automatisch, %s)\nmain %s · Kennung %s · Prüfung: siehe Leitstand\n\n" % (
        time.strftime("%d.%m.%Y %H:%M"), main, CFG["kennung"])
    try:
        os.makedirs(os.path.dirname(ueber), exist_ok=True)
        with open(ueber, "w", encoding="utf-8") as fp:
            fp.write(auto + (hand or "<!-- HAND: ab hier schreibt nur der Besitzer -->\n\n## Als Nächstes\n"))
        ueb_ok = True
    except Exception as e:
        return {"ok": False, "out": "Übergabedatei nicht schreibbar: " + str(e)}
    gespeichert = ""
    if run(["git", "rev-parse", "--git-dir"], cwd=proj)["ok"]:
        run(["git", "add", "--", ueber], cwd=proj)
        if not run(["git", "diff", "--cached", "--quiet"], cwd=proj)["ok"]:
            c = run(_commit_ident(proj) + ["-m", "docs: Übergabedatei"], cwd=proj)
            if c["ok"]:
                gespeichert = " und die Übergabedatei gespeichert"
    ok = res["ok"] and ueb_ok
    return {"ok": ok, "out": ("Stand gesichert (Sicherung auf main, Übergabedatei aktualisiert%s)." % gespeichert)
            if ok else "Sichern unvollständig: " + git_klar(res["out"])}


UEBERGABE_DATEIEN = ["index.html", "style.css", "leitstand.js", "leitstand.py",
                     "start.sh", "stop.sh", "install-desktop.sh", "einstellungen.json",
                     "README.md", "HISTORIE.md"]


def act_uebergabe():
    token = read_token()
    t = ["ADVENTSHAUS · LEITSTAND – ENTWICKLER-INFO (vollständig)",
         "Erstellt: %s · Helfer %s · GUI %s · Kennung %s" % (time.strftime("%d.%m.%Y %H:%M"), HELPER_VERSION, GUI_HINT, CFG.get("kennung", "-")),
         "", "ZWECK: Stand und nächster Schritt für den KI-Ablauf, kein Teil des Spiels.",
         "SICHERHEIT: nur 127.0.0.1, feste Aktionen, Token nur im Helfer und immer gefiltert.",
         "REGEL: Diese Info muss den gesamten Quellcode aller Komponenten und die gesamte HISTORIE enthalten.",
         "", "AKTUELLER STAND:"]
    for k in ("projekt", "sicherung", "ablage", "kennung", "port", "spiel_url"):
        t.append("  %s: %s" % (k, CFG.get(k, "-")))
    t += ["  token: " + ("vorhanden" if token else "fehlt"), "  ordner: " + HERE,
          "", "VOLLSTÄNDIGER QUELLCODE EINSCHLIESSLICH HISTORIE:"]
    for name in UEBERGABE_DATEIEN:
        p = os.path.join(HERE, name)
        t += ["", "### DATEI: " + name]
        if not os.path.exists(p):
            t.append("(fehlt im Ordner)")
            continue
        try:
            with open(p, encoding="utf-8", errors="replace") as fp:
                inhalt = fp.read()
        except Exception as e:
            inhalt = "(nicht lesbar: %s)" % e
        t += ["```", inhalt.rstrip(), "```"]
    t.append("### ENDE DER ENTWICKLER-INFO")
    text = scrub("\n".join(t), token)
    return {"ok": True, "text": text, "bytes": len(text.encode("utf-8"))}


def act_offene_speichern():
    proj = CFG["projekt"]
    git_geraeumig(proj)
    st = run(["git", "status", "--porcelain", "-uall"], cwd=proj)
    if not st["ok"]:
        return {"ok": False, "out": "Projekt nicht lesbar: " + git_klar(st["out"])}
    zeilen = [z for z in st["out"].splitlines() if z.strip()]
    if not zeilen:
        return {"ok": True, "info": True, "out": "Alles gespeichert – keine offenen Änderungen."}
    namen = [z.split(None, 1)[-1] for z in zeilen]
    msg = "docs: Übergabedatei" if len(namen) == 1 and namen[0].endswith("UEBERGABE.md") else "Leitstand: %d offene Änderung(en) gespeichert" % len(zeilen)
    if not run(["git", "add", "-A"], cwd=proj)["ok"]:
        return {"ok": False, "out": "git add fehlgeschlagen."}
    c = run(_commit_ident(proj) + ["-m", msg], cwd=proj)
    if not c["ok"]:
        return {"ok": False, "out": "Speichern fehlgeschlagen: " + git_klar(c["out"])}
    return {"ok": True, "out": "%d Änderung(en) lokal gespeichert („%s“) – nichts hochgeladen." % (len(zeilen), msg)}


def act_basis_korrigieren():
    token = read_token()
    if not token:
        return _token_fehlt()
    try:
        data = _gist_lesen(token)
    except urllib.error.HTTPError as e:
        return {"ok": False, "out": _http_fehler(e, token)}
    files = data.get("files") or {}
    try:
        meta = json.loads((files.get("aktuell.json") or {}).get("content") or "{}")
    except Exception:
        return {"ok": False, "out": "aktuell.json ist nicht lesbar."}
    patch = (files.get("aktuell.patch") or {}).get("content") or ""
    if patch and hashlib.sha256(patch.encode()).hexdigest()[:16] != meta.get("sha256"):
        return {"ok": False, "out": "Basis nicht geändert: Die Patch-Prüfsumme stimmt nicht."}
    origin = _origin_main_kurz(CFG["projekt"], token)
    if not origin:
        return {"ok": False, "out": "GitHub-main konnte nicht ermittelt werden."}
    alt = str(meta.get("basis") or "–")
    meta["basis"] = origin
    try:
        _gist_schreiben({"aktuell.json": {"content": json.dumps(meta, ensure_ascii=False)}}, token)
        return {"ok": True, "out": "Basis von %s auf %s gesetzt; Patch und Prüfsumme unverändert." % (alt, origin)}
    except urllib.error.HTTPError as e:
        return {"ok": False, "out": _http_fehler(e, token)}


def _data_uri_inhalt(html_text):
    import base64
    patch, meta = "", ""
    for m in re.finditer(r"data:[a-z0-9/+.]+;(?:charset=[^;]+;)?base64,([A-Za-z0-9+/=]+)", html_text):
        try:
            roh = base64.b64decode(m.group(1)).decode("utf-8", "ignore")
        except Exception:
            continue
        if "diff --git" in roh and not patch:
            patch = roh
        elif '"basis"' in roh and not meta:
            meta = roh
    return patch, meta


def act_patch_von_url(payload):
    url = (payload.get("url") or "").strip()
    if not url:
        return {"ok": False, "out": "Keine Adresse angegeben."}
    if not url.startswith("http"):
        url = "https://" + url
    if urllib.parse.urlparse(url).scheme not in ("http", "https"):
        return {"ok": False, "out": "Nur http/https-Adressen sind erlaubt."}
    try:
        r = urllib.request.urlopen(url, timeout=25)
        inhalt = r.read(2_000_000).decode("utf-8", "ignore")
        basis_url = r.geturl().rsplit("/", 1)[0] + "/"
    except Exception as e:
        return {"ok": False, "out": "Adresse nicht erreichbar: " + str(e)[:140]}
    patch, meta = "", ""
    for name in ("aktuell.patch", "aktuell.json"):
        try:
            txt = urllib.request.urlopen(basis_url + name, timeout=15).read(2_000_000).decode("utf-8", "ignore")
            if name.endswith("patch"):
                patch = txt
            else:
                meta = txt
        except Exception:
            pass
    if not patch or not meta:
        p2, m2 = _data_uri_inhalt(inhalt)
        patch, meta = patch or p2, meta or m2
    if not patch:
        return {"ok": False, "out": "Auf der Seite wurde kein Patch gefunden."}
    return act_patch_einfuegen({"patch": patch, "meta": meta})


def act_projekt_diagnose():
    token, proj = read_token(), CFG["projekt"]
    if not os.path.isdir(proj):
        return {"ok": False, "out": "Projektordner nicht gefunden: " + proj}
    st = run(["git", "status", "--porcelain", "-uall"], cwd=proj, token=token)
    head = run(["git", "rev-parse", "--short", "HEAD"], cwd=proj, token=token)
    if not st["ok"] or not head["ok"]:
        return {"ok": False, "out": "Kein Git-Repository unter: " + proj}
    offene = [z for z in st["out"].splitlines() if z.strip()]
    zeilen = ["Projekt: %s · HEAD %s · %s" % (proj, head["out"].strip(), "Stand sauber" if not offene else "%d offene Änderung(en)" % len(offene))]
    origin = _origin_main_kurz(proj, token)
    if origin:
        zeilen.append("GitHub-main: %s · lokaler HEAD: %s" % (origin, head["out"].strip()))
    patch_text = ""
    if token:
        try:
            data = _gist_lesen(token)
            patch_text = ((data.get("files") or {}).get("aktuell.patch") or {}).get("content") or ""
        except Exception as e:
            zeilen.append("Postfach nicht lesbar: " + scrub(str(e), token)[:100])
    gefordert, vorhanden, fehlen = [], [], []
    if "diff --git" in patch_text:
        for m in re.findall(r"\+\+\+ b/(\S+)", patch_text):
            if m not in gefordert:
                gefordert.append(m)
        for pfad in gefordert:
            (vorhanden if os.path.exists(os.path.join(proj, pfad)) else fehlen).append(pfad)
        zeilen.append("Patch fordert %d Datei(en): %d vorhanden, %d fehlen%s" % (
            len(gefordert), len(vorhanden), len(fehlen), (" – fehlt: " + ", ".join(fehlen)) if fehlen else ""))
        out = "Projekt-Diagnose fertig – " + ("es fehlen Patch-Dateien (noch nicht übernommen)." if fehlen else "alle Patch-Dateien vorhanden.")
    else:
        zeilen.append("Kein lesbarer Patch im Postfach." if token else "Kein Token – Postfach nicht gelesen.")
        out = "Projekt-Diagnose fertig – Projektstatus aufgenommen."
    return {"ok": True, "zeilen": zeilen, "out": out, "offen": len(offene)}


def _sha_varianten(text):
    varianten = set()
    for wert in (text.encode("utf-8", "ignore"), text.encode("utf-8-sig", "ignore"),
                 text.encode("utf-8").replace(b"\r\n", b"\n"), text.replace("\r\n", "\n").encode("utf-8", "ignore")):
        varianten.add(hashlib.sha256(wert).hexdigest()[:16])
    return varianten


def act_patch_einfuegen(payload):
    token = read_token()
    if not token:
        return _token_fehlt()
    patch = (payload.get("patch") or "").strip()
    meta_text = (payload.get("meta") or "").strip()
    if not patch or not re.search(r"(^|\n)diff --git ", patch):
        return {"ok": False, "out": "Kein gültiger Patch-Text (diff --git fehlt)."}
    if len(patch.encode("utf-8", "ignore")) > 200 * 1024:
        return {"ok": False, "out": "Der Patch ist zu groß (über 200 KB)."}
    try:
        meta = json.loads(meta_text)
    except Exception:
        return {"ok": False, "out": "Die json mit der Basis fehlt oder ist nicht lesbar."}
    basis = str(meta.get("basis") or "").strip()
    if not basis:
        return {"ok": False, "out": "In der json fehlt „basis“ – ohne Basis kein Ablagen."}
    patch, entfernt = _filtere_bereits_vorhandene(patch, CFG["projekt"])
    if not re.search(r"^diff --git ", patch, flags=re.M):
        return {"ok": True, "info": True,
                "out": "Nichts einzutragen – nur bereits vorhandene Dateien: " + ", ".join(entfernt)}
    dateien = []
    for m in re.findall(r"\+\+\+ b/(\S+)", patch):
        if m not in dateien:
            dateien.append(m)
    titel = str(meta.get("titel") or "").strip() or (dateien[0] if dateien else "eingefügter Patch")
    sha = hashlib.sha256(patch.encode("utf-8", "ignore")).hexdigest()[:16]
    mitgeliefert = str(meta.get("sha256") or "").strip().lower()
    sha_hinweis = ""
    if mitgeliefert and mitgeliefert not in _sha_varianten(patch):
        sha_hinweis = "Mitgelieferte Prüfsumme %s weicht ab; frisch berechnet: %s (BOM/Zeilenenden möglich)." % (mitgeliefert, sha)
    neu = {"datei": "aktuell.patch", "sha256": sha, "titel": titel, "basis": basis}
    try:
        _gist_schreiben({"aktuell.patch": {"content": patch},
                         "aktuell.json": {"content": json.dumps(neu, ensure_ascii=False)}}, token)
        hinweis = (" Entfernt: " + ", ".join(entfernt)) if entfernt else ""
        return {"ok": True, "sha_info": sha_hinweis,
                "out": "Patch ins Postfach gelegt: %d Datei(en), Prüfsumme %s, Basis %s.%s" % (len(dateien), sha, basis, hinweis)}
    except urllib.error.HTTPError as e:
        return {"ok": False, "out": "Ins Postfach legen fehlgeschlagen: " + _http_fehler(e, token)}


def act_postfach_leeren():
    token = read_token()
    if not token:
        return _token_fehlt()
    try:
        data = _gist_lesen(token)
        vorhanden = {k: None for k in ("aktuell.patch", "aktuell.json") if k in (data.get("files") or {})}
        if not vorhanden:
            return {"ok": True, "info": True, "out": "Postfach war schon leer – nichts zu entfernen."}
        _gist_schreiben(vorhanden, token)
        return {"ok": True, "out": "Postfach geleert: %s entfernt; Knopf-Dateien bleiben." % ", ".join(sorted(vorhanden))}
    except urllib.error.HTTPError as e:
        return {"ok": False, "out": _http_fehler(e, token)}


def _probe(port):
    for host in ("127.0.0.1", "::1"):
        try:
            url = ("http://[%s]:%d/" % (host, port)) if ":" in host else ("http://%s:%d/" % (host, port))
            r = urllib.request.urlopen(url, timeout=0.35)
            html = r.read(4000).decode("utf-8", "ignore")
            m = re.search(r"<title>(.*?)</title>", html, re.S | re.I)
            return {"port": port, "title": (m.group(1).strip() if m else "")[:60]}
        except Exception:
            continue
    return None


def find_game():
    ports = list(range(5173, 5201)) + [3000, 4173, 5000, 8000, 8080]
    found = [f for f in (_probe(p) for p in ports) if f]
    best = next((f for f in found if "Adventshaus" in f["title"] or "Luni" in f["title"]), found[0] if found else None)
    return {"url": ("http://localhost:%d/" % best["port"]) if best else "",
            "title": (best or {}).get("title", ""), "found": found}


def start_game():
    global GAME_PROC
    f = find_game()
    if f["url"]:
        return {"url": f["url"], "gestartet": False, "out": "Spiel läuft bereits: " + f["url"]}
    proj = CFG["projekt"]
    if not os.path.isdir(proj):
        return {"url": "", "out": "Projekt nicht gefunden: " + proj}
    npm = shutil.which("npm")
    if not npm:
        return {"url": "", "out": "npm nicht gefunden – Node.js wird für den Spielstart benötigt."}
    if GAME_PROC is not None and GAME_PROC.poll() is None:
        return {"url": "", "out": "Spielstart läuft bereits – bitte kurz warten."}
    try:
        logf = open(GAME_LOG, "w")
        GAME_PROC = subprocess.Popen([npm, "run", "dev"], cwd=proj, stdout=logf,
                                     stderr=subprocess.STDOUT, start_new_session=True)
    except Exception as e:
        return {"url": "", "out": "Spielstart fehlgeschlagen: " + str(e)}
    for _ in range(50):
        time.sleep(0.5)
        f = find_game()
        if f["url"]:
            return {"url": f["url"], "gestartet": True, "out": "Spiel gestartet: " + f["url"]}
        if GAME_PROC.poll() is not None:
            tail = ""
            try:
                with open(GAME_LOG, encoding="utf-8", errors="replace") as fp:
                    tail = fp.read()[-300:].strip()
            except Exception:
                pass
            return {"url": "", "out": "Spielstart endete sofort. " + tail}
    return {"url": "", "out": "Spiel startet nicht (25 s). Log: " + GAME_LOG}


def stop_game():
    global GAME_PROC
    if GAME_PROC is None or GAME_PROC.poll() is not None:
        GAME_PROC = None
        return {"ok": False, "out": "Spiel wurde nicht vom Leitstand gestartet – nichts beendet."}
    pid = GAME_PROC.pid
    try:
        os.killpg(os.getpgid(pid), signal.SIGTERM)
    except Exception:
        try:
            GAME_PROC.terminate()
        except Exception:
            pass
    for _ in range(20):
        if GAME_PROC.poll() is not None:
            break
        time.sleep(0.25)
    if GAME_PROC.poll() is None:
        try:
            os.killpg(os.getpgid(pid), signal.SIGKILL)
        except Exception:
            pass
    GAME_PROC = None
    return {"ok": True, "out": "Spiel beendet."}


ACTIONS = {"status": act_status, "pruefen": act_pruefen, "ablegen": act_ablegen,
           "uebernehmen": act_uebernehmen, "sichern": act_sichern,
           "uebergabe": act_uebergabe, "postfach-leeren": act_postfach_leeren,
           "basis-korrigieren": act_basis_korrigieren,
           "projekt-diagnose": act_projekt_diagnose,
           "patch-von-url": act_patch_von_url,
           "offene-speichern": act_offene_speichern}
STATIC_FILES = set(UEBERGABE_DATEIEN)


class Handler(http.server.BaseHTTPRequestHandler):
    def _json(self, code, obj):
        b = json.dumps(obj, ensure_ascii=False).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(b)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(b)

    def do_GET(self):
        path = self.path.split("?", 1)[0]
        if path.startswith("/api/"):
            name = path[len("/api/"):].strip("/")
            try:
                if name == "spiel":
                    self._json(200, start_game())
                elif name == "spiel-stop":
                    self._json(200, stop_game())
                elif name in ACTIONS:
                    self._json(200, ACTIONS[name]())
                else:
                    self._json(404, {"ok": False, "out": "unbekannte Aktion"})
            except Exception as e:
                self._json(500, {"ok": False, "out": scrub(str(e), read_token())})
            return
        p = path.lstrip("/") or "index.html"
        if p not in STATIC_FILES:
            self._json(404, {"ok": False, "out": "nicht gefunden: " + p})
            return
        fp = os.path.join(HERE, p)
        if not os.path.isfile(fp):
            self._json(404, {"ok": False, "out": "nicht gefunden: " + p})
            return
        ctype = "text/html; charset=utf-8" if p.endswith(".html") else (
                "text/css; charset=utf-8" if p.endswith(".css") else (
                "application/javascript; charset=utf-8" if p.endswith(".js") else "text/plain; charset=utf-8"))
        with open(fp, "rb") as fh:
            b = fh.read()
        self.send_response(200)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(b)))
        self.end_headers()
        self.wfile.write(b)

    def do_POST(self):
        length = int(self.headers.get("Content-Length", 0) or 0)
        if length > 2_100_000:
            self._json(413, {"ok": False, "out": "Anfrage zu groß."})
            return
        body = self.rfile.read(length).decode("utf-8") if length else ""
        path = self.path.split("?", 1)[0]
        try:
            daten = json.loads(body or "{}")
        except Exception:
            daten = {}
        try:
            if path == "/api/token":
                tok = (daten.get("token") or "").strip()
                if not tok:
                    self._json(200, {"ok": False, "out": "Kein Token übergeben."})
                    return
                os.makedirs(os.path.dirname(TOKEN_PATH), exist_ok=True)
                with open(TOKEN_PATH, "w", encoding="utf-8") as f:
                    f.write(tok + "\n")
                os.chmod(TOKEN_PATH, 0o600)
                self._json(200, {"ok": True, "out": "Token gespeichert (Rechte 600)."})
            elif path == "/api/patch-von-url":
                self._json(200, act_patch_von_url(daten))
            elif path == "/api/patch-einfuegen":
                self._json(200, act_patch_einfuegen(daten))
            else:
                self.do_GET()
        except Exception as e:
            self._json(500, {"ok": False, "out": scrub(str(e), read_token())})

    def log_message(self, *a):
        pass


def open_browser(url):
    time.sleep(0.6)
    for opener in (["xdg-open", url], ["open", url]):
        try:
            subprocess.Popen(opener, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            return True
        except Exception:
            continue
    try:
        return bool(webbrowser.open(url, new=2))
    except Exception:
        return False


def main():
    port = int(CFG.get("port", 8790))
    url = "http://127.0.0.1:%d/" % port
    socketserver.ThreadingTCPServer.allow_reuse_address = True
    socketserver.ThreadingTCPServer.daemon_threads = True
    try:
        httpd = socketserver.ThreadingTCPServer(("127.0.0.1", port), Handler)
    except OSError:
        print("Leitstand läuft bereits. Öffne den Browser: " + url, flush=True)
        open_browser(url)
        return
    print("Adventshaus · Leitstand %s läuft → %s" % (HELPER_VERSION, url), flush=True)
    print("Ordner: " + HERE, flush=True)
    with open(PID_FILE, "w", encoding="utf-8") as f:
        f.write(str(os.getpid()))

    def _beenden(signum=None, frame=None):
        try:
            os.remove(PID_FILE)
        except Exception:
            pass
        os._exit(0)

    try:
        signal.signal(signal.SIGTERM, _beenden)
        signal.signal(signal.SIGINT, _beenden)
        open_browser(url)
        httpd.serve_forever()
    finally:
        try:
            os.remove(PID_FILE)
        except Exception:
            pass


if __name__ == "__main__":
    main()
