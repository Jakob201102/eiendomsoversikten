const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),ts=require(path.join(root,'node_modules/typescript'));
function load(file,stubs={}){const m={exports:{}};const code=ts.transpileModule(fs.readFileSync(path.join(root,file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;new Function('require','module','exports',code)(name=>{if(name in stubs)return stubs[name];throw Error('Unexpected import '+name)},m,m.exports);return m.exports;}
let user={id:'u1',email:'owner@example.test',user_metadata:{navn:'Owner',mobil:'12345678',bruksomrade:'privat',secret:'NOT_FOR_EXPORT'},access_token:'NOT_FOR_EXPORT'},failure='',missing='',calls=[];
const client = {
 auth: { getUser: async () => ({data:{user},error:null}) },
 from(table) {
  const q = {
   select(){return q}, eq(key,value){q.key=key;q.value=value;return q}, order(sort){q.sort=sort;return q},
   async range(a,b) {
    calls.push({table,key:q.key,value:q.value,a,b,sort:q.sort});
    if(table===failure)return{error:{code:'42501'}};
    if(table===missing)return{error:{code:'42P01'}};
    const rows=table==='boliger'?Array.from({length:501},(_,i)=>({id:i,user_id:'u1',data:{privatOkonomi:{belop:'20000'}}})):[];
    return {data:rows.slice(a,b+1),error:null};
   }
  }; return q;
 }
};
const exp=load('app/lib/konto-eksport.ts',{'./supabase/client':{createClient:()=>client}});
(async()=>{
 const out=await exp.hentKontodata();assert.equal(out.data.boliger.length,501);assert.equal(out.data.boliger[0].data.privatOkonomi.belop,'20000');assert(calls.every(c=>c.key==='user_id'&&c.value==='u1'));assert(!JSON.stringify(out).includes('NOT_FOR_EXPORT'));assert(out.data.skatteposter);assert.equal(out.vedleggInkludert,false);
 assert.deepEqual(calls.filter(c=>c.table==='boliger').map(c=>c.a),[0,500]);console.log('PASS: export is paginated, limited to own rows and excludes auth tokens and unknown metadata.');
 missing='egne_kontrakter';const partial=await exp.hentKontodata();assert.deepEqual(partial.manglendeTabeller,['egne_kontrakter']);failure='dokumenter';await assert.rejects(()=>exp.hentKontodata(),/Kunne ikke eksportere/);failure='';user=null;calls=[];await assert.rejects(()=>exp.hentKontodata(),/Innloggingen/);assert.equal(calls.length,0);console.log('PASS: missing optional module is reported; permission/network errors and signed-out sessions never produce a misleading successful export.');
 const en=load('app/lib/translations-en.ts').english;
 for(const file of ['app/components/KontoBoliger.tsx','app/components/KontoValg.tsx']){const src=fs.readFileSync(path.join(root,file),'utf8');for(const match of src.matchAll(/uiText\("([^"]+)"\)/g))assert(en[match[1]],'Missing English: '+match[1]);}
 console.log('PASS: new account labels have English translations.');
})().catch(e=>{console.error(e);process.exitCode=1});
