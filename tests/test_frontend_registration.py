"""Tester registrering av frontendressursen uten Home Assistant-avhengigheter."""

from __future__ import annotations

import importlib
import sys
import unittest
from pathlib import Path
from types import ModuleType, SimpleNamespace


EXTRA_JS_URLS: list[str] = []
sys.path.insert(0, str(Path(__file__).parents[1]))


class FakeResourceStorageCollection:
    """Minimal lagringssamling for ressursregistreringstestene."""

    def __init__(self, items: list[dict] | None = None) -> None:
        self.items = items or []
        self.created: list[dict] = []
        self.updated: list[tuple[str, dict]] = []

    async def async_get_info(self) -> dict[str, int]:
        return {"resources": len(self.items)}

    def async_items(self) -> list[dict]:
        return self.items

    async def async_create_item(self, data: dict) -> None:
        self.created.append(data)

    async def async_update_item(self, item_id: str, data: dict) -> None:
        self.updated.append((item_id, data))


def install_home_assistant_stubs() -> None:
    """Installer bare modulene integrasjonens __init__ trenger."""
    modules = {
        name: ModuleType(name)
        for name in (
            "homeassistant",
            "homeassistant.components",
            "homeassistant.components.frontend",
            "homeassistant.components.http",
            "homeassistant.components.lovelace",
            "homeassistant.components.lovelace.resources",
            "homeassistant.config_entries",
            "homeassistant.const",
            "homeassistant.core",
            "homeassistant.helpers",
            "homeassistant.helpers.device",
            "homeassistant.helpers.helper_integration",
            "homeassistant.helpers.typing",
        )
    }
    modules["homeassistant.components.frontend"].add_extra_js_url = (
        lambda _hass, url: EXTRA_JS_URLS.append(url)
    )
    modules["homeassistant.components.http"].StaticPathConfig = object
    modules["homeassistant.components.lovelace"].LOVELACE_DATA = "lovelace"
    modules["homeassistant.components.lovelace"].MODE_STORAGE = "storage"
    modules[
        "homeassistant.components.lovelace.resources"
    ].ResourceStorageCollection = FakeResourceStorageCollection
    modules["homeassistant.config_entries"].ConfigEntry = object
    modules["homeassistant.const"].Platform = SimpleNamespace(SENSOR="sensor")
    modules["homeassistant.core"].HomeAssistant = object
    modules["homeassistant.helpers.device"].async_entity_id_to_device_id = object
    modules[
        "homeassistant.helpers.helper_integration"
    ].async_remove_helper_devices = object
    modules["homeassistant.helpers.typing"].ConfigType = dict
    sys.modules.update(modules)


install_home_assistant_stubs()
integration = importlib.import_module("custom_components.nordpool_stromoversikt")


class FrontendRegistrationTest(unittest.IsolatedAsyncioTestCase):
    """Kontroller riktig innlastingsvei i lagrings- og YAML-modus."""

    def setUp(self) -> None:
        EXTRA_JS_URLS.clear()

    async def test_creates_persistent_resource_in_storage_mode(self) -> None:
        resources = FakeResourceStorageCollection()
        hass = SimpleNamespace(
            data={
                "lovelace": SimpleNamespace(
                    resource_mode="storage",
                    resources=resources,
                )
            }
        )

        await integration._async_register_frontend_resource(hass)

        self.assertEqual(
            resources.created,
            [{"res_type": "module", "url": integration.CARD_URL}],
        )
        self.assertEqual(EXTRA_JS_URLS, [])

    async def test_updates_existing_resource_when_url_changes(self) -> None:
        resources = FakeResourceStorageCollection(
            [
                {
                    "id": "resource-id",
                    "type": "module",
                    "url": integration.CARD_PATH,
                }
            ]
        )
        hass = SimpleNamespace(
            data={
                "lovelace": SimpleNamespace(
                    resource_mode="storage",
                    resources=resources,
                )
            }
        )

        await integration._async_register_frontend_resource(hass)

        self.assertEqual(
            resources.updated,
            [
                (
                    "resource-id",
                    {"res_type": "module", "url": integration.CARD_URL},
                )
            ],
        )

    async def test_uses_extra_js_only_for_missing_yaml_resource(self) -> None:
        resources = SimpleNamespace(
            async_get_info=lambda: async_value({"resources": 0}),
            async_items=lambda: [],
        )
        hass = SimpleNamespace(
            data={
                "lovelace": SimpleNamespace(
                    resource_mode="yaml",
                    resources=resources,
                )
            }
        )

        await integration._async_register_frontend_resource(hass)

        self.assertEqual(EXTRA_JS_URLS, [integration.CARD_URL])


async def async_value(value):
    """Returner en verdi via en awaitbar testfunksjon."""
    return value


if __name__ == "__main__":
    unittest.main()
