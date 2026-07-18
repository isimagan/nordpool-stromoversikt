# Nordpool strømoversikt

En norsk Home Assistant-integrasjon som lager én enkel strømoversikt basert på
en sensor fra den offisielle **Nord Pool-integrasjonen**.

Under oppsettet må du velge sensoren som Nord Pool har opprettet. Integrasjonen
viser bare sensorer som tilhører Nord Pool, slik at du ikke kan velge feil type
sensor.

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
4. Velg Nord Pool-sensoren du vil bruke, for eksempel sensoren for gjeldende
   pris.
5. Velg **Send inn**.

Integrasjonen oppretter sensoren **Strømoversikt**. Den følger tilstanden,
måleenheten og de synlige attributtene til Nord Pool-sensoren du valgte.

Hvis Nord Pool ikke er installert, eller ingen Nord Pool-sensor finnes, må du
installere og konfigurere Nord Pool før du kan fullføre oppsettet.

## Endre valgt sensor

Fjern integrasjonen fra **Innstillinger → Enheter og tjenester**, legg den til
på nytt og velg en annen Nord Pool-sensor.

## Feil og forslag

Opprett en sak under **Issues** i dette repoet. Beskriv hvilken Home
Assistant-versjon du bruker, hvilken Nord Pool-sensor du valgte og hva du
forventet skulle skje.

