// Checks fixed interface copy and seed descriptions without touching user data.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const dictionaryModule = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(root, 'app/lib/translations-en.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, dictionaryModule);
const dictionary = dictionaryModule.exports.english;
const missing = new Map();
const preserved = new Set(['Eiendomsoversikten', 'EIENDOMSOVERSIKTEN', 'SSB', 'NOK', 'EUR', 'USD', 'NO', 'EN', 'SLETT', 'Eksempelveien 12', 'Eksempelgata 12, Oslo', '0 kr', '0 NOK']);
function check(text, file) {
  const key = text.trim();
  if (!/[A-Za-zÆØÅæøå]/.test(key) || dictionary[key] || preserved.has(key) || /^(?:https?:\/\/|[^\s]+@[^\s]+$)/.test(key)) return;
  missing.set(key, path.relative(root, file));
}
function files(directory) { return fs.readdirSync(directory).flatMap(name => { const file = path.join(directory, name); return fs.statSync(file).isDirectory() ? files(file) : [file]; }); }
for (const file of files(path.join(root, 'app')).filter(file => file.endsWith('.tsx'))) {
  const source = fs.readFileSync(file, 'utf8');
  const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  function visit(node) {
    if (ts.isJsxText(node)) check(node.text, file);
    if (ts.isCallExpression(node) && ['uiText', 'uiFormat'].includes(node.expression.getText(tree)) && node.arguments[0] && ts.isStringLiteral(node.arguments[0])) check(node.arguments[0].text, file);
    if (ts.isJsxAttribute(node) && ['text', 'tekst', 'label', 'tittel', 'merke', 'lenketekst', 'placeholder', 'title', 'aria-label'].includes(node.name.text) && node.initializer && ts.isStringLiteral(node.initializer)) check(node.initializer.text, file);
    if (ts.isJsxAttribute(node) && node.name.text === 'key') assert.ok(!node.initializer || !ts.isJsxElement(node.initializer) && !ts.isJsxSelfClosingElement(node.initializer), 'A React key must remain an identifier: ' + file);
    ts.forEachChild(node, visit);
  }
  visit(tree);
}
for (const name of ['demo-data.ts', 'dokumenter.ts', 'kalender.ts', 'okonomi.ts', 'alt-om-boligen.ts']) {
  const file = path.join(root, 'app/lib', name);
  const tree = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
  function visit(node) {
    if (ts.isPropertyAssignment(node) && /^(notat|tittel|beskrivelse)$/.test(node.name.getText(tree)) && ts.isStringLiteral(node.initializer)) check(node.initializer.text, file);
    ts.forEachChild(node, visit);
  }
  visit(tree);
}
if (missing.size) {
  for (const [text, file] of missing) console.error(`${file}: missing English translation: ${JSON.stringify(text)}`);
  process.exitCode = 1;
} else console.log(`PASS: fixed interface copy and built-in example descriptions checked against ${Object.keys(dictionary).length} English translations.`);
