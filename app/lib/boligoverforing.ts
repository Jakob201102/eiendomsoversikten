import { createClient } from "./supabase/client";
import type { AltOmBoligenData } from "./alt-om-boligen";
import type { BoligData } from "./boliger";

export type Overforingsvalg = { generell: boolean; viktigeDeler: boolean; rom: boolean; oppussing: boolean; teknisk: boolean; utstyr: boolean; sikkerhet: boolean; uteomrader: boolean; garantier: boolean; forsikringer: boolean; dokumentIder: string[] };

function renBolig(bolig: BoligData, valg: Overforingsvalg) {
  const alt = (bolig.altOmBoligen || {}) as Partial<AltOmBoligenData>;
  const sikkerTeknisk = valg.teknisk ? alt.teknisk : undefined;
  const nokler = valg.teknisk && Array.isArray(alt.nokler) ? alt.nokler.map((n) => ({ ...n, merking: "", notat: "" })) : [];
  return {
    brukstype: "privat",
    adresse: String(bolig.adresse || ""), boligtype: valg.generell ? String(bolig.boligtype || "") : "", byggeaar: valg.generell ? String(bolig.byggeaar || "") : "", areal: valg.generell ? bolig.areal || "" : "", bolignummer: valg.generell ? String(bolig.bolignummer || "") : "",
    kjopesum: 0, restlaan: 0, rente: 0, manedsleie: 0, felleskostnader: 0, kommunaleAvgifter: 0, stromInternett: 0, vedlikehold: 0, andreKostnader: 0,
    altOmBoligen: {
      versjon: 1, generell: valg.generell ? alt.generell || {} : {}, teknisk: sikkerTeknisk || {}, viktigeDeler: valg.viktigeDeler ? alt.viktigeDeler || {} : {}, sikkerhet: valg.sikkerhet ? alt.sikkerhet || {} : {}, tilleggsarealer: valg.generell ? alt.tilleggsarealer || {} : {},
      rom: valg.rom ? alt.rom || [] : [], uteomrader: valg.uteomrader ? alt.uteomrader || [] : [], garantier: valg.garantier ? alt.garantier || [] : [], forsikringer: valg.forsikringer ? alt.forsikringer || [] : [], nokler, utstyr: valg.utstyr ? alt.utstyr || [] : [], oppussing: valg.oppussing ? alt.oppussing || [] : [], historikk: valg.oppussing ? alt.historikk || [] : [], mal: [], onboarding: { status: "ferdig", steg: 5 }, notater: "", oppdatert: new Date().toISOString(),
    },
    overfortFra: "Digital boligoverlevering", overfortDato: new Date().toISOString(),
  };
}

export async function opprettBoligoverforing(bolig: BoligData, mottakerEpost: string, valg: Overforingsvalg) {
  const supabase = createClient(); const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("IKKE_INNLOGGET");
  if (String(bolig.brukstype || "") !== "privat") throw new Error("KUN_PRIVAT_BOLIG");
  const { data, error } = await supabase.from("boligoverforinger").insert({ selger_id: auth.user.id, bolig_id: bolig.id, mottaker_epost: mottakerEpost.trim().toLowerCase(), pakke: { bolig: renBolig(bolig, valg), dokumentIder: valg.dokumentIder } }).select("token").single();
  if (error) throw error;
  return `${window.location.origin}/motta-bolig?token=${data.token}`;
}

export async function hentBoligoverforing(token: string) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("hent_boligoverforing", { p_token: token });
  if (error) throw error; return data?.[0] || null;
}

export async function aksepterBoligoverforing(token: string) {
  const supabase = createClient(); const { data, error } = await supabase.rpc("aksepter_boligoverforing", { p_token: token });
  if (error) throw error; return data as string;
}
