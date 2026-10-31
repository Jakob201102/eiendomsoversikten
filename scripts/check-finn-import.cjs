const fs=require('fs'),path=require('path'),ts=require('typescript'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),cache={};
function load(name){if(cache[name])return cache[name];let out={};new Function('require','exports',ts.transpileModule(fs.readFileSync(path.join(root,'app/lib',name+'.ts'),'utf8'),{compilerOptions:{module:1,target:9}}).outputText)(p=>load(p.slice(2)),out);return cache[name]=out;}
const lib=load('boligimport'),finn=load('finn-import');
// A compact, synthetic turbo-stream using the real listing's public factual fields.
function stream(value){const table=[],seen=new Map();function ref(v){if(typeof v==='string'&&seen.has(v))return seen.get(v);let n=table.length;table.push(null);if(typeof v==='string')seen.set(v,n);table[n]=Array.isArray(v)?v.map(ref):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).map(([k,v])=>['_'+ref(k),ref(v)])):v;return n;}ref(value);return '<script>window.__reactRouterContext.streamController.enqueue('+JSON.stringify(JSON.stringify(table))+')</script>';}
const kode='475535440',base='https://images.finncdn.no/dynamic/default/2026/10/vertical-2/15/0/475/535/440_';
const photo=base+'85a8847d-3d0a-45d6-985e-2c4a9c3d2cd0.jpg',plan=base+'6204f2c8-555d-463d-bf36-705f6bfbf20d.jpg',foreign='https://images.finncdn.no/dynamic/default/2026/10/vertical-2/15/0/111/111/111_other.jpg';
const names=['Spisestue/Stue','Soverom','Kjøkken','Entré','Bad','WC','Walk-in'];
const ad={location:{streetAddress:'Svaneviksveien 12',postalCode:'5063',postalName:'Bergen'},propertyType:'Leilighet',constructionYear:1920,floor:2,rooms:2,bedrooms:1,size:{usable:51,usableAreaI:51},plot:{area:4231},energyLabel:{class:'D'},cadastres:[{landNumber:159,titleNumber:981,partOwnershipNumber:26}],images:[{uri:photo,description:'Fasade'},{uri:plan,description:'Plantegning'},{uri:foreign,description:'Unrelated home'}],summaryUnsafe:'Byggeår: 1920. Vinduer fra 2020. Badet har behov for oppussing. Kjøkkenet må skiftes.',generalText:[{heading:'Sentrale lover',textUnsafe:'Soverom pusset opp i 1990.'}]};
const state={adId:475535440,objectData:{ad,meta:{adId:475535440}},floorPlanImages:[{uri:plan}],interactiveFloorPlansImages:{floors:[{floorplan:{uri:plan},longName:'1. etasje',rooms:names.map(roomLabel=>({type:'room',roomLabel}))}]}};
const html='<link rel="canonical" href="https://www.finn.no/475535440"><aside>Etasje: 51. Energimerking: G. Seksjonsnr: 159. Boligtype: Enebolig. '+foreign+'</aside>'+stream({loaderData:state,related:{adId:111111111,objectData:{ad:{floor:51,energyLabel:{class:'G'}},meta:{adId:111111111}}}});
const data=lib.analyserBoligHtml(html,'https://www.finn.no/475535440');
assert.equal(data.adresse,'Svaneviksveien 12, 5063 Bergen');assert.equal(data.etasjer,'2');assert.equal(data.energimerking,'D');assert.equal(data.antallRom,'2');assert.equal(data.soverom,'1');assert.equal(data.gnrBnr,'159/981, andel 26');assert.deepEqual(data.romForslag,names);assert(data.romDetaljer.every(r=>r.areal===''));assert.deepEqual(data.bildeForslag,[photo,plan]);assert.deepEqual(data.plantegningForslag,[plan]);assert.equal(data.romlisteFraPlantegning,true);assert(!data.historikkForslag.some(h=>h.dato.startsWith('1920')||h.dato.startsWith('1990')));assert(!data.viktigeDeler.bad);assert(!data.viktigeDeler.kjokken);assert(data.historikkForslag.some(h=>h.dato.startsWith('2020')));
assert.throws(()=>lib.analyserBoligHtml(html,'https://www.finn.no/111111111'),/annen FINN/);
assert.equal(finn.lesFinnAnnonse(html,'222222222'),null);assert(!finn.tilhorerFinnBilde(foreign,kode));assert(!finn.tilhorerFinnBilde('https://evil.invalid/475/535/440_x.jpg',kode));
const merged=lib.slaSammenBoligimport([{kilde:'FINN',data}]).resultat;assert.equal(merged.romForslag.length,7);assert.equal(merged.bildeTekster[plan],'Plantegning');assert.deepEqual(merged.plantegningForslag,[plan]);
const fallback=lib.analyserBoligHtml('<link rel="canonical" href="https://www.finn.no/475535440"><div data-testid="info-floor"><dt>Etasje</dt><dd>2</dd></div><svg aria-label="Energimerke D"></svg>'+photo+' '+foreign,'https://www.finn.no/475535440');assert.equal(fallback.etasjer,'2');assert.equal(fallback.energimerking,'D');assert.deepEqual(fallback.bildeForslag,[photo]);
assert.equal(lib.analyserBoligtekst('Gårdsnr: 159\nBruksnr: 981').gnrBnr,'159/981');
assert.deepEqual(finn.lesFinnAnnonse('<script>streamController.enqueue("not JSON")</script>',kode),null);
console.log('PASS: listing identity, streamed FINN facts, seven plan areas vs two advertised rooms, energy, floor, land/share numbers, foreign-image rejection, history accuracy, fallback and metadata merge.');
// Exercise the actual API handler with deterministic network/auth boundaries.
(async()=>{
 const source=fs.readFileSync(path.join(root,'app/api/importer-bolig/route.ts'),'utf8');const out={};let urls=[],denied=false;
 const req=n=>n==='next/server'?{NextResponse:{json:(body,options={})=>({body,status:options.status||200})}}:n.endsWith('/boligimport')?lib:n.endsWith('/finn-import')?finn:n.endsWith('/api-sikkerhet')?{krevInnloggetApi:async()=>denied?{status:401}:null}:require(n);
 const fetchMock=async url=>{urls.push(String(url));return {status:200,ok:true,headers:new Headers(),text:async()=>html}};
 new Function('require','exports','fetch',ts.transpileModule(source,{compilerOptions:{module:1,target:9}}).outputText)(req,out,fetchMock);
 const response=await out.POST({json:async()=>({url:'https://www.finn.no/475535440'})});assert.equal(response.status,200);assert.equal(response.body.data.energimerking,'D');assert.equal(urls.length,1);assert.equal(urls[0],'https://www.finn.no/realestate/homes/ad.html?finnkode=475535440');
 const bad=await out.POST({json:async()=>({url:'https://www.finn.no/not-a-listing'})});assert.equal(bad.status,400);assert.equal(urls.length,1);
 denied=true;assert.equal((await out.POST({})).status,401);assert.equal(urls.length,1);
 console.log('PASS: authenticated API normalises short links into one canonical fetch, reads listing-scoped facts, and rejects invalid links/unauthenticated requests before fetching.');
})().catch(e=>{console.error(e);process.exit(1)});
