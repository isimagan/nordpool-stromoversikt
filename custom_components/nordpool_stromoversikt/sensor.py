"""Sensor for Nordpool strømoversikt."""

from __future__ import annotations

from datetime import datetime, timedelta
import math
from typing import Any

from homeassistant.components.sensor import SensorEntity, SensorStateClass
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import (
    ATTR_UNIT_OF_MEASUREMENT,
    STATE_UNAVAILABLE,
    STATE_UNKNOWN,
)
from homeassistant.core import Event, EventStateChangedData, HomeAssistant, callback
from homeassistant.helpers import device_registry as dr, entity_registry as er
from homeassistant.helpers.device_registry import DeviceInfo
from homeassistant.helpers.entity_platform import AddConfigEntryEntitiesCallback
from homeassistant.helpers.event import async_track_state_change_event
from homeassistant.util import dt as dt_util

from .const import CONF_NORDPOOL_SENSOR


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddConfigEntryEntitiesCallback,
) -> None:
    """Opprett strømoversikten."""
    async_add_entities(
        [
            NordpoolStromoversiktSensor(hass, entry),
            BilligstTimeSensor(hass, entry),
        ],
        update_before_add=True,
    )


class NordpoolKildesensor(SensorEntity):
    """Felles grunnlag for sensorer som bruker valgt Nord Pool-sensor."""

    def __init__(self, hass: HomeAssistant, entry: ConfigEntry) -> None:
        """Knytt sensoren til valgt Nord Pool-sensor og dens enhet."""
        self.hass = hass
        self._entry = entry
        self._source_entity_id = entry.data[CONF_NORDPOOL_SENSOR]
        self._attr_device_info = self._finn_nordpool_enhet()

    def _finn_nordpool_enhet(self) -> DeviceInfo | None:
        """Returner Nord Pool-enheten slik at sensoren vises på informasjonssiden."""
        kilde = er.async_get(self.hass).async_get(self._source_entity_id)
        if kilde is None or kilde.device_id is None:
            return None

        enhet = dr.async_get(self.hass).async_get(kilde.device_id)
        if enhet is None:
            return None

        return DeviceInfo(
            identifiers=enhet.identifiers,
            connections=enhet.connections,
        )

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


class NordpoolStromoversiktSensor(NordpoolKildesensor):
    """Vis valgt Nord Pool-sensor som en norsk strømoversikt."""

    _attr_has_entity_name = True
    _attr_name = "Strømoversikt"
    _attr_icon = "mdi:lightning-bolt"

    def __init__(self, hass: HomeAssistant, entry: ConfigEntry) -> None:
        """Opprett sensoren."""
        super().__init__(hass, entry)
        self._attr_unique_id = entry.entry_id
        self._attr_native_value: Any = None
        self._attr_available = False
        self._attr_extra_state_attributes = {
            "valgt_nordpool_sensor": self._source_entity_id
        }

    @callback
    def _oppdater_fra_kildesensor(self) -> None:
        """Kopier verdi og informasjon fra valgt sensor."""
        state = self.hass.states.get(self._source_entity_id)

        if state is None or state.state in (STATE_UNKNOWN, STATE_UNAVAILABLE):
            self._attr_available = False
            self._attr_native_value = None
            return

        self._attr_available = True
        try:
            self._attr_native_value = float(state.state)
        except ValueError:
            self._attr_native_value = state.state

        self._attr_native_unit_of_measurement = state.attributes.get(
            ATTR_UNIT_OF_MEASUREMENT
        )
        self._attr_extra_state_attributes = {
            "valgt_nordpool_sensor": self._source_entity_id,
            **state.attributes,
        }


class BilligstTimeSensor(NordpoolKildesensor):
    """Vis dagens billigste hele strømtime."""

    _attr_has_entity_name = True
    _attr_name = "Billigst time"
    _attr_icon = "mdi:cash-clock"
    _attr_state_class = SensorStateClass.MEASUREMENT

    def __init__(self, hass: HomeAssistant, entry: ConfigEntry) -> None:
        """Opprett sensoren for billigste time."""
        super().__init__(hass, entry)
        self._attr_unique_id = f"{entry.entry_id}-billigst-time"
        self._attr_native_value: float | None = None
        self._attr_available = False
        self._attr_extra_state_attributes = {
            "starttid": None,
            "stopptid": None,
        }

    @callback
    def _oppdater_fra_kildesensor(self) -> None:
        """Finn dagens billigste hele time fra raw_today eller today."""
        state = self.hass.states.get(self._source_entity_id)
        if state is None:
            self._sett_utilgjengelig()
            return

        billigste = self._billigste_fra_raw_today(state.attributes.get("raw_today"))
        if billigste is None:
            billigste = self._billigste_fra_today(state.attributes.get("today"))

        if billigste is None:
            self._sett_utilgjengelig()
            return

        pris, start, stopp = billigste
        self._attr_available = True
        self._attr_native_value = pris
        self._attr_native_unit_of_measurement = state.attributes.get(
            ATTR_UNIT_OF_MEASUREMENT
        )
        self._attr_extra_state_attributes = {
            "starttid": start.isoformat(),
            "stopptid": stopp.isoformat(),
        }

    @callback
    def _sett_utilgjengelig(self) -> None:
        """Tøm verdiene når Nord Pool ikke har gyldige dagspriser."""
        self._attr_available = False
        self._attr_native_value = None
        self._attr_extra_state_attributes = {
            "starttid": None,
            "stopptid": None,
        }

    @staticmethod
    def _billigste_fra_raw_today(
        raw_today: Any,
    ) -> tuple[float, datetime, datetime] | None:
        """Finn billigste klokktime fra time- eller kvarterspriser."""
        if not isinstance(raw_today, list):
            return None

        perioder: list[tuple[datetime, datetime, float]] = []
        for oppføring in raw_today:
            if not isinstance(oppføring, dict):
                continue

            start = BilligstTimeSensor._som_datetime(oppføring.get("start"))
            slutt = BilligstTimeSensor._som_datetime(oppføring.get("end"))
            try:
                pris = float(oppføring["value"])
            except (KeyError, TypeError, ValueError):
                continue

            if start is None or slutt is None or slutt <= start:
                continue
            if not math.isfinite(pris):
                continue

            perioder.append((start, slutt, pris))

        if not perioder:
            return None

        kandidater = {
            start.replace(minute=0, second=0, microsecond=0)
            for start, _slutt, _pris in perioder
        }
        hele_timer: list[tuple[float, datetime, datetime]] = []

        for timestart in sorted(kandidater):
            timeslutt = timestart + timedelta(hours=1)
            deler: list[tuple[datetime, datetime, float]] = []

            for start, slutt, pris in perioder:
                delstart = max(start, timestart)
                delslutt = min(slutt, timeslutt)
                if delstart < delslutt:
                    deler.append((delstart, delslutt, pris))

            deler.sort(key=lambda delperiode: delperiode[0])
            neste_tid = timestart
            pris_ganger_sekunder = 0.0

            for delstart, delslutt, pris in deler:
                if delstart > neste_tid:
                    break

                gyldig_start = max(delstart, neste_tid)
                if delslutt <= gyldig_start:
                    continue

                sekunder = (delslutt - gyldig_start).total_seconds()
                pris_ganger_sekunder += pris * sekunder
                neste_tid = delslutt

                if neste_tid >= timeslutt:
                    break

            if neste_tid < timeslutt:
                continue

            timepris = pris_ganger_sekunder / timedelta(hours=1).total_seconds()
            hele_timer.append(
                (timepris, timestart, timeslutt - timedelta(seconds=1))
            )

        if not hele_timer:
            return None
        return min(hele_timer, key=lambda time: (time[0], time[1]))

    @staticmethod
    def _billigste_fra_today(
        today: Any,
    ) -> tuple[float, datetime, datetime] | None:
        """Finn billigste time i en liste med time- eller kvarterspriser."""
        if (
            not isinstance(today, list)
            or len(today) < 24
            or len(today) % 24 != 0
        ):
            return None

        verdier_per_time = len(today) // 24
        priser: list[tuple[float, int]] = []
        for time in range(24):
            timeverdier = today[
                time * verdier_per_time : (time + 1) * verdier_per_time
            ]
            try:
                gyldige_verdier = [float(verdi) for verdi in timeverdier]
            except (TypeError, ValueError):
                continue

            if (
                len(gyldige_verdier) != verdier_per_time
                or not all(math.isfinite(verdi) for verdi in gyldige_verdier)
            ):
                continue

            priser.append((sum(gyldige_verdier) / verdier_per_time, time))

        if not priser:
            return None

        pris, time = min(priser, key=lambda verdi: (verdi[0], verdi[1]))
        nå = dt_util.now()
        start = nå.replace(hour=time, minute=0, second=0, microsecond=0)
        stopp = start + timedelta(hours=1) - timedelta(seconds=1)
        return pris, start, stopp

    @staticmethod
    def _som_datetime(verdi: Any) -> datetime | None:
        """Gjør om en datetime eller ISO-tekst til datetime."""
        if isinstance(verdi, datetime):
            return verdi
        if isinstance(verdi, str):
            return dt_util.parse_datetime(verdi)
        return None
