// Fait tourner le script hors de l'iPhone, avec de faux objets Scriptable.
//   node test/simulateur.mjs app              -> écrit test/apercu.html (la page de l'app)
//   node test/simulateur.mjs widget-medium    -> imprime le contenu du widget
// Familles : small, medium, large, accessoryRectangular, accessoryInline, accessoryCircular.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const racine = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = fs.readFileSync(path.join(racine, 'Kaury Taches.js'), 'utf8');
const mode = process.argv[2] || 'app';
const store = {};
const log = [];
const mkText = (t) => ({ t, centerAlignText() {}, set font(v) {}, set textColor(v) {}, set lineLimit(v) {} });
const mkStack = (depth) => ({
  addText(t) { log.push('  '.repeat(depth) + 'T ' + t); return mkText(t); },
  addStack() { return mkStack(depth + 1); },
  addSpacer() {}, addImage() { log.push('  '.repeat(depth) + 'o'); return {}; },
  centerAlignContent() {}, layoutHorizontally() {}, layoutVertically() {}, setPadding() {},
});
const g = {
  FileManager: { iCloud: () => { throw new Error('no icloud'); }, local: () => ({
    documentsDirectory: () => '/docs', libraryDirectory: () => '/lib', joinPath: (a, b) => a + '/' + b,
    fileExists: (p) => p in store, writeString: (p, s) => { store[p] = s; }, readString: (p) => store[p],
    createDirectory: (p) => { store[p] = 1; }, write: () => {}, read: () => ({ toBase64String: () => '' }), move() {},
  }) },
  Request: class { constructor() {} async load() { throw new Error('offline'); } },
  Color: Object.assign(class { constructor(h) { this.h = h; } }, { dynamic: (a) => a }),
  Font: new Proxy({}, { get: () => () => ({}) }),
  SFSymbol: { named: () => ({ applyFont() {}, image: {} }) },
  Size: class {},
  ListWidget: class { constructor() { Object.assign(this, mkStack(0)); } },
  Script: { setWidget() {}, complete() {} },
  config: { runsInWidget: mode.startsWith('widget'), widgetFamily: mode.split('-')[1] },
  WebView: class { async loadHTML(h) { fs.writeFileSync(path.join(racine, 'test', 'apercu.html'), h); } async present() {} async evaluateJavaScript() { return null; } },
};
const fn = new Function(...Object.keys(g), `return (async () => {${src}})()`);
await fn(...Object.values(g));
console.log(log.join('\n'));
