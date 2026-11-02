import { tomtBudsjett, lesBudsjettbelop, type Budsjett } from './privat-okonomi';
export type Importokonomi = { felleskostAar?:string; kommunaleAar?:string; eiendomsskattAar?:string; kommunaleInkludert?:string; eiendomsskattInkludert?:string };
/** Only explicit recurring amounts with a period; never prices, debt, rates or hypothetical examples. */
export function finnBoligokonomi(tekst:string):Importokonomi {
 const r:Importokonomi={};
 const labels=[['felleskostAar',/\b(?:felleskost(?:nad(?:er)?)?|fellesutgifter)(?:\s*\/(?:mnd|måned|år))?\b/gi],['kommunaleAar',/\bkommunale\s*avgifter\b/gi],['eiendomsskattAar',/\beiendomsskatt\b/gi]] as const;
 for(const [key,re] of labels){
  for(const m of tekst.matchAll(re)){
   const fra=m.index!+m[0].length;
   let bit=tekst.slice(fra,fra+140).split(/\n\s*\n|\b(?:felleskost(?:nad(?:er)?)?|fellesutgifter|kommunale\s*avgifter|eiendomsskatt|prisantydning|totalpris|fellesgjeld|formuesverdi|ligningsverdi|omkostninger|byggeår)\b/i)[0];
   bit=bit.replace(/^\s*(?:for\s+)?20\d{2}\s*[:\-]\s*/, "");
   if(/\b(?:eksempel|dersom|hvis|kan bli|anslått|anslag|promille|prosent)\b|%/i.test(bit))continue;
   // The number must follow the heading, optional currency and period, not prose or another field.
   const amount=bit.match(/^\s*(?:(?:pr\.?|per|\/)\s*(?:mnd\.?|måned|år|kvartal|annum)\s*)?[.:]*\s*(?:(?:kr\.?|NOK)\s*)?(\d{1,3}(?:[ .\u00a0]\d{3})+(?:,\d{1,2})?|\d+(?:[,.]\d{1,2})?)(?:[,.]-)?(?![\d.,%])/i);
   if(!amount)continue;
   if(/^20\d{2}$/.test(amount[1])&&/^\s+\d/.test(bit.slice(amount[0].length)))continue;
   const number=lesBudsjettbelop(amount[1]);if(number===null)continue;
   const prefix=tekst.slice(Math.max(0,m.index!-25),m.index).match(/(?:årlige?|månedlige?|kvartalsvise?)\s*$/i)?.[0]||"";
   const context=prefix+m[0]+bit.slice(0,amount[0].length+35);
   const multiplier=/(?:\/|pr\.?\s*|per\s+)(?:mnd\.?|måned)|månedlig/i.test(context)?12:/(?:\/|pr\.?\s*|per\s+)kvartal|kvartalsvis/i.test(context)?4:/(?:\/|pr\.?\s*|per\s+)(?:år|annum)|årlig|p\.a\./i.test(context)?1:0;
   if(!multiplier)continue;
   r[key]=String(Math.round(number*multiplier*100)/100);break;
  }
 }
 for(const [key,label] of [['kommunaleInkludert','kommunale\\s*avgifter'],['eiendomsskattInkludert','eiendomsskatt']] as const){
  const yes=new RegExp(`\\b${label}\\b[^.\\n]{0,35}\\b(?:er\\s+)?(?:inkludert|inngår)\\s+i\\s+felleskost`, 'i');
  const reversed=new RegExp(`felleskost(?:nad(?:er)?)?[^.\\n]{0,30}inkluderer[^.\\n]{0,55}\\b${label}\\b`,'i');
  const negative=new RegExp(`(?:${label}[^.\\n]{0,40}(?:ikke|uten)|(?:ikke|uten)[^.\\n]{0,25}${label})`,'i');
  if(negative.test(tekst))r[key]='nei';
  else if(yes.test(tekst)||reversed.test(tekst))r[key]='ja';
 }
 return r;
}
export function budsjettFraImport(funn:Importokonomi|undefined):Budsjett {
 const b=tomtBudsjett();
 for(const [felt,id] of [['felleskostAar','felleskost'],['kommunaleAar','kommunale'],['eiendomsskattAar','eiendomsskatt']] as const){
  const raw=funn?.[felt];if(raw===undefined||raw==='')continue;const n=lesBudsjettbelop(raw);if(n!==null)b.poster[id]={belop:String(n),periode:'aar'};
 }
 if(funn?.kommunaleInkludert==='ja')b.inkludert.push('kommunale');
 if(funn?.eiendomsskattInkludert==='ja')b.inkludert.push('eiendomsskatt');
 return b;
}
