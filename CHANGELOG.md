# Endringslogg

Alle vesentlige endringer i Nordpool strømoversikt dokumenteres i denne filen.

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
