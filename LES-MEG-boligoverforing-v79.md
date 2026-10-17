# Boligoverføring v79

Rettelsen er laget på grunnlag av v78. Den er ikke publisert automatisk.

## Dette er endret

- Eieren velger boliginformasjon, rom, historikk, teknisk informasjon, vedlikehold, skader og øvrige seksjoner. Forsikringer, nøkkelmerking, kontakter og private notater krever egne valg.
- Valgte bilder og dokumenter får egne filer og egne dokumentposter hos mottakeren. Rom, forsidebilde, historikk, garantier og forsikringer peker til de nye dokumentene. Ikke valgte dokumentkoblinger fjernes.
- Ingen lån, skatteopplysninger, leietakere eller privat økonomi kopieres. Dokumentinnhold må kontrolleres av avsender før sending.
- Supabase sender en innloggingslenke til mottakerens e-post. Samme flyt støtter eksisterende kontoer og nye mottakere. Nye mottakere får en konto ved invitasjonen og bekrefter e-posten ved å bruke lenken.
- Dersom e-posten ikke kan sendes, vises dette. Invitasjonen er likevel lagret og kan kopieres eller sendes på nytt.
- Invitasjonen kan bare åpnes av kontoen med riktig bekreftet e-postadresse. Kun eieren av boligen kan opprette overføringen.
- Etter mottak opprettes en separat boligmappe. Avsender beholder sin mappe. Dette er ikke en juridisk eiendomsoverdragelse.
- Filer kopieres først, så lagres bolig, dokumenter og vedlikehold i én databasetransaksjon. Feil gir ikke en halvferdig bolig. Et nytt forsøk gjenbruker filkopiene og oppretter ikke en ekstra bolig.
- Ufullførte filkopier kan ligge i mottakerens overføringsmappe etter avbrudd. De gjenbrukes ved neste forsøk. Kilden må fortsatt finnes til kopieringen er gjennomført.
- Gamle invitasjoner fra før v79 endres ikke. Lag en ny invitasjon etter installasjonen.

## Nødvendig oppsett

1. Kjør HELE `boligoverforing-v79.sql` i SQL Editor i prosjektet du bruker på nettsiden. Skriptet kan kjøres flere ganger og sletter ingen eksisterende boliger. Det oppretter en ny overføringstabell og serverfunksjon.
2. Vercel må ha `SUPABASE_SECRET_KEY` eller eksisterende `SUPABASE_SERVICE_ROLE_KEY` for samme Supabase-prosjekt. Nøkkelen er bare til serveren, og skal aldri få prefikset NEXT_PUBLIC eller deles i chat. De eksisterende NEXT_PUBLIC_SUPABASE_URL og NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY beholdes. Ved lokal testing trengs servernøkkelen også i din lokale miljøfil.
3. I Supabase: Authentication → URL Configuration. Site URL skal være `https://www.eiendomsoversikten.no`. Legg til `https://www.eiendomsoversikten.no/**` i Redirect URLs. For lokal testing kan også `http://localhost:3000/**` legges til. Behold allerede nødvendige adresser.
4. E-postinnlogging og registrering må være aktivert i Supabase. Kontroller at Magic Link og Confirm signup-malene bruker `{{ .ConfirmationURL }}` som lenke, slik standardmalene gjør. En mal som bare lenker til forsiden mister invitasjonen.
5. For e-post til vanlige kunder må Supabase ha fungerende Custom SMTP. Standardtjenesten begrenser mottakere til prosjektets teammedlemmer. Hvis SMTP allerede er satt opp til registrering/glemt passord, kan samme oppsett brukes. Supabase kan også ha egne sendegrenser eller CAPTCHA-krav; sjekk disse hvis utsendingen avvises.
6. Bygg og publiser etter at SQL og miljøvariabler er på plass. Test med en separat e-postadresse du kontrollerer. Ikke bruk avsenderens egen konto som mottaker.

Nye brukere kan bruke e-postlenken uten først å velge passord. Vil de senere bruke vanlig passordinnlogging, kan de velge Glemt passord. Innloggingslenken har Supabases utløpstid (normalt én time); selve boligoverføringen varer i 30 dager. Avsender kan sende en ny e-postlenke.

## Kontroller utført

- Produksjonsbygg med Next.js 16.3 og TypeScript bestått. Eksisterende unpdf-advarsel er uendret.
- Test av pakkevalg, fjerning av ikke valgte felt og dokumentkoblinger, bevaring av originaldata og korrekte nye ID-er.
- API-test med simulerte Supabase-svar: eierskap, feil mottaker, ubekreftet e-post, valgte dokumenter fra feil bolig, filfeil, nye forsøk, e-postfeil og ny/eksisterende konto-flyt.
- SQL kjørt i lokal PostgreSQL via PGlite: migrering to ganger, tilgangskontroll, filkontroll, full rollback ved sen feil, separate dokumenter, vedlikehold og idempotent mottak.
- NO/EN-kontroll bestått. Personlige fritekster beholdes på originalspråket.
- Virkelig e-postlevering og kjøring mot produksjonsdatabasen er ikke testet: det krever ditt Supabase-oppsett.

Kjør `node scripts/check-boligoverforing.cjs` og `node scripts/check-translations.cjs` i prosjektmappen for lokale kodekontroller. Ingen nye app-avhengigheter er nødvendig.

Offisiell dokumentasjon:
https://supabase.com/docs/guides/auth/auth-email-passwordless
https://supabase.com/docs/guides/auth/redirect-urls
https://supabase.com/docs/guides/auth/auth-smtp
