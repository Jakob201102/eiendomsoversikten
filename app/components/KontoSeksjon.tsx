"use client";
import type { ReactNode } from "react";
import { uiText, useLanguage } from "../lib/language";
import styles from "./konto-kort.module.css";

export default function KontoSeksjon({ tittel, beskrivelse, children, fare = false, id }: {
  tittel: string; beskrivelse?: string; children: ReactNode; fare?: boolean; id?: string;
}) {
  useLanguage();
  return <section id={id} className={`${styles.card} ${fare ? styles.danger : ""}`}>
    <header className={`${styles.cardHeader} ${id === "boligtilgang" ? styles.keys : ""}`}>
      <span aria-hidden="true" className={styles.rule} />
      <h2 className={`text-lg font-bold ${fare ? "text-red-700" : "text-slate-900"}`}>{uiText(tittel)}</h2>
      {beskrivelse && <p className="mt-1 text-xs leading-5 text-slate-500">{uiText(beskrivelse)}</p>}
    </header>
    <div className={styles.content}>{children}</div>
  </section>;
}
