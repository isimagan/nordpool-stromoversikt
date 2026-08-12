# Endringslogg

Alle vesentlige endringer i Nordpool strømoversikt dokumenteres i denne filen.

## Neste versjon

## 1.3.5 – 2026-08-12

### Rettet

- Priskortet bruker autoritativ dato og gjeldende time fra Home Assistant-
  backenden, slik at nettleserens tidssone ikke kan overstyre markeringen.
- Frontendressursen får en innholdsbasert versjon i URL-en, slik at oppdaterte
  kortfiler ikke gjenbrukes fra nettleserbufferen etter omstart.

## 1.3.4 – 2026-08-12

### Rettet

- Priskortets dato, nåpris og markering av gjeldende time følger nå Home
  Assistants konfigurerte tidssone i stedet for nettleserens lokale tidssone.

## 1.3.3 – 2026-08-10

### Rettet

- Kortveiviseren beholder integrasjonens **I morgen**-sensor i sensorlisten når
  morgendagens priser ennå ikke er tilgjengelige.

## 1.3.2 – 2026-08-10

### Lagt til

- Kortveiviseren kan skjule søylene etter strømstøtte og den stiplede linjen
  uten strømstøtte hver for seg. Skjulte prisserier fjernes også fra
  tegnforklaringen og verktøytipset.

### Rettet

- Priskortet reduserer høyden når grafen skjules, i stedet for å beholde tom
  dashboardplass.

## 1.3.1 – 2026-08-10

### Rettet

- Priskortet tilpasser grafhøyden til tilgjengelig dashboardplass, slik at
  klokkeslett, tegnforklaring og nåpris ikke blir beskåret.
- Grafen bruker kortets faktiske mål, slik at akse- og graftekst ikke strekkes
  på smale skjermer.
- Kortveiviseren bruker Home Assistants entitetsvelger for de to sensorfeltene.
- Dagsvelgeren er gjort lavere og mer kompakt.

## 1.3.0 – 2026-08-10

### Lagt til

- Kortet **Nordpool priskort**, med timepriser etter strømstøtte som søyler og
  ordinære Nord Pool-priser som en stiplet linje.
- Visuell kortveiviser med obligatorisk **Strømstøttesensor** og valgfri
  **I morgen-sensor**. Når begge er valgt, kan kortet bytte mellom dagene med
  knappene **I dag** og **I morgen**.
- Egen utilgjengelig-tilstand som beholder aksene og viser **Kommer** i stedet
  for snittpris.
- Åtte visningsvalg i kortveiviseren for dato, snittpris, overskrift, graf,
  grafmarkeringer, forklaring og nåpris.

## 1.2.0 – 2026-08-06

### Lagt til

- Attributtet `etter_stotte` på sensorene **Billigst time** og
  **Dyreste time**.
- Attributtene `idag` og `snittpris` på **Strømstøtte**, med dagens
  Nord Pool-priser samlet til hele timer og beregnet etter strømstøtte.
- Sensoren **I morgen**, med morgendagens snittpris som tilstand og
  attributtene `pris` og `stotte` med timepriser før og etter strømstøtte.

### Rettet

- Døgnprislogikken støtter nå komplette 23-, 24- og 25-timersdøgn ved
  overgang til og fra sommertid, inkludert 92/96/100 kvartersverdier.

### Endret

- Integrasjonsversjonen er oppdatert til `1.2.0`.

## 1.1.0 – 2026-08-06

### Endret

- Sensorene kobles direkte til den valgte Nord Pool-enheten i samsvar med
  enhetsregistermodellen i Home Assistant 2026.8.
- Eksisterende hjelpeenheter migreres slik at gamle duplikatenheter ryddes opp.
- Minimum støttet Home Assistant-versjon er oppdatert til `2026.8.0`.
- Integrasjonsversjonen er oppdatert til `1.1.0`.

## 1.0.0 – 2026-07-23

### Lagt til

- Sensoren **Strømstøtte**, som viser gjeldende Nord Pool-pris etter beregnet
  strømstøtte.
- Strømstøtteberegning som dekker 90 prosent av prisen over 0,9625 kr/kWh.

### Endret

- Tilstanden til **Strømstøtte** avrundes og vises med to desimaler.
- Integrasjonsversjonen er oppdatert til `1.0.0`.

## 0.5.0 – 2026-07-19

### Endret

- Tilstanden til **Billigst time** og **Dyreste time** viser nå tidsrommet som
  `xx:xx-yy:yy`.
- Prisen er flyttet fra sensortilstanden til attributtet `pris`.
- Tilstandsklasse og måleenhet er fjernet fra begge prissensorene.
- Integrasjonsversjonen er oppdatert til `0.5.0`.

## 0.4.0 – 2026-07-19

### Lagt til

- Sensoren **Dyreste time**, med samme oppsett og attributter som
  **Billigst time**.
- Automatisk valg av Nord Pool-sensor når bare én slik sensor finnes.

### Endret

- `stopptid` på prissensorene er nå starten på neste hele time, med sekunder
  satt til `00`.
- Sensorvalget vises bare når flere Nord Pool-sensorer finnes.
- Integrasjonsversjonen er oppdatert til `0.4.0`.

### Fjernet

- Den overflødige sensoren **Strømoversikt**, som dupliserte Nord
  Pool-sensoren.

## 0.3.0 – 2026-07-19

### Rettet

- **Billigst time** støtter nå Nord Pools kvarterspriser og blir ikke
  utilgjengelig når `raw_today` eller `today` inneholder 96 verdier.
- Prisene som dekker en hel klokktime samles til et tidsvektet gjennomsnitt.
- Ugyldige, manglende og ikke-endelige prisverdier ignoreres.

### Endret

- Integrasjonen vises nå som en vanlig tjenesteintegrasjon i stedet for i
  hjelper-listen.
- Integrasjonsversjonen er oppdatert til `0.3.0`.

## 0.2.0 – 2026-07-19

### Lagt til

- Sensoren **Billigst time**, som viser prisen for dagens billigste hele
  strømtime.
- Støtte for prisdata fra `raw_today`, med `today` som reserve.
- Attributtene `starttid` og `stopptid` på sensoren **Billigst time**.
- Tilknytning av integrasjonens sensorer til den valgte Nord Pool-enheten.

### Endret

- Dokumentasjonen beskriver den nye sensoren og hvordan billigste time velges.

## 0.1.0 – 2026-07-18

### Lagt til

- Første versjon av Nordpool strømoversikt.
- Oppsett i Home Assistant med obligatorisk valg av en Nord Pool-sensor.
- Sensoren **Strømoversikt**, som følger valgt Nord Pool-sensor.
- Norsk grensesnitt og norsk dokumentasjon.
- Støtte for installasjon som egendefinert HACS-integrasjon.
