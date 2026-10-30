/** Display labels only. Keys and stored property values are never changed. */
const navn: Record<string, string> = {
  hovedstoppekran: "Hovedstoppekran", sikringsskap: "Sikringsskap", hovedsikring: "Hovedsikring", vannmaler: "Vannmåler", strommaler: "Strømmåler", slukInspeksjon: "Sluk og inspeksjon", brannslukker: "Brannslukker", internettinntak: "Internettinntak", oppvarming: "Oppvarming", ventilasjon: "Ventilasjon", internettleverandor: "Internettleverandør",
  tak: "Tak", bad: "Bad", kjokken: "Kjøkken", vinduer: "Vinduer", elektrisk: "Elektrisk anlegg", ror: "Rør", fasade: "Fasade", boligen: "Boligen",
  roykvarslere: "Røykvarslere", sistKontrollert: "Sist kontrollert", romningsveier: "Rømningsveier", radon: "Radon", notat: "Notat",
  bod: "Bod", parkering: "Parkering", garasje: "Garasje", balkong: "Balkong", postkasse: "Postkasse", fellesareal: "Fellesareal", fastInventar: "Fast inventar",
};
export function boligFeltnavn(felt: string) { return navn[felt] || felt; }
