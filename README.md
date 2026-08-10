# Nordpool strømoversikt

En norsk Home Assistant-integrasjon som lager prissensorer basert på en sensor
fra den offisielle **Nord Pool-integrasjonen**.

Hvis du har én Nord Pool-sensor, brukes den automatisk under oppsettet. Hvis du
har flere, ber integrasjonen deg velge hvilken som skal brukes.

## Krav

- Home Assistant 2026.8.0 eller nyere
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

Sensoren **Billigst time** viser dagens billigste hele strømtime som et
tidsrom, for eksempel `03:00-04:00`. Den leser først attributtet `raw_today`
og bruker `today` som reserve dersom `raw_today` ikke finnes.

Hvis Nord Pool leverer priser hvert 15. minutt, samler sensoren de fire
kvartersprisene som dekker en hel klokktime og beregner et tidsvektet
gjennomsnitt. Den fungerer også når Nord Pool leverer én pris per time.

Sensoren har fire attributter:

- `pris`: prisen for den valgte timen fra Nord Pool
- `etter_stotte`: prisen for den valgte timen etter beregnet strømstøtte
- `starttid`: tidspunktet den billigste timen starter
- `stopptid`: starten på neste time, med sekunder satt til `00`

Sensoren har ikke tilstandsklasse eller måleenhet, fordi tilstanden er tekst.

Hvis flere timer har samme laveste pris, velges den første timen.

### Dyreste time

Sensoren **Dyreste time** bruker samme oppsett som **Billigst time**, men viser
tidsrommet for dagens dyreste hele strømtime. Prisen ligger i attributtet `pris`, og prisen etter beregnet strømstøtte ligger i
`etter_stotte`. Hvis flere timer har samme høyeste pris, velges den første.

### Strømstøtte

Sensoren **Strømstøtte** viser gjeldende Nord Pool-pris etter beregnet
strømstøtte, avrundet og vist med to desimaler og måleenheten `kr`. Når prisen
er høyere enn 0,9625 kr/kWh, trekkes 90 prosent av beløpet over denne grensen
fra prisen:

`pris - ((pris - 0,9625) × 0,9)`

Når prisen er lik eller lavere enn 0,9625 kr/kWh, er sensorverdien den samme
som Nord Pool-prisen.

Sensoren har også attributtene:

- `original`: 23–25 ordinære Nord Pool-priser for inneværende dag,
  avhengig av om dagen har overgang til eller fra sommertid.
  Originalsensorens `today`-verdier samles til hele klokketimer.
- `idag`: de samme timeprisene etter beregnet strømstøtte.
- `snittpris`: gjennomsnittet av prisene i `idag`, avrundet til to
  desimaler.

### I morgen

Sensoren **I morgen** viser gjennomsnittet av morgendagens priser etter beregnet
strømstøtte, avrundet til to desimaler og med måleenheten `kr`. Den er bare
tilgjengelig når originalsensorens `tomorrow_valid` er `true` og `tomorrow`
inneholder et komplett prisdøgn.

Sensoren har attributtene:

- `snitt`: gjennomsnittet av morgendagens ordinære Nord Pool-priser før støtte.
- `pris`: 23–25 timepriser fra originalsensorens `tomorrow`, avhengig av om
  dagen har overgang til eller fra sommertid. Kvarterspriser gjennomsnittberegnes
  til hele timer.
- `stotte`: de samme timeprisene etter beregnet strømstøtte.

## Nordpool priskort

Integrasjonen legger automatisk til kortet **Nordpool priskort** i
kortvelgeren for dashbord. Kortet viser prisen etter strømstøtte som søyler og
den ordinære Nord Pool-prisen som en stiplet linje.

I kortets visuelle veiviser er **Strømstøttesensor** påkrevd og brukes alltid
til dagens priser. **I morgen-sensor** er valgfri. Når den velges, vises
knappene **I dag** og **I morgen** øverst i kortet, slik at begge prisdøgn kan
vises i samme kort. Begge sensorfeltene bruker Home Assistants vanlige
entitetsvelger med søk, ikon og entitetsnavn.

- **Strømstøttesensor** bruker attributtene `idag` og `original` og markerer
  gjeldende time.
- Den valgfrie **I morgen-sensoren** bruker attributtene `stotte` og `pris`.

Når sensoren er utilgjengelig, beholder kortet x- og y-aksene uten søyler eller
linje. Snittprisen vises da som **Kommer**.

I den visuelle veiviseren kan du velge om kortet skal vise dato, snittpris,
overskrift, graf, forklaring og nåpris. Når grafen vises, kan du i tillegg
velge markering av gjeldende time og en horisontal snittlinje. Slås grafen av,
slås også de to grafvalgene av automatisk.

Kortet kan også legges til med YAML:

```yaml
type: custom:nordpool-price-card
entity: sensor.nordpool_stromstotte
tomorrow_entity: sensor.nordpool_i_morgen
show_date: true
show_mean: true
show_heading: true
show_graph: true
show_now_graph: true
show_mean_graph: true
show_description: true
show_now_price: true
```

Alle visningsvalgene er `true` som standard og kan utelates fra YAML dersom
standardvisningen skal brukes. `tomorrow_entity` kan utelates; da viser kortet
bare dagens priser og dagsknappene skjules.

Hvis Nord Pool ikke er installert, eller ingen Nord Pool-sensor finnes, må du
installere og konfigurere Nord Pool før du kan fullføre oppsettet.

## Endre valgt sensor

Fjern integrasjonen fra **Innstillinger → Enheter og tjenester** og legg den
til på nytt. Hvis du har flere Nord Pool-sensorer, kan du velge en annen.

## Feil og forslag

Opprett en sak under **Issues** i dette repoet. Beskriv hvilken Home
Assistant-versjon du bruker, hvilken Nord Pool-sensor du valgte og hva du
forventet skulle skje.
