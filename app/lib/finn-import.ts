/** Read only the requested FINN listing. The streamed JSON is data, never executable code. */
type Obj = Record<string, unknown>;
const obj = (v:unknown): Obj => v && typeof v === "object" && !Array.isArray(v) ? v as Obj : {};
const arr = (v:unknown): unknown[] => Array.isArray(v) ? v : [];
const text = (v:unknown) => typeof v === "string" ? v.trim() : "";
const number = (v:unknown) => typeof v === "number" && Number.isFinite(v) && v >= 0 ? String(v) : typeof v === "string" && /^\d+(?:[.,]\d+)?$/.test(v.trim()) ? v.trim() : undefined;
export function finnKodeFraUrl(verdi:string) {
  try { const u=new URL(verdi);if(!/(^|\.)finn\.no$/i.test(u.hostname))return undefined;return u.searchParams.get("finnkode")?.match(/^\d+$/)?.[0] || u.pathname.match(/^\/(\d+)\/?$/)?.[1]; } catch { return undefined; }
}
export function tilhorerFinnBilde(url:string,kode:string) {
  try {const u=new URL(url);return u.protocol==="https:" && u.hostname==="images.finncdn.no" && new RegExp(`/(?:${kode.replace(/\B(?=(\d{3})+(?!\d))/g,"/")}|${kode})[_/.]`).test(decodeURIComponent(u.pathname));}catch{return false;}
}
export type FinnAnnonse = { kode:string; ad:Obj; plantegninger:Obj[]; etasjer:Obj[] };
export function lesFinnAnnonse(html:string,kode:string): FinnAnnonse|null {
  for(const match of html.matchAll(/streamController\.enqueue\(\s*("(?:\\.|[^"\\])*")\s*\)/g)) {
    try {
      const encoded=JSON.parse(match[1]); if(typeof encoded!=="string" || encoded.length>4_000_000)continue;
      const parsed:unknown=JSON.parse(encoded);if(!Array.isArray(parsed)||parsed.length>100_000)continue;
      const table:unknown[]=parsed;
      const field=(record:Obj,key:string):unknown=>{for(const [k,ref]of Object.entries(record)){if(/^_\d+$/.test(k)&&table[Number(k.slice(1))]===key&&typeof ref==="number")return table[ref];}return undefined;};
      let nodes=0;
      function decode(value:unknown,depth=0):unknown {
        if(depth>14 || ++nodes>15000)return undefined;
        if(Array.isArray(value))return value.slice(0,300).map(ref=>typeof ref==="number"&&ref>=0?decode(table[ref],depth+1):undefined);
        if(value&&typeof value==="object") {
          const result:Obj=Object.create(null);
          for(const [k,ref]of Object.entries(value)){
            const key=/^_\d+$/.test(k)?table[Number(k.slice(1))]:undefined;
            if(typeof key==="string" && !["__proto__","constructor","prototype"].includes(key)&&typeof ref==="number"&&ref>=0)result[key]=decode(table[ref],depth+1);
          }
          return result;
        }
        return value;
      }
      for(const raw of table) {
        const root=obj(raw);if(String(field(root,"adId"))!==kode)continue;
        const objectData=obj(field(root,"objectData")),ad=obj(field(objectData,"ad")),meta=obj(field(objectData,"meta"));
        if(!Object.keys(ad).length || String(field(meta,"adId"))!==kode)continue;
        return {kode,ad:obj(decode(ad)),plantegninger:arr(decode(field(root,"floorPlanImages"))).map(obj),etasjer:arr(obj(decode(field(root,"interactiveFloorPlansImages"))).floors).map(obj)};
      }
    }catch{ /* Unsupported or partial stream: use the conservative HTML fallback. */ }
  }
  return null;
}
function bildeUrl(v:unknown,kode:string) {
  let u=text(v);if(!u)return undefined;
  if(!/^https:\/\//.test(u))u=`https://images.finncdn.no/dynamic/default/${u.replace(/^\//,"")}`;
  return tilhorerFinnBilde(u,kode)?u:undefined;
}
function strip(v:unknown){return text(v).replace(/<br\s*\/?>|<\/(?:p|div|li|h\d)>/gi,"\n").replace(/<[^>]*>/g," ").replace(/&nbsp;|&#160;/g," ").replace(/&amp;/g,"&");}
export function finnImportgrunnlag(finn:FinnAnnonse) {
  const a=finn.ad,location=obj(a.location),size=obj(a.size),plot=obj(a.plot),energy=obj(a.energyLabel);
  const felt:Record<string,string>={};const set=(k:string,v:unknown)=>{const t=typeof v==="string"?v.trim():number(v);if(t)felt[k]=t;};
  set("adresse",[text(location.streetAddress),[text(location.postalCode),text(location.postalName)].filter(Boolean).join(" ")].filter(Boolean).join(", "));
  set("boligtype",obj(a.propertyType).label || a.propertyType);set("byggeaar",number(a.constructionYear));set("etasjer",number(a.floor));set("soverom",number(a.bedrooms));set("antallRom",number(a.rooms));
  set("areal",number(size.usable));set("braI",number(size.usableAreaI));set("braE",number(size.usableAreaE));set("bruttoareal",number(size.gross));set("tomteareal",number(plot.area));
  const c=text(energy.class).toUpperCase();if(/^[A-G]$/.test(c))set("energimerking",c);
  const matrikkel=arr(a.cadastres).map(obj).find(c=>number(c.landNumber)&&number(c.titleNumber));
  if(matrikkel)set("gnrBnr",`${number(matrikkel.landNumber)}/${number(matrikkel.titleNumber)}${number(matrikkel.sectionNumber)?`, snr. ${number(matrikkel.sectionNumber)}`:""}${number(matrikkel.partOwnershipNumber)?`, andel ${number(matrikkel.partOwnershipNumber)}`:""}`);
  const bilder: string[]=[],bildeTekster:Record<string,string>={},plantegninger:string[]=[];
  for(const raw of arr(a.images)){const image=obj(raw),url=bildeUrl(image.uri,finn.kode);if(!url||bilder.includes(url))continue;bilder.push(url);bildeTekster[url]=text(image.description);if(/plantegning|floor\s*plan/i.test(text(image.description)))plantegninger.push(url);}
  for(const plan of finn.plantegninger){const url=bildeUrl(plan.uri,finn.kode);if(url&&bilder.includes(url)&&!plantegninger.includes(url))plantegninger.push(url);}
  const rom:string[]=[];
  for(const floor of finn.etasjer){
    if(!bildeUrl(obj(floor.floorplan).uri,finn.kode))continue;
    for(const raw of arr(floor.rooms)){const r=obj(raw),name=text(r.roomLabel);if(!name || name.length>80 || r.type!=="room")continue;if(!rom.some(n=>n.toLowerCase()===name.toLowerCase()))rom.push(name);}
  }
  const tekst=[strip(a.summaryUnsafe),strip(size.descriptionUnsafe),...arr(a.propertyInfo).map(v=>strip(obj(v).content)),...arr(a.generalText).filter(v=>/^(?:kort om|om boligen|innhold|tomt|byggemåte|standard|oppvarming|energimerking|radon|parkering|oppussing|modernisering|utførte|areal)/i.test(text(obj(v).heading))).map(v=>strip(obj(v).textUnsafe))].filter(Boolean).join("\n");
  return {felt,bilder,bildeTekster,plantegninger,rom,tekst};
}
