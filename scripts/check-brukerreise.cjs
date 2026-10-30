const fs = require('fs'), path = require('path'), assert = require('node:assert/strict');
const ts = require('typescript'), React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const root = path.resolve(__dirname, '..');
function source(file) { return ts.createSourceFile(file, fs.readFileSync(path.join(root,file),'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX); }
function find(ast, predicate) { let result; function visit(n) { if(predicate(n)) result=n; ts.forEachChild(n,visit); } visit(ast); assert(result); return result; }
function execute(code, env) { const out={}; const js=ts.transpileModule(code,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText; new Function(...Object.keys(env),'exports','require',js)(...Object.values(env),out,require); return out; }
const page=source('app/mitt-hjem/page.tsx');
const fn=find(page,n=>ts.isFunctionDeclaration(n)&&n.name?.text==='MittHjem');
const ret=fn.body.statements.filter(ts.isReturnStatement).at(-1).expression.getText(page);
const mark=name=>()=>React.createElement('div',{'data-view':name});
const base={Navigasjon:mark('nav'),MittHjemDashboard:mark('dashboard'),MittHjemIPad:mark('ipad'),MittHjemOppsett:mark('setup'),BoligoverforingKort:mark('handover'),UiText:({text})=>text,uiText:x=>x,search:new URLSearchParams(),boliger:[{id:'home'}],valgt:{id:'home'},valgtId:'home',forespurtBoligId:'',dokumenter:[],oppgaver:[],innlogget:true,nyBolig:false,aktivOnboarding:false,ipadmodus:true,feil:'',setValgtId(){},setNyBolig(){},slettPrivatBolig(){},lastInn(){},oppsettOppdatert(){}};
function view(extra) { return renderToStaticMarkup(execute('exports.render=()=>('+ret+');',{...base,...extra}).render()); }
assert.match(view({}),/data-view="ipad"/);
assert.match(view({nyBolig:true}),/data-view="setup"/);
assert.doesNotMatch(view({nyBolig:true}),/data-view="ipad"/);
assert.match(view({aktivOnboarding:true}),/data-view="setup"/);
assert.match(view({boliger:[],valgt:null}),/data-view="setup"/);
assert.match(view({ipadmodus:false}),/data-view="dashboard"/);
const failed=view({boliger:[],valgt:null,feil:'Kunne ikke hente hjemmet ditt.'});
assert.match(failed,/role="alert"/); assert.match(failed,/Prøv igjen/); assert.doesNotMatch(failed,/data-view="setup"|Opprett din første/);
console.log('PASS: iPad setup, add-home, onboarding, normal dashboard and recoverable error states');
const history=source('app/bolighistorikk/page.tsx');
const loader=find(history,n=>ts.isVariableDeclaration(n)&&n.name.getText(history)==='lastInn').initializer.arguments[0].getText(history);
async function checkHistory(user) {
 const state={}, calls=[]; const setter=k=>v=>{state[k]=typeof v==='function'?v(state[k]):v;};
 const example={id:'demo-privat-hjem',tilgang:'leser'}, own={id:'own',brukstype:'privat'}, rental={id:'rental',brukstype:'utleie'};
 const env={supabase:{auth:{getUser:async()=>({data:{user}})}},search:new URLSearchParams('bolig=demo-privat-hjem'),privatDemoBolig:()=>example,hentBoliger:async()=>{calls.push('homes');return[own,rental];},hentDokumenter:async()=>{calls.push('docs');return[];},setFeil:setter('error'),setDemo:setter('demo'),setBoliger:setter('homes'),setValgtId:setter('selected'),setDokumenter:setter('docs'),setLaster:setter('loading')};
 await execute('exports.load='+loader,env).load();
 assert.equal(state.loading,false); assert.equal(state.error,'');
 if(!user){assert.equal(state.demo,true);assert.deepEqual(state.homes,[example]);assert.equal(state.selected,example.id);assert.deepEqual(calls,[]);assert.equal(example.tilgang,'leser');}
 else {assert.equal(state.demo,false);assert.deepEqual(state.homes,[own]);assert.equal(state.selected,'own');assert.deepEqual(calls.sort(),['docs','homes']);}
}
(async()=>{await checkHistory(null);await checkHistory({id:'owner'}); console.log('PASS: guest history read-only demo without database queries; authenticated history contains only private homes');})().catch(e=>{console.error(e);process.exit(1);});
