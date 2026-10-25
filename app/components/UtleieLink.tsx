"use client";
import Link from "next/link";
import type { ComponentProps } from "react";
import { useSearchParams } from "next/navigation";
import { utleieAdresse } from "../lib/utleie-ruter";
export default function UtleieLink(props: ComponentProps<typeof Link>) {
  const search = useSearchParams();
  return <Link {...props} href={typeof props.href === "string" ? utleieAdresse(props.href, search.get("bolig") || "") : props.href} />;
}
