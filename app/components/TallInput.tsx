"use client";

import { useEffect, useRef, useState, type InputHTMLAttributes } from "react";
import { uiText, uiFormat } from "../lib/language";
import { formaterTallfelt, rensTalltekst, sammeTalltekst, markorEtterFormatering } from "../lib/tallfelt-format";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "value" | "onChange" | "inputMode"> & {
  value: string | number; onValueChange: (raw: string) => void;
};

export default function TallInput({ value, onValueChange, min, max, step, onBlur, onKeyDown, ...props }: Props) {
  const [draft, setDraft] = useState(() => formaterTallfelt(value));
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { setDraft((old) => sammeTalltekst(old, value) ? old : formaterTallfelt(value)); }, [value]);

  function feiltekst(text: string) {
    const raw = rensTalltekst(text);
    if (!raw) return "";
    if (!/^-?\d+(?:\.\d*)?$/.test(raw) || !Number.isFinite(Number(raw))) return uiText("Skriv et gyldig tall.");
    const number = Number(raw);
    if (min !== undefined && number < Number(min)) return uiFormat("Tallet må være minst {0}.", [formaterTallfelt(String(min))]);
    if (max !== undefined && number > Number(max)) return uiFormat("Tallet kan ikke være større enn {0}.", [formaterTallfelt(String(max))]);
    if (step !== undefined && step !== "any" && Number(step) > 0) {
      const units = (number - Number(min || 0)) / Number(step);
      if (Math.abs(units - Math.round(units)) > 0.000001) return uiFormat("Bruk trinn på {0}.", [formaterTallfelt(String(step))]);
    }
    return "";
  }
  useEffect(() => { input.current?.setCustomValidity(feiltekst(draft)); });

  function endre(text: string, caret: number) {
    const raw = rensTalltekst(text);
    const formatted = formaterTallfelt(text);
    const position = caret === text.length ? formatted.length : markorEtterFormatering(formatted, text.slice(0, caret).replace(/\s/g, "").length);
    setDraft(formatted);
    if (input.current) { input.current.value = formatted; input.current.setSelectionRange(position, position); input.current.setCustomValidity(feiltekst(formatted)); }
    // String-backed budgets retain invalid drafts for their existing validation;
    // number-backed forms never receive NaN or a partially entered minus sign.
    if (typeof value === "string" || raw === "" || (/^-?\d+(?:\.\d*)?$/.test(raw) && Number.isFinite(Number(raw)))) onValueChange(raw);
  }

  return <input {...props} ref={input} type="text" inputMode="decimal" value={draft}
    onChange={(event) => endre(event.target.value, event.target.selectionStart ?? event.target.value.length)}
    onKeyDown={(event) => {
      onKeyDown?.(event);
      if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
      const element = event.currentTarget, start = element.selectionStart, end = element.selectionEnd;
      if (start === null || start !== end) return;
      if (event.key === "Backspace" && start > 1 && element.value[start - 1] === " ") {
        event.preventDefault(); endre(element.value.slice(0, start - 2) + element.value.slice(start), start - 2);
      } else if (event.key === "Delete" && element.value[start] === " ") {
        event.preventDefault(); endre(element.value.slice(0, start) + element.value.slice(start + 2), start);
      }
    }}
    onBlur={(event) => { if (typeof value === "number" && !feiltekst(draft)) setDraft(formaterTallfelt(value)); onBlur?.(event); }}/>;
}
