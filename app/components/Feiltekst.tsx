"use client";
import { uiText, useLanguage } from "../lib/language";
export default function Feiltekst({ melding }: { melding: unknown }) {
  useLanguage();
  const tekst = String(melding || "");
  const raad = /innlogging|logg inn|sesjon|IKKE_INNLOGGET/i.test(tekst)
    ? "Logg inn på nytt og prøv igjen."
    : /tilgang|rettighet|eier|lesetilgang/i.test(tekst)
      ? "Be boligens eier kontrollere rettighetene dine."
      : /Kunne ikke|could not|failed|timeout|TIDSAVBRUDD/i.test(tekst)
        ? "Kontroller nettforbindelsen og prøv igjen. Behold siden åpen hvis du har ulagrede endringer."
        : "";
  return <span role="alert" aria-live="assertive"><span>{uiText(tekst)}</span>{raad && <span className="mt-2 block text-sm">{uiText(raad)}</span>}</span>;
}
