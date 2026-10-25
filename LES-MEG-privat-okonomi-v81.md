# Økonomi for Privat bolig – v81

Ny side: /privat-okonomi. Ligger i menyen Boligen, mellom Alt om boligen og Vedlikehold, også for kontoer med begge bruksområder. Mitt hjem har en snarvei med bolig-ID.

## Budsjett

- Boliglån: samlet betaling ELLER renter og avdrag hver for seg, aldri begge deler samtidig.
- Felleskostnader, kommunale avgifter, eiendomsskatt, strøm/nettleie, internett/TV, forsikringer og vedlikeholdsbuffer.
- Egendefinerte faste utgifter kan legges til og fjernes.
- Beløp kan være per måned, kvartal eller år. Årsbeløp og månedlig gjennomsnitt beregnes automatisk. Totalen inkluderer avdrag og buffer. Dette er et budsjett, ikke en betalings- eller bankoversikt.
- Poster som er helt inkludert i felleskostnadene kan merkes og telles ikke dobbelt. Ved delvis dekning registreres bare tillegget.
- Forsikringer: velg enten manuelt beløp eller bestemte forsikringer registrert på samme bolig. Bare valgte forsikringer regnes med, og ikke i tillegg til manuelt beløp. Manglende årsbeløp eller slettede valgte forsikringer gir melding før lagring.
- Alle inndata er i NOK. Totalsummer følger det eksisterende valutavalget.

Budsjettfeltene er tomme for en ekte bolig uten lagret budsjett. De fylles ikke fra gamle kalkulatorfelt med uklare perioder. Eksempelboligen har tydelig merkede eksempelbeløp som kan prøves uten lagring.

## Lagring og avgrensning

Lagrer separat for hver privatbolig som privatOkonomi i boligens eksisterende datafelt. Ingen nye tabeller, SQL, avhengigheter eller miljøvariabler er nødvendig. Eksisterende innlogging og tilgangsregler gjelder. Lesetilgang gir ikke redigeringsknapper. Ulagrede endringer varsles ved boligbytte, lenkeklikk og lukking/oppfriskning.

Ved lagring hentes boligens nyeste data, kontrolleres for privat brukstype, og andre boligopplysninger bevares. Endringer som oppstår samtidig oppdages med updated_at-kontroll. Økonomibudsjettet følger ikke med i boligoverleveringen, som bruker en eksplisitt liste over delbare boligfelt.

Utleiearbeidsflaten, utleiedata, API-er og globale stiler er uendret fra v80. Privat bolig endres kun med den nye siden, menylenken og snarveien fra Mitt hjem. Øvrige privatsider er beholdt.

## Installering

Stopp lokalserveren. Ta sikkerhetskopi av app og public. Pakk ut ZIP til en midlertidig mappe og kopier app- og scripts-innholdet inn i prosjektet, samt denne veiledningen. Public og prosjektkonfigurasjon er uendret.

Kjør:
node scripts/check-privat-okonomi.cjs
node scripts/check-utleie.cjs
npm.cmd run build
npm.cmd run dev

Åpne http://localhost:3000/privat-okonomi. Velg bolig, fyll inn beløp og trykk Lagre boligbudsjett. Test gjenåpning og boligbytte lokalt før publisering.

## Kontroller

- Beregninger: måned/kvartal/år, norske beløpsformater, renter/avdrag, inkluderte kostnader, forsikringsvalg, egne utgifter og ugyldige beløp.
- Lagring med simulerte databasesvar: riktig bolig-ID, bevaring av ferske øvrige boligopplysninger, avvisning av utleiebolig, manglende innlogging og samtidige endringer.
- React/DOM med simulerte data: valg av privatbolig, feltendring, bytte med ulagrede endringer, separate utkast per bolig, ugyldig bolig, engelsk tekst og nøyaktig menyplassering.
- Produksjonsbygg og TypeScript.
- Ingen endring i eksisterende utleiesider eller API-er; 120 tidligere originalfiler fortsatt uendret. Mitt hjem er unntatt den gamle kontrollsummen fordi den nye snarveien er bestilt.

Virkelig lagring mot kontoen din og visuell testing på iPad/mobil er ikke utført i testmiljøet. Eksisterende unpdf-advarsel under bygg er uendret.
