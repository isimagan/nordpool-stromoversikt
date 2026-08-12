"""Nordpool strømoversikt."""

from __future__ import annotations

from hashlib import sha256
from pathlib import Path

from homeassistant.components.frontend import add_extra_js_url
from homeassistant.components.http import StaticPathConfig
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import Platform
from homeassistant.core import HomeAssistant
from homeassistant.helpers.device import async_entity_id_to_device_id
from homeassistant.helpers.helper_integration import async_remove_helper_devices
from homeassistant.helpers.typing import ConfigType

from .const import CONF_NORDPOOL_SENSOR

PLATFORMS: tuple[Platform, ...] = (Platform.SENSOR,)
CARD_PATH = "/nordpool_stromoversikt/nordpool-price-card.js"
CARD_FILE = Path(__file__).parent / "frontend" / "nordpool-price-card.js"
CARD_URL = f"{CARD_PATH}?v={sha256(CARD_FILE.read_bytes()).hexdigest()[:12]}"


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    """Registrer priskortet i Home Assistant-frontend."""
    await hass.http.async_register_static_paths(
        [StaticPathConfig(CARD_PATH, str(CARD_FILE), False)]
    )
    add_extra_js_url(hass, CARD_URL)
    return True


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
