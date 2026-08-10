import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const source = readFileSync(new URL(
  "../custom_components/nordpool_stromoversikt/frontend/nordpool-price-card.js",
  import.meta.url,
), "utf8");

const customElements = new Map();
const context = vm.createContext({
  console,
  customElements: {
    define: (name, element) => customElements.set(name, element),
    get: (name) => customElements.get(name),
  },
  document: {
    createElement: () => ({}),
    createElementNS: () => ({ setAttribute() {} }),
  },
  HTMLElement: class {},
  window: {},
});

vm.runInContext(`${source}\n;globalThis.cardTest = { isTomorrowEntity };`, context);

const { isTomorrowEntity } = context.cardTest;
const unavailableTomorrow = {
  state: "unavailable",
  attributes: { icon: "mdi:calendar-arrow-right" },
};

test("accepts a compatible tomorrow sensor with price attributes", () => {
  const stateObj = {
    state: "1.23",
    attributes: { stotte: [], pris: [], snitt: 1.23 },
  };

  assert.equal(isTomorrowEntity({ entities: {} }, "sensor.compatible", stateObj), true);
});

test("accepts the integration tomorrow sensor while unavailable", () => {
  const hass = {
    entities: {
      "sensor.nordpool_i_morgen": { platform: "nordpool_stromoversikt" },
    },
  };

  assert.equal(
    isTomorrowEntity(hass, "sensor.nordpool_i_morgen", unavailableTomorrow),
    true,
  );
});

test("rejects unrelated unavailable sensors", () => {
  const hass = {
    entities: {
      "sensor.other": { platform: "other_integration" },
      "sensor.nordpool_stromstotte": { platform: "nordpool_stromoversikt" },
    },
  };

  assert.equal(isTomorrowEntity(hass, "sensor.other", unavailableTomorrow), false);
  assert.equal(isTomorrowEntity(
    hass,
    "sensor.nordpool_stromstotte",
    { state: "unavailable", attributes: { icon: "mdi:cash-refund" } },
  ), false);
});
