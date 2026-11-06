(function(){
"use strict";
/* ============================================================
   Adventshaus · Leitstand: eigenständiger Oberflächenentwurf mit Demo-Daten
   ============================================================ */

var GUI_VERSION = "23.34";
var EROEFFNUNG = "Repository: https://github.com/Chihuaua/adventshaus – Stand: main\n" +
"Lies README.md komplett, besonders „Grundsätze“, „Arbeitsablauf mit KI-Assistenten“ und „Regel 0“. Halte dich daran.\n\n" +
"Regel 0: Klone den Stand und führe ihn aus – baue ihn nicht nach. Ändere nichts, was ich nicht verlange: keine Texte, Erklärungen, Buttons, Styles oder Größen hinzufügen oder anpassen. Nur die Aufgabe unten.\n\n" +
"Ablauf: 1) klonen, npm ci, npx tsc --noEmit, npm run build – bestätige, dass es baut. 2) Frag mich nach dem Postfach-Token (ich schicke es in zwei Hälften). 3) Setze die Aufgabe um und zeig sie mir lauffähig. 4) Erst nach meinem „ja“: Patch + Prüfsumme ins Postfach. Ich übernehme per Knopf.\n\n" +
"Aufgabe: Noch keine. Klone den Stand, zeig ihn mir unverändert, frag nach dem Token – dann sage ich dir, was zu tun ist.";
var API = {
  pruefbericht:{method:"GET", pfad:"/api/pruefen"},
  pruefen:{method:"GET", pfad:"/api/projekt-diagnose"},
  eintragen:{method:"POST", pfad:"/api/patch-einfuegen"},
  zugit:{method:"POST", pfad:"/api/uebernehmen"},
  speichern:{method:"POST", pfad:"/api/offene-speichern"},
  postfach:{method:"POST", pfad:"/api/ablegen"},
  nachhause:{method:"POST", pfad:"/api/sichern"},
  entfernen:{method:"POST", pfad:"/api/postfach-leeren"},
  spiel:{method:"GET", pfad:"/api/spiel"},
  spielstop:{method:"GET", pfad:"/api/spiel-stop"}
};

var $  = function(s,r){ return (r||document).querySelector(s); };
var $$ = function(s,r){ return Array.prototype.slice.call((r||document).querySelectorAll(s)); };

/* ---------- Aktien (Titel, Symbole, Art) ---------- */
var AKTEN = {
  eroeffnung:{
    label:"Eröffnungstext kopieren", sym:"✎", art:"read", mark:"lokal", gruppe:"01",
    sub:"Starttext für die KI",
    tip:"Legt den Eröffnungstext (Anleitung für die neue KI-Sitzung) in die Zwischenablage – nur lesend.",
    vorschau:"Lese die Übergabedatei docs/UEBERGABE.md und kopiere den Abschnitt „Eröffnungstext“ in die Zwischenablage.\nEs wird keine Datei verändert."
  },
  pruefbericht:{
    label:"Projekt Prüfbericht holen", sym:"⧉", art:"read", mark:"lokal", gruppe:"01",
    sub:"Projektstand prüfen",
    tip:"Prüft Projektordner, Git-Stand und Basis – erzeugt den Prüfbericht zum Weitergeben an die KI. Liest nur.",
    vorschau:"Lese Projektordner, git status und die Basis (origin/main) und stelle den Prüfbericht zusammen.\nEs wird nichts verändert."
  },
  eintragen:{
    label:"Patch eintragen", sym:"⇥", art:"write", mark:"online", gruppe:"01",
    sub:"KI-Patch ins Postfach",
    tip:"Legt den Patch der KI ins Postfach (GitHub-Gist). Prüft vorher die Basis und entfernt Dateien, die schon existieren.",
    vorschau:"Schreibe den übergebenen Patch-Text ins Postfach (GitHub-Gist) als aktuell.patch + aktuell.json.\nDer Postfach-Inhalt wird dabei überschrieben."
  },
  zugit:{
    label:"Patch zu GitHub", sym:"⇧", art:"write", mark:"online", gruppe:"01",
    sub:"Prüfen und Freigabe",
    tip:"Holt den Patch aus dem Postfach, prüft ihn, baut ihn lokal und eröffnet eine Pull Request (Freigabe) auf GitHub.",
    vorschau:"Lese das Postfach, prüfe Prüfsumme und Basis, wende den Patch auf einem eigenen Zweig an,\nbaue das Projekt und eröffne eine Pull Request (Freigabe) auf GitHub."
  },
  speichern:{
    label:"Offene Änderungen speichern", sym:"◎", art:"write", mark:"lokal", gruppe:"02",
    sub:"Commit, kein Upload",
    tip:"Speichert alle offenen Änderungen als lokalen Commit. Es wird nichts hochgeladen.",
    vorschau:"Führe git add und git commit im Projektordner aus (lokaler Commit).\nEs wird nichts hochgeladen – der lokale Stand wird nur festgehalten."
  },
  postfach:{
    label:"Ins Postfach legen", sym:"⇪", art:"write", mark:"online", gruppe:"02",
    sub:"Deinen Stand ablegen",
    tip:"Macht aus deinem Projektordner (main) einen Patch und legt ihn ins Postfach (GitHub-Gist).",
    vorschau:"Baue aus dem Projektordner (main) einen Patch, berechne die Prüfsumme und schreibe ihn ins Postfach (GitHub-Gist).\nDer alte Postfach-Inhalt wird dabei überschrieben."
  },
  nachhause:{
    label:"Patch lokal nach Hause", sym:"⇩", art:"write", mark:"lokal", gruppe:"02",
    sub:"Sicherung und Übergabe",
    tip:"Holt den Stand von GitHub in die lokale Sicherung und erneuert die Übergabedatei (HAND-Notiz bleibt erhalten).",
    vorschau:"Hole den Stand von GitHub, aktualisiere die lokale Sicherung und schreibe docs/UEBERGABE.md neu\n(die HAND-Notiz unter <!-- HAND: … --> bleibt erhalten)."
  },
  pruefen:{
    label:"Stand prüfen", sym:"✓", art:"read", mark:"lokal", gruppe:"03",
    sub:"Diagnose",
    tip:"Prüft den Stand des Projekts, die Basis und den Postfach-Inhalt. Liest nur.",
    vorschau:"Lese git status, die Basis (origin/main) und den Postfach-Inhalt und berichte den Stand.\nEs wird nichts verändert."
  },
  spiel:{
    label:"Spiel ansehen", sym:"▶", art:"read", mark:"lokal", gruppe:"03",
    sub:"Spiel im Browser öffnen",
    tip:"Sucht den laufenden Spiel-Server und öffnet ihn im Browser (startet ihn bei Bedarf selbst).",
    vorschau:"Suche den laufenden Dev-Server (Ports 5173–5200 u. a.) und öffne die Adresse im Browser.\nDer Leitstand startet den Server bei Bedarf selbst."
  },
  entfernen:{
    label:"Alten Patch entfernen", sym:"⌫", art:"write", mark:"online", gruppe:"04",
    sub:"Postfach leeren",
    tip:"Entfernt nur aktuell.patch und aktuell.json aus dem Postfach. Die Knopf-Dateien bleiben unangetastet.",
    vorschau:"Prüfe den Gist-Inhalt und lösche daraus nur aktuell.patch und aktuell.json.\nDie Knopf-Dateien im Gist werden nicht angerührt."
  },
  abbrechen:{
    label:"Vorgang abbrechen", sym:"⊘", art:"read", mark:"lokal", gruppe:"04",
    sub:"Laufenden Vorgang stoppen",
    tip:"Bricht eine laufende Prüfung sofort ab. Bei schreibenden Aktionen läuft der Helfer seine geprüften Schritte zu Ende, damit nichts halb bleibt.",
    vorschau:"Keine Datei wird verändert – es wird nur der laufende Vorgang beendet."
  },
  spielstop:{
    label:"Spiel beenden", sym:"■", art:"write", mark:"lokal", gruppe:"04",
    sub:"Vom Leitstand gestartet",
    tip:"Beendet ein Spiel, das der Leitstand selbst gestartet hat, und schließt den Tab. Ehrliche Meldung, falls keins lief.",
    vorschau:"Beende nur einen Spiel-Server, den der Leitstand selbst gestartet hat, und schließe den zugehörigen Tab."
  }
};

var GRUPPEN = [
  {id:"01", titel:"Übergabe an die KI", klein:"Was die KI von dir braucht", farbe:"blau",    aktionen:["eroeffnung","pruefbericht","eintragen","zugit"]},
  {id:"02", titel:"Sichern des Projektes", klein:"Stand, Postfach, nach Hause", farbe:"violett", aktionen:["speichern","postfach","nachhause"]},
  {id:"03", titel:"Status", klein:"Diagnose · Spiel", farbe:"tuerkis", aktionen:["pruefen","spiel"]},
  {id:"04", titel:"Wartung", klein:"entfernen · abbrechen · beenden", farbe:"grau", aktionen:["entfernen","abbrechen","spielstop"]}
];

var GRUPPEN_FARBE = {blau:"var(--blau)", violett:"var(--violett)", tuerkis:"var(--tuerkis)", grau:"var(--grau)"};

/* ---------- Ablauf (Simulationsschritte) ---------- */
var ABLauf = {
  eroeffnung:[
    ["Lese Einstellungen (einstellungen.json)","info"],
    ["Übergabedatei gefunden: docs/UEBERGABE.md","ok"],
    ["Abschnitt „Eröffnungstext“ kopiert","ok"]
  ],
  pruefbericht:[
    ["Prüfe Projektordner …","info"],
    ["git status: 1 offene Änderung (docs/UEBERGABE.md)","warn"],
    ["Basis: 82b1629 (origin/main) – passt","ok"],
    ["Prüfsumme des Postfachs: stimmt","ok"]
  ],
  pruefen:[
    ["Lese Status (nur lesend) …","info"],
    ["Projektordner gefunden","ok"],
    ["Basis-Prüfung gegen origin/main: ok","ok"]
  ],
  eintragen:[
    ["Prüfe Patch-Text (Prüfsumme wird im Helfer berechnet)","info"],
    ["Filter: docs/UEBERGABE.md entfernt – Datei existiert schon","warn"],
    ["Basis vorhanden: 82b1629","ok"],
    ["Schreibe ins Postfach (GitHub-Gist) …","info"]
  ],
  zugit:[
    ["Gist lesen …","info"],
    ["Prüfsumme stimmt","ok"],
    ["Basis passt (82b1629)","ok"],
    ["git apply --check: in Ordnung","ok"],
    ["Zweig ki/thema angelegt, Patch angewendet","ok"],
    ["tsc + Build: ohne Fehler","ok"],
    ["Pull Request (Freigabe) eröffnet","ok"]
  ],
  speichern:[
    ["git status --porcelain -uall","info"],
    ["git add docs/UEBERGABE.md","ok"],
    ["git commit – lokal, kein Push","ok"]
  ],
  postfach:[
    ["Stand aus main als Patch bauen …","info"],
    ["Prüfsumme berechnen","ok"],
    ["Gist schreiben (aktuell.patch + aktuell.json)","ok"]
  ],
  nachhause:[
    ["GitHub-Stand holen (fetch)","ok"],
    ["Sicherung aktualisieren (Bare-Spiegel)","ok"],
    ["docs/UEBERGABE.md neu schreiben (HAND-Notiz bleibt)","ok"]
  ],
  entfernen:[
    ["Postfach-Inhalt prüfen (Gist)","info"],
    ["aktuell.patch entfernt","ok"],
    ["aktuell.json entfernt","ok"]
  ],
  spiel:[
    ["Suche Port 5173 … 5174 … 3000 …","info"],
    ["Dev-Server gefunden: http://localhost:5173","ok"]
  ],
  spielstop:[
    ["Prüfe, ob der Leitstand das Spiel gestartet hat …","info"],
    ["Kein selbst gestartetes Spiel gefunden","warn"]
  ]
};

var ENDBUND = {
  eroeffnung:{txt:"Eröffnungstext liegt in der Zwischenablage – du kannst die KI starten.",art:"info",lampe:"gelb"},
  pruefbericht:{txt:"Prüfbericht ist fertig – „Bericht kopieren“ unten rechts nimmt ihn mit.",art:"info",lampe:"gelb"},
  pruefen:{txt:"Stand geprüft: alles lesend, nichts verändert.",art:"ok",lampe:"gruen"},
  eintragen:{txt:"Patch liegt im Postfach – weiter mit „Patch zu GitHub“.",art:"ok",lampe:"gelb"},
  zugit:{txt:"Pull Request eröffnet – im Browser auf „Freigabe“ klicken.",art:"ok",lampe:"gelb"},
  speichern:{txt:"1 Änderung lokal gespeichert – es wurde nichts hochgeladen.",art:"ok",lampe:"gruen"},
  postfach:{txt:"Dein Stand liegt im Postfach (online).",art:"ok",lampe:"gelb"},
  nachhause:{txt:"Stand gesichert und Übergabedatei erneuert.",art:"ok",lampe:"gruen"},
  entfernen:{txt:"Alter Patch entfernt – der nächste Patch kann geliefert werden.",art:"ok",lampe:"gelb"},
  spiel:{txt:"Spiel läuft – der Tab wurde geöffnet.",art:"ok",lampe:"gelb"},
  spielstop:{txt:"Kein vom Leitstand gestartetes Spiel – es wurde nichts beendet.",art:"warn",lampe:"gelb"}
};

var ZUSTAND = {
  modus:"demo", helperVersion:null, ordner:null,
  cfg:{projekt:"~/projekte/adventshaus", sicherung:"~/sicherung/adventshaus.git", ablage:"~/adventshaus-postfach", kennung:"KI-B", spiel_url:"http://localhost:5173/"},
  kette:null, erledigt:{}, laeuft:false, token:0,
  log:[], ampel:"gelb", bericht:null, controller:null, patchHinweis:""
};

var STANDARD_KETTE = ["eroeffnung","pruefbericht","pruefen","eintragen","zugit","speichern","postfach","nachhause","spiel"];

/* ============================================================
   Aufbau der Knöpfe
   ============================================================ */
function baueKnöpfe(){
  GRUPPEN.forEach(function(g){
    var ziel = $("#kn-"+g.id);
    ziel.textContent = "";
    g.aktionen.forEach(function(id){
      var a = AKTEN[id];
      var b = document.createElement("button");
      b.className = "knopf " + (a.mark==="lokal" ? "lokal" : "online");
      b.setAttribute("data-act", id);
      b.setAttribute("data-gruppe", g.id);
      b.setAttribute("title", a.tip);
      b.innerHTML =
        '<span class="sym">' + a.sym + '</span>' +
        '<span class="txt">' +
          '<span class="z1">' + a.label + '</span>' +
          '<span class="z2"><span class="badge ' + a.mark + '">' + a.mark + '</span>' + a.sub + '</span>' +
        '</span>';
      b.addEventListener("click", function(){ klickAktion(id, b); });
      ziel.appendChild(b);
    });
  });
}

/* ============================================================
   Denkfenster
   ============================================================ */
function denkZeile(text, art){
  var li = document.createElement("li");
  li.className = art || "info";
  var m = {ok:"✓", info:"›", warn:"!", err:"✕"}[art || "info"] || "›";
  var symbol = document.createElement("span");
  var inhalt = document.createElement("span");
  symbol.className = "m";
  symbol.textContent = m;
  inhalt.textContent = text;
  li.appendChild(symbol);
  li.appendChild(inhalt);
  $("#denkListe").appendChild(li);
  var b = $("#denkBody"); b.scrollTop = b.scrollHeight;
}
function denkAktuell(text){ $("#denkAktuell").textContent = text; }
function denkStatus(text, laeuft){
  $("#denkStatusText").textContent = text;
  $("#denkStatus").classList.toggle("laeuft", !!laeuft);
}
function protokolle(text){
  ZUSTAND.log.push(text);
  $("#protokollText").textContent = ZUSTAND.log.slice(-120).join("\n");
  var rl = $("#rasterLog"); if (rl) rl.textContent = ZUSTAND.log.slice(-200).join("\n");
}

/* ============================================================
   Ampel
   ============================================================ */
function setAmpel(zustand, text){
  ZUSTAND.ampel = zustand;
  $("#lampeRot").classList.toggle("aktiv", zustand==="rot");
  $("#lampeGelb").classList.toggle("aktiv", zustand==="gelb");
  $("#lampeGruen").classList.toggle("aktiv", zustand==="gruen");
  $("#ampelText").textContent = text || ({gruen:"alles in Ordnung", gelb:"es wartet etwas", rot:"Fehler"}[zustand]);
}

/* ============================================================
   Großer Knopf / Kette
   ============================================================ */
function naechsterSchritt(){
  if (!ZUSTAND.kette && ZUSTAND.override) return ZUSTAND.override;
  if (ZUSTAND.kette){
    var g = gruppeVon(ZUSTAND.kette.gruppe);
    var liste = g.aktionen;
    if (ZUSTAND.kette.index < liste.length) return liste[ZUSTAND.kette.index];
    return null;
  }
  for (var i=0;i<STANDARD_KETTE.length;i++){
    if (!ZUSTAND.erledigt[STANDARD_KETTE[i]]) return STANDARD_KETTE[i];
  }
  return null;
}
function gruppeVon(id){
  for (var i=0;i<GRUPPEN.length;i++) if (GRUPPEN[i].id===id) return GRUPPEN[i];
  return GRUPPEN[0];
}
function aktualisiereGrossenKnopf(){
  var id = naechsterSchritt();
  var knopf = $("#grossKnopf");
  $$(".knopf").forEach(function(b){ b.classList.remove("markiert"); });
  if (!id){
    $("#grossSymbol").textContent = "✓";
    $("#grossLabel").textContent = "Vorschau durchlaufen";
    $("#grossSub").textContent = "Eine Überschrift startet eine neue Kette.";
    knopf.setAttribute("title","Alle Beispielschritte wurden angezeigt.");
    $("#grossKette").innerHTML = "";
    return;
  }
  var a = AKTEN[id];
  $(".g-mitte").style.setProperty("--c", GRUPPEN_FARBE[gruppeVon(a.gruppe).farbe]);
  $("#grossSymbol").textContent = a.sym;
  $("#grossLabel").textContent = a.label;
  $("#grossSub").textContent = "Vorschau · " + a.sub;
  knopf.setAttribute("title", "Vorschau: " + a.tip);
  var k = $("#grossKette");
  k.textContent = "";
  if (ZUSTAND.kette){
    var g = gruppeVon(ZUSTAND.kette.gruppe);
    var name = document.createElement("span");
    name.className = "kette-name";
    name.textContent = g.titel + " · Schritt " + (ZUSTAND.kette.index + 1) + "/" + g.aktionen.length;
    var fortschritt = document.createElement("span");
    fortschritt.className = "kette-fortschritt";
    fortschritt.setAttribute("aria-hidden", "true");
    g.aktionen.forEach(function(x,i){
      var strich = document.createElement("i");
      if (i <= ZUSTAND.kette.index) strich.className = "aktiv";
      fortschritt.appendChild(strich);
    });
    k.appendChild(name);
    k.appendChild(fortschritt);
  } else {
    k.textContent = "Kette über eine Überschrift starten";
  }
  var ziel = $('.knopf[data-act="'+id+'"]');
  if (ziel) ziel.classList.add("markiert");
}
function ketteStarten(gruppeId){
  if (ZUSTAND.laeuft){
    denkZeile("Eine Simulation läuft noch. Bitte zuerst abbrechen oder abwarten.", "warn");
    return;
  }
  var g = gruppeVon(gruppeId);
  ZUSTAND.override = null;
  ZUSTAND.kette = {gruppe:gruppeId, index:0};
  denkAktuell("Vorschau der Kette „"+g.titel+"“: "+AKTEN[g.aktionen[0]].label+" ist als Nächstes dran.");
  denkZeile("Vorschau: " + g.aktionen.map(function(x){return AKTEN[x].label;}).join(" → "), "info");
  protokolle("Vorschau der Kette gestartet: " + g.titel);
  setAmpel("gelb", "Vorschau");
  aktualisiereGrossenKnopf();
}
function ketteWeiter(id){
  if (!ZUSTAND.kette) return false;
  var g = gruppeVon(ZUSTAND.kette.gruppe);
  var pos = g.aktionen.indexOf(id);
  if (pos === ZUSTAND.kette.index) return true;
  return false;
}

/* ============================================================
   Aktionen
   ============================================================ */
function klickAktion(id, knopfEl){
  if (id === "abbrechen" && ZUSTAND.laeuft){
    abbrechen();
    return;
  }
  if (ZUSTAND.laeuft){
    denkZeile("Es läuft gerade ein Vorgang – erst „Abbrechen“ drücken.", "warn");
    return;
  }
  var a = AKTEN[id];
  if (id !== ZUSTAND.override) ZUSTAND.override = null;
  var inKette = ketteWeiter(id);
  var kettenHinweis = "";
  if (ZUSTAND.kette && !inKette){
    kettenHinweis = "Kette beendet, weil du einen anderen Schritt gewählt hast.";
    ZUSTAND.kette = null;
    denkZeile(kettenHinweis, "warn");
    protokolle(kettenHinweis);
    aktualisiereGrossenKnopf();
  }
  if (id === "abbrechen"){
    abbrechen();
    if (inKette && ZUSTAND.kette){
      ZUSTAND.kette.index++;
      aktualisiereGrossenKnopf();
    }
    return;
  }
  if (id === "eroeffnung"){
    eroeffnungKopieren(kettenHinweis);
  } else if (id === "eintragen"){
    patchOeffnen(kettenHinweis);
  } else if (a.art === "write"){
    dialogOeffnen(id, kettenHinweis);
  } else {
    starteAktion(id, kettenHinweis);
  }
}
function starteAktion(id, kettenHinweis){
  if (ZUSTAND.modus === "echt"){
    starteEcht(id, kettenHinweis);
    return;
  }
  var a = AKTEN[id];
  ZUSTAND.laeuft = true;
  ZUSTAND.token++;
  var token = ZUSTAND.token;
  $("#denkListe").innerHTML = "";
  denkStatus("Simulation", true);
  denkAktuell("Vorschau: " + a.label + " …");
  $("#btnBericht").classList.add("hidden");
  $("#abschnittBefehl").classList.add("hidden");
  $("#btnBefehl").classList.remove("aktiv");
  $("#btnBefehl").setAttribute("aria-expanded", "false");
  $("#befehlText").textContent = a.vorschau;
  if (kettenHinweis) denkZeile(kettenHinweis, "warn");
  protokolle("Vorschau: " + a.label);

  var schritte = ABLauf[id] || [];
  var i = 0;
  function weiter(){
    if (token !== ZUSTAND.token) return;           // abgebrochen
    if (i < schritte.length){
      var s = schritte[i++];
      denkZeile("Beispiel: " + s[0], s[1]);
      setTimeout(weiter, 420);
      return;
    }
    var e = ENDBUND[id] || {txt:a.label + " abgeschlossen.", art:"ok", lampe:"gruen"};
    denkZeile("Beispiel: " + e.txt, e.art);
    denkZeile("Nur eine Simulation. Es wurde nichts geprüft oder verändert.", "info");
    denkAktuell("Simulation beendet. Keine echten Projektdaten wurden verwendet.");
    denkStatus("simuliert", false);
    ZUSTAND.laeuft = false;
    ZUSTAND.erledigt[id] = true;
    setAmpel("gelb", "Vorschau");
    protokolle("Simulation beendet: " + a.label);
    if (id === "pruefbericht" || id === "pruefen"){
      $("#btnBericht").classList.remove("hidden");
    }
    // Kette weiterschalten
    if (ZUSTAND.kette){
      var g = gruppeVon(ZUSTAND.kette.gruppe);
      var pos = g.aktionen.indexOf(id);
      if (pos >= 0){
        ZUSTAND.kette.index = pos + 1;
        if (ZUSTAND.kette.index >= g.aktionen.length){
          denkZeile("Die Vorschau der Kette „"+g.titel+"“ ist fertig.", "ok");
          protokolle("Vorschau der Kette fertig: " + g.titel);
          ZUSTAND.kette = null;
        }
      }
    }
    aktualisiereGrossenKnopf();
    setTimeout(function(){ if (token===ZUSTAND.token) denkStatus("bereit", false); }, 900);
  }
  weiter();
}
function kopiereText(text){
  function fallback(){
    return new Promise(function(resolve){
      var feld=document.createElement("textarea");
      feld.value=text; feld.style.position="fixed"; feld.style.left="-9999px";
      document.body.appendChild(feld); feld.select();
      var ok=false;
      try{ ok=document.execCommand("copy"); }catch(e){ ok=false; }
      feld.remove(); resolve(ok);
    });
  }
  if (navigator.clipboard && navigator.clipboard.writeText){
    return navigator.clipboard.writeText(text).then(function(){return true;},fallback);
  }
  return fallback();
}
function aktionFortschritt(id){
  ZUSTAND.erledigt[id]=true;
  if (ZUSTAND.kette){
    var g=gruppeVon(ZUSTAND.kette.gruppe), pos=g.aktionen.indexOf(id);
    if (pos>=0){
      ZUSTAND.kette.index=pos+1;
      if (ZUSTAND.kette.index>=g.aktionen.length){
        denkZeile("Kette „"+g.titel+"“ ist fertig.","ok");
        ZUSTAND.kette=null;
      }
    }
  }
  var folge={eintragen:"zugit",zugit:"nachhause",speichern:"postfach",postfach:"zugit",entfernen:"postfach",nachhause:"pruefbericht"}[id] || null;
  ZUSTAND.override=folge;
  aktualisiereGrossenKnopf();
}
function eroeffnungKopieren(hinweis){
  if (hinweis) denkZeile(hinweis,"warn");
  denkAktuell("Kopiere den Eröffnungstext …");
  kopiereText(EROEFFNUNG).then(function(ok){
    denkZeile(ok ? "Eröffnungstext kopiert – mit STRG+V in den Chat einfügen." : "Kopieren nicht möglich; die Zwischenablage wurde nicht geändert.",ok?"ok":"err");
    denkAktuell(ok ? "Eröffnungstext ist in der Zwischenablage." : "Kopieren fehlgeschlagen.");
    protokolle(ok ? "Eröffnungstext kopiert" : "Eröffnungstext: Kopieren fehlgeschlagen");
    if (ok) aktionFortschritt("eroeffnung");
  });
}
function showSolution(url,text){
  var a=$("#solveLink");
  if (!url || !/^https?:\/\//i.test(url)){ a.classList.add("hidden"); return; }
  a.href=url; a.textContent=text || "Öffnen"; a.classList.remove("hidden");
}
function hideSolution(){
  $("#solveLink").classList.add("hidden");
  $("#btnBasis").classList.add("hidden");
}
function echtenBericht(id,j){
  var l=["Adventshaus · Leitstand – Prüfbericht","Zeit: "+new Date().toLocaleString("de-DE"),"Modus: Echtbetrieb · GUI "+GUI_VERSION+" · Helfer "+(ZUSTAND.helperVersion || "?")];
  if (id==="pruefbericht"){
    (j.steps || []).forEach(function(s){ l.push("· "+(s.name||"Schritt")+": "+(s.out||"")+(s.loesung?" | Lösung: "+s.loesung:"")); });
  } else {
    (j.zeilen || []).forEach(function(z){ l.push("· "+z); });
    if (j.out) l.push("· "+j.out);
  }
  l.push("Kennung: "+(ZUSTAND.cfg.kennung || "–"));
  return l.join("\n");
}
async function starteEcht(id,kettenHinweis,extra){
  if (ZUSTAND.versionKonflikt){
    denkZeile("Aktion blockiert: GUI und Helfer haben unterschiedliche Versionen. Helfer neu starten und Seite aktualisieren.","err");
    return;
  }
  var a=AKTEN[id], spec=API[id];
  if (!spec){ denkZeile("Kein echter Endpunkt für "+id,"err"); return; }
  extra=extra || {};
  var token=++ZUSTAND.token;
  ZUSTAND.laeuft=true;
  ZUSTAND.controller=typeof AbortController==="function" ? new AbortController() : null;
  $("#denkListe").innerHTML="";
  $("#btnBericht").classList.add("hidden");
  hideSolution();
  denkStatus("Helfer läuft",true);
  denkAktuell("Helfer: "+a.label+" …");
  $("#befehlText").textContent=(extra.pfad || spec.pfad)+" · "+spec.method+"\n"+a.vorschau;
  if (kettenHinweis) denkZeile(kettenHinweis,"warn");
  protokolle("Echte Aktion: "+a.label);
  try{
    var optionen={method:spec.method,cache:"no-store",headers:{}};
    if (ZUSTAND.controller) optionen.signal=ZUSTAND.controller.signal;
    if (extra.daten){
      optionen.headers["Content-Type"]="application/json";
      optionen.body=JSON.stringify(extra.daten);
    }
    var r=await fetch(extra.pfad || spec.pfad,optionen);
    var j=await r.json();
    if (token!==ZUSTAND.token) return;
    if (!r.ok && !j.out) throw new Error("HTTP "+r.status);
    if (id==="pruefbericht"){
      var schritte=j.steps || [];
      if (!schritte.length) denkZeile(j.out || "Keine Prüfdaten erhalten.",j.ok?"info":"err");
      schritte.forEach(function(s){
        denkZeile((s.name||"Schritt")+(s.out?": "+s.out:""),s.ok?"ok":"warn");
        if (s.loesung) denkZeile("Lösung: "+s.loesung,"warn");
        if (s.link) showSolution(s.link,s.linkText);
      });
      ZUSTAND.bericht=echtenBericht(id,j);
      $("#btnBericht").classList.remove("hidden");
    } else if (id==="pruefen"){
      (j.zeilen || []).forEach(function(z){denkZeile(z,"info");});
      ZUSTAND.bericht=echtenBericht(id,j);
      $("#btnBericht").classList.remove("hidden");
    }
    var erfolg=(id==="spiel") ? !!j.url : !!j.ok;
    var ton=erfolg ? (j.info?"info":"ok") : (id==="spielstop"?"warn":"err");
    if (id!=="pruefbericht" && id!=="pruefen") denkZeile(j.out || (erfolg?"Erledigt.":"Keine Erfolgsmeldung erhalten."),ton);
    else if (j.out && id==="pruefen") denkZeile(j.out,ton);
    if (j.sha_info) denkZeile(j.sha_info,"info");
    if (j.loesung) denkZeile("Lösung: "+j.loesung,"warn");
    if (j.link) showSolution(j.link,j.linkText);
    if (j.basisfehler) $("#btnBasis").classList.remove("hidden");
    if (j.detail){ $("#befehlText").textContent += "\n\n"+j.detail; }
    if (id==="spiel" && j.url){
      var fenster=window.open(j.url,"_blank");
      denkZeile(fenster?"Spiel-Adresse geöffnet: "+j.url:"Browser hat das neue Fenster blockiert. Adresse: "+j.url,fenster?"ok":"warn");
      if (!fenster) showSolution(j.url,"Spiel öffnen");
    }
    if (id==="zugit" && j.pr_url){
      showSolution(j.pr_url,"Pull Request öffnen");
      var prFenster=window.open(j.pr_url,"_blank");
      if (!prFenster) denkZeile("PR nicht automatisch geöffnet – Knopf „Pull Request öffnen“ verwenden.","warn");
    }
    denkAktuell(j.out || (erfolg?a.label+" abgeschlossen.":a.label+" fehlgeschlagen."));
    denkStatus(erfolg?"fertig":"Fehler",false);
    var neueLampe=erfolg?"gruen":(id==="spielstop"?"gelb":"rot");
    var lampenText=erfolg?(j.info?"keine Handlung nötig":"alles ok"):(id==="spielstop"?"kein Spiel beendet":"Fehler");
    setAmpel(neueLampe,lampenText);
    protokolle((erfolg?"✓ ":"✕ ")+(j.out || a.label));
    if (erfolg && !j.info) aktionFortschritt(id);
    else aktualisiereGrossenKnopf();
  }catch(e){
    if (token!==ZUSTAND.token) return;
    var msg=(e && e.name==="AbortError") ? "Anzeige abgebrochen; der Helfer kann seine geprüften Schritte zu Ende führen." : "Helfer nicht erreichbar oder Aktion fehlgeschlagen: "+e.message;
    denkZeile(msg,"err"); denkAktuell(msg); denkStatus("Fehler",false);
    setAmpel("rot","Fehler"); protokolle(msg);
  }finally{
    if (token===ZUSTAND.token){ ZUSTAND.laeuft=false; ZUSTAND.controller=null; }
  }
}
async function basisKorrigieren(){
  if (ZUSTAND.modus!=="echt"){ denkZeile("Basis korrigieren ist nur mit Helfer möglich.","warn"); return; }
  $("#btnBasis").classList.add("hidden");
  denkAktuell("Prüfe Prüfsumme und korrigiere die Basis …");
  try{
    var r=await fetch("/api/basis-korrigieren",{method:"POST"}),j=await r.json();
    denkZeile(j.out || "Unbekannte Antwort.",j.ok?"ok":"err");
    denkAktuell(j.out || "Basis-Korrektur beendet.");
    if (j.ok){ ZUSTAND.override="zugit"; aktualisiereGrossenKnopf(); setAmpel("gruen","Basis korrigiert"); }
    else setAmpel("rot","Fehler");
  }catch(e){ denkZeile("Basis korrigieren fehlgeschlagen: "+e.message,"err"); }
}
function abbrechen(){
  if (!ZUSTAND.laeuft){
    denkZeile("Hinweis: Es läuft gerade kein Vorgang – „Abbrechen“ ist hier wirkungslos.", "warn");
    denkAktuell("Es läuft gerade keine Aktion.");
    return;
  }
  var echt=ZUSTAND.modus==="echt";
  if (ZUSTAND.controller){ try{ZUSTAND.controller.abort();}catch(e){} }
  ZUSTAND.controller=null;
  ZUSTAND.token++;
  ZUSTAND.laeuft = false;
  denkStatus("bereit", false);
  var abbruchText=echt ? "Anzeige abgebrochen. Der Helfer kann seine geprüften Schritte zu Ende führen; das ist kein Server-Abbruch." : "Simulation abgebrochen. Es wurde nichts verändert.";
  denkZeile(abbruchText, "warn");
  denkAktuell(abbruchText);
  protokolle(abbruchText);
  setAmpel("gelb", "abgebrochen");
  aktualisiereGrossenKnopf();
}

/* ============================================================
   Patch eintragen: Text, Datei oder Adresse
   ============================================================ */
function patchPruefe(){
  var patch=$("#patchText").value, meta=$("#patchMeta").value;
  var hatDiff=/(^|\n)diff --git /.test(patch), basis="";
  try{basis=String(JSON.parse(meta).basis || "").trim();}catch(e){basis="";}
  var voll=hatDiff && !!basis, info=$("#patchInfo");
  info.className="paste-info "+(voll?"ok":"bad");
  if (!patch.trim() && !meta.trim()) info.textContent="Noch nichts eingefügt.";
  else info.textContent=(hatDiff?"Patch-Format erkannt ✓":"Es fehlt „diff --git“ am Zeilenanfang")+" · "+(basis?"Basis "+basis+" ✓":"json mit lesbarer Basis fehlt (Pflicht)");
  $("#patchOk").disabled=!voll;
}
function patchOeffnen(hinweis){
  ZUSTAND.patchHinweis=hinweis || "";
  $("#patchText").value=""; $("#patchMeta").value=""; $("#patchUrl").value="";
  $("#patchDateiName").textContent="keine Datei gewählt";
  $("#patchModus").textContent=ZUSTAND.modus==="echt" ? "Echtbetrieb: Der Helfer prüft und schreibt ins GitHub-Gist. Das Token bleibt lokal." : "Demo: Eingabe wird geprüft, aber nur simuliert – es wird nichts ins Postfach geschrieben.";
  $("#patchOk").textContent=ZUSTAND.modus==="echt" ? "Ins Postfach legen" : "Simulation starten";
  patchPruefe();
  $("#patchDialog").classList.remove("hidden");
  $("#patchText").focus();
}
function patchSchliessen(){ $("#patchDialog").classList.add("hidden"); }
function patchSenden(){
  if ($("#patchOk").disabled) return;
  var daten={patch:$("#patchText").value,meta:$("#patchMeta").value},hinweis=ZUSTAND.patchHinweis;
  patchSchliessen();
  if (ZUSTAND.modus==="echt") starteEcht("eintragen",hinweis,{daten:daten});
  else starteAktion("eintragen",hinweis);
}
function patchHolen(){
  var url=$("#patchUrl").value.trim();
  if (!url){ $("#patchInfo").textContent="Bitte zuerst eine Adresse einfügen."; $("#patchInfo").className="paste-info bad"; return; }
  if (ZUSTAND.modus!=="echt"){
    $("#patchInfo").textContent="„Von dort holen“ braucht den Helfer; in der Demo wird keine Adresse geladen.";
    $("#patchInfo").className="paste-info bad"; return;
  }
  var hinweis=ZUSTAND.patchHinweis;
  patchSchliessen();
  starteEcht("eintragen",hinweis,{pfad:"/api/patch-von-url",daten:{url:url}});
}

/* ============================================================
   Bestätigungs-Dialog
   ============================================================ */
var dialogZiel = null;
var dialogHinweis = "";
var dialogAusloeser = null;
function dialogOeffnen(id, kettenHinweis){
  var a = AKTEN[id];
  dialogZiel = id;
  dialogHinweis = kettenHinweis || "";
  dialogAusloeser = document.activeElement;
  var echt = ZUSTAND.modus === "echt";
  $("#dialogTitel").textContent = echt ? "Aktion bestätigen" : "Simulation bestätigen";
  $("#dialogWarn").textContent = echt ? "Diese Aktion verändert Daten. Der Helfer führt nur die gezeigte feste Aktion aus." : "Nur Vorschau: Es werden keine Dateien oder Online-Dienste verändert.";
  $("#dialogText").textContent = (echt ? "Ausführen: „" : "So würde „") + a.label + "“ (" + a.mark + ")" + (echt ? ":" : " im echten Leitstand ablaufen:");
  $("#dialogVorschau").textContent = a.vorschau;
  $("#dialogVersion").textContent = GUI_VERSION;
  $("#dialogOk").textContent = echt ? "Ausführen" : "Simulation starten";
  $("#dialog").classList.remove("hidden");
  $("#dialogOk").focus();
}
function dialogSchliessen(){
  $("#dialog").classList.add("hidden");
  dialogZiel = null;
  dialogHinweis = "";
  if (dialogAusloeser && document.contains(dialogAusloeser)) dialogAusloeser.focus();
  dialogAusloeser = null;
}

/* ============================================================
   Reiter
   ============================================================ */
var REITER = {
  ablauf:function(){
    return '<h3>Ablauf – die vier Bereiche</h3>' +
      '<ol>' +
      '<li><b>01 · Übergabe an die KI</b> – du gibst der KI das, was sie braucht: Eröffnungstext, Prüfbericht, den Patch und den Weg zu GitHub.</li>' +
      '<li><b>02 · Sichern des Projektes</b> – dein Stand: lokal speichern, ins Postfach legen, nach Hause holen.</li>' +
      '<li><b>03 · Status</b> – Diagnose und Spiel ansehen.</li>' +
      '<li><b>04 · Wartung</b> – alten Patch entfernen, Vorgang abbrechen, Spiel beenden.</li>' +
      '</ol>' +
      '<h4>Der große Knopf</h4>' +
      '<p>Er zeigt <b>immer den Schritt, der gerade dran ist</b>. Willst du eine Kette ablaufen lassen, klickst du die Überschrift 01–04 an – danach springt der große Knopf von selbst zum nächsten Schritt der Kette.</p>' +
      '<h4>Stationsstraße</h4>' +
      '<p><code>① Aufgabe</code> → <code>② KI baut</code> → <code>③ Übernehmen</code> → <code>④ Sichern</code></p>';
  },
  so:function(){
    return '<h3>So funktioniert’s</h3>' +
      '<h4>Der Weg eines Patches</h4>' +
      '<ol>' +
      '<li>KI liefert den Patch → <b>Patch eintragen</b> (ins Postfach).</li>' +
      '<li><b>Patch zu GitHub</b>: Gist lesen → Prüfsumme → Basis → <code>git apply --check</code> → Zweig → Build → Pull Request (Freigabe).</li>' +
      '<li>Im Browser auf <b>Freigabe</b> (Merge) klicken.</li>' +
      '<li><b>Patch lokal nach Hause</b>: GitHub → Sicherung + Übergabedatei.</li>' +
      '</ol>' +
      '<h4>Grundregeln (unverhandelbar)</h4>' +
      '<ol>' +
      '<li>Schreibende Aktionen müssen vorher bestätigt werden.</li>' +
      '<li>Ein Token darf nur der echte Helfer verwenden und niemals anzeigen.</li>' +
      '<li>Der echte Helfer soll nur auf <code>127.0.0.1</code> lauschen und nur feste Aktionen ausführen.</li>' +
      '<li>Meldungen sollen nur bestätigen, was tatsächlich geprüft wurde.</li>' +
      '</ol>' +
      '<h4>Diese Ansicht</h4>' +
      (ZUSTAND.modus==="echt"
        ? '<p><b>Echtbetrieb:</b> Der Helfer ist verbunden. Prüf- und Aktionsmeldungen kommen aus der lokalen API; schreibende Knöpfe fragen vorher.</p>'
        : '<p><b>Demo:</b> Alle Projektaktionen und Prüfergebnisse sind simuliert. Das ZIP enthält trotzdem den vollständigen Helfer und alle Startdateien.</p>');
  },
  protokoll:function(){
    return '<h3>Protokoll</h3><div class="raster-log" id="rasterLog">' +
      (ZUSTAND.log.length ? ZUSTAND.log.slice(-200).join("\n") : "Noch nichts protokolliert.") + '</div>';
  },
  einstellungen:function(){
    var c=ZUSTAND.cfg;
    return '<h3>Einstellungen</h3>' +
      '<div class="pfad-raster">' +
      '<span class="k">Projektordner</span><span class="v">'+htmlEsc(c.projekt)+'</span>' +
      '<span class="k">Sicherung</span><span class="v">'+htmlEsc(c.sicherung)+'</span>' +
      '<span class="k">Ablage</span><span class="v">'+htmlEsc(c.ablage)+'</span>' +
      '<span class="k">Kennung</span><span class="v">'+htmlEsc(c.kennung)+'</span>' +
      '<span class="k">Spiel-Adresse</span><span class="v">'+htmlEsc(c.spiel_url)+'</span>' +
      '<span class="k">Modus</span><span class="v">'+(ZUSTAND.modus==="echt"?"Echtbetrieb · Helfer "+htmlEsc(ZUSTAND.helperVersion):"Demo · kein Helfer")+'</span>' +
      '<span class="k">Helfer-Ordner</span><span class="v">'+htmlEsc(ZUSTAND.ordner || "nicht verbunden")+'</span>' +
      '</div>' +
      '<h4>Token (nur Gist-Rechte)</h4>' +
      '<div class="token-zeile"><input id="inpToken" type="password" placeholder="ghp_…" autocomplete="off" spellcheck="false"><button class="mini" id="btnTokenSave">Speichern</button><button class="mini" id="btnTokenTest">Testen</button></div>' +
      '<p id="tokenState">Wird nur an den lokalen Helfer übergeben und in ~/.config/adventshaus/gist-token mit Rechten 600 gespeichert. Nie im Protokoll.</p>' +
      '<h4>Pfade ändern</h4><p>Die GUI verändert einstellungen.json nicht stillschweigend. Abweichende Pfade dort eintragen und den Helfer neu starten. Eigene einstellungen.json vor dem Überschreiben sichern.</p>';
  }
};
var offenerReiter = null;
function zeigeReiter(name){
  offenerReiter = offenerReiter === name ? null : name;
  $$("#reiter button").forEach(function(b){
    var aktiv = b.getAttribute("data-reiter") === offenerReiter;
    b.classList.toggle("aktiv", aktiv);
    b.setAttribute("aria-expanded", String(aktiv));
  });
  var inhalt = $("#reiterInhalt");
  inhalt.classList.toggle("hidden", !offenerReiter);
  inhalt.innerHTML = offenerReiter ? REITER[offenerReiter]() : "";
  if (offenerReiter==="einstellungen") verdrahteEinstellungen();
}
function htmlEsc(s){
  return String(s == null ? "" : s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];});
}
function verdrahteEinstellungen(){
  var speichern=$("#btnTokenSave"),testen=$("#btnTokenTest");
  if (speichern) speichern.addEventListener("click",async function(){
    var wert=$("#inpToken").value.trim(),status=$("#tokenState");
    if (!wert){status.textContent="Bitte Token einfügen.";return;}
    if (ZUSTAND.modus!=="echt"){status.textContent="Token speichern ist nur mit laufendem Helfer möglich; in der Demo wird nichts gespeichert.";return;}
    try{
      var r=await fetch("/api/token",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token:wert})}),j=await r.json();
      status.textContent=j.out || "Unbekannte Antwort.";
      if (j.ok) $("#inpToken").value="";
    }catch(e){status.textContent="Token nicht gespeichert: "+e.message;}
  });
  if (testen) testen.addEventListener("click",async function(){
    var status=$("#tokenState");
    if (ZUSTAND.modus!=="echt"){status.textContent="Kein Helfer verbunden – Tokenstatus kann nicht geprüft werden.";return;}
    try{
      var r=await fetch("/api/status",{cache:"no-store"}),j=await r.json();
      status.textContent=j.token ? "Token vorhanden (Inhalt wird nicht angezeigt)." : "Kein Token hinterlegt.";
    }catch(e){status.textContent="Helfer nicht erreichbar: "+e.message;}
  });
}

/* ============================================================
   Helfer-Erkennung und Banner (Demo gelb, Echtbetrieb grün)
   ============================================================ */
function bannerCode(s){ var c = document.createElement("code"); c.textContent = s; return c; }
function bannerFett(s){ var b = document.createElement("b"); b.textContent = s; return b; }
function setzeBanner(modus, info){
  info = info || {};
  var b = $("#modusBanner"), t = $("#modusText");
  b.className = "banner " + (modus === "echt" ? "modus-echt" : modus === "fehler" ? "fehler" : "modus-demo");
  t.textContent = "";
  function txt(s){ t.appendChild(document.createTextNode(s)); }
  if (modus === "echt"){
    t.appendChild(bannerFett("Echter Modus"));
    txt(" – Helfer verbunden (" + (info.host || location.host) + ") · ");
    t.appendChild(bannerFett("Version " + (info.helfer || "?")));
    txt(" (GUI " + GUI_VERSION + ")");
    if (info.ordner){ txt(" · Ordner: "); t.appendChild(bannerCode(info.ordner)); }
    txt(". Die Knöpfe führen echte git-/Postfach-Schritte aus.");
    $("#modusVersion").textContent = "Echtbetrieb";
  } else if (modus === "fehler"){
    t.appendChild(bannerFett(info.richtung || "Versionen passen nicht"));
    txt(" – Helfer " + (info.helfer || "?") + ", GUI " + GUI_VERSION + ". Bitte Helfer beenden und neu starten; danach Version und Ordner prüfen.");
    $("#modusVersion").textContent = "kein Echtbetrieb";
  } else {
    t.appendChild(bannerFett("Demo-Modus"));
    txt(" – reine Simulation, es wird nichts verändert · ");
    t.appendChild(bannerFett("Version " + GUI_VERSION));
    txt(" · Ordner: "); t.appendChild(bannerCode("nicht verbunden"));
    txt(". Für echten Betrieb: Helfer starten (");
    t.appendChild(bannerCode("./start.sh"));
    txt(") und "); t.appendChild(bannerCode("http://127.0.0.1:8790/")); txt(" öffnen.");
    $("#modusVersion").textContent = "kein Echtbetrieb";
  }
}
async function detecteModus(){
  $("#versionAnzeige").textContent="GUI "+GUI_VERSION;
  setzeBanner("demo");
  ZUSTAND.modus="demo";
  if (location.protocol==="file:" || typeof fetch!=="function") return;
  var controller=typeof AbortController==="function" ? new AbortController() : null;
  var timer=controller ? setTimeout(function(){controller.abort();},1600) : null;
  try{
    var optionen={cache:"no-store"}; if (controller) optionen.signal=controller.signal;
    var r=await fetch("/api/status",optionen);
    if (!r.ok) throw new Error("HTTP "+r.status);
    var j=await r.json();
    if (!j || j.helfer!==true) throw new Error("kein Leitstand-Helfer");
    ZUSTAND.modus="echt";
    ZUSTAND.helperVersion=String(j.version || "?");
    ZUSTAND.ordner=j.ordner || "";
    ZUSTAND.versionKonflikt=ZUSTAND.helperVersion!==GUI_VERSION;
    if (j.cfg) Object.keys(ZUSTAND.cfg).forEach(function(k){if (j.cfg[k]!=null) ZUSTAND.cfg[k]=j.cfg[k];});
    $("#pfadProjekt").textContent=ZUSTAND.cfg.projekt;
    $("#pfadSicherung").textContent=ZUSTAND.cfg.sicherung;
    if (ZUSTAND.versionKonflikt){
      var a=parseFloat(ZUSTAND.helperVersion),b=parseFloat(GUI_VERSION);
      var richtung=(isFinite(a)&&isFinite(b)&&a>b)?"Die GUI ist älter als der Helfer":"Der Helfer ist älter als die GUI";
      setzeBanner("fehler",{helfer:ZUSTAND.helperVersion,richtung:richtung});
    }else{
      setzeBanner("echt",{helfer:ZUSTAND.helperVersion,ordner:ZUSTAND.ordner,host:location.host});
    }
    setAmpel("gelb","noch nicht geprüft");
    protokolle("Helfer verbunden: "+ZUSTAND.helperVersion+" · "+ZUSTAND.ordner);
  }catch(e){
    ZUSTAND.modus="demo";
    setzeBanner("demo");
  }finally{
    if (timer) clearTimeout(timer);
  }
}

/* ============================================================
    Portables ZIP: aktuelle HTML-Vorschau samt eigener ZIP-Erzeugung.
   ============================================================ */
function portableHTML(){
  var kopie = document.documentElement.cloneNode(true);
  function c(id){ return kopie.querySelector("#" + id); }
  kopie.querySelectorAll("style:not(#appStyles)").forEach(function(stil){ stil.remove(); });
  ["kn-01","kn-02","kn-03","kn-04"].forEach(function(id){ c(id).textContent = ""; });
  kopie.querySelector(".g-mitte").removeAttribute("style");
  c("grossSymbol").textContent = "✎";
  c("grossLabel").textContent = "Eröffnungstext kopieren";
  c("grossSub").textContent = "Vorschau · Starttext für die KI";
  c("grossKette").textContent = "Kette über eine Überschrift starten";
  c("denkAktuell").textContent = "Bereit für deinen nächsten Schritt.";
  c("denkListe").innerHTML = '<li class="info"><span class="m">›</span><span>Hinweise und Prüfschritte erscheinen hier.</span></li>';
  c("denkStatus").classList.remove("laeuft");
  c("denkStatusText").textContent = "bereit";
  c("abschnittBefehl").classList.add("hidden");
  c("abschnittProtokoll").classList.add("hidden");
  c("protokollText").textContent = "–";
  c("befehlText").textContent = "–";
  ["btnBefehl","btnProtokoll"].forEach(function(id){
    c(id).classList.remove("aktiv");
    c(id).setAttribute("aria-expanded", "false");
  });
  c("btnBericht").classList.add("hidden");
  c("btnBasis").classList.add("hidden");
  c("solveLink").classList.add("hidden");
  c("patchDialog").classList.add("hidden");
  c("modusBanner").className="banner modus-demo";
  c("modusText").innerHTML='<b>Demo-Modus</b> – reine Simulation, es wird nichts verändert · <b>Version '+GUI_VERSION+'</b> · Ordner: <code>nicht verbunden</code>. Für echten Betrieb: Helfer starten (<code>./start.sh</code>) und <code>http://127.0.0.1:8790/</code> öffnen.';
  c("modusVersion").textContent="kein Echtbetrieb";
  c("versionAnzeige").textContent="GUI "+GUI_VERSION;
  c("pfadProjekt").textContent="~/projekte/adventshaus";
  c("pfadSicherung").textContent="~/sicherung/adventshaus.git";
  c("reiterInhalt").classList.add("hidden");
  c("reiterInhalt").textContent = "";
  kopie.querySelectorAll("#reiter button").forEach(function(b){
    b.classList.remove("aktiv");
    b.setAttribute("aria-expanded", "false");
  });
  c("dialog").classList.add("hidden");
  ["dialogWarn","dialogText","dialogVorschau","dialogVersion"].forEach(function(id){ c(id).textContent = ""; });
  c("ampelText").textContent = "Vorschau";
  kopie.querySelectorAll(".lampe").forEach(function(l){ l.classList.remove("aktiv"); });
  c("lampeGelb").classList.add("aktiv");
  return "<!DOCTYPE html>\n" + kopie.outerHTML + "\n";
}

var CRC_TABELLE = (function(){
  var t = new Uint32Array(256);
  for (var n=0;n<256;n++){
    var c=n;
    for (var k=0;k<8;k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    t[n]=c >>> 0;
  }
  return t;
})();
function crc32(bytes){
  var c=0xffffffff;
  for (var i=0;i<bytes.length;i++) c=CRC_TABELLE[(c ^ bytes[i]) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function zipSpeichern(dateien){
  var encoder=new TextEncoder();
  var eintraege=dateien.map(function(datei){
    var name=encoder.encode(datei.name);
    var daten=encoder.encode(datei.text);
    if (name.length > 65535 || daten.length > 0xffffffff) throw new Error("Datei zu groß für ZIP.");
    return {name:name, daten:daten, crc:crc32(daten), offset:0};
  });
  var jetzt=new Date();
  var zeit=(jetzt.getHours()<<11)|(jetzt.getMinutes()<<5)|(jetzt.getSeconds()>>1);
  var datum=((Math.max(1980,jetzt.getFullYear())-1980)<<9)|((jetzt.getMonth()+1)<<5)|jetzt.getDate();
  var teile=[], position=0;
  function anfuegen(bytes){ teile.push(bytes); position+=bytes.length; }
  function header(laenge){ var bytes=new Uint8Array(laenge); return {bytes:bytes, view:new DataView(bytes.buffer)}; }
  eintraege.forEach(function(e){
    e.offset=position;
    var h=header(30+e.name.length),v=h.view;
    v.setUint32(0,0x04034b50,true); v.setUint16(4,20,true);
    v.setUint16(6,0x0800,true); v.setUint16(8,0,true);
    v.setUint16(10,zeit,true); v.setUint16(12,datum,true);
    v.setUint32(14,e.crc,true); v.setUint32(18,e.daten.length,true);
    v.setUint32(22,e.daten.length,true); v.setUint16(26,e.name.length,true);
    h.bytes.set(e.name,30); anfuegen(h.bytes); anfuegen(e.daten);
  });
  var zentralStart=position;
  eintraege.forEach(function(e){
    var h=header(46+e.name.length),v=h.view;
    v.setUint32(0,0x02014b50,true); v.setUint16(4,20,true);
    v.setUint16(6,20,true); v.setUint16(8,0x0800,true);
    v.setUint16(10,0,true); v.setUint16(12,zeit,true);
    v.setUint16(14,datum,true); v.setUint32(16,e.crc,true);
    v.setUint32(20,e.daten.length,true); v.setUint32(24,e.daten.length,true);
    v.setUint16(28,e.name.length,true); v.setUint32(42,e.offset,true);
    h.bytes.set(e.name,46); anfuegen(h.bytes);
  });
  var zentralLaenge=position-zentralStart;
  var ende=header(22),v=ende.view;
  v.setUint32(0,0x06054b50,true);
  v.setUint16(8,eintraege.length,true); v.setUint16(10,eintraege.length,true);
  v.setUint32(12,zentralLaenge,true); v.setUint32(16,zentralStart,true);
  anfuegen(ende.bytes);
  var zip=new Uint8Array(position), at=0;
  teile.forEach(function(teil){ zip.set(teil,at); at+=teil.length; });
  // Verify local headers, payloads, central directory and end record before offering the file.
  var pruef=new DataView(zip.buffer);
  if (pruef.getUint32(position-22,true)!==0x06054b50 ||
      pruef.getUint32(position-6,true)!==zentralStart ||
      pruef.getUint16(position-12,true)!==eintraege.length) throw new Error("ZIP-Abschluss ungültig.");
  var zentral=zentralStart;
  eintraege.forEach(function(e){
    var start=e.offset, datenStart=start+30+e.name.length;
    if (pruef.getUint32(start,true)!==0x04034b50 ||
        pruef.getUint32(start+14,true)!==crc32(zip.subarray(datenStart,datenStart+e.daten.length)) ||
        pruef.getUint32(start+18,true)!==e.daten.length ||
        pruef.getUint32(zentral,true)!==0x02014b50 ||
        pruef.getUint32(zentral+42,true)!==start ||
        pruef.getUint32(zentral+16,true)!==e.crc) throw new Error("ZIP-Eintrag ungültig.");
    zentral+=46+e.name.length;
  });
  if (zentral!==position-22) throw new Error("ZIP-Verzeichnis unvollständig.");
  return zip;
}
function quell(id){
  var n=document.getElementById(id);
  if (!n) throw new Error("Eingebettete Quelle fehlt: "+id);
  return n.textContent.replace(/^\n/,"");
}
function paketDateien(){
  var dateien=[
    {name:"index.html",text:portableHTML()},
    {name:"style.css",text:quell("appStyles")},
    {name:"leitstand.js",text:quell("appScript")},
    {name:"leitstand.py",text:quell("src-python")},
    {name:"start.sh",text:quell("src-start")},
    {name:"stop.sh",text:quell("src-stop")},
    {name:"install-desktop.sh",text:quell("src-install")},
    {name:"einstellungen.json",text:quell("src-einstellungen")},
    {name:"README.md",text:quell("src-readme")},
    {name:"HISTORIE.md",text:quell("src-historie")}
  ];
  dateien.forEach(function(d){
    if (!d.text || !d.text.trim()) throw new Error("Leere Paketdatei: "+d.name);
  });
  return dateien;
}
function zipLaden(){
  try{
    var dateien=paketDateien();
    var zip=zipSpeichern(dateien);
    var url=URL.createObjectURL(new Blob([zip],{type:"application/zip"}));
    var link=document.createElement("a");
    link.href=url;
    link.download="adventshaus-leitstand-"+GUI_VERSION+".zip";
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(function(){URL.revokeObjectURL(url);},60000);
    var msg="Vollständiges ZIP erstellt: "+link.download+" – "+dateien.length+" Dateien, inklusive leitstand.py, Start-/Stop-Skripten, Konfiguration und HISTORIE.";
    denkZeile(msg,"ok"); denkAktuell(msg); protokolle(msg);
  }catch(err){
    denkZeile("ZIP konnte nicht erstellt werden: "+err.message,"err");
  }
}
function textDatei(name, text){
  var blob = new Blob([text], {type:"text/plain;charset=utf-8"});
  var a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a); a.click();
  a.remove();
  setTimeout(function(){ try { URL.revokeObjectURL(a.href); } catch (e) {} }, 60000);
}
/* Ohne Helfer: ehrliche Teilmenge – dieser Quellcode, nichts erfundenes. */
function entwicklerInfoOhneHelfer(grund){
  var jetzt = new Date().toISOString().slice(0,10);
  var trenn = "========================================================================";
  var css = (document.getElementById("appStyles") || {}).textContent || "";
  var js = "";
  var skripte = document.querySelectorAll("script");
  for (var i = 0; i < skripte.length; i++){
    if (!skripte[i].src && skripte[i].textContent.length > js.length) js = skripte[i].textContent;
  }
  var t = [];
  t.push("ADVENTSHAUS · LEITSTAND · ENTWICKLER-INFO (ohne Helfer – Teilmenge)");
  t.push("Erzeugt am " + jetzt + " · GUI " + GUI_VERSION);
  t.push("Grund: " + (grund || "kein laufender Helfer"));
  t.push("");
  t.push("VOLLSTAENDIG IST DIESE INFO NUR MIT DEM PYTHON-HELFER:");
  t.push("  Helfer starten (Schreibtisch-Knopf bzw. ./start.sh), dann diesen Knopf");
  t.push("  druecken – Endpunkt /api/uebergabe liefert den vollstaendigen Quellcode");
  t.push("  ALLER Komponenten und die gesamte HISTORIE (Patch- und Aenderungsverlauf).");
  t.push("");
  t.push("ENTHALTEN HIER: Zweck, Grundregeln, Stand und der vollstaendige Quellcode");
  t.push("dieser Datei (index.html: CSS und JavaScript).");
  t.push("");
  t.push("NICHT ENTHALDEN (liegen im Projektordner, hier nicht erfunden):");
  ["style.css", "leitstand.js", "leitstand.py", "start.sh", "stop.sh",
   "install-desktop.sh", "einstellungen.json", "README.md", "HISTORIE.md"
  ].forEach(function(n){ t.push("  - " + n); });
  t.push("  HISTORIE.md traegt die gesamte Patch-Historie – mit Helfer vollstaendig dabei.");
  t.push("");
  t.push("ZWECK");
  t.push("Ein Fenster, das dem Besitzer zeigt, wo der Stand steht und was als Naechstes");
  t.push("zu tun ist. Der Leitstand veraendert das Spielprojekt nicht von selbst.");
  t.push("");
  t.push("GRUNDREGELN (unverhandelbar)");
  t.push("1. Schreibende Aktionen fragen vorher und nennen, was passiert.");
  t.push("2. Das Token verlaesst nie den Helfer und steht nie in einem Log oder einer Meldung.");
  t.push("3. Der Helfer lauscht nur auf 127.0.0.1 und fuehrt nur feste Aktionen aus.");
  t.push("4. Keine neuen npm-Pakete, kein Node-Baufschritt fuer den Desktop-Betrieb.");
  t.push("5. Meldungen immer ehrlich – lieber „nicht gefunden“ als ein Erfolg, der keiner ist.");
  t.push("6. Nach jeder Aenderung: node --check leitstand.js, python3 -m py_compile");
  t.push("   leitstand.py, bash -n *.sh, npm run build, ZIP neu packen.");
  t.push("7. Helfer nach dem Austausch von Dateien immer neu starten.");
  t.push("8. HISTORIE.md bei jeder Aenderung fortschreiben. UND: Die Entwickler-Info");
  t.push("   muss den gesamten Quellcode aller Komponenten und die gesamte Historie");
  t.push("   enthalten – diese Anweisung ist hiermit festgehalten (Auftrag des Besitzers).");
  t.push("");
  t.push("STAND");
  t.push("  GUI:      " + GUI_VERSION);
  t.push("  Modus:    Vorschau, kein Helfer verbunden");
  t.push("  Raster:   01 Uebergabe · JETZT DRAN · 02 Sichern / 03 Status · 04 Wartung,");
  t.push("            Denkfenster als Raster-Element direkt unter „JETZT DRAN“.");
  t.push("  Ausrichtung: Oberkante Jetzt-dran-Knopf = erste Knoepfe in 01 und 02.");
  t.push("  ZIP:      enthaelt die aktuelle portable GUI mit dieser Versionsnummer.");
  t.push("");
  t.push(trenn);
  t.push("QUELLCODE · index.html (Version " + GUI_VERSION + ")");
  t.push(trenn);
  t.push("");
  t.push("### ABSCHNITT 1: <style id=\"appStyles\">  (entspricht style.css dieser Datei)");
  t.push("```css");
  t.push(css.replace(/^\n+/, "").replace(/\s+$/, ""));
  t.push("```");
  t.push("");
  t.push("### ABSCHNITT 2: <script>  (entspricht leitstand.js dieser Datei)");
  t.push("```javascript");
  t.push(js.replace(/^\n+/, "").replace(/\s+$/, ""));
  t.push("```");
  t.push("");
  t.push("### HINWEIS ZUM HTML-GERUEST");
  t.push("Das Markup steht in index.html zwischen <body> und </body>: Kopf, Modus-Banner,");
  t.push("Stationsstraße, die vier Bereiche 01–04, JETZT DRAN mit Denkfenster,");
  t.push("Reiter und Fusszeile sowie die beiden Bestaetigungs-Dialoge.");
  t.push("");
  t.push("### ENDE DER ENTWICKLER-INFO");
  textDatei("Leitstand-Entwicklerinfo.txt", t.join("\n"));
  denkZeile("Entwickler-Info erzeugt (Leitstand-Entwicklerinfo.txt): Zweck, Regeln, Stand und der vollständige Quellcode dieser Datei. Ohne Helfer sind style.css, leitstand.js, leitstand.py und HISTORIE.md nicht verfügbar – sie wurden nicht erfunden.", "warn");
  protokolle("Entwickler-Info (TXT) erzeugt – Teilmenge, ohne Helfer");
}
function entwicklerInfo(){
  try{
    var dateien=paketDateien();
    var t=["ADVENTSHAUS · LEITSTAND – ENTWICKLER-INFO (vollständig)",
      "Erzeugt: "+new Date().toLocaleString("de-DE")+" · GUI/Helfer-Paket "+GUI_VERSION,
      "Modus beim Export: "+(ZUSTAND.modus==="echt"?"Echtbetrieb":"Demo – Quellen trotzdem vollständig"),"",
      "ZWECK: Stand und nächster Schritt für den KI-Ablauf; kein Teil des Spiels.",
      "SICHERHEIT: Helfer nur 127.0.0.1, feste Aktionen, Token nur im Helfer.",
      "REGEL: Diese Entwickler-Info enthält den gesamten Quellcode aller Komponenten",
      "und die gesamte HISTORIE.md. Diese Anweisung bleibt bei jeder Änderung bestehen.",
      "HISTORIE.md ist bei jeder Änderung fortzuschreiben.","",
      "DATEIEN: "+dateien.map(function(d){return d.name;}).join(", "),""];
    dateien.forEach(function(d){
      t.push("================================================================================");
      t.push("BEGIN DATEI: "+d.name);
      t.push("================================================================================");
      t.push(d.text.replace(/\s+$/,""));
      t.push("END DATEI: "+d.name); t.push("");
    });
    t.push("ENDE DER ENTWICKLER-INFO");
    var text=t.join("\n");
    textDatei("Leitstand-Entwicklerinfo.txt",text);
    var kb=Math.max(1,Math.round(new TextEncoder().encode(text).length/1024));
    denkZeile("Entwickler-Info heruntergeladen: "+kb+" KB – vollständiger Quellcode aller "+dateien.length+" Komponenten und gesamte HISTORIE.","ok");
    protokolle("Entwickler-Info vollständig erzeugt: "+kb+" KB");
  }catch(e){denkZeile("Entwickler-Info fehlgeschlagen: "+e.message,"err");}
}

function beispielberichtKopieren(){
  var echt=ZUSTAND.modus==="echt" && ZUSTAND.bericht;
  var text=echt ? ZUSTAND.bericht : ["ADVENTSHAUS - BEISPIELBERICHT", "Nur Demo. Keine echten Projektdaten wurden geprüft.", ""]
    .concat(ABLauf.pruefbericht.map(function(s){ return "Beispiel: " + s[0]; })).join("\n");
  kopiereText(text).then(function(ok){
    denkZeile(ok ? (echt?"Echter Prüfbericht kopiert.":"Beispielbericht kopiert – ausdrücklich keine echten Projektdaten.") : "Kopieren nicht möglich; Zwischenablage unverändert.",ok?"ok":"warn");
    if (ok) protokolle(echt?"Prüfbericht kopiert":"Beispielbericht kopiert");
  });
}

/* ============================================================
   Start
   ============================================================ */
function init(){
  baueKnöpfe();

  $("#grossKnopf").addEventListener("click", function(){
    var id = naechsterSchritt();
    if (!id){ denkZeile("Es ist nichts offen. Klicke eine Überschrift 01–04, um eine Kette zu starten.", "info"); return; }
    klickAktion(id);
  });

  $$(".kette-start").forEach(function(b){
    b.addEventListener("click", function(){ ketteStarten(b.getAttribute("data-kette")); });
  });

  $("#btnAbbruch").addEventListener("click", abbrechen);
  $("#btnBefehl").addEventListener("click", function(){
    var a = $("#abschnittBefehl");
    a.classList.toggle("hidden");
    $("#btnBefehl").classList.toggle("aktiv", !a.classList.contains("hidden"));
    $("#btnBefehl").setAttribute("aria-expanded", String(!a.classList.contains("hidden")));
    if (!a.classList.contains("hidden")) $("#denkBody").scrollTop = $("#denkBody").scrollHeight;
  });
  $("#btnProtokoll").addEventListener("click", function(){
    var a = $("#abschnittProtokoll");
    a.classList.toggle("hidden");
    $("#btnProtokoll").classList.toggle("aktiv", !a.classList.contains("hidden"));
    $("#btnProtokoll").setAttribute("aria-expanded", String(!a.classList.contains("hidden")));
    if (!a.classList.contains("hidden")) $("#denkBody").scrollTop = $("#denkBody").scrollHeight;
  });
  $("#btnBericht").addEventListener("click", beispielberichtKopieren);
  $("#btnBasis").addEventListener("click", basisKorrigieren);
  $("#patchOk").addEventListener("click", patchSenden);
  $("#patchAbbrechen").addEventListener("click", patchSchliessen);
  $("#patchHolen").addEventListener("click", patchHolen);
  $("#patchText").addEventListener("input", patchPruefe);
  $("#patchMeta").addEventListener("input", patchPruefe);
  $("#patchDateiKnopf").addEventListener("click", function(){$("#patchDatei").click();});
  $("#patchDatei").addEventListener("change", function(e){
    var f=e.target.files && e.target.files[0]; if (!f) return;
    var fr=new FileReader();
    fr.onload=function(){
      var text=String(fr.result || "");
      if (text.trim().startsWith("{")) $("#patchMeta").value=text;
      else $("#patchText").value=text;
      $("#patchDateiName").textContent="Datei gelesen: "+f.name;
      patchPruefe();
    };
    fr.onerror=function(){$("#patchDateiName").textContent="Datei konnte nicht gelesen werden.";};
    fr.readAsText(f); e.target.value="";
  });
  $("#patchDialog").addEventListener("click",function(e){if(e.target===this)patchSchliessen();});

  $("#dialogOk").addEventListener("click", function(){
    var id = dialogZiel;
    var hinweis = dialogHinweis;
    dialogSchliessen();
    if (id) starteAktion(id, hinweis);
  });
  $("#dialogAbbrechen").addEventListener("click", function(){
    denkZeile("Abgebrochen – es wurde nichts verändert.", "warn");
    dialogSchliessen();
  });
  $("#dialog").addEventListener("click", function(e){ if (e.target === this) dialogSchliessen(); });

  $$("#reiter button").forEach(function(b){
    b.addEventListener("click", function(){ zeigeReiter(b.getAttribute("data-reiter")); });
  });

  $("#btnZip").addEventListener("click", zipLaden);
  $("#btnInfo").addEventListener("click", entwicklerInfo);

  // Tastatur: Esc bricht ab / schließt den Dialog
  document.addEventListener("keydown", function(e){
    var dialogOffen = !$("#dialog").classList.contains("hidden");
    if (e.key === "Tab" && dialogOffen){
      var erster = $("#dialogAbbrechen");
      var letzter = $("#dialogOk");
      if (e.shiftKey && (document.activeElement === erster || !$("#dialog").contains(document.activeElement))){
        e.preventDefault(); letzter.focus();
      } else if (!e.shiftKey && document.activeElement === letzter){
        e.preventDefault(); erster.focus();
      }
    }
    if (e.key === "Escape"){
      if (!$("#patchDialog").classList.contains("hidden")) patchSchliessen();
      else if (dialogOffen) dialogSchliessen();
      else abbrechen();
    }
  });

  aktualisiereGrossenKnopf();
  setAmpel("gelb", "Vorschau");
  detecteModus();
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
else init();
})();
