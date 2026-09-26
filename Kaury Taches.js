// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: deep-brown; icon-glyph: check-circle;

// ===========================================================================
//  KAURY TÂCHES — liste de tâches perso pour iPhone (app Scriptable)
//
//  Un seul fichier : il sert à la fois de widget (écran d'accueil ou écran
//  verrouillé) et d'app (quand on touche le widget ou qu'on lance le script).
//
//  Sections :
//    Quotidien     revient décoché chaque matin
//    Aujourd'hui   les tâches datées du jour (et celles en retard)
//    Demain        glisse toute seule dans Aujourd'hui le lendemain
//    Plus tard     tâches datées au-delà de demain
//    À faire       sans date
//    Fait          ce qui a été coché ; on peut le remettre ou le supprimer
//
//  Les données sont un fichier JSON dans iCloud Drive/Scriptable/
//  (kaury-taches.json) : lisible et sauvegardable depuis le PC.
//
//  https://github.com/theoblondel/kaury-taches · Licence MIT · Kaury Studio
// ===========================================================================

const FICHIER = 'kaury-taches.json';
const POLICES = [
  ['Cabinet Grotesk', 800, 'cabinet-grotesk-800'],
  ['Cabinet Grotesk', 700, 'cabinet-grotesk-700'],
  ['Satoshi', 500, 'satoshi-500'],
  ['Satoshi', 700, 'satoshi-700'],
];

// ---------------------------------------------------------------------------
//  Logique partagée. Ces fonctions tournent dans le script (widget) ET dans
//  la page (injectées via toString), pour que les deux classent pareil.
// ---------------------------------------------------------------------------
function cleJour(d) {
  const p = (n) => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}
function decaler(cle, jours) {
  const [a, m, j] = cle.split('-').map(Number);
  return cleJour(new Date(a, m - 1, j + jours));
}
function categorie(t, auj) {
  if (t.section === 'fait') return 'fait';
  if (t.section === 'quotidien') return 'quotidien';
  if (t.section === 'jour') {
    if (t.date <= auj) return 'aujourdhui';
    if (t.date === decaler(auj, 1)) return 'demain';
    return 'plustard';
  }
  return 'afaire';
}

// ---------------------------------------------------------------------------
//  Données
// ---------------------------------------------------------------------------
function gestionnaire() {
  try {
    const fm = FileManager.iCloud();
    fm.documentsDirectory();
    return fm;
  } catch (e) {
    return FileManager.local();
  }
}

function premieresDonnees() {
  // Exemples du premier lancement : de quoi voir chaque section vivre.
  // Tout se renomme, se déplace ou se supprime depuis l'app.
  const auj = cleJour(new Date());
  let n = 0;
  const t = (texte, section, extra = {}) => ({ id: 'e' + ++n, texte, section, cree: auj, ...extra });
  return {
    version: 1,
    taches: [
      t('Boire 1,5 l d’eau', 'quotidien'),
      t('10 000 pas', 'quotidien'),
      t('Lire 10 pages', 'quotidien'),
      t('Répondre aux messages en attente', 'jour', { date: auj }),
      t('Appeler le garage', 'jour', { date: decaler(auj, 1) }),
      t('Trier les photos de vacances', 'afaire'),
      t('Installer Kaury Tâches', 'fait', { faitLe: auj, origine: { section: 'jour', date: auj } }),
    ],
  };
}

async function lire() {
  const fm = gestionnaire();
  const chemin = fm.joinPath(fm.documentsDirectory(), FICHIER);
  if (!fm.fileExists(chemin)) {
    const d = premieresDonnees();
    fm.writeString(chemin, JSON.stringify(d, null, 2));
    return d;
  }
  if (fm.isFileStoredIniCloud && fm.isFileStoredIniCloud(chemin)) await fm.downloadFileFromiCloud(chemin);
  try {
    return JSON.parse(fm.readString(chemin));
  } catch (e) {
    // Fichier abîmé (édition à la main ratée) : on le met de côté plutôt que
    // de l'écraser, pour ne rien perdre.
    fm.move(chemin, chemin.replace(/\.json$/, '-abime-' + Date.now() + '.json'));
    const d = premieresDonnees();
    fm.writeString(chemin, JSON.stringify(d, null, 2));
    return d;
  }
}

function ecrire(donnees) {
  const fm = gestionnaire();
  fm.writeString(fm.joinPath(fm.documentsDirectory(), FICHIER), JSON.stringify(donnees, null, 2));
}

// ---------------------------------------------------------------------------
//  Polices du site, mises en cache au premier lancement (hors ligne ensuite).
// ---------------------------------------------------------------------------
async function policesCss() {
  const fm = FileManager.local();
  const dossier = fm.joinPath(fm.libraryDirectory(), 'kaury-polices');
  if (!fm.fileExists(dossier)) fm.createDirectory(dossier, true);
  let css = '';
  for (const [famille, graisse, nom] of POLICES) {
    const chemin = fm.joinPath(dossier, nom + '.woff2');
    try {
      if (!fm.fileExists(chemin)) {
        const data = await new Request('https://kaury.studio/fonts/' + nom + '.woff2').load();
        fm.write(chemin, data);
      }
      const b64 = fm.read(chemin).toBase64String();
      css += `@font-face{font-family:'${famille}';src:url(data:font/woff2;base64,${b64}) format('woff2');font-weight:${graisse};font-display:swap}`;
    } catch (e) {
      // Pas de réseau au premier lancement : polices système, on réessaiera.
    }
  }
  return css;
}

// ---------------------------------------------------------------------------
//  Widget
// ---------------------------------------------------------------------------
const C = {
  fond: Color.dynamic(new Color('#F1E8CB'), new Color('#1C1A1A')),
  encre: Color.dynamic(new Color('#1C1A1A'), new Color('#F1E8CB')),
  doux: Color.dynamic(new Color('#1C1A1A', 0.55), new Color('#F1E8CB', 0.55)),
  orange: new Color('#F56E2E'),
  vert: Color.dynamic(new Color('#3D5C3D'), new Color('#8DB58D')),
};

function videTexte(conteneur) {
  const vide = conteneur.addText('Rien de prévu. Profite.');
  vide.font = Font.mediumSystemFont(13);
  vide.textColor = C.doux;
}

// Remplit un conteneur avec les groupes, dans la limite de `budget` lignes.
// Renvoie le nombre de lignes posées (0 = rien à afficher).
function remplir(conteneur, groupes, budget, petit) {
  let lignes = 0;
  for (const [nom, liste, info] of groupes) {
    if (!liste.length) continue;
    if (lignes + 2 > budget) break;
    const entete = conteneur.addStack();
    const n = entete.addText(nom.toUpperCase());
    n.font = Font.boldSystemFont(10);
    n.textColor = C.doux;
    if (info) {
      entete.addSpacer(6);
      const i = entete.addText(info);
      i.font = Font.boldSystemFont(10);
      i.textColor = C.vert;
    }
    lignes++;
    conteneur.addSpacer(2);
    const place = budget - lignes;
    const montre = liste.length > place ? liste.slice(0, Math.max(place - 1, 1)) : liste;
    for (const t of montre) {
      const r = conteneur.addStack();
      r.centerAlignContent();
      const s = SFSymbol.named('circle');
      s.applyFont(Font.systemFont(11));
      const img = r.addImage(s.image);
      img.imageSize = new Size(11, 11);
      img.tintColor = C.orange;
      r.addSpacer(6);
      const l = r.addText(t.texte);
      l.font = Font.mediumSystemFont(petit ? 12 : 13);
      l.textColor = C.encre;
      l.lineLimit = 1;
      lignes++;
    }
    const reste = liste.length - montre.length;
    if (reste > 0) {
      const plus = conteneur.addText(`+ ${reste} autre${reste > 1 ? 's' : ''}`);
      plus.font = Font.mediumSystemFont(11);
      plus.textColor = C.doux;
      lignes++;
    }
    conteneur.addSpacer(5);
  }
  return lignes;
}

function construireWidget(donnees, famille) {
  const auj = cleJour(new Date());
  const par = (cat) => donnees.taches.filter((t) => categorie(t, auj) === cat);
  const quot = par('quotidien');
  const quotReste = quot.filter((t) => t.faitLe !== auj);
  // Le widget montre d'abord ce qui presse : les tâches du jour, puis les
  // quotidiennes restantes. (L'app garde l'ordre de l'ancienne note.)
  const groupes = [
    ["Aujourd'hui", par('aujourdhui'), ''],
    ['Quotidien', quotReste, quot.length ? `${quot.length - quotReste.length}/${quot.length}` : ''],
    ['Demain', par('demain'), ''],
    ['À faire', par('afaire'), ''],
  ];
  const restant = quotReste.length + par('aujourdhui').length;

  const w = new ListWidget();
  // Minuit passé, les quotidiennes doivent réapparaître : on redemande un
  // rafraîchissement juste après, en plus de ceux qu'iOS fait de lui-même.
  const minuit = new Date();
  minuit.setHours(24, 0, 30, 0);
  w.refreshAfterDate = new Date(Math.min(minuit.getTime(), Date.now() + 15 * 60 * 1000));

  if (famille === 'accessoryInline') {
    w.addText(restant ? `${restant} tâche${restant > 1 ? 's' : ''} aujourd'hui` : 'Journée bouclée');
    return w;
  }
  if (famille === 'accessoryCircular') {
    w.addAccessoryWidgetBackground = true;
    const n = w.addText(String(restant));
    n.font = Font.heavyRoundedSystemFont(22);
    n.centerAlignText();
    const l = w.addText('à faire');
    l.font = Font.mediumSystemFont(9);
    l.centerAlignText();
    return w;
  }
  if (famille === 'accessoryRectangular') {
    const titre = w.addText(restant ? `${restant} à faire aujourd'hui` : 'Journée bouclée');
    titre.font = Font.heavySystemFont(13);
    [...par('aujourdhui'), ...quotReste].slice(0, 2).forEach((t) => {
      const l = w.addText('○ ' + t.texte);
      l.font = Font.systemFont(12);
      l.lineLimit = 1;
    });
    return w;
  }

  w.backgroundColor = C.fond;
  w.setPadding(14, 16, 12, 16);

  const budget = { small: 6, medium: 6, large: 17, extraLarge: 17 }[famille] ?? 6;
  const petit = famille === 'small';

  const tete = w.addStack();
  tete.centerAlignContent();
  const titre = tete.addText(petit ? 'Tâches' : 'Mes tâches');
  titre.font = Font.heavySystemFont(petit ? 15 : 17);
  titre.textColor = C.orange;
  tete.addSpacer();
  const compte = tete.addText(restant ? String(restant) : '✓');
  compte.font = Font.heavyRoundedSystemFont(petit ? 15 : 17);
  compte.textColor = restant ? C.encre : C.vert;
  w.addSpacer(6);

  if (famille === 'medium') {
    // Large mais bas : deux colonnes, le jour à gauche, la suite à droite.
    const cols = w.addStack();
    cols.layoutHorizontally();
    const g = cols.addStack();
    g.layoutVertically();
    const n1 = remplir(g, groupes.slice(0, 2), 5, petit);
    cols.addSpacer(12);
    const d = cols.addStack();
    d.layoutVertically();
    const n2 = remplir(d, groupes.slice(2), 5, petit);
    if (!n1 && !n2) videTexte(g);
  } else if (!remplir(w, groupes, budget - 1, petit)) videTexte(w);
  w.addSpacer();
  return w;
}

// ---------------------------------------------------------------------------
//  App (page HTML dans une WebView)
// ---------------------------------------------------------------------------
function pageHtml(donnees, css) {
  return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover">
<style>${css}
:root{
  --fond:#F1E8CB; --carte:#FBF6E6; --encre:#1C1A1A; --doux:rgba(28,26,26,.58); --ligne:rgba(28,26,26,.1);
  --orange:#F56E2E; --orange-texte:#A83E0D; --vert:#3D5C3D; --rouge:#C2361B;
  --ombre:0 14px 40px rgba(28,26,26,.22);
  --titre:'Cabinet Grotesk','Arial Black',system-ui,sans-serif; --texte:'Satoshi',system-ui,-apple-system,sans-serif;
}
@media (prefers-color-scheme: dark){:root{
  --fond:#141212; --carte:#211E1D; --encre:#F1E8CB; --doux:rgba(241,232,203,.55); --ligne:rgba(241,232,203,.1);
  --orange-texte:#F58A58; --vert:#8DB58D; --rouge:#F07A60; --ombre:0 14px 40px rgba(0,0,0,.6);
}}
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
html,body{margin:0;background:var(--fond);color:var(--encre);font:500 17px/1.35 var(--texte)}
body{padding:calc(env(safe-area-inset-top) + 16px) 14px calc(env(safe-area-inset-bottom) + 90px)}
button,input,textarea{font:inherit;color:inherit}
button{background:none;border:0;padding:0;cursor:pointer}

/* En-tête : où j'en suis, en une phrase */
.tete{display:flex;align-items:center;gap:12px;padding:0 4px}
.tete svg{width:38px;height:38px;flex:none}
.tete div{flex:1;min-width:0}
h1{font:800 28px/1 var(--titre);margin:0}
.date{display:block;color:var(--doux);font-size:14px;margin-top:3px}
.date::first-letter{text-transform:uppercase}
.bilan{margin:18px 4px 20px;display:flex;align-items:center;gap:12px}
.bilan .jauge{flex:1;height:8px;border-radius:99px;background:var(--ligne);overflow:hidden}
.bilan .jauge i{display:block;height:100%;width:0;background:var(--orange);border-radius:99px;transition:width .5s cubic-bezier(.16,1,.3,1)}
.bilan b{font:800 15px var(--titre);white-space:nowrap}
.bilan.fini .jauge i{background:var(--vert)} .bilan.fini b{color:var(--vert)}

/* Sections */
section{background:var(--carte);border-radius:24px;padding:4px 14px;margin-bottom:12px;transition:box-shadow .2s,outline-color .2s;outline:2px solid transparent}
section.cible{outline-color:var(--orange)}
.sh{display:flex;align-items:center;gap:8px;width:100%;padding:12px 2px 6px;text-align:left}
.sh h2{margin:0;font:800 19px/1.2 var(--titre)}
.sh .n{font:700 13px var(--texte);color:var(--doux)}
.sh .n.ok{color:var(--vert)}
.sh .chev{margin-left:auto;color:var(--doux);font-size:20px;line-height:1;transition:transform .2s}
.replie .chev{transform:rotate(-90deg)}
.replie ul{display:none}
.replie .sh{padding-bottom:12px}
ul{list-style:none;margin:0;padding:0}

/* Tâches */
.tache{display:flex;align-items:flex-start;gap:12px;padding:11px 2px;border-top:1px solid var(--ligne);-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;background:var(--carte);touch-action:pan-y}
ul > .tache:first-child{border-top:0}
.case{flex:none;width:26px;height:26px;border-radius:50%;border:2px solid var(--orange);display:grid;place-items:center;margin-top:-1px;transition:background .2s,transform .15s}
.case:active{transform:scale(.88)}
.case svg{width:14px;height:14px;opacity:0;transition:opacity .15s}
.coche .case{background:var(--orange)} .coche .case svg{opacity:1}
.coche .txt{color:var(--doux);text-decoration:line-through}
.txt{flex:1;min-width:0;word-wrap:break-word;cursor:pointer}
.meta{display:block;font-size:13px;color:var(--orange-texte);margin-top:2px}

/* Ajouter, directement dans la section */
.ajouter{border-top:1px solid var(--ligne)}
ul > .ajouter:first-child{border-top:0}
.ajouter button{display:flex;align-items:center;gap:12px;width:100%;padding:11px 2px;color:var(--doux);text-align:left}
.ajouter .plus{width:26px;height:26px;border-radius:50%;border:2px dashed var(--ligne);display:grid;place-items:center;font:700 18px/1 var(--texte);color:var(--orange)}
.ajouter input{flex:1;min-width:0;border:0;background:none;outline:0;padding:0;font-size:17px;color:var(--encre)}
.ajouter form{display:flex;align-items:center;gap:12px;padding:9px 2px}

/* Glisser-déposer */
.place{height:46px;border-radius:14px;background:var(--ligne);margin:4px 0;border:0}
.fantome{position:fixed;left:14px;right:14px;z-index:50;border-radius:16px;box-shadow:var(--ombre);padding:11px 14px;transform:scale(1.03);pointer-events:none;border:0}
.drague{display:none}
body.glisse{overflow:hidden}

/* Fait */
.fait .tache{align-items:center}
.fait .txt{color:var(--doux);cursor:default}
.fait .actions{display:flex;gap:6px;flex:none}
.pill{border:1.5px solid var(--ligne);border-radius:999px;padding:6px 12px;font-size:14px;font-weight:700;white-space:nowrap}
.pill.plein{background:var(--encre);color:var(--fond);border-color:var(--encre)}
.pill.danger{color:var(--rouge);border-color:color-mix(in srgb,var(--rouge) 40%,transparent)}
.pill.actif{background:var(--orange);border-color:var(--orange);color:#1C1A1A}
.pied{display:flex;justify-content:flex-end;padding:6px 0 12px}
.pied[hidden],.replie .pied{display:none}
.astuce{color:var(--doux);font-size:13px;text-align:center;margin:18px 20px 0}

/* Fiche d'une tâche */
.voile{position:fixed;inset:0;background:rgba(0,0,0,.4);opacity:0;pointer-events:none;transition:opacity .2s;z-index:60}
.voile.ouvert{opacity:1;pointer-events:auto}
.fiche{position:fixed;left:0;right:0;bottom:0;z-index:61;background:var(--carte);border-radius:24px 24px 0 0;padding:10px 16px calc(env(safe-area-inset-bottom) + 18px);transform:translateY(105%);transition:transform .3s cubic-bezier(.16,1,.3,1)}
.fiche.ouvert{transform:none}
.fiche .poignee{width:40px;height:5px;border-radius:9px;background:var(--ligne);margin:0 auto 14px}
.fiche textarea{width:100%;border:1.5px solid var(--ligne);border-radius:16px;background:var(--fond);font:500 17px/1.35 var(--texte);padding:12px 14px;resize:none;outline:0}
.fiche h3{font:700 12px var(--texte);text-transform:uppercase;letter-spacing:.07em;color:var(--doux);margin:16px 0 8px}
.fiche .grille{display:flex;flex-wrap:wrap;gap:8px}
.fiche label.pill{display:flex;align-items:center;gap:6px}
.fiche input[type=date]{border:0;padding:0;background:none;font:700 14px var(--texte);color:var(--encre)}
.fiche .bas{display:flex;justify-content:space-between;margin-top:22px}

/* Toast */
.toast{position:fixed;left:50%;bottom:calc(env(safe-area-inset-bottom) + 22px);z-index:70;transform:translate(-50%,20px);background:var(--encre);color:var(--fond);border-radius:999px;padding:10px 12px 10px 18px;display:flex;gap:14px;align-items:center;font-size:15px;opacity:0;pointer-events:none;transition:.25s;white-space:nowrap;max-width:calc(100% - 28px)}
.toast span{overflow:hidden;text-overflow:ellipsis}
.toast.ouvert{opacity:1;transform:translate(-50%,0);pointer-events:auto}
.toast button{color:var(--orange);font-weight:700}
</style></head>
<body>
<div class="tete">
  <svg viewBox="0 0 232 232" aria-hidden="true"><rect width="232" height="232" rx="52" fill="#F56E2E"/><g transform="translate(16, 36)"><path d="M199.75 142.65L184.57 113.36C183.98 112.21 182.83 111.54 181.64 111.54C181.21 111.54 180.76 111.62 180.33 111.82C167.47 117.53 155.41 120.43 144.5 120.43C130.22 121.08 107.65 116.91 100.07 103.4C93.61 91.88 98.16 72.67 110.11 63.56C121.25 55.06 135.98 53.37 149.31 55.8C150.65 56.04 152.02 56.36 153.12 57.19C156.61 59.86 154.58 67.37 152.39 70.19C150.1 73.14 146.16 75.07 141.58 75.47C140.99 75.53 140.39 75.55 139.79 75.55C138.9 75.55 138.01 75.49 137.12 75.38C134.18 75.01 131.18 74.21 128.2 73.15C128.2 73.15 121.95 105.27 144.43 109.01C182.18 115.29 191.09 78.25 191.25 77.69C191.49 76.6 197.12 50.93 183.28 32.79C174.73 21.59 160.8 15.91 141.87 15.91C141.11 15.91 140.35 15.91 139.56 15.94C90.98 17.09 58.95 53.7 46.2 71.53V3.44C46.2 1.54 44.71 0 42.88 0H3.32001C1.49001 0 0 1.54 0 3.44V156.98C0 158.87 1.48001 160.42 3.32001 160.42H41.11C42.57 160.42 43.86 159.43 44.28 157.97C45.57 153.61 45.76 132.1 45.76 119.53C45.76 117.16 48.74 116.24 49.97 118.23C59.67 133.88 87.12 166.81 143.66 160.42C172.89 157.11 197.32 147.91 198.33 147.38C199.14 146.96 199.73 146.22 200 145.34C200.27 144.46 200.19 143.49 199.76 142.67L199.75 142.65Z" fill="#F1E8CB"/></g></svg>
  <div><h1>Mes tâches</h1><span class="date" id="date"></span></div>
</div>
<div class="bilan" id="bilan"><div class="jauge"><i id="jauge"></i></div><b id="bilan-txt"></b></div>
<main id="app"></main>
<p class="astuce">Maintiens une tâche pour la glisser dans une autre section.</p>

<div class="voile" id="voile"></div>
<div class="fiche" id="fiche" role="dialog" aria-modal="true"></div>
<div class="toast" id="toast"><span id="toast-txt"></span><button id="toast-annuler">Annuler</button></div>

<script>
${cleJour.toString()}
${decaler.toString()}
${categorie.toString()}

const etat = ${JSON.stringify(donnees).replace(/</g, '\\u003c')};

// --- Pont avec Scriptable : le script attend, la page répond à chaque changement.
let attente = null, sale = false;
function sauver() {
  sale = true;
  if (attente) { const c = attente; attente = null; sale = false; c(JSON.stringify(etat)); }
}
window.__attendre = (c) => {
  if (sale) { sale = false; c(JSON.stringify(etat)); } else attente = c;
};

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const auj = () => cleJour(new Date());
const JOURS = ['dimanche','lundi','mardi','mercredi','jeudi','vendredi','samedi'];
const MOIS = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
function joli(cle) {
  const [a, m, j] = cle.split('-').map(Number);
  return JOURS[new Date(a, m - 1, j).getDay()] + ' ' + j + ' ' + MOIS[m - 1];
}
function quand(cle) {
  const a = auj();
  if (cle === decaler(a, -1)) return 'hier';
  if (cle === decaler(a, 2)) return 'après-demain';
  return joli(cle);
}
const CHEV = '<svg class="chev" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>';
const COCHE = '<svg viewBox="0 0 24 24" fill="none" stroke="#1C1A1A" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';

// Sections affichées, dans l'ordre de l'ancienne note.
const SECTIONS = [
  ['quotidien', 'Quotidien'],
  ['aujourdhui', "Aujourd'hui"],
  ['demain', 'Demain'],
  ['plustard', 'Plus tard'],
  ['afaire', 'À faire'],
];
const DESTINATIONS = [
  ['quotidien', 'Quotidien'],
  ['aujourdhui', "Aujourd'hui"],
  ['demain', 'Demain'],
  ['apres', 'Après-demain'],
  ['afaire', 'À faire'],
];
let faitOuvert = false;
let aVider = false;
let quotOuvert = null; // null = automatique : replié quand tout est fait

function placer(t, dest, date) {
  const a = auj();
  delete t.date;
  if (dest === 'quotidien') { t.section = 'quotidien'; delete t.faitLe; }
  else if (dest === 'afaire') t.section = 'afaire';
  else {
    t.section = 'jour';
    t.date = date || (dest === 'aujourdhui' ? a : dest === 'demain' ? decaler(a, 1) : decaler(a, 2));
  }
}

function ligne(t, cat) {
  const a = auj();
  const fait = cat === 'quotidien' && t.faitLe === a;
  let meta = '';
  if (cat === 'aujourdhui' && t.date < a) meta = '<span class="meta">Prévu ' + (quand(t.date) === 'hier' ? 'hier' : 'le ' + joli(t.date)) + '</span>';
  if (cat === 'plustard') meta = '<span class="meta">' + quand(t.date) + '</span>';
  return '<li class="tache' + (fait ? ' coche' : '') + '" data-id="' + t.id + '"><button class="case" data-cocher aria-label="Cocher">' + COCHE + '</button><div class="txt" data-ouvrir role="button">' + esc(t.texte) + meta + '</div></li>';
}
const ligneAjouter = (cat) => '<li class="ajouter" data-ajout="' + cat + '"><button data-ajouter><span class="plus">+</span>Ajouter</button></li>';

function rendre() {
  const a = auj();
  $('#date').textContent = joli(a);
  const par = {};
  for (const t of etat.taches) (par[categorie(t, a)] ||= []).push(t);

  // Bilan du jour : quotidiennes + tâches du jour, faites ou non.
  const quot = par.quotidien || [];
  const faitsAuj = etat.taches.filter((t) => t.section === 'fait' && t.faitLe === a).length;
  const total = quot.length + (par.aujourdhui || []).length + faitsAuj;
  const faits = quot.filter((t) => t.faitLe === a).length + faitsAuj;
  const reste = total - faits;
  $('#jauge').style.width = total ? Math.round((faits / total) * 100) + '%' : '0%';
  $('#bilan-txt').textContent = !total ? 'Rien de prévu' : reste ? (reste + ' à faire aujourd’hui') : 'Journée bouclée ✓';
  $('#bilan').classList.toggle('fini', total > 0 && !reste);

  let html = '';
  for (const [cat, nom] of SECTIONS) {
    let liste = par[cat] || [];
    if (cat === 'plustard' && !liste.length) continue;
    let n = liste.length ? String(liste.length) : '', ok = false, replie = false;
    if (cat === 'quotidien') {
      // Ce qui reste à faire d'abord, le coché descend.
      liste = [...liste.filter((t) => t.faitLe !== a), ...liste.filter((t) => t.faitLe === a)];
      const f = liste.filter((t) => t.faitLe === a).length;
      ok = liste.length > 0 && f === liste.length;
      n = liste.length ? f + '/' + liste.length : '';
      replie = quotOuvert === null ? ok : !quotOuvert;
    }
    html += '<section data-cat="' + cat + '"' + (replie ? ' class="replie"' : '') + '>' +
      '<button class="sh"' + (cat === 'quotidien' ? ' data-replier-quot' : ' tabindex="-1"') + '><h2>' + nom + '</h2>' +
      '<span class="n' + (ok ? ' ok' : '') + '">' + (ok ? 'tout est fait ✓' : n) + '</span>' +
      (cat === 'quotidien' ? CHEV : '') + '</button>' +
      '<ul>' + liste.map((t) => ligne(t, cat)).join('') + (cat === 'plustard' ? '' : ligneAjouter(cat)) + '</ul></section>';
  }

  const faitsListe = etat.taches.filter((t) => t.section === 'fait').sort((x, y) => (y.faitLe || '').localeCompare(x.faitLe || ''));
  if (faitsListe.length) {
    html += '<section class="fait' + (faitOuvert ? '' : ' replie') + '"><button class="sh" data-replier><h2>Fait</h2><span class="n">' + faitsListe.length + '</span>' + CHEV + '</button><ul>';
    html += faitsListe.map((t) => '<li class="tache" data-id="' + t.id + '"><div class="txt">' + esc(t.texte) + '<span class="meta" style="color:var(--vert)">' + (t.faitLe === a ? "Fait aujourd'hui" : 'Fait ' + (quand(t.faitLe) === 'hier' ? 'hier' : 'le ' + joli(t.faitLe))) + '</span></div><span class="actions"><button class="pill" data-remettre>Remettre</button><button class="pill danger" data-suppr aria-label="Supprimer">✕</button></span></li>').join('');
    html += '</ul><div class="pied"' + (faitOuvert ? '' : ' hidden') + '><button class="pill danger" data-vider>' + (aVider ? 'Sûr ? Tout supprimer' : 'Tout supprimer') + '</button></div></section>';
  }
  $('#app').innerHTML = html;
}

// --- Toast avec « Annuler »
let annulation = null, minuteur = null;
function toast(texte, annuler) {
  annulation = annuler;
  $('#toast-txt').textContent = texte;
  $('#toast').classList.add('ouvert');
  clearTimeout(minuteur);
  minuteur = setTimeout(() => { $('#toast').classList.remove('ouvert'); annulation = null; }, 4000);
}
$('#toast-annuler').onclick = () => {
  if (annulation) { annulation(); annulation = null; sauver(); rendre(); }
  $('#toast').classList.remove('ouvert');
};

const trouver = (id) => etat.taches.find((t) => t.id === id);
const court = (s) => (s.length > 24 ? s.slice(0, 24) + '…' : s);

// --- Ajouter dans une section : le champ reste ouvert pour enchaîner.
function ouvrirAjout(li) {
  const cat = li.dataset.ajout;
  li.innerHTML = '<form><span class="plus" style="width:26px;height:26px;border-radius:50%;border:2px dashed var(--ligne);display:grid;place-items:center;color:var(--orange);font-weight:700">+</span><input enterkeyhint="done" placeholder="Nouvelle tâche…" autocomplete="off"></form>';
  const input = li.querySelector('input');
  const form = li.querySelector('form');
  input.focus();
  form.onsubmit = (e) => {
    e.preventDefault();
    const texte = input.value.trim();
    if (!texte) { input.blur(); return; }
    const t = { id: 't' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), texte, cree: auj() };
    placer(t, cat);
    etat.taches.push(t);
    sauver();
    // On insère la ligne sans tout redessiner, pour garder le clavier ouvert.
    li.insertAdjacentHTML('beforebegin', ligne(t, cat));
    input.value = '';
  };
  input.onblur = () => setTimeout(() => {
    // Rien de focalisé ailleurs (on n'est pas passé au « + » d'une autre section) : on referme.
    if (!document.activeElement || !document.activeElement.closest('.ajouter')) rendre();
  }, 150);
}

document.addEventListener('click', (e) => {
  if (Date.now() < ignorerClicJusqua) { e.preventDefault(); return; }
  const b = e.target.closest('button, [data-ouvrir]');
  if (!b) return;
  const li = b.closest('.tache');
  const t = li && trouver(li.dataset.id);
  const a = auj();

  if (b.hasAttribute('data-cocher') && t) {
    if (t.section === 'quotidien') {
      t.faitLe = t.faitLe === a ? null : a;
      li.classList.toggle('coche', t.faitLe === a);
      sauver();
      setTimeout(rendre, 350);
      return;
    }
    const avant = { section: t.section, date: t.date };
    t.origine = avant;
    t.section = 'fait';
    t.faitLe = a;
    delete t.date;
    li.classList.add('coche');
    toast('« ' + court(t.texte) + ' » est fait', () => {
      t.section = avant.section; if (avant.date) t.date = avant.date; delete t.faitLe; delete t.origine;
    });
    sauver();
    setTimeout(rendre, 350);
    return;
  }
  if (b.hasAttribute('data-ouvrir') && t) return ouvrirFiche(t);
  if (b.hasAttribute('data-ajouter')) return ouvrirAjout(b.closest('.ajouter'));
  if (b.hasAttribute('data-replier-quot')) {
    const sec = b.closest('section');
    quotOuvert = sec.classList.contains('replie');
    return rendre();
  }
  if (b.hasAttribute('data-replier')) { faitOuvert = !faitOuvert; aVider = false; return rendre(); }
  if (b.hasAttribute('data-remettre') && t) {
    const o = t.origine || { section: 'afaire' };
    t.section = o.section; if (o.date) t.date = o.date;
    delete t.faitLe; delete t.origine;
    toast('« ' + court(t.texte) + ' » est de retour', null);
  } else if (b.hasAttribute('data-suppr') && t) {
    const i = etat.taches.indexOf(t);
    etat.taches.splice(i, 1);
    toast('Supprimé', () => etat.taches.splice(i, 0, t));
  } else if (b.hasAttribute('data-vider')) {
    if (!aVider) { aVider = true; return rendre(); }
    const avant = etat.taches.slice();
    const gardes = etat.taches.filter((x) => x.section !== 'fait');
    etat.taches.length = 0; etat.taches.push(...gardes);
    aVider = false; faitOuvert = false;
    toast('Tâches faites supprimées', () => { etat.taches.length = 0; etat.taches.push(...avant); });
  } else return;
  sauver();
  rendre();
});

// --- Glisser-déposer : appui long sur une tâche, puis on la promène.
let ignorerClicJusqua = 0;
const drag = { minuteur: null, actif: false, t: null, li: null, fantome: null, place: null, dy: 0, x0: 0, y0: 0, y: 0, defile: 0 };

function debut(x, y, cible) {
  const li = cible.closest('.tache');
  if (!li || cible.closest('.case, .actions') || li.closest('.fait')) return;
  drag.x0 = x; drag.y0 = y; drag.y = y;
  drag.minuteur = setTimeout(() => lancer(li, y), 380);
}
function lancer(li, y) {
  const t = trouver(li.dataset.id);
  if (!t) return;
  const r = li.getBoundingClientRect();
  drag.actif = true; drag.t = t; drag.li = li; drag.dy = y - r.top;
  const f = li.cloneNode(true);
  f.classList.add('fantome');
  f.style.top = r.top + 'px';
  document.body.appendChild(f);
  drag.fantome = f;
  const p = document.createElement('li');
  p.className = 'place';
  li.after(p);
  drag.place = p;
  li.classList.add('drague');
  document.body.classList.add('glisse');
  if (navigator.vibrate) navigator.vibrate(10);
  bouclerDefilement();
}
function deplacer(x, y) {
  if (!drag.actif) {
    if (drag.minuteur && Math.hypot(x - drag.x0, y - drag.y0) > 8) { clearTimeout(drag.minuteur); drag.minuteur = null; }
    return;
  }
  drag.y = y;
  drag.fantome.style.top = (y - drag.dy) + 'px';
  const sous = document.elementFromPoint(x, y);
  document.querySelectorAll('section.cible').forEach((s) => s.classList.remove('cible'));
  const sec = sous && sous.closest('section[data-cat]');
  if (!sec) return;
  sec.classList.add('cible');
  const ul = sec.querySelector('ul');
  const lignes = [...ul.querySelectorAll('.tache:not(.drague)')];
  let avant = null;
  for (const l of lignes) {
    const r = l.getBoundingClientRect();
    if (y < r.top + r.height / 2) { avant = l; break; }
  }
  const fin = ul.querySelector('.ajouter');
  const ref = avant || fin;
  if (ref) { if (ref.previousElementSibling !== drag.place) ul.insertBefore(drag.place, ref); }
  else if (drag.place.parentNode !== ul || drag.place.nextElementSibling) ul.appendChild(drag.place);
}
function bouclerDefilement() {
  if (!drag.actif) return;
  const h = window.innerHeight;
  const v = drag.y < 90 ? -Math.ceil((90 - drag.y) / 6) : drag.y > h - 90 ? Math.ceil((drag.y - (h - 90)) / 6) : 0;
  if (v) { window.scrollBy(0, v); deplacer(drag.x0, drag.y); }
  requestAnimationFrame(bouclerDefilement);
}
function fin() {
  clearTimeout(drag.minuteur); drag.minuteur = null;
  if (!drag.actif) return;
  const { t, place } = drag;
  const sec = place.closest('section[data-cat]');
  document.querySelectorAll('section.cible').forEach((s) => s.classList.remove('cible'));
  drag.actif = false;
  drag.fantome.remove();
  document.body.classList.remove('glisse');
  ignorerClicJusqua = Date.now() + 400;
  if (sec) {
    const a = auj();
    const cat = sec.dataset.cat;
    const avantCat = categorie(t, a);
    if (cat !== avantCat) {
      if (cat === 'plustard') {
        const voisin = place.nextElementSibling?.classList.contains('tache') ? trouver(place.nextElementSibling.dataset.id) : null;
        placer(t, 'date', voisin?.date || decaler(a, 2));
      } else placer(t, cat);
    }
    // Ordre : on se place juste avant la tâche qui suit le trou.
    etat.taches.splice(etat.taches.indexOf(t), 1);
    const suivant = place.nextElementSibling?.classList.contains('tache') ? trouver(place.nextElementSibling.dataset.id) : null;
    if (suivant) etat.taches.splice(etat.taches.indexOf(suivant), 0, t);
    else {
      const memes = etat.taches.filter((x) => categorie(x, a) === cat);
      const dernier = memes[memes.length - 1];
      etat.taches.splice(dernier ? etat.taches.indexOf(dernier) + 1 : etat.taches.length, 0, t);
    }
    if (cat !== avantCat) toast('« ' + court(t.texte) + ' » → ' + SECTIONS.find((s) => s[0] === cat)[1], null);
    sauver();
  }
  rendre();
}

document.addEventListener('touchstart', (e) => { if (e.touches.length === 1) debut(e.touches[0].clientX, e.touches[0].clientY, e.target); }, { passive: true });
document.addEventListener('touchmove', (e) => {
  if (drag.actif) e.preventDefault();
  deplacer(e.touches[0].clientX, e.touches[0].clientY);
}, { passive: false });
document.addEventListener('touchend', fin);
document.addEventListener('touchcancel', fin);
// Souris : pour tester sur ordinateur.
document.addEventListener('mousedown', (e) => { if (e.button === 0) debut(e.clientX, e.clientY, e.target); });
document.addEventListener('mousemove', (e) => deplacer(e.clientX, e.clientY));
document.addEventListener('mouseup', fin);
document.addEventListener('contextmenu', (e) => { if (e.target.closest('.tache')) e.preventDefault(); });

// --- Fiche d'une tâche : renommer, déplacer, dater, remonter, supprimer
let enCours = null;
function ouvrirFiche(t) {
  enCours = t;
  const a = auj();
  const cat = categorie(t, a);
  const actif = (k) => (k === cat || (k === 'apres' && t.date === decaler(a, 2))) && !(k === 'apres' && cat !== 'plustard') ? 'actif' : '';
  $('#fiche').innerHTML =
    '<div class="poignee"></div>' +
    '<textarea id="f-texte" rows="2">' + esc(t.texte) + '</textarea>' +
    '<h3>Mettre dans</h3><div class="grille">' +
    DESTINATIONS.map(([k, n]) => '<button class="pill ' + actif(k) + '" data-dest="' + k + '">' + n + '</button>').join('') +
    '<label class="pill">📅 <input type="date" id="f-date" value="' + (t.date || '') + '" min="' + a + '" aria-label="Choisir une date"></label>' +
    '</div>' +
    '<div class="bas"><button class="pill danger" data-f-suppr>Supprimer</button><span style="display:flex;gap:8px"><button class="pill" data-f-haut>↑ En haut</button><button class="pill plein" data-f-fermer>OK</button></span></div>';
  $('#fiche').classList.add('ouvert');
  $('#voile').classList.add('ouvert');
}
function fermerFiche() {
  if (!enCours) return;
  const v = $('#f-texte').value.trim();
  if (v && v !== enCours.texte) { enCours.texte = v; sauver(); }
  enCours = null;
  $('#fiche').classList.remove('ouvert');
  $('#voile').classList.remove('ouvert');
  rendre();
}
$('#voile').onclick = fermerFiche;
$('#fiche').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b || !enCours) return;
  if (b.dataset.dest) {
    const t = enCours;
    placer(t, b.dataset.dest); sauver(); fermerFiche();
    toast('« ' + court(t.texte) + ' » → ' + DESTINATIONS.find((d) => d[0] === b.dataset.dest)[1], null);
  } else if (b.hasAttribute('data-f-haut')) {
    etat.taches.splice(etat.taches.indexOf(enCours), 1); etat.taches.unshift(enCours); sauver(); fermerFiche();
  } else if (b.hasAttribute('data-f-suppr')) {
    const t = enCours, i = etat.taches.indexOf(t);
    etat.taches.splice(i, 1); enCours = null;
    $('#fiche').classList.remove('ouvert'); $('#voile').classList.remove('ouvert');
    toast('Supprimé', () => etat.taches.splice(i, 0, t));
    sauver(); rendre();
  } else if (b.hasAttribute('data-f-fermer')) fermerFiche();
});
$('#fiche').addEventListener('change', (e) => {
  if (e.target.id === 'f-date' && e.target.value && enCours) { placer(enCours, 'date', e.target.value); sauver(); fermerFiche(); }
});

// Si l'app reste ouverte après minuit, la journée change sous nos yeux.
let jourAffiche = auj();
setInterval(() => { if (auj() !== jourAffiche && !drag.actif && !enCours) { jourAffiche = auj(); rendre(); } }, 30000);

rendre();
</script>
</body></html>`;
}

async function ouvrirApp(donnees) {
  const wv = new WebView();
  await wv.loadHTML(pageHtml(donnees, await policesCss()));
  let ouvert = true;
  // Boucle d'écoute : la page rend la main à chaque modification.
  (async () => {
    while (ouvert) {
      try {
        const json = await wv.evaluateJavaScript('window.__attendre(completion)', true);
        if (json) ecrire(JSON.parse(json));
      } catch (e) {
        break;
      }
    }
  })();
  await wv.present(true);
  ouvert = false;
  // Filet de sécurité : dernier état relu à la fermeture.
  try {
    const json = await wv.evaluateJavaScript('JSON.stringify(etat)');
    if (json) ecrire(JSON.parse(json));
  } catch (e) {}
}

// ---------------------------------------------------------------------------
const donnees = await lire();
if (config.runsInWidget) {
  Script.setWidget(construireWidget(donnees, config.widgetFamily));
} else {
  await ouvrirApp(donnees);
  // Aperçu du widget à jour quand on lance depuis l'app Scriptable.
  Script.setWidget(construireWidget(await lire(), 'large'));
}
Script.complete();
