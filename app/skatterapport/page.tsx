import { redirect } from "next/navigation";
import { utleieAdresse } from "../lib/utleie-ruter";
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const search = await searchParams; const p = new URLSearchParams();
  for (const [key, value] of Object.entries(search)) if (typeof value === "string") p.set(key, value);
  redirect(utleieAdresse("/skatterapport?" + p.toString()));
}
