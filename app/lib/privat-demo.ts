import type { BoligData } from "./boliger";
import { demoAltOmBoligen } from "./alt-om-boligen";

export const PRIVAT_DEMO_ID = "demo-privat-hjem";

export function privatDemoBolig(): BoligData {
  const bolig: BoligData = { id: PRIVAT_DEMO_ID, brukstype: "privat", adresse: "Eksempelveien 12, Bergen", boligtype: "Enebolig", byggeaar: "1958", areal: 142, tilgang: "leser" };
  return { ...bolig, altOmBoligen: demoAltOmBoligen(bolig) };
}

/** Scope only guest data in private views; never filter an authenticated user's data. */
export function avgrensPrivatDemo<T extends { boligId: string }>(rader: T[], innlogget: boolean): T[] {
  return innlogget ? rader : rader.filter((rad) => rad.boligId === PRIVAT_DEMO_ID);
}
