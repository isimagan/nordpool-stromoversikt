"""Sensor for Nordpool strømoversikt."""

from __future__ import annotations

from typing import Any

from homeassistant.components.sensor import SensorEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import ATTR_UNIT_OF_MEASUREMENT, STATE_UNAVAILABLE, STATE_UNKNOWN
from homeassistant.core import Event, EventStateChangedData, HomeAssistant, callback
from homeassistant.helpers.entity_platform import AddConfigEntryEntitiesCallback
from homeassistant.helpers.event import async_track_state_change_event

from .const import CONF_NORDPOOL_SENSOR


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddConfigEntryEntitiesCallback,
) -> None:
    """Opprett strømoversikten."""
    async_add_entities(
        [NordpoolStromoversiktSensor(hass, entry)],
        update_before_add=True,
    )


class NordpoolStromoversiktSensor(SensorEntity):
    """Vis valgt Nord Pool-sensor som en norsk strømoversikt."""

    _attr_has_entity_name = True
    _attr_name = "Strømoversikt"
    _attr_icon = "mdi:lightning-bolt"

    def __init__(self, hass: HomeAssistant, entry: ConfigEntry) -> None:
        """Opprett sensoren."""
        self.hass = hass
        self._entry = entry
        self._source_entity_id = entry.data[CONF_NORDPOOL_SENSOR]
        self._attr_unique_id = entry.entry_id
        self._attr_native_value: Any = None
        self._attr_available = False
        self._attr_extra_state_attributes = {
            "valgt_nordpool_sensor": self._source_entity_id
        }

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

