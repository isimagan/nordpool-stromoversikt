# Endringslogg

Alle vesentlige endringer i Nordpool strømoversikt dokumenteres i denne filen.

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
