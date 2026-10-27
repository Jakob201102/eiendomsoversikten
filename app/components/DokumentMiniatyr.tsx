"use client";

import { useEffect, useRef, useState } from "react";
import { dokumentLenke, type Dokument } from "../lib/dokumenter";
import { bilagLenke } from "../lib/okonomi";
import { uiText } from "../lib/language";

type Fil = Pick<Dokument, "filtype" | "filnavn" | "filsti" | "kilde" | "navn">;

export function erBildefil(fil: Fil): boolean {
  const mime = fil.filtype.split(";")[0].trim().toLowerCase();
  if (mime.startsWith("image/")) return true;
  if (mime && mime !== "application/octet-stream") return false;
  return /\.(?:jpe?g|png|webp|avif|gif|bmp|svg|heic|heif)$/i.test(fil.filnavn);
}

export default function DokumentMiniatyr({ dokument, onAapne }: {
  dokument: Fil;
  onAapne: () => void;
}) {
  const element = useRef<HTMLButtonElement>(null);
  const [synlig, setSynlig] = useState(false);
  const [bilde, setBilde] = useState({ nokkel: "", url: "" });
  const [feilet, setFeilet] = useState("");
  const erBilde = erBildefil(dokument);
  const nokkel = `${dokument.kilde}:${dokument.filsti}`;
  const url = bilde.nokkel === nokkel && feilet !== nokkel ? bilde.url : "";
  const merke = dokument.filtype === "text/uri-list"
    ? uiText("LENKE")
    : (dokument.filnavn.split(".").pop() || "fil").slice(0, 4);
  const klasse = "flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100 text-xs font-bold uppercase text-slate-500";

  useEffect(() => {
    if (!erBilde || !dokument.filsti || !element.current) return;
    if (typeof IntersectionObserver === "undefined") {
      setSynlig(true);
      return;
    }
    const observator = new IntersectionObserver((elementer) => {
      if (elementer.some((e) => e.isIntersecting)) {
        setSynlig(true);
        observator.disconnect();
      }
    }, { rootMargin: "160px" });
    observator.observe(element.current);
    return () => observator.disconnect();
  }, [erBilde, dokument.filsti]);

  useEffect(() => {
    if (!synlig || !erBilde || !dokument.filsti) return;
    let aktiv = true;
    const hentLenke = dokument.kilde === "okonomi" ? bilagLenke : dokumentLenke;
    hentLenke(dokument.filsti).then((verdi) => {
      if (aktiv) {
        setBilde({ nokkel, url: verdi });
        setFeilet("");
      }
    }).catch(() => {
      if (aktiv) setFeilet(nokkel);
    });
    return () => { aktiv = false; };
  }, [synlig, erBilde, dokument.filsti, dokument.kilde, nokkel]);

  if (!erBilde || !dokument.filsti) return <div className={klasse}>{merke}</div>;
  return <button ref={element} type="button" onClick={onAapne}
    aria-label={`${uiText("Åpne")} ${dokument.navn}`}
    className={`${klasse} focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600`}>
    {url ? <img src={url} alt="" width={56} height={56} loading="lazy" decoding="async"
      className="h-full w-full object-cover" onError={() => setFeilet(nokkel)} /> : merke}
  </button>;
}
