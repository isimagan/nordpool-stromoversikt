"""Sensorer for Nordpool strømoversikt."""

from __future__ import annotations

from homeassistant.components.sensor import SensorEntity, SensorStateClass
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import ATTR_UNIT_OF_MEASUREMENT
from homeassistant.core import Event, EventStateChangedData, HomeAssistant, callback
from homeassistant.helpers import device_registry as dr, entity_registry as er
from homeassistant.helpers.device_registry import DeviceInfo
from homeassistant.helpers.entity_platform import AddConfigEntryEntitiesCallback
from homeassistant.helpers.event import async_track_state_change_event
from homeassistant.util import dt as dt_util

from .const import CONF_NORDPOOL_SENSOR, DOMAIN
from .price import hele_timer_fra_raw_today, hele_timer_fra_today, velg_time


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
        ],
        update_before_add=True,
    )


class NordpoolKildesensor(SensorEntity):
    """Felles grunnlag for sensorer som bruker valgt Nord Pool-sensor."""

    def __init__(self, hass: HomeAssistant, entry: ConfigEntry) -> None:
        """Knytt sensoren til valgt Nord Pool-sensor og dens enhet."""
        self.hass = hass
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


class NordpoolTimeSensor(NordpoolKildesensor):
    """Vis dagens billigste eller dyreste hele strømtime."""

    _attr_has_entity_name = True
    _attr_state_class = SensorStateClass.MEASUREMENT

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
        self._attr_native_value: float | None = None
        self._attr_available = False
        self._attr_extra_state_attributes = {
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
