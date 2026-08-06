"""Nordpool strømoversikt."""

from __future__ import annotations

from homeassistant.config_entries import ConfigEntry
from homeassistant.const import Platform
from homeassistant.core import HomeAssistant
from homeassistant.helpers.device import async_entity_id_to_device_id
from homeassistant.helpers.helper_integration import async_remove_helper_devices

from .const import CONF_NORDPOOL_SENSOR

PLATFORMS: tuple[Platform, ...] = (Platform.SENSOR,)


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Sett opp Nordpool strømoversikt fra et konfigurasjonsvalg."""
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Fjern Nordpool strømoversikt."""
    return await hass.config_entries.async_unload_platforms(entry, PLATFORMS)


async def async_migrate_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Flytt eksisterende hjelpeentiteter til Nord Pool-enheten."""
    if entry.version == 1 and entry.minor_version < 2:
        if source_device_id := async_entity_id_to_device_id(
            hass, entry.data[CONF_NORDPOOL_SENSOR]
        ):
            async_remove_helper_devices(
                hass,
                helper_config_entry_id=entry.entry_id,
                source_device_id=source_device_id,
            )
        hass.config_entries.async_update_entry(entry, minor_version=2)

    return True
