import { createClient } from "./supabase/client";
import { lesBudsjett, beregnBoligbudsjett, type Budsjett } from "./privat-okonomi";
import { lesAltOmBoligen } from "./alt-om-boligen";
export async function lagrePrivatOkonomi(id: string, budsjett: Budsjett) {
  const client = createClient(); const { data: auth, error: authFeil } = await client.auth.getUser();
  if (authFeil || !auth.user) throw new Error("Logg inn for å lagre boligbudsjettet.");
  const { data: rad, error } = await client.from("boliger").select("id,data,updated_at").eq("id", id).single();
  if (error) throw error;
  if (rad.data?.brukstype !== "privat") throw new Error("Boligbudsjettet kan bare lagres på en privat bolig.");
  const rent = lesBudsjett(budsjett); const forsikringer = lesAltOmBoligen({ ...rad.data, id }).forsikringer;
  if (beregnBoligbudsjett(rent, forsikringer).harFeil) throw new Error("Kontroller beløp, navn og valgte forsikringer før du lagrer.");
  let query = client.from("boliger").update({ data: { ...rad.data, privatOkonomi: rent }, updated_at: new Date().toISOString() }).eq("id", id);
  query = rad.updated_at ? query.eq("updated_at", rad.updated_at) : query.is("updated_at", null);
  const result = await query.select("id"); if (result.error) throw result.error;
  if (!result.data?.length) throw new Error("Boligen ble endret et annet sted eller du mangler redigeringstilgang. Last siden på nytt før du lagrer.");
  return { ...rad.data, id, privatOkonomi: rent };
}
