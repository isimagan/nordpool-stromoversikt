"""Oppsett av Nordpool strømoversikt."""

from __future__ import annotations

from typing import Any

import voluptuous as vol

from homeassistant.config_entries import ConfigFlow, ConfigFlowResult
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers.selector import EntitySelector, EntitySelectorConfig

from .const import CONF_NORDPOOL_SENSOR, DOMAIN


class NordpoolStromoversiktConfigFlow(ConfigFlow, domain=DOMAIN):
    """Behandle oppsettet av Nordpool strømoversikt."""

    VERSION = 1

    async def async_step_user(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        """Be brukeren velge sensoren som Nord Pool har opprettet."""
        errors: dict[str, str] = {}

        if user_input is not None:
            entity_id = user_input[CONF_NORDPOOL_SENSOR]
            registry_entry = er.async_get(self.hass).async_get(entity_id)

            if registry_entry is None or registry_entry.platform != "nordpool":
                errors["base"] = "ikke_nordpool_sensor"
            elif self.hass.states.get(entity_id) is None:
                errors["base"] = "sensor_ikke_tilgjengelig"
            else:
                await self.async_set_unique_id(entity_id)
                self._abort_if_unique_id_configured()
                return self.async_create_entry(
                    title="Nordpool strømoversikt",
                    data={CONF_NORDPOOL_SENSOR: entity_id},
                )

        return self.async_show_form(
            step_id="user",
            data_schema=vol.Schema(
                {
                    vol.Required(CONF_NORDPOOL_SENSOR): EntitySelector(
                        EntitySelectorConfig(
                            domain="sensor",
                            integration="nordpool",
                        )
                    )
                }
            ),
            errors=errors,
        )
