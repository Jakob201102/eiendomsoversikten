import type { Historikkinfo } from './alt-om-boligen';
import type { Vedlikeholdsdata } from './vedlikehold';
export type Prosjektdel = { id:string; navn:string; beskrivelse?:string; romIder:string[]; oppgaver:{id:string;tekst:string;ferdig:boolean}[] };
export type Arbeidslogg = { id:string; delId:string; dato:string; tekst:string; dokumentIder:string[] };
export function prosjektDeler(o:Vedlikeholdsdata):Prosjektdel[]{return Array.isArray(o.prosjektDeler)?o.prosjektDeler as Prosjektdel[]:[];}
export function prosjektLogg(o:Vedlikeholdsdata):Arbeidslogg[]{return Array.isArray(o.arbeidslogg)?o.arbeidslogg as Arbeidslogg[]:[];}
export function prosjektHarRom(o:Vedlikeholdsdata,romId:string){return String(o.romId||'')===romId||prosjektDeler(o).some(d=>d.romIder.includes(romId));}
/** Read model: never writes copies into property JSON. Completed projects remain the source. */
export function medProsjekthistorikk(gammel:Historikkinfo[],oppgaver:Vedlikeholdsdata[],boligId:string):Historikkinfo[]{
 const egne=oppgaver.filter(o=>String(o.boligId)===boligId);
 const prosjektIder=new Set(egne.filter(o=>Array.isArray(o.prosjektDeler)).map(o=>String(o.id)));
 const resultat=gammel.filter(h=>!prosjektIder.has(h.kildeVedlikeholdId));
 for(const o of egne){
  if(o.status!=='ferdig'||(!prosjektIder.has(String(o.id))&&resultat.some(h=>h.kildeVedlikeholdId===String(o.id))))continue;
  const deler=prosjektDeler(o);const logg=prosjektLogg(o);
  const felles:Prosjektdel={id:'',navn:'',romIder:o.romId?[String(o.romId)]:[],oppgaver:[]};
  const seksjoner=deler.length?[...(logg.some(l=>!l.delId)?[felles]:[]),...deler]:[felles];
  for(const [indeks,d] of seksjoner.entries()){
   const poster=logg.filter(l=>l.delId===d.id);
   const tekst=[String(o.notat||''),d.beskrivelse||'',...d.oppgaver.map(t=>`${t.ferdig?'✓':'•'} ${t.tekst}`),...poster.map(l=>`${l.dato}\n${l.tekst}`)].filter(Boolean).join('\n\n');
   const vedlegg=[...new Set(poster.flatMap(l=>l.dokumentIder))];
   resultat.push({id:`prosjekt-${o.id}-${d.id}`,dato:String(o.ferdigdato||o.frist||''),tittel:[String(o.tittel||''),d.navn].filter(Boolean).join(' · '),omrade:d.navn||String(o.omrade||''),romId:d.romIder[0]||'',romIder:d.romIder,kostnad:indeks===0?Number(o.faktiskKostnad ?? o.kostnad ?? 0):0,utfortAv:'',firma:'',beskrivelse:tekst,dokumentIder:vedlegg,bildeIder:vedlegg,kildeVedlikeholdId:String(o.id),prosjektAvledet:true});
  }
 }
 return resultat;
}
