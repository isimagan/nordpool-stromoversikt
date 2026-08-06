"""Sensorer for Nordpool strømoversikt."""

from __future__ import annotations

import math

from homeassistant.components.sensor import SensorEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import Event, EventStateChangedData, HomeAssistant, callback
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers.device import async_entity_id_to_device
from homeassistant.helpers.entity_platform import AddConfigEntryEntitiesCallback
from homeassistant.helpers.event import async_track_state_change_event
from homeassistant.util import dt as dt_util

from .const import CONF_NORDPOOL_SENSOR, DOMAIN
from .price import (
    formater_tidsrom,
    hele_timer_fra_raw_today,
    hele_timer_fra_today,
    pris_etter_stromstotte,
    timepriser_fra_dagspriser,
    timepriser_etter_stromstotte,
    velg_time,
)


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddConfigEntryEntitiesCallback,
) -> None:
    """Opprett prissensorene."""
    register = er.async_get(hass)
    gammel_sensor = register.async_get_entity_id(
        "sensor",
        DOMAIN,
        entry.entry_id,
    )
    if gammel_sensor is not None:
        register.async_remove(gammel_sensor)

    async_add_entities(
        [
            NordpoolTimeSensor(
                hass,
                entry,
                navn="Billigst time",
                unik_nøkkel="billigst-time",
                ikon="mdi:cash-clock",
                velg_høyeste=False,
            ),
            NordpoolTimeSensor(
                hass,
                entry,
                navn="Dyreste time",
                unik_nøkkel="dyreste-time",
                ikon="mdi:chart-line",
                velg_høyeste=True,
            ),
            NordpoolStromstotteSensor(hass, entry),
            NordpoolIMorgenSensor(hass, entry),
        ],
        update_before_add=True,
    )


class NordpoolKildesensor(SensorEntity):
    """Felles grunnlag for sensorer som bruker valgt Nord Pool-sensor."""

    def __init__(self, hass: HomeAssistant, entry: ConfigEntry) -> None:
        """Knytt sensoren til valgt Nord Pool-sensor og dens enhet."""
        self.hass = hass
        self._source_entity_id = entry.data[CONF_NORDPOOL_SENSOR]
        self.device_entry = async_entity_id_to_device(hass, self._source_entity_id)

    async def async_added_to_hass(self) -> None:
        """Følg endringer fra valgt Nord Pool-sensor."""
        await super().async_added_to_hass()
        self.async_on_remove(
            async_track_state_change_event(
                self.hass,
                [self._source_entity_id],
                self._async_kildesensor_endret,
            )
        )
        self._oppdater_fra_kildesensor()

    async def async_update(self) -> None:
        """Oppdater fra valgt Nord Pool-sensor."""
        self._oppdater_fra_kildesensor()

    @callback
    def _async_kildesensor_endret(
        self, event: Event[EventStateChangedData]
    ) -> None:
        """Håndter ny verdi fra Nord Pool."""
        self._oppdater_fra_kildesensor()
        self.async_write_ha_state()

    @callback
    def _oppdater_fra_kildesensor(self) -> None:
        """Oppdater sensoren fra valgt Nord Pool-sensor."""
        raise NotImplementedError


class NordpoolTimeSensor(NordpoolKildesensor):
    """Vis dagens billigste eller dyreste hele strømtime."""

    _attr_has_entity_name = True

    def __init__(
        self,
        hass: HomeAssistant,
        entry: ConfigEntry,
        *,
        navn: str,
        unik_nøkkel: str,
        ikon: str,
        velg_høyeste: bool,
    ) -> None:
        """Opprett sensoren."""
        super().__init__(hass, entry)
        self._attr_name = navn
        self._attr_unique_id = f"{entry.entry_id}-{unik_nøkkel}"
        self._attr_icon = ikon
        self._velg_høyeste = velg_høyeste
        self._attr_native_value: str | None = None
        self._attr_available = False
        self._attr_extra_state_attributes = {
            "pris": None,
            "etter_stotte": None,
            "starttid": None,
            "stopptid": None,
        }

    @callback
    def _oppdater_fra_kildesensor(self) -> None:
        """Finn dagens billigste eller dyreste hele time."""
        state = self.hass.states.get(self._source_entity_id)
        if state is None:
            self._sett_utilgjengelig()
            return

        timer = hele_timer_fra_raw_today(state.attributes.get("raw_today"))
        if not timer:
            timer = hele_timer_fra_today(
                state.attributes.get("today"),
                dt_util.now(),
            )

        valgt = velg_time(timer, høyeste=self._velg_høyeste)
        if valgt is None:
            self._sett_utilgjengelig()
            return

        pris, start, stopp = valgt
        self._attr_available = True
        self._attr_native_value = formater_tidsrom(start, stopp)
        self._attr_extra_state_attributes = {
            "pris": pris,
            "etter_stotte": pris_etter_stromstotte(pris),
            "starttid": start.isoformat(),
            "stopptid": stopp.isoformat(),
        }

    @callback
    def _sett_utilgjengelig(self) -> None:
        """Tøm verdiene når Nord Pool ikke har gyldige dagspriser."""
        self._attr_available = False
        self._attr_native_value = None
        self._attr_extra_state_attributes = {
            "pris": None,
            "etter_stotte": None,
            "starttid": None,
            "stopptid": None,
        }


class NordpoolStromstotteSensor(NordpoolKildesensor):
    """Vis gjeldende strømpris etter beregnet strømstøtte."""

    _attr_has_entity_name = True
    _attr_name = "Strømstøtte"
    _attr_icon = "mdi:cash-refund"
    _attr_native_unit_of_measurement = "kr"
    _attr_suggested_display_precision = 2

    def __init__(self, hass: HomeAssistant, entry: ConfigEntry) -> None:
        """Opprett strømstøttesensoren."""
        super().__init__(hass, entry)
        self._attr_unique_id = f"{entry.entry_id}-stromstotte"
        self._attr_native_value: float | None = None
        self._attr_available = False
        self._attr_extra_state_attributes = {
            "idag": None,
            "snittpris": None,
        }

    @callback
    def _oppdater_fra_kildesensor(self) -> None:
        """Beregn gjeldende pris etter strømstøtte."""
        state = self.hass.states.get(self._source_entity_id)
        if state is None:
            self._sett_utilgjengelig()
            return

        try:
            pris = float(state.state)
        except (TypeError, ValueError):
            self._sett_utilgjengelig()
            return

        if not math.isfinite(pris):
            self._sett_utilgjengelig()
            return

        dagens_priser = timepriser_etter_stromstotte(
            state.attributes.get("today"),
            dt_util.now(),
        )

        self._attr_available = True
        self._attr_native_value = pris_etter_stromstotte(pris)
        self._attr_extra_state_attributes = {
            "idag": dagens_priser or None,
            "snittpris": (
                round(sum(dagens_priser) / len(dagens_priser), 2)
                if dagens_priser
                else None
            ),
        }

    @callback
    def _sett_utilgjengelig(self) -> None:
        """Tøm verdien når Nord Pool ikke har en gyldig pris."""
        self._attr_available = False
        self._attr_native_value = None
        self._attr_extra_state_attributes = {
            "idag": None,
            "snittpris": None,
        }


class NordpoolIMorgenSensor(NordpoolKildesensor):
    """Vis gjennomsnittsprisen for i morgen."""

    _attr_has_entity_name = True
    _attr_name = "I morgen"
    _attr_icon = "mdi:calendar-arrow-right"
    _attr_native_unit_of_measurement = "kr"
    _attr_suggested_display_precision = 2

    def __init__(self, hass: HomeAssistant, entry: ConfigEntry) -> None:
        """Opprett sensoren for morgendagens priser."""
        super().__init__(hass, entry)
        self._attr_unique_id = f"{entry.entry_id}-i-morgen"
        self._attr_native_value: float | None = None
        self._attr_available = False
        self._attr_extra_state_attributes = {
            "pris": None,
            "stotte": None,
        }

    @callback
    def _oppdater_fra_kildesensor(self) -> None:
        """Beregn morgendagens snittpris og timepriser."""
        state = self.hass.states.get(self._source_entity_id)
        if state is None or state.attributes.get("tomorrow_valid") is not True:
            self._sett_utilgjengelig()
            return

        priser = timepriser_fra_dagspriser(
            state.attributes.get("tomorrow"),
            dt_util.now(),
        )
        if len(priser) != 24:
            self._sett_utilgjengelig()
            return

        self._attr_available = True
        self._attr_native_value = round(sum(priser) / len(priser), 2)
        self._attr_extra_state_attributes = {
            "pris": priser,
            "stotte": [pris_etter_stromstotte(pris) for pris in priser],
        }

    @callback
    def _sett_utilgjengelig(self) -> None:
        """Tøm verdiene når morgendagens priser ikke er gyldige."""
        self._attr_available = False
        self._attr_native_value = None
        self._attr_extra_state_attributes = {
            "pris": None,
            "stotte": None,
        }
