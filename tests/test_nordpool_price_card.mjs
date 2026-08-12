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

vm.runInContext(
  `${source}\n;globalThis.cardTest = { isTomorrowEntity, sensorModel };`,
  context,
);

const { isTomorrowEntity, sensorModel } = context.cardTest;
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

test("uses the Home Assistant time zone for the current hour", () => {
  const prices = Array.from({ length: 24 }, (_, hour) => hour);
  const stateObj = {
    state: "1.23",
    attributes: {
      idag: prices,
      original: prices,
      snittpris: 11.5,
    },
  };
  const now = new Date("2026-08-12T12:30:00Z");

  assert.equal(sensorModel(stateObj, false, "Europe/Oslo", now).currentHour, 14);
  assert.equal(sensorModel(stateObj, false, "America/New_York", now).currentHour, 8);
});

test("uses the Home Assistant calendar date for today and tomorrow", () => {
  const now = new Date("2026-08-12T23:30:00Z");

  assert.equal(
    sensorModel(undefined, false, "Europe/Oslo", now).date,
    "Torsdag 13. august",
  );
  assert.equal(
    sensorModel(undefined, true, "Europe/Oslo", now).date,
    "Fredag 14. august",
  );
});

test("prefers authoritative time data from the Home Assistant backend", () => {
  const prices = Array.from({ length: 24 }, (_, hour) => hour);
  const stateObj = {
    state: "1.23",
    attributes: {
      idag: prices,
      original: prices,
      snittpris: 11.5,
      dato: "2026-08-12",
      gjeldende_time: 15,
      tidssone: "Europe/Oslo",
    },
  };
  const bostonNow = new Date("2026-08-12T13:30:00Z");
  const model = sensorModel(stateObj, false, "America/New_York", bostonNow);

  assert.equal(model.currentHour, 15);
  assert.equal(model.date, "Onsdag 12. august");
});
