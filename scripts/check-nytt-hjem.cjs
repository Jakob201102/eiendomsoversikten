const fs=require('fs'),path=require('path'),ts=require('typescript'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
function read(p){return fs.readFileSync(path.join(root,p),'utf8')}
function load(p,stubs={}){const out={};const code=ts.transpileModule(read(p),{compilerOptions:{module:1,target:7}}).outputText;new Function('require','exports',code)(n=>n in stubs?stubs[n]:require(n),out);return out;}
const alt=load('app/lib/alt-om-boligen.ts');
const lib=load('app/lib/nytt-hjem.ts',{'./alt-om-boligen':alt});
let draft=lib.tomtHjemutkast();assert.throws(()=>lib.lagNyttHjem(draft),/adressen/);
Object.assign(draft,{adresse:' Testveien 2 ',areal:'66,5',braI:'60',braE:'6,5',tomteareal:'1 200',antallRom:'4',soverom:'3',leilighetsnummer:'H0201',gnrBnr:'154/295',etasjer:'2',energimerking:'D – Oransje',bod:'Kjeller'});
const before=JSON.stringify(draft),saved=lib.lagNyttHjem(draft);
assert.equal(JSON.stringify(draft),before);assert.equal(saved.brukstype,'privat');assert.equal(saved.adresse,'Testveien 2');assert.equal(saved.areal,66.5);assert.equal(saved.tomteareal,1200);assert.equal(saved.bolignummer,'H0201');assert.equal(saved.altOmBoligen.generell.gnrBnr,'154/295');assert.equal(saved.altOmBoligen.generell.braI,'60');assert.equal(saved.altOmBoligen.generell.braE,'6,5');assert.equal(saved.altOmBoligen.tilleggsarealer.bod,'Kjeller');assert.equal(saved.altOmBoligen.onboarding.status,'ferdig');assert.deepEqual(saved.altOmBoligen.rom,[]);
for(const n of ['-5','NaN','abc'])assert.throws(()=>lib.lagNyttHjem({...draft,areal:n}),/gyldig tall/);
assert.equal(lib.lagNyttHjem({...draft,areal:''}).areal,0);
console.log('PASS: native iPad form creates correct private-home data, accepts Norwegian numbers, preserves metadata and rejects invalid input without mutation.');
