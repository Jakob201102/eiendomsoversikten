/** A deadline is overdue after its date has ended in Norway, never on the day itself. */
export function erVedlikeholdForfalt(oppgave: { frist?: unknown; status?: unknown }, naa = new Date()): boolean {
  const frist = String(oppgave.frist || "");
  if (oppgave.status === "ferdig" || !/^\d{4}-\d{2}-\d{2}$/.test(frist)) return false;
  const iDag = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Oslo", year: "numeric", month: "2-digit", day: "2-digit" }).format(naa);
  return frist < iDag;
}
