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
  CustomEvent: class {
    constructor(type, options) {
      this.type = type;
      Object.assign(this, options);
    }
  },
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
    badgeActionConfig,
    badgeEntityConfig,
    badgeForeground,
    badgeLabel,
    badgeStateText,
    badgeTimeRange,
    badgePriceState,
    cardClass,
    createSensorPicker,
    isBadgeEntity,
    isTomorrowEntity,
    moreInfoCardConfig,
    NordpoolBadge,
    recoverNordpoolBadgePickers,
    recoverNordpoolBadges,
    performBadgeAction,
    sensorModel,
    sensorPickerValue,
    showEntityMoreInfo,
    supportEntityFor,
  };`,
  context,
);

const {
  applyBadgePriceColors,
  badgeBackground,
  badgeActionConfig,
  badgeEntityConfig,
  badgeForeground,
  badgeLabel,
  badgeStateText,
  badgeTimeRange,
  badgePriceState,
  cardClass,
  createSensorPicker,
  isBadgeEntity,
  isTomorrowEntity,
  moreInfoCardConfig,
  NordpoolBadge,
  recoverNordpoolBadgePickers,
  recoverNordpoolBadges,
  performBadgeAction,
  sensorModel,
  sensorPickerValue,
  showEntityMoreInfo,
  supportEntityFor,
} = context.cardTest;

test("shows a usable sensor select when Home Assistant has not loaded its picker", () => {
  const originalCreateElement = context.document.createElement;
  context.document.createElement = (tagName) => ({
    tagName,
    children: [],
    append(...children) { this.children.push(...children); },
  });
  try {
    const result = createSensorPicker(
      { states: { "sensor.price": { attributes: { friendly_name: "Strømpris" } } } },
      "sensor.price", "Prissensor", "Velg sensor", ["sensor.price"], true,
    );
    assert.equal(result.eventName, "change");
    assert.equal(result.control.tagName, "select");
    assert.equal(result.control.value, "sensor.price");
    assert.equal(result.control.children[1].value, "sensor.price");
    assert.equal(sensorPickerValue({ target: result.control }), "sensor.price");
  } finally {
    context.document.createElement = originalCreateElement;
  }
});

test("keeps Home Assistant's sensor picker when it is available", () => {
  const originalCreateElement = context.document.createElement;
  customElements.set("ha-entity-picker", class {});
  context.document.createElement = (tagName) => ({ tagName });
  try {
    const hass = { states: {} };
    const result = createSensorPicker(hass, "sensor.price", "Prissensor", "", ["sensor.price"]);
    assert.equal(result.eventName, "value-changed");
    assert.equal(result.control.tagName, "ha-entity-picker");
    assert.equal(result.control.hass, hass);
    assert.equal(result.control.value, "sensor.price");
    assert.equal(sensorPickerValue({ detail: { value: "sensor.other" } }), "sensor.other");
  } finally {
    customElements.delete("ha-entity-picker");
    context.document.createElement = originalCreateElement;
  }
});
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
  assert.equal(badgeStateText({ state: "1" }), "1,00 kr");
  assert.equal(badgeStateText({ state: "2.7" }), "2,70 kr");
  assert.equal(badgeStateText({ state: "0.56" }), "0,56 kr");
  assert.equal(badgeStateText({ state: "1.2" }, "NOK/kWh"), "1,20 NOK/kWh");
  assert.equal(badgeStateText({ state: "unavailable" }), "—");
  assert.equal(badgeStateText(undefined), "—");
});

test("migrates the previous badge unit spelling", () => {
  assert.equal(badgeStateText({ state: "1.2" }, "kWh/NOK"), "1,20 NOK/kWh");
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

test("uses a custom badge name instead of the composed name", () => {
  const now = new Date("2026-08-12T13:26:00Z");

  assert.equal(
    badgeLabel(
      { name: "Min strømpris", show_price: true, show_time_range: true },
      "Europe/Oslo",
      now,
    ),
    "Min strømpris",
  );
  assert.equal(badgeLabel({ name: "  " }, "Europe/Oslo", now), "");
});

test("colors the badge only during the cheapest or most expensive hour", () => {
  const config = { show_background: true };
  const cheapest = {
    state: "0",
    attributes: { idag: [1, 0, 2], gjeldende_time: 1 },
  };
  const ordinary = {
    state: "1",
    attributes: { idag: [1, 0, 2], gjeldende_time: 0 },
  };
  const mostExpensive = {
    state: "2",
    attributes: { today: [1, 0, 2], gjeldende_time: 2 },
  };

  assert.equal(badgeBackground(cheapest, config), "#C6EFCE");
  assert.equal(badgeForeground(cheapest, config), "#006100");
  assert.equal(badgeBackground(mostExpensive, config), "#FFC7CE");
  assert.equal(badgeForeground(mostExpensive, config), "#9C0006");
  assert.equal(badgeBackground(ordinary, config), undefined);
  assert.equal(badgeForeground(ordinary, config), undefined);
  assert.equal(badgeBackground(cheapest, {}), undefined);
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

test("uses the requested default badge actions", () => {
  assert.equal(badgeActionConfig({}, "tap").action, "more-info");
  assert.equal(badgeActionConfig({}, "double_tap").action, "none");
  assert.equal(badgeActionConfig({}, "hold").action, "none");
});

test("delegates configured badge actions to Home Assistant", () => {
  const events = [];
  const target = { dispatchEvent: (event) => events.push(event) };
  const config = {
    entity: "sensor.nordpool_stromstotte",
    hold_action: {
      action: "navigate",
      navigation_path: "/energy",
    },
  };

  assert.equal(performBadgeAction(target, {}, config, "hold"), true);
  assert.equal(events.length, 1);
  assert.equal(events[0].type, "hass-action");
  assert.equal(events[0].detail.action, "hold");
  assert.equal(events[0].detail.config, config);
  assert.equal(events[0].bubbles, true);
  assert.equal(events[0].composed, true);
  assert.equal(performBadgeAction(target, {}, config, "double_tap"), false);
  assert.equal(events.length, 1);
});

test("opens the price card as more info for the selected support entity", () => {
  const events = [];
  const target = { dispatchEvent: (event) => events.push(event) };
  const hass = {
    states: {
      "sensor.nordpool_stromstotte": {
        state: "1.2",
        attributes: {
          kildesensor: "sensor.nordpool",
          idag: Array(24).fill(1),
          original: Array(24).fill(2),
          snittpris: 1,
        },
      },
      "sensor.nordpool_i_morgen": {
        state: "1.1",
        attributes: {
          kildesensor: "sensor.nordpool",
          stotte: Array(24).fill(1.1),
          pris: Array(24).fill(2.1),
          snitt: 2.1,
        },
      },
    },
    entities: {},
  };

  assert.equal(
    showEntityMoreInfo(target, hass, "sensor.nordpool_stromstotte"),
    true,
  );
  assert.equal(events.length, 1);
  assert.equal(events[0].type, "show-dialog");
  assert.equal(events[0].detail.dialogTag, "nordpool-price-more-info");
  assert.equal(
    events[0].detail.dialogParams.config.entity,
    "sensor.nordpool_stromstotte",
  );
  assert.equal(
    events[0].detail.dialogParams.config.tomorrow_entity,
    "sensor.nordpool_i_morgen",
  );
  assert.equal(events[0].detail.dialogParams.config.price_mode, "supported");
  assert.equal(events[0].detail.dialogParams.config.show_line, true);
  assert.equal(events[0].bubbles, true);
  assert.equal(events[0].composed, true);
  assert.equal(showEntityMoreInfo(target, hass, undefined), false);
  assert.equal(events.length, 1);
});

test("uses hourly support-sensor attributes when Nord Pool is selected", () => {
  const supportState = {
    state: "1.2",
    attributes: {
      kildesensor: "sensor.nordpool",
      idag: Array(24).fill(1),
      original: Array.from({ length: 24 }, (_, hour) => hour),
      snittpris: 1,
      gjeldende_time: 8,
    },
  };
  const hass = {
    states: {
      "sensor.nordpool": {
        state: "8",
        attributes: { today: Array(96).fill(8), tomorrow: [] },
      },
      "sensor.nordpool_stromstotte": supportState,
    },
    entities: { "sensor.nordpool": { platform: "nordpool" } },
  };

  assert.equal(
    supportEntityFor(hass, "sensor.nordpool"),
    "sensor.nordpool_stromstotte",
  );
  const priceState = badgePriceState(hass, "sensor.nordpool");
  assert.deepEqual(
    Array.from(priceState.attributes.idag),
    Array.from(supportState.attributes.original),
  );
  assert.equal(priceState.attributes.gjeldende_time, 8);

  const config = moreInfoCardConfig(hass, "sensor.nordpool");
  assert.equal(config.entity, "sensor.nordpool_stromstotte");
  assert.equal(config.price_mode, "original");
  assert.equal(config.show_line, false);

  const model = sensorModel(
    supportState,
    false,
    "Europe/Oslo",
    new Date("2026-09-13T06:00:00Z"),
    config.price_mode,
  );
  assert.equal(model.supported.length, 24);
  assert.equal(model.supported[8], 8);
  assert.equal(model.average, 11.5);
  assert.equal(model.primaryLabel, "Uten strømstøtte");
  assert.equal(model.averageLabel, "Snittpris");
});

test("falls back to Home Assistant more info without matching hourly data", () => {
  const events = [];
  const target = { dispatchEvent: (event) => events.push(event) };
  const hass = {
    states: { "sensor.other": { state: "1", attributes: {} } },
    entities: {},
  };

  assert.equal(showEntityMoreInfo(target, hass, "sensor.other"), true);
  assert.equal(events[0].type, "hass-more-info");
  assert.equal(events[0].detail.entityId, "sensor.other");
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
    { state: "0", attributes: { idag: [0, 1, 2], gjeldende_time: 0 } },
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

test("reloads a badge picker left on a spinner after the load race", () => {
  let loadCount = 0;
  const picker = {
    shadowRoot: {
      querySelector: (selector) => (
        selector === ".badge.spinner" ? { localName: "ha-spinner" } : null
      ),
    },
    _loadBages: () => { loadCount += 1; },
  };
  const root = {
    querySelectorAll: (selector) => (
      selector === "hui-badge-picker" ? [picker] : []
    ),
  };

  assert.equal(recoverNordpoolBadgePickers(root), 1);
  assert.equal(recoverNordpoolBadgePickers(root), 0);
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
