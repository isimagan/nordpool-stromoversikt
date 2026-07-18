# Nordpool strømoversikt

En norsk Home Assistant-integrasjon som lager prissensorer basert på en sensor
fra den offisielle **Nord Pool-integrasjonen**.

Hvis du har én Nord Pool-sensor, brukes den automatisk under oppsettet. Hvis du
har flere, ber integrasjonen deg velge hvilken som skal brukes.

## Krav

- Home Assistant 2025.10 eller nyere
- Den offisielle Nord Pool-integrasjonen må være installert og konfigurert
- Minst én Nord Pool-sensor må finnes i Home Assistant

## Installasjon med HACS

1. Åpne HACS i Home Assistant.
2. Velg **Integrasjoner**.
3. Åpne menyen og velg **Egendefinerte repositorier**.
4. Legg inn adressen til dette repoet og velg typen **Integrasjon**.
5. Installer **Nordpool strømoversikt**.
6. Start Home Assistant på nytt.

## Oppsett

1. Gå til **Innstillinger → Enheter og tjenester**.
2. Velg **Legg til integrasjon**.
3. Søk etter **Nordpool strømoversikt**.
4. Hvis du har flere Nord Pool-sensorer, velger du sensoren du vil bruke.
   Har du bare én, velges den automatisk.
5. Velg **Send inn** hvis du får opp sensorvalget.

Integrasjonen oppretter sensorene på informasjonssiden til den valgte Nord
Pool-enheten.

### Billigst time

Sensoren **Billigst time** viser prisen for dagens billigste hele strømtime.
Den leser først attributtet `raw_today` og bruker `today` som reserve dersom
`raw_today` ikke finnes.

Hvis Nord Pool leverer priser hvert 15. minutt, samler sensoren de fire
kvartersprisene som dekker en hel klokktime og beregner et tidsvektet
gjennomsnitt. Den fungerer også når Nord Pool leverer én pris per time.

Sensoren har to attributter:

- `starttid`: tidspunktet den billigste timen starter
- `stopptid`: starten på neste time, med sekunder satt til `00`

Hvis flere timer har samme laveste pris, velges den første timen.

### Dyreste time

Sensoren **Dyreste time** bruker samme beregning som **Billigst time**, men
viser prisen for dagens dyreste hele strømtime. Den har attributtene `starttid`
og `stopptid`. Hvis flere timer har samme høyeste pris, velges den første.

Hvis Nord Pool ikke er installert, eller ingen Nord Pool-sensor finnes, må du
installere og konfigurere Nord Pool før du kan fullføre oppsettet.

## Endre valgt sensor

Fjern integrasjonen fra **Innstillinger → Enheter og tjenester** og legg den
til på nytt. Hvis du har flere Nord Pool-sensorer, kan du velge en annen.

## Feil og forslag

Opprett en sak under **Issues** i dette repoet. Beskriv hvilken Home
Assistant-versjon du bruker, hvilken Nord Pool-sensor du valgte og hva du
forventet skulle skje.
