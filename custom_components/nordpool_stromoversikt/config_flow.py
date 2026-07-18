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
        """Velg automatisk når bare én Nord Pool-sensor finnes."""
        errors: dict[str, str] = {}
        sensorer = self._finn_nordpool_sensorer()

        if not sensorer:
            return self.async_abort(reason="ingen_nordpool_sensor")

        if user_input is None and len(sensorer) == 1:
            return await self._opprett_oppføring(sensorer[0])

        if user_input is not None:
            entity_id = user_input[CONF_NORDPOOL_SENSOR]

            if entity_id not in sensorer:
                errors["base"] = "ikke_nordpool_sensor"
            else:
                return await self._opprett_oppføring(entity_id)

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

    def _finn_nordpool_sensorer(self) -> list[str]:
        """Finn registrerte Nord Pool-sensorer som finnes i tilstandsmaskinen."""
        register = er.async_get(self.hass)
        return sorted(
            oppføring.entity_id
            for oppføring in register.entities.values()
            if oppføring.domain == "sensor"
            and oppføring.platform == "nordpool"
            and self.hass.states.get(oppføring.entity_id) is not None
        )

    async def _opprett_oppføring(self, entity_id: str) -> ConfigFlowResult:
        """Opprett integrasjonen for valgt Nord Pool-sensor."""
        await self.async_set_unique_id(entity_id)
        self._abort_if_unique_id_configured()
        return self.async_create_entry(
            title="Nordpool strømoversikt",
            data={CONF_NORDPOOL_SENSOR: entity_id},
        )
