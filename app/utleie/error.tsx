"use client";
import { UiText, useLanguage } from "../lib/language";
export default function Error({ reset }: { reset: () => void }) { useLanguage(); return <section className="p-8"><p><UiText text="Kunne ikke åpne utleievisningen. Prøv igjen."/></p><button onClick={reset} className="mt-4 rounded-xl bg-emerald-900 px-4 py-3 text-white"><UiText text="Prøv igjen"/></button></section>; }
