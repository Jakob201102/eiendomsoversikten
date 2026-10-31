const fs=require('fs'),path=require('path'),ts=require('typescript'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),cache={};
function load(name){if(cache[name])return cache[name];const out={};new Function('require','exports',ts.transpileModule(fs.readFileSync(path.join(root,'app/lib',name+'.ts'),'utf8'),{compilerOptions:{module:1,target:9}}).outputText)(p=>load(p.slice(2)),out);return cache[name]=out;}
const lib=load('boligimport'),pdf=load('pdf-import');
const blank=()=>({romForslag:[],romDetaljer:[],historikkForslag:[],bildeForslag:[],viktigeDeler:{},tilleggsarealer:{}});
const finn={...blank(),adresse:'Testveien 12',energimerking:'D',romForslag:['Entré','Soverom 1','Soverom 2','WC','Stue/Kjøkken'],romDetaljer:[{navn:'Soverom 1',areal:'',sistPusset:''}]};
const doc={...blank(),adresse:'Testveien 12',energimerking:'D - RØD',romForslag:['Entré/gang','Soverom','Toalettrom','Kjøkken'],romDetaljer:[{navn:'Soverom 1',areal:'12',sistPusset:'2021'},{navn:'Soverom 2',areal:'9',sistPusset:''}]};
const work=(tittel,beskrivelse='Vinduer byttet i 2020.')=>({tittel,beskrivelse,omrade:'Vinduer',dato:'2020-01-01'});
finn.historikkForslag=[work('Vinduer skiftet')];doc.historikkForslag=[work('Vinduer byttet'),work('Vinduer malt','Vinduer malt i 2020.')];
const sources=[{kilde:'FINN',data:finn},{kilde:'salgsoppgave.pdf',data:doc}];
const merged=lib.slaSammenBoligimport(sources).resultat;
assert.equal(merged.romForslag.length,5);assert.equal(merged.romDetaljer.find(r=>r.navn==='Soverom 1').areal,'12');assert.equal(merged.energimerking,'D - RØD');assert.equal(merged.historikkForslag.length,2);
assert.deepEqual(lib.slaSammenBoligimport([...sources,sources[1]]).resultat,merged,'repeating identical source is idempotent');
const edited=structuredClone(merged);edited.byggeaar='1930';edited.historikkForslag=[];
const fresh={...blank(),byggeaar:'1920',energimerking:'E'};
const kept=lib.beholdImportredigeringer(merged,edited,fresh);assert.equal(kept.byggeaar,'1930');assert.equal(kept.energimerking,'E');assert.deepEqual(kept.historikkForslag,[]);assert.deepEqual(kept.romForslag,[],'removed automatic rooms must not survive');assert.equal(finn.romDetaljer[0].areal,'','sources are immutable');
const conflicts=lib.slaSammenBoligimport([{kilde:'FINN',data:finn},{kilde:'doc.pdf',data:{...doc,energimerking:'F'}}]);assert(conflicts.konflikter.some(k=>k.felt==='energimerking'));
const history=lib.analyserBoligtekst('Badet ble renovert i 2018.\nBadet ble malt i 2023.\nKjøkkenet må skiftes i 2026.');assert(history.historikkForslag.some(h=>h.dato.startsWith('2018')));assert(history.historikkForslag.some(h=>h.dato.startsWith('2023')));assert(!history.historikkForslag.some(h=>h.omrade==='Kjøkken'));
assert.equal(pdf.pdfSideTekst([{str:'Vinduer skiftet i',hasEOL:true},{str:'2020.'}]),'Vinduer skiftet i 2020.');
const items=[{str:'BRA-i',transform:[10,0,0,10,30,600]},{str:'51 m²',transform:[10,0,0,10,180,600],hasEOL:true},{type:'beginMarkedContent'},{str:'Etasje',transform:[10,0,0,10,30,580]},{str:'2',transform:[10,0,0,10,180,580]}];assert.equal(pdf.pdfSideTekst(items),'BRA-i 51 m²\nEtasje 2');assert.equal(lib.analyserBoligtekst(pdf.pdfSideTekst(items)).braI,'51');
(async()=>{
 let reads=[],cleaned=[],visited=[];
 const pageText=['Adresse: Testveien 12. Bruksareal: 51 m². Byggeår: 1920. Denne siden har et lesbart tekstlag.','Side 2','Bad: 5 m². Energimerking: D. Denne siden har lesbar boligtekst og trenger ikke OCR.'];
 const result=await pdf.lesPdfSider({numPages:3,getPage:async n=>({getTextContent:async()=>({items:[{str:pageText[n-1]}]}),cleanup:()=>cleaned.push(n)})},{ocr:async(p,n)=>{reads.push(n);return 'Soverom 1: 12 m²\nSoverom 2: 9 m²\nVinduer skiftet i 2020.'},page:async(p,n,t)=>visited.push(n)});
 assert.deepEqual(reads,[2],'mixed PDF must OCR scanned page only');assert.deepEqual(cleaned,[1,2,3]);assert.deepEqual(visited,[1,2,3]);assert(result.tekst.includes('Soverom 2'));assert.equal(lib.analyserBoligtekst(result.tekst).romDetaljer.find(r=>r.navn==='Soverom 2').areal,'9');
 const failed=await pdf.lesPdfSider({numPages:2,getPage:async n=>({getTextContent:async()=>({items:[{str:'Side '+n}]})})},{ocr:async()=>{throw Error('offline')}});assert.deepEqual(failed.ufullstendigeSider,[1,2]);
 console.log('PASS: FINN + PDF + text merge, room aliases and enrichment, repeated-source deduplication, distinct work preservation, manual edits vs stale data, mixed PDF per-page OCR, row layout, OCR failures and cleanup.');
})().catch(e=>{console.error(e);process.exit(1)});
