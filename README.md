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

- `kildesensor`: entitets-ID-en til Nord Pool-sensoren som prisene kommer fra.
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

- `kildesensor`: entitets-ID-en til Nord Pool-sensoren som prisene kommer fra.
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
velge søylene etter strømstøtte, den stiplede linjen uten strømstøtte,
markering av gjeldende time og en horisontal snittlinje. Skjulte prisserier
fjernes også fra forklaringen og verktøytipset. Slås grafen av, slås alle fire
grafvalgene av automatisk, og kortet reduserer høyden til det synlige innholdet.

Kortet kan konfigureres visuelt eller med følgende YAML-parametere:

| Parameter | Type | Påbudt | Standard | Beskrivelse |
| --- | --- | :---: | --- | --- |
| `type` | string | ✅ | — | Må være `custom:nordpool-price-card`. |
| `entity` | entity | ✅ | — | Strømstøttesensoren med dagens aggregerte timepriser. |
| `tomorrow_entity` | entity | ❌ | Ikke valgt | I morgen-sensoren. Når den velges, vises dagsknappene **I dag** og **I morgen**. |
| `show_date` | boolean | ❌ | `true` | Viser datoen. |
| `show_mean` | boolean | ❌ | `true` | Viser dagens eller morgendagens snittpris. |
| `show_heading` | boolean | ❌ | `true` | Viser overskriften for valgt prisdøgn. |
| `show_graph` | boolean | ❌ | `true` | Viser grafen. Når den slås av, slås også grafens undervalg av. |
| `show_bars` | boolean | ❌ | `true` | Viser timeprisene etter strømstøtte som søyler. |
| `show_line` | boolean | ❌ | `true` | Viser ordinære Nord Pool-priser som stiplet linje. |
| `show_now_graph` | boolean | ❌ | `true` | Markerer gjeldende time i grafen. |
| `show_mean_graph` | boolean | ❌ | `true` | Viser snittprisen som en horisontal linje i grafen. |
| `show_description` | boolean | ❌ | `true` | Viser tegnforklaringen for de synlige prisseriene. |
| `show_now_price` | boolean | ❌ | `true` | Viser prisen for gjeldende time. For i morgen vises laveste pris. |
| `show_border` | boolean | ❌ | `true` | Viser kanten og skyggen rundt kortet. Dette valget finnes bare i YAML. |

## Nordpool Badge

Integrasjonen legger også til **Nordpool Badge** i badgevelgeren for dashbord.
Badgen følger Home Assistants standardutseende. Du kan velge enten den
opprinnelige Nord Pool-sensoren eller integrasjonens strømstøttesensor;
strømstøttesensoren er standardvalget. Sensorens tilstand vises uten den
opprinnelige enheten, etterfulgt av valgt enhet: `kr` eller `NOK/kWh`.

Under **Navn** kan du velge mellom **Sammensatt** og **Egendefinert**, på samme
måte som i Home Assistants tile-kort. Et sammensatt navn bygges med **Legg til**,
der navnedelene **Pris** og **Tid nå** er tilgjengelige. Bare **Pris** er lagt
til som standard. Tidsrommet viser den hele klokketimen nå er innenfor, for
eksempel `15:00-16:00`. Når begge vises, blir navnet
`Pris · 15:00-16:00`. Navnedelene kan fjernes igjen. **Egendefinert** viser et
tekstfelt for et fritt navn.

Ikonet følger den valgte entiteten som standard, men kan overstyres i
ikonvelgeren. Et overstyrt ikon beholdes når entiteten byttes. En valgfri
prisbasert bakgrunn bruker Excels standardfarger for positive og negative
celler: lysegrønn når nåværende time er dagens billigste time, og lyserød når
nåværende time er dagens dyreste time. Tekst og ikon får den tilhørende mørke
grønne eller røde fargen. I alle andre timer brukes Home Assistants normale
badgefarger. Bakgrunnen slås av eller på med en bryter.

Trykk på badgen åpner Nordpool-priskortet som **Mer informasjon** for den
valgte prissensoren. Når strømstøttesensoren er valgt, vises prisene etter
strømstøtte som søyler og originalprisene som stiplet linje. Når den
opprinnelige Nord Pool-sensoren er valgt, vises originalprisene som søyler uten
den stiplede linjen. I begge tilfeller leses grafen fra de ferdig aggregerte
timeprisene på strømstøttesensoren. Nord Pool-sensorens eventuelle
kvartersverdier brukes derfor ikke direkte i kortet.

Badgen forsøker automatisk å bygge seg på nytt dersom Home Assistant rekker å
vise «Custom element doesn't exist» før integrasjonens frontendressurs er
ferdig lastet. Badgevelgeren lastes også på nytt dersom Nordpool Badge blir
stående med en lastesirkel. Det gjør at badgen normalt kommer tilbake uten at
dashboardet må lastes inn på nytt manuelt.

I vanlig lagringsmodus registrerer integrasjonen frontendfilen som en Lovelace-
ressurs, slik at både kort og badge lastes før dashboardet bygges. YAML-modus
bruker automatisk frontendinnlasting som reserve dersom ressursen ikke allerede
er definert i `configuration.yaml`.

Badgen kan legges til med YAML:

```yaml
type: custom:nordpool-badge
entity: sensor.nordpool_stromstotte
show_price: true
show_time_range: false
show_background: false
unit: kr
# icon: mdi:cash-refund
# name: Min strømpris
```

Hvis Nord Pool ikke er installert, eller ingen Nord Pool-sensor finnes, må du
installere og konfigurere Nord Pool før du kan fullføre oppsettet.

## Endre valgt sensor

Fjern integrasjonen fra **Innstillinger → Enheter og tjenester** og legg den
til på nytt. Hvis du har flere Nord Pool-sensorer, kan du velge en annen.

## Feil og forslag

Opprett en sak under **Issues** i dette repoet. Beskriv hvilken Home
Assistant-versjon du bruker, hvilken Nord Pool-sensor du valgte og hva du
forventet skulle skje.
