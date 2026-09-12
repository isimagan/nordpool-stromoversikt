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
  `${source}\n;globalThis.cardTest = {
    applyBadgePriceColors,
    badgeBackground,
    badgeEntityConfig,
    badgeForeground,
    badgeLabel,
    badgeStateText,
    badgeTimeRange,
    cardClass,
    isBadgeEntity,
    isTomorrowEntity,
    NordpoolBadge,
    recoverNordpoolBadges,
    sensorModel,
  };`,
  context,
);

const {
  applyBadgePriceColors,
  badgeBackground,
  badgeEntityConfig,
  badgeForeground,
  badgeLabel,
  badgeStateText,
  badgeTimeRange,
  cardClass,
  isBadgeEntity,
  isTomorrowEntity,
  NordpoolBadge,
  recoverNordpoolBadges,
  sensorModel,
} = context.cardTest;
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

test("hides the card border only when show_border is false", () => {
  assert.equal(cardClass({ show_border: false }), "borderless");
  assert.equal(cardClass({ show_border: true }), "");
  assert.equal(cardClass({}), "");
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

test("formats the Nordpool badge state as a Norwegian krone amount", () => {
  assert.equal(badgeStateText({ state: "1.2" }), "1,2 kr");
  assert.equal(badgeStateText({ state: "1.2" }, "kWh/NOK"), "1,2 kWh/NOK");
  assert.equal(badgeStateText({ state: "unavailable" }), "—");
  assert.equal(badgeStateText(undefined), "—");
});

test("builds the badge label from price and the current whole hour", () => {
  const now = new Date("2026-08-12T13:26:00Z");

  assert.equal(badgeLabel({}, "Europe/Oslo", now), "Pris");
  assert.equal(
    badgeLabel({ show_price: true, show_time_range: true }, "Europe/Oslo", now),
    "Pris · 15:00-16:00",
  );
  assert.equal(
    badgeLabel({ show_price: false, show_time_range: true }, "Europe/Oslo", now),
    "15:00-16:00",
  );
  assert.equal(
    badgeLabel({ show_price: false, show_time_range: false }, "Europe/Oslo", now),
    "",
  );
  assert.equal(badgeTimeRange("Europe/Oslo", now), "15:00-16:00");
});

test("colors the badge between the cheapest and most expensive prices", () => {
  const config = {
    show_background: true,
    cheapest_color: "blue",
    most_expensive_color: "orange",
  };

  assert.equal(
    badgeBackground({ state: "0", attributes: { idag: [0, 1, 2] } }, config),
    "#C6EFCE",
  );
  assert.equal(
    badgeBackground({ state: "1", attributes: { idag: [0, 1, 2] } }, config),
    "color-mix(in srgb, #C6EFCE 50%, #FFC7CE)",
  );
  assert.equal(
    badgeBackground({ state: "2", attributes: { today: [0, 1, 2] } }, config),
    "#FFC7CE",
  );
  assert.equal(
    badgeBackground({ state: "1", attributes: { idag: [0, 1, 2] } }, {}),
    undefined,
  );
  assert.equal(
    badgeForeground({ state: "0", attributes: { idag: [0, 1, 2] } }, config),
    "#006100",
  );
  assert.equal(
    badgeForeground({ state: "1", attributes: { idag: [0, 1, 2] } }, config),
    "color-mix(in srgb, #006100 50%, #9C0006)",
  );
  assert.equal(
    badgeForeground({ state: "2", attributes: { idag: [0, 1, 2] } }, config),
    "#9C0006",
  );
});

test("keeps a custom icon when the badge entity changes", () => {
  const config = {
    entity: "sensor.old",
    icon: "mdi:lightning-bolt",
    unit: "kr",
  };

  const changed = badgeEntityConfig(config, "sensor.new");

  assert.equal(changed.entity, "sensor.new");
  assert.equal(changed.icon, "mdi:lightning-bolt");
  assert.equal(changed.unit, "kr");
  assert.equal(config.entity, "sensor.old");
});

test("applies the price color to badge text and icon", () => {
  const properties = new Map();
  const badge = {
    style: {
      setProperty: (name, value) => properties.set(name, value),
    },
  };

  applyBadgePriceColors(
    badge,
    { state: "0", attributes: { idag: [0, 1, 2] } },
    { show_background: true },
  );

  assert.equal(properties.get("--ha-card-background"), "#C6EFCE");
  assert.equal(properties.get("--primary-text-color"), "#006100");
  assert.equal(properties.get("--secondary-text-color"), "#006100");
  assert.equal(properties.get("--badge-color"), "#006100");
});

test("offers Nord Pool and strømstøtte sensors in the badge editor", () => {
  const support = {
    state: "1.2",
    attributes: { idag: [], original: [], snittpris: 1.2 },
  };
  const source = { state: "1.8", attributes: { today: [], tomorrow: [] } };
  const hass = {
    states: { "sensor.source": source, "sensor.support": support },
    entities: { "sensor.source": { platform: "nordpool" } },
  };

  assert.equal(isBadgeEntity(hass, "sensor.source", source), true);
  assert.equal(isBadgeEntity(hass, "sensor.support", support), true);
  assert.equal(NordpoolBadge.getStubConfig(hass).entity, "sensor.support");
});

test("registers Nordpool Badge in the Home Assistant badge picker", () => {
  assert.ok(customElements.get("nordpool-badge"));
  assert.equal(context.window.customBadges.length, 1);
  assert.equal(context.window.customBadges[0].name, "Nordpool Badge");
});

test("rebuilds a Nordpool badge left in Home Assistant's error state", () => {
  let loadCount = 0;
  const failedBadge = {
    config: { type: "custom:nordpool-badge" },
    load: () => { loadCount += 1; },
    querySelector: (selector) => (
      selector === "hui-error-badge" ? { localName: selector } : null
    ),
  };
  const healthyBadge = {
    config: { type: "custom:nordpool-badge" },
    load: () => { loadCount += 1; },
    querySelector: () => null,
  };
  const badgeRoot = {
    querySelectorAll: (selector) => (
      selector === "hui-badge" ? [failedBadge, healthyBadge] : []
    ),
  };
  const root = {
    querySelectorAll: (selector) => (
      selector === "*" ? [{ shadowRoot: badgeRoot }] : []
    ),
  };

  assert.equal(recoverNordpoolBadges(root), 1);
  assert.equal(loadCount, 1);
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
