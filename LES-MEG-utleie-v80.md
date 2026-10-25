# Samlet Utleie – v80

Basert på eiendomsoversikten-utleie-na.zip, lastet opp 25. oktober 2026.

## Fem hovedområder

- Utleieoversikt: nøkkeltall, registrerte forfalte leiebetalinger og kommende oppgaver.
- Mine boliger: boligliste, boliginformasjon, rom, dokumenter/bilder og historikk. Klikk adressen eller Åpne bolig for å samle informasjonen rundt den boligen. Nøkkeltall åpner den eksisterende økonomiske detaljvisningen. Ny bolig/Rediger bruker fortsatt boligkalkulatoren.
- Leieforhold: leietakere og avtaler, kontrakter/maler og leiebetalinger. Leiebetalinger viser husleie uten utgiftslisten.
- Økonomi: inntekter/utgifter og årsrapport/skatt.
- Vedlikehold: oppgaver og kalender.

Åpne /utleie. De gamle utleieadressene /oversikt, /boliger, /leietakere, /kontrakter, /okonomi og /skatterapport sender videre til riktig område og bevarer lenkeparametere.

Boligvelgeren øverst følger med mellom områdene. Velg Hele utleieporteføljen for samlet visning. En spesifikk bolig avgrenser tilknyttede poster, leietakere, oppgaver, dokumenter og kalenderhendelser. Privatboliger utelates fra Utleie. Et ugyldig boligvalg viser en melding fremfor en annen bolig.

Det eksisterende kontraktsarkivet med egne opplastede kontrakter og maler er fortsatt felles for porteføljen: dagens datamodell knytter ikke disse filene til en bolig. Dette står i visningen. Boligspesifikke signerte avtaler ligger på leietakeren. Ukoblede økonomi-/skatteposter og kalenderhendelser vises på porteføljenivå, men ikke når én bolig er valgt.

Betalingskortet viser registrerte økonomiposter for inneværende år. Det oppretter ikke leieposter ved å åpnes. Eksisterende opprettelse/markering av husleie ligger under Leiebetalinger/Økonomi. Oversikten er ikke en kontroll mot banken.

## Privat bolig beholdes

De opprinnelige sidene for Mitt hjem, Alt om boligen, Rom, Bolighistorikk, Vedlikehold, Kalender, Dokumentarkiv, Kontakter, Garantier og Forsikringer er uendret. Felles stilark, layout, API-er og lagringsfunksjoner er uendret. De nye utleievisningene bruker egne tilpassede visninger og datadaptere, og stilene er avgrenset til Utleie. Privatmenyen er sammenlignet med originalen for privatkonto og kombinert konto.

## Installering

Ingen ny SQL, miljøvariabler eller app-avhengigheter er nødvendig.

1. Stopp lokalserveren med Ctrl+C. Ta sikkerhetskopi av app og public.
2. Pakk ut ZIP til en midlertidig mappe. Kopier app-mappens innhold over prosjektets app-mappe med undermapper. Kopier også scripts og denne veiledningen.
3. Kjør node scripts/check-utleie.cjs og npm.cmd run build.
4. Hvis begge lykkes, kjør npm.cmd run dev. Åpne http://localhost:3000/utleie.
5. Test boligvalg og alle hovedområdene. Kontroller Mitt hjem før publisering.

Pakken inneholder også uendrede public-filer og prosjektkonfigurasjon, slik at den er en komplett kildekodepakke. Disse trenger ikke byttes. Miljøfiler, node_modules, nøkler og byggfiler er ikke med.

## Kontroll

- Produksjonsbygg og TypeScript.
- Kontrollsummer: 121 originalfiler uten endringer, inkludert private sider, API-er, lagring, layout og felles CSS.
- Ruter, gamle lenker, boligkontekst og ugyldig bolig-ID.
- Dataavgrensning for boliger, leietakere, dokumenter, økonomi, skatt, vedlikehold og kalender.
- React/DOM med simulerte data: alle 13 utleievisninger, klikk fra boligkort til bolig og videre til leieforhold, husleie uten utgifter, og husleiegenerering uten privatboligens leietaker.
- Engelsk hovedmeny, faner og ny tekst.
- Privat navigasjon sammenlignet med original gjengitt HTML for privat og kombinert konto.

Reelle kontodata og lagring er ikke testet mot Supabase; de eksisterende lagringsfunksjonene er beholdt. Nettleserinstallasjonen var utilgjengelig i testmiljøet, så mobil/iPad er ikke visuelt testet på en virkelig enhet. Responsiv oppdeling og eksisterende visninger er beholdt. Eksisterende unpdf-advarsel ved bygg er uendret.
