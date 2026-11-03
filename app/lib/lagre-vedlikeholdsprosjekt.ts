import { createClient } from './supabase/client';
import { hentBoliger } from './boliger';
import { lesAltOmBoligen } from './alt-om-boligen';
import { hentDokumenter } from './dokumenter';
import type { Vedlikeholdsdata } from './vedlikehold';
import { prosjektDeler, prosjektLogg, prosjektOppgaver } from './vedlikeholdsprosjekt';
export async function lagreVedlikeholdsprosjekt(o:Vedlikeholdsdata){
 const supabase=createClient(); const {data:auth,error:authFeil}=await supabase.auth.getUser();
 if(authFeil||!auth.user)throw new Error('IKKE_INNLOGGET');
 const bolig=(await hentBoliger()).find(b=>String(b.id)===String(o.boligId));
 if(!bolig||bolig.tilgang==='leser')throw new Error('Ingen tilgang');
 const deler=prosjektDeler(o),logg=prosjektLogg(o),rom=new Set(lesAltOmBoligen(bolig).rom.map(r=>r.id));
 if(!String(o.tittel||'').trim()||deler.some(d=>!d.navn.trim()||d.oppgaver.some(t=>!t.tekst.trim())||d.romIder.some(id=>!rom.has(id))))throw new Error('Ugyldig prosjekt');
 if(new Set(deler.map(d=>d.id)).size!==deler.length||logg.some(l=>l.delId&&!deler.some(d=>d.id===l.delId)))throw new Error('Ugyldig prosjektdel');
 if(!['planlagt','pagar','ferdig'].includes(String(o.status))||logg.some(l=>!/^\d{4}-\d{2}-\d{2}$/.test(l.dato)))throw new Error('Ugyldig prosjekt');
 const hoved=prosjektOppgaver(o);
 for(const oppgaver of [hoved,...deler.map(d=>d.oppgaver)])if(oppgaver.some(t=>!t.id||!t.tekst.trim())||new Set(oppgaver.map(t=>t.id)).size!==oppgaver.length)throw new Error('Ugyldig sjekkliste');
 if(deler.some(d=>d.status&&!['planlagt','pagar','ferdig'].includes(d.status)))throw new Error('Ugyldig status');
 if(logg.some(l=>l.oppgaveId&&!(l.delId?deler.find(d=>d.id===l.delId)?.oppgaver:hoved)?.some(t=>t.id===l.oppgaveId)))throw new Error('Ugyldig sjekkpunkt');
 const ids=new Set(logg.flatMap(l=>l.dokumentIder));
 if(ids.size){const docs=await hentDokumenter([String(o.boligId)]);if([...ids].some(id=>!docs.some(d=>d.id===id&&d.boligId===o.boligId)))throw new Error('Ugyldig vedlegg');}
 const {data:rad,error:hentefeil}=await supabase.from('vedlikeholdsoppgaver').select('data,bolig_id').eq('id',o.id).single();
 if(hentefeil||!rad||String(rad.bolig_id)!==String(o.boligId))throw hentefeil||new Error('Ugyldig bolig');
 const gammel=rad.data as Record<string,unknown>;if(String(gammel.prosjektVersjon||'')!==String(o.prosjektVersjon||''))throw new Error('PROSJEKT_KONFLIKT');
 const versjon=crypto.randomUUID();
 // Merge only project-owned fields; preserve recurrence, calendar metadata and other task data.
 let query=supabase.from('vedlikeholdsoppgaver').update({data:{...gammel,tittel:String(o.tittel).trim(),notat:String(o.notat||''),status:o.status,ferdigdato:o.status==='ferdig'?String(o.ferdigdato||new Date().toISOString().slice(0,10)):'',prosjektDeler:deler,prosjektOppgaver:hoved,arbeidslogg:logg,prosjektVersjon:versjon},updated_at:new Date().toISOString()}).eq('id',o.id).eq('bolig_id',o.boligId);
 query=gammel.prosjektVersjon?query.eq('data->>prosjektVersjon',String(gammel.prosjektVersjon)):query.is('data->>prosjektVersjon',null);
 const {data:lagret,error}=await query.select('id').single();if(error||!lagret?.id)throw error||new Error('PROSJEKT_KONFLIKT');
 return {...o,prosjektVersjon:versjon};
}
