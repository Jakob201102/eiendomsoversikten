"use client";

import UiIcon from "./UiIcon";
import { uiText, useLanguage } from "../lib/language";

/** Keep the full translation key, replacing only its decorative leading symbol. */
export default function UiIconText({ text }: { text: string }) {
  useLanguage();
  const translated = uiText(text);
  const leading = translated.match(/^(\p{Extended_Pictographic}(?:\uFE0F)?(?:\u200D\p{Extended_Pictographic}(?:\uFE0F)?)*)/u)?.[0];
  if (!leading) return translated;
  return <><UiIcon symbol={leading}/>{translated.slice(leading.length)}</>;
}
