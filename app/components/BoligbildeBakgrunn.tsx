"use client";

import { useEffect, useState } from "react";
import { dokumentLenke, type Dokument } from "../lib/dokumenter";

export default function BoligbildeBakgrunn({
  boligId,
  dokumenter,
}: {
  boligId: string;
  dokumenter: Dokument[];
}) {
  const [bilder, setBilder] = useState<string[]>([]);

  useEffect(() => {
    let aktiv = true;
    const kandidater = dokumenter
      .filter(
        (dokument) =>
          dokument.boligId === boligId &&
          Boolean(dokument.filsti) &&
          (dokument.filtype.startsWith("image/") ||
            dokument.kategori === "boligbilde"),
      )
      .slice(0, 2);

    if (!kandidater.length) {
      setBilder([]);
      return () => {
        aktiv = false;
      };
    }

    Promise.allSettled(
      kandidater.map((dokument) => dokumentLenke(dokument.filsti)),
    ).then((resultater) => {
      if (!aktiv) return;
      setBilder(
        resultater.flatMap((resultat) =>
          resultat.status === "fulfilled" ? [resultat.value] : [],
        ),
      );
    });

    return () => {
      aktiv = false;
    };
  }, [boligId, dokumenter]);

  if (!bilder.length) return null;

  return (
    <div className="boligbilde-bakgrunn" aria-hidden="true">
      <div
        className="boligbilde-side boligbilde-side-venstre"
        style={{ backgroundImage: `url("${bilder[0]}")` }}
      />
      <div
        className="boligbilde-side boligbilde-side-hoyre"
        style={{ backgroundImage: `url("${bilder[1] || bilder[0]}")` }}
      />
    </div>
  );
}
