const CARD_TYPE = "nordpool-price-card";
const CARD_NAME = "Nordpool priskort";
const CARD_DOCS = "https://github.com/isimagan/nordpool-stromoversikt#nordpool-priskort";
const BADGE_TYPE = "nordpool-badge";
const BADGE_NAME = "Nordpool Badge";
const BADGE_DOCS = "https://github.com/isimagan/nordpool-stromoversikt#nordpool-badge";
const MORE_INFO_DIALOG_TYPE = "nordpool-price-more-info";
const BADGE_UNITS = ["kr", "NOK/kWh"];
const BADGE_DEFAULTS = {
  show_price: true,
  show_time_range: false,
  show_background: false,
  unit: BADGE_UNITS[0],
};
const BADGE_ACTION_DEFAULTS = {
  tap: "more-info",
  double_tap: "none",
  hold: "none",
};
const BADGE_ACTION_KEYS = {
  tap: "tap_action",
  double_tap: "double_tap_action",
  hold: "hold_action",
};
const BADGE_PRICE_COLORS = {
  cheapest: {
    background: "#C6EFCE",
    foreground: "#006100",
  },
  mostExpensive: {
    background: "#FFC7CE",
    foreground: "#9C0006",
  },
};
const INTEGRATION_DOMAIN = "nordpool_stromoversikt";
const TOMORROW_SENSOR_ICON = "mdi:calendar-arrow-right";
const RECOVERED_BADGE_PICKERS = new WeakSet();

const SVG_NS = "http://www.w3.org/2000/svg";
const UNAVAILABLE_STATES = new Set(["unknown", "unavailable", "none", ""]);
const DISPLAY_OPTIONS = [
  ["show_date", "Vis dato"],
  ["show_mean", "Vis snittpris"],
  ["show_heading", "Vis overskrift"],
  ["show_graph", "Vis graf"],
  ["show_bars", "Vis søyler"],
  ["show_line", "Vis stiplet linje"],
  ["show_now_graph", "Marker gjeldende time i grafen"],
  ["show_mean_graph", "Vis snittpris i grafen"],
  ["show_description", "Vis forklaring"],
  ["show_now_price", "Vis nåpris"],
];
const DISPLAY_DEFAULTS = Object.fromEntries(
  DISPLAY_OPTIONS.map(([key]) => [key, true]),
);
const GRAPH_SUB_OPTIONS = new Set([
  "show_bars",
  "show_line",
  "show_now_graph",
  "show_mean_graph",
]);

const styles = `
  :host {
    display: block;
    height: 100%;
    --nordpool-bar-color: var(--primary-color, #45a4f5);
    --nordpool-current-color: #73c0ff;
    --nordpool-line-color: #ffb74d;
  }

  * { box-sizing: border-box; }

  ha-card {
    height: 100%;
    min-width: 0;
    padding: 20px 18px 15px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  ha-card.borderless {
    border: none;
    box-shadow: none;
  }

  .period-switch {
    display: grid;
    grid-template-columns: 1fr 1fr;
    flex: 0 0 auto;
    gap: 2px;
    margin: 0 3px 12px;
    padding: 2px;
    border: 1px solid var(--divider-color);
    border-radius: 9px;
    background: color-mix(in srgb, var(--primary-text-color) 5%, transparent);
  }

  .period-button {
    min-height: 26px;
    padding: 3px 10px;
    border: 0;
    border-radius: 6px;
    background: transparent;
    color: var(--secondary-text-color);
    font: inherit;
    font-size: 12px;
    font-weight: 650;
    cursor: pointer;
    transition: background .15s, color .15s, box-shadow .15s;
  }

  .period-button.active {
    background: var(--secondary-background-color);
    color: var(--primary-text-color);
    box-shadow: 0 1px 5px rgba(0, 0, 0, .24);
  }

  .card-head {
    display: flex;
    flex: 0 0 auto;
    justify-content: space-between;
    gap: 16px;
    align-items: flex-start;
    padding: 0 3px 16px;
  }

  .eyebrow {
    color: var(--secondary-text-color);
    font-size: 12px;
    font-weight: 650;
    letter-spacing: .045em;
    text-transform: uppercase;
  }

  h2 {
    margin: 4px 0 0;
    color: var(--primary-text-color);
    font-size: 21px;
    line-height: 1.15;
    letter-spacing: -.02em;
  }

  .average {
    margin-left: auto;
    text-align: right;
    white-space: nowrap;
  }

  .average strong {
    display: block;
    margin-top: 2px;
    color: var(--nordpool-current-color);
    font-size: 22px;
    letter-spacing: -.03em;
  }

  .chart-wrap {
    position: relative;
    flex: 1 1 330px;
    height: auto;
    min-height: 190px;
    min-width: 0;
  }

  svg {
    display: block;
    width: 100%;
    height: 100%;
    overflow: visible;
  }

  .grid-line { stroke: var(--divider-color); stroke-width: 1; }
  .zero-line { stroke: var(--secondary-text-color); stroke-width: 1; opacity: .45; }
  .mean-line {
    stroke: var(--nordpool-current-color);
    stroke-width: 1.5;
    stroke-dasharray: 3 4;
    opacity: .9;
  }
  .mean-label {
    fill: var(--nordpool-current-color);
    font-size: 9px;
    font-weight: 700;
    text-anchor: end;
  }
  .mean-label-bg {
    fill: var(--ha-card-background, var(--card-background-color));
    opacity: .88;
  }
  .axis-label { fill: var(--secondary-text-color); font-size: 10px; }
  .hour-label { fill: var(--secondary-text-color); font-size: 10px; text-anchor: middle; }
  .bar { fill: var(--nordpool-bar-color); opacity: .82; transition: opacity .15s, filter .15s; }
  .bar.current {
    fill: var(--nordpool-current-color);
    opacity: 1;
    filter: drop-shadow(0 0 6px color-mix(in srgb, var(--nordpool-current-color) 45%, transparent));
  }
  .bar:hover { opacity: 1; }
  .price-line {
    fill: none;
    stroke: var(--nordpool-line-color);
    stroke-width: 2.3;
    stroke-dasharray: 6 5;
    stroke-linejoin: round;
    stroke-linecap: round;
    filter: drop-shadow(0 1px 2px rgba(0, 0, 0, .34));
  }
  .line-dot { fill: var(--nordpool-line-color); opacity: 0; transition: opacity .15s; }
  .chart-hit:hover + .line-dot { opacity: 1; }

  .now-label {
    fill: var(--nordpool-current-color);
    font-size: 9px;
    font-weight: 700;
    text-anchor: middle;
  }

  .legend {
    display: flex;
    flex: 0 0 auto;
    flex-wrap: wrap;
    gap: 18px;
    align-items: center;
    padding: 11px 4px 0;
    border-top: 1px solid var(--divider-color);
    color: var(--secondary-text-color);
    font-size: 12px;
  }

  .legend-item { display: inline-flex; align-items: center; gap: 7px; }
  .legend-bar { width: 15px; height: 9px; border-radius: 2px; background: var(--nordpool-bar-color); }
  .legend-line { width: 19px; border-top: 2px dashed var(--nordpool-line-color); }
  .now-price { margin-left: auto; color: var(--primary-text-color); font-weight: 600; }

  .tooltip {
    position: fixed;
    z-index: 10;
    pointer-events: none;
    opacity: 0;
    min-width: 148px;
    padding: 9px 11px;
    border: 1px solid var(--divider-color);
    border-radius: 9px;
    background: var(--ha-card-background, var(--card-background-color));
    color: var(--primary-text-color);
    box-shadow: var(--ha-card-box-shadow, 0 8px 24px rgba(0, 0, 0, .35));
    font-size: 12px;
    transform: translate(-50%, calc(-100% - 12px));
    transition: opacity .1s;
  }

  .tooltip.visible { opacity: 1; }
  .tooltip strong { display: block; margin-bottom: 6px; }
  .tooltip-row {
    display: flex;
    justify-content: space-between;
    gap: 14px;
    color: var(--secondary-text-color);
    line-height: 1.6;
  }
  .tooltip-row b { color: var(--primary-text-color); font-weight: 650; }

  @media (max-width: 430px) {
    ha-card { padding-inline: 12px; }
    .card-head { padding-inline: 4px; }
    .average strong { font-size: 19px; }
    .legend { gap: 11px; }
    .now-price { width: 100%; margin-left: 0; }
  }
`;

function svgNode(name, attributes = {}) {
  const node = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attributes)) {
    node.setAttribute(key, value);
  }
  return node;
}

function numberList(value) {
  if (!Array.isArray(value)) return [];
  const numbers = value.map(Number);
  return numbers.every(Number.isFinite) ? numbers : [];
}

function hasAttributes(stateObj, names) {
  const attrs = stateObj?.attributes ?? {};
  return names.every((name) => Object.prototype.hasOwnProperty.call(attrs, name));
}

function isTodayState(stateObj) {
  return hasAttributes(stateObj, ["idag", "original", "snittpris"]);
}

function isTomorrowState(stateObj) {
  return hasAttributes(stateObj, ["stotte", "pris", "snitt"]);
}

function isTomorrowEntity(hass, entityId, stateObj) {
  if (isTomorrowState(stateObj)) return true;

  return UNAVAILABLE_STATES.has(String(stateObj?.state).toLowerCase())
    && hass?.entities?.[entityId]?.platform === INTEGRATION_DOMAIN
    && stateObj?.attributes?.icon === TOMORROW_SENSOR_ICON;
}

function capitalize(value) {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}

function homeAssistantTime(date, timeZone) {
  const options = {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    hourCycle: "h23",
  };
  if (timeZone) options.timeZone = timeZone;

  let parts;
  try {
    parts = new Intl.DateTimeFormat("en-CA", options).formatToParts(date);
  } catch (error) {
    if (!(error instanceof RangeError)) throw error;
    delete options.timeZone;
    parts = new Intl.DateTimeFormat("en-CA", options).formatToParts(date);
  }

  return Object.fromEntries(
    parts
      .filter(({ type }) => ["year", "month", "day", "hour"].includes(type))
      .map(({ type, value }) => [type, Number(value)]),
  );
}

function calendarDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value ?? ""));
  if (!match) return null;
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
}

function dayLabel({ year, month, day }, dayOffset = 0) {
  const date = new Date(Date.UTC(year, month - 1, day + dayOffset));
  return capitalize(date.toLocaleDateString("nb-NO", {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
  }));
}

function priceText(value) {
  if (!Number.isFinite(value)) return "—";
  return `${value.toLocaleString("nb-NO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} kr`;
}

function badgeUnit(unit) {
  const configuredUnit = unit === "kWh/NOK" ? "NOK/kWh" : unit;
  return BADGE_UNITS.includes(configuredUnit)
    ? configuredUnit
    : BADGE_DEFAULTS.unit;
}

function badgeConfig(config = {}) {
  return {
    show_price: config.show_price !== false,
    show_time_range: config.show_time_range === true,
    show_background: config.show_background === true,
    unit: badgeUnit(config.unit),
  };
}

function badgeEntityConfig(config, entity) {
  const nextConfig = { ...config };
  if (entity) nextConfig.entity = entity;
  else delete nextConfig.entity;
  return nextConfig;
}

function badgeStateText(stateObj, unit = BADGE_DEFAULTS.unit) {
  if (!stateObj
    || UNAVAILABLE_STATES.has(String(stateObj.state).toLowerCase())) {
    return "—";
  }

  const value = Number(stateObj.state);
  if (!Number.isFinite(value)) return "—";
  const state = value.toLocaleString("nb-NO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${state} ${badgeUnit(unit)}`;
}

function badgeTimeRange(timeZone, now = new Date()) {
  const hour = homeAssistantTime(now, timeZone).hour;
  const nextHour = (hour + 1) % 24;
  return `${String(hour).padStart(2, "0")}:00-${String(nextHour).padStart(2, "0")}:00`;
}

function badgeLabel(config, timeZone, now = new Date()) {
  if (typeof config?.name === "string") return config.name.trim();

  const display = badgeConfig(config);
  const parts = [];
  if (display.show_price) parts.push("Pris");
  if (display.show_time_range) parts.push(badgeTimeRange(timeZone, now));
  return parts.join(" · ");
}

function isNordpoolSourceEntity(hass, entityId, stateObj) {
  return hass?.entities?.[entityId]?.platform === "nordpool"
    || hasAttributes(stateObj, ["today", "tomorrow"]);
}

function isBadgeEntity(hass, entityId, stateObj) {
  return isTodayState(stateObj)
    || isNordpoolSourceEntity(hass, entityId, stateObj);
}

function supportEntityFor(hass, entityId) {
  const selectedState = hass?.states?.[entityId];
  if (isTodayState(selectedState)) return entityId;
  if (!isNordpoolSourceEntity(hass, entityId, selectedState)) return undefined;

  return Object.entries(hass?.states ?? {}).find(([, stateObj]) => (
    isTodayState(stateObj)
    && stateObj.attributes?.kildesensor === entityId
  ))?.[0];
}

function tomorrowEntityFor(hass, sourceEntityId) {
  if (!sourceEntityId) return undefined;
  return Object.entries(hass?.states ?? {}).find(([entityId, stateObj]) => (
    isTomorrowEntity(hass, entityId, stateObj)
    && stateObj.attributes?.kildesensor === sourceEntityId
  ))?.[0];
}

function badgePriceState(hass, entityId) {
  const supportEntity = supportEntityFor(hass, entityId);
  if (!supportEntity) return undefined;

  const supportState = hass.states[supportEntity];
  if (entityId === supportEntity) return supportState;
  return {
    ...supportState,
    attributes: {
      ...supportState.attributes,
      idag: supportState.attributes.original,
    },
  };
}

function badgePriceCategory(
  stateObj,
  config = {},
  timeZone,
  now = new Date(),
) {
  const display = badgeConfig(config);
  if (!display.show_background || !stateObj) return undefined;

  const prices = numberList(stateObj.attributes?.idag).length
    ? numberList(stateObj.attributes.idag)
    : numberList(stateObj.attributes?.today);
  if (!prices.length) return undefined;

  const backendHour = Number(stateObj.attributes?.gjeldende_time);
  const currentHour = Number.isInteger(backendHour)
    && backendHour >= 0
    && backendHour < prices.length
    ? backendHour
    : homeAssistantTime(now, timeZone).hour;
  if (currentHour === prices.indexOf(Math.min(...prices))) return "cheapest";
  if (currentHour === prices.indexOf(Math.max(...prices))) return "mostExpensive";
  return undefined;
}

function badgePriceColor(stateObj, config, colorType, timeZone, now = new Date()) {
  const category = badgePriceCategory(stateObj, config, timeZone, now);
  return category ? BADGE_PRICE_COLORS[category][colorType] : undefined;
}

function badgeBackground(stateObj, config = {}, timeZone, now = new Date()) {
  return badgePriceColor(stateObj, config, "background", timeZone, now);
}

function badgeForeground(stateObj, config = {}, timeZone, now = new Date()) {
  return badgePriceColor(stateObj, config, "foreground", timeZone, now);
}

function applyBadgePriceColors(badge, stateObj, config = {}, timeZone) {
  const background = badgeBackground(stateObj, config, timeZone);
  const foreground = badgeForeground(stateObj, config, timeZone);
  if (background) badge.style.setProperty("--ha-card-background", background);
  if (!foreground) return;

  badge.style.setProperty("--primary-text-color", foreground);
  badge.style.setProperty("--secondary-text-color", foreground);
  badge.style.setProperty("--badge-color", foreground);
}

function moreInfoCardConfig(hass, entityId) {
  const supportEntity = supportEntityFor(hass, entityId);
  if (!supportEntity) return undefined;

  const supportState = hass.states[supportEntity];
  const sourceEntity = supportState.attributes?.kildesensor;
  const originalPrices = entityId !== supportEntity;
  const tomorrowEntity = tomorrowEntityFor(hass, sourceEntity);
  return {
    entity: supportEntity,
    ...(tomorrowEntity ? { tomorrow_entity: tomorrowEntity } : {}),
    ...DISPLAY_DEFAULTS,
    show_line: !originalPrices,
    show_border: false,
    price_mode: originalPrices ? "original" : "supported",
  };
}

function showEntityMoreInfo(target, hass, entityId) {
  if (!entityId) return false;

  const config = moreInfoCardConfig(hass, entityId);
  if (config) {
    target.dispatchEvent(new CustomEvent("show-dialog", {
      detail: {
        dialogTag: MORE_INFO_DIALOG_TYPE,
        dialogImport: async () => undefined,
        dialogParams: { entityId, config },
      },
      bubbles: true,
      composed: true,
    }));
    return true;
  }

  target.dispatchEvent(new CustomEvent("hass-more-info", {
    detail: { entityId },
    bubbles: true,
    composed: true,
  }));
  return true;
}

function badgeActionConfig(config = {}, gesture) {
  const key = BADGE_ACTION_KEYS[gesture];
  if (!key) return { action: "none" };
  return config[key] ?? { action: BADGE_ACTION_DEFAULTS[gesture] };
}

function hasBadgeAction(config, gesture) {
  return badgeActionConfig(config, gesture)?.action !== "none";
}

function performBadgeAction(target, hass, config, gesture) {
  const actionConfig = badgeActionConfig(config, gesture);
  if (!actionConfig || actionConfig.action === "none") return false;
  if (actionConfig.action === "more-info") {
    return showEntityMoreInfo(target, hass, config.entity);
  }

  target.dispatchEvent(new CustomEvent("hass-action", {
    detail: { config, action: gesture },
    bubbles: true,
    composed: true,
  }));
  return true;
}

function displayConfig(config = {}) {
  const display = Object.fromEntries(
    Object.keys(DISPLAY_DEFAULTS).map((key) => [key, config[key] !== false]),
  );
  if (!display.show_graph) {
    for (const key of GRAPH_SUB_OPTIONS) display[key] = false;
  }
  return display;
}

function cardClass(config = {}) {
  return config.show_border === false ? "borderless" : "";
}

function cardLayout(config = {}) {
  const display = displayConfig(config);
  if (display.show_graph) return { cardSize: 9, gridRows: 7 };

  const showHead = display.show_date || display.show_heading || display.show_mean;
  const showDescription = display.show_description
    && (display.show_bars || display.show_line);
  const showFooter = showDescription || display.show_now_price;
  const compactRows = 1
    + (config.tomorrow_entity ? 1 : 0)
    + (showHead ? 1 : 0)
    + (showFooter ? 1 : 0);

  return { cardSize: compactRows, gridRows: compactRows };
}

function sensorModel(
  stateObj,
  isTomorrow = false,
  timeZone,
  now = new Date(),
  priceMode = "supported",
) {
  const attrs = stateObj?.attributes ?? {};
  const supportedPrices = numberList(isTomorrow ? attrs.stotte : attrs.idag);
  const original = numberList(isTomorrow ? attrs.pris : attrs.original);
  const primary = priceMode === "original" ? original : supportedPrices;
  const validLength = primary.length >= 23 && primary.length <= 25;
  const available = Boolean(stateObj)
    && !UNAVAILABLE_STATES.has(String(stateObj.state).toLowerCase())
    && validLength
    && supportedPrices.length === original.length;

  const haTime = homeAssistantTime(now, attrs.tidssone || timeZone);
  const backendDate = calendarDate(attrs.dato);
  const backendHour = Number(attrs.gjeldende_time);

  let average = priceMode === "original"
    ? Number(isTomorrow ? attrs.snitt : NaN)
    : Number(isTomorrow ? stateObj?.state : attrs.snittpris);
  if (!Number.isFinite(average) && primary.length) {
    average = primary.reduce((sum, value) => sum + value, 0) / primary.length;
  }

  const currentHour = !isTomorrow && available
    ? Math.min(
      Number.isInteger(backendHour) && backendHour >= 0 && backendHour <= 23
        ? backendHour
        : haTime.hour,
      primary.length - 1,
    )
    : null;

  return {
    title: isTomorrow ? "Strømpris i morgen" : "Strømpris i dag",
    date: dayLabel(
      backendDate || haTime,
      backendDate ? 0 : (isTomorrow ? 1 : 0),
    ),
    supported: available ? primary : [],
    original: available ? original : [],
    average,
    averageLabel: priceMode === "original"
      ? "Snittpris"
      : "Snitt etter støtte",
    primaryLabel: priceMode === "original"
      ? "Uten strømstøtte"
      : "Etter strømstøtte",
    currentHour,
    available,
  };
}

class NordpoolPriceCard extends HTMLElement {
  static getConfigElement() {
    return document.createElement("nordpool-price-card-editor");
  }

  static getStubConfig(hass) {
    const entity = Object.keys(hass?.states ?? {})
      .find((entityId) => isTodayState(hass.states[entityId]));
    return entity ? { entity, ...DISPLAY_DEFAULTS } : { ...DISPLAY_DEFAULTS };
  }

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._hass = undefined;
    this._config = undefined;
    this._period = "today";
    this._chartFrame = undefined;
    this._chartState = undefined;
    this._resizeObserver = typeof ResizeObserver === "undefined"
      ? undefined
      : new ResizeObserver(() => this._scheduleChart());
  }

  connectedCallback() {
    this._resizeObserver?.observe(this);
  }

  disconnectedCallback() {
    this._resizeObserver?.disconnect();
    if (this._chartFrame !== undefined && typeof cancelAnimationFrame === "function") {
      cancelAnimationFrame(this._chartFrame);
    }
    this._chartFrame = undefined;
  }

  setConfig(config) {
    this._config = { ...config };
    if (!this._config.tomorrow_entity) this._period = "today";
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  getCardSize() {
    return cardLayout(this._config).cardSize;
  }

  getGridOptions() {
    const { gridRows } = cardLayout(this._config);
    return {
      rows: gridRows,
      columns: 12,
      min_rows: gridRows,
      min_columns: 6,
    };
  }

  _render() {
    if (!this._config || !this._hass) return;

    const hasTomorrow = Boolean(this._config.tomorrow_entity);
    if (!hasTomorrow) this._period = "today";
    const isTomorrow = this._period === "tomorrow";
    const activeEntity = isTomorrow
      ? this._config.tomorrow_entity
      : this._config.entity;
    const stateObj = activeEntity
      ? this._hass.states[activeEntity]
      : undefined;
    const model = sensorModel(
      stateObj,
      isTomorrow,
      this._hass.config?.time_zone,
      undefined,
      this._config.price_mode,
    );
    const display = displayConfig(this._config);
    const showHead = display.show_date || display.show_heading || display.show_mean;
    const showDescription = display.show_description
      && (display.show_bars || display.show_line);
    const showFooter = showDescription || display.show_now_price;

    this.shadowRoot.innerHTML = `
      <style>${styles}</style>
      <ha-card class="${cardClass(this._config)}" aria-label="Nordpool priskort">
        ${hasTomorrow ? `<nav class="period-switch" aria-label="Velg prisdag">
          <button class="period-button${isTomorrow ? "" : " active"}" type="button" data-period="today" aria-pressed="${!isTomorrow}">I dag</button>
          <button class="period-button${isTomorrow ? " active" : ""}" type="button" data-period="tomorrow" aria-pressed="${isTomorrow}">I morgen</button>
        </nav>` : ""}
        ${showHead ? `<div class="card-head">
          ${display.show_date || display.show_heading ? `<div>
            ${display.show_date ? `<div class="eyebrow">${model.date}</div>` : ""}
            ${display.show_heading ? `<h2>${model.title}</h2>` : ""}
          </div>` : ""}
          ${display.show_mean ? `<div class="average">
            <span class="eyebrow">${model.averageLabel}</span>
            <strong>${model.available ? priceText(model.average) : "Kommer"}</strong>
          </div>` : ""}
        </div>` : ""}
        ${display.show_graph ? `<div class="chart-wrap">
          <svg role="img" aria-label="Pris time for time"></svg>
        </div>` : ""}
        ${showFooter ? `<div class="legend">
          ${showDescription && display.show_bars
            ? `<span class="legend-item"><i class="legend-bar"></i>${model.primaryLabel}</span>`
            : ""}
          ${showDescription && display.show_line
            ? `<span class="legend-item"><i class="legend-line"></i>Uten strømstøtte</span>`
            : ""}
          ${display.show_now_price ? `<span class="now-price"></span>` : ""}
        </div>` : ""}
      </ha-card>
      <div class="tooltip"></div>
    `;

    for (const button of this.shadowRoot.querySelectorAll(".period-button")) {
      button.addEventListener("click", () => {
        this._period = button.dataset.period;
        this._render();
      });
    }

    const detail = this.shadowRoot.querySelector(".now-price");
    if (detail) {
      if (!model.available) {
        detail.textContent = "Nå: —";
      } else if (model.currentHour === null) {
        detail.textContent = `Lavest: ${priceText(Math.min(...model.supported))}/kWh`;
      } else {
        detail.textContent = `Nå: ${priceText(model.supported[model.currentHour])}/kWh`;
      }
    }

    this._chartState = display.show_graph ? { model, display } : undefined;
    this._scheduleChart();
  }

  _scheduleChart() {
    if (!this._chartState || !this.shadowRoot.querySelector("svg")) return;
    if (this._chartFrame !== undefined && typeof cancelAnimationFrame === "function") {
      cancelAnimationFrame(this._chartFrame);
    }
    if (typeof requestAnimationFrame !== "function") {
      this._drawChart(this._chartState.model, this._chartState.display);
      return;
    }
    this._chartFrame = requestAnimationFrame(() => {
      this._chartFrame = undefined;
      if (this._chartState) {
        this._drawChart(this._chartState.model, this._chartState.display);
      }
    });
  }

  _drawChart(model, display) {
    const svg = this.shadowRoot.querySelector("svg");
    const tooltip = this.shadowRoot.querySelector(".tooltip");
    if (!svg || !tooltip) return;
    svg.replaceChildren();
    const bounds = svg.getBoundingClientRect();
    const width = Math.max(Math.round(bounds.width), 280);
    const height = Math.max(Math.round(bounds.height), 180);
    const margin = { top: 18, right: 6, bottom: 30, left: 38 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    const visibleValues = [];
    if (display.show_bars) visibleValues.push(...model.supported);
    if (display.show_line) visibleValues.push(...model.original);
    if (display.show_mean_graph && Number.isFinite(model.average)) {
      visibleValues.push(model.average);
    }
    const values = model.available && visibleValues.length ? visibleValues : [0, 2];
    const minimum = Math.min(0, ...values);
    const maximum = Math.max(0, ...values);
    const padding = Math.max((maximum - minimum) * .08, .12);
    const yMin = model.available ? Math.floor((minimum - padding) * 2) / 2 : 0;
    const yMax = model.available ? Math.ceil((maximum + padding) * 2) / 2 : 2;
    const range = Math.max(yMax - yMin, .5);
    const ticks = 4;
    const hours = model.available ? model.supported.length : 24;
    const slot = innerWidth / hours;
    const barWidth = Math.max(5, slot * .63);
    const x = (index) => margin.left + index * slot + slot / 2;
    const y = (value) => margin.top + innerHeight - ((value - yMin) / range) * innerHeight;
    const zeroY = y(Math.min(yMax, Math.max(yMin, 0)));

    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");

    for (let index = 0; index <= ticks; index += 1) {
      const value = yMin + range * index / ticks;
      const lineY = y(value);
      svg.append(svgNode("line", {
        x1: margin.left,
        y1: lineY,
        x2: width - margin.right,
        y2: lineY,
        class: Math.abs(value) < .0001 ? "zero-line" : "grid-line",
      }));
      const label = svgNode("text", {
        x: margin.left - 8,
        y: lineY + 3,
        class: "axis-label",
        "text-anchor": "end",
      });
      label.textContent = value.toFixed(1).replace(".", ",");
      svg.append(label);
    }

    for (let index = 0; index < hours; index += 2) {
      const label = svgNode("text", {
        x: x(index),
        y: height - 12,
        class: "hour-label",
      });
      label.textContent = String(index).padStart(2, "0");
      svg.append(label);
    }

    if (!model.available) return;

    if (display.show_mean_graph && Number.isFinite(model.average)) {
      const meanY = y(model.average);
      svg.append(svgNode("line", {
        x1: margin.left,
        y1: meanY,
        x2: width - margin.right,
        y2: meanY,
        class: "mean-line",
      }));
      svg.append(svgNode("rect", {
        x: width - margin.right - 37,
        y: meanY - 16,
        width: 37,
        height: 14,
        rx: 3,
        class: "mean-label-bg",
      }));
      const meanLabel = svgNode("text", {
        x: width - margin.right - 3,
        y: meanY - 6,
        class: "mean-label",
      });
      meanLabel.textContent = "SNITT";
      svg.append(meanLabel);
    }

    if (display.show_bars) {
      model.supported.forEach((value, index) => {
        const valueY = y(value);
        const rect = svgNode("rect", {
          x: x(index) - barWidth / 2,
          y: Math.min(valueY, zeroY),
          width: barWidth,
          height: Math.max(Math.abs(zeroY - valueY), 1),
          rx: 2.5,
          class: `bar${display.show_now_graph && index === model.currentHour ? " current" : ""}`,
        });
        svg.append(rect);
      });
    }

    if (display.show_now_graph && model.currentHour !== null) {
      const now = svgNode("text", {
        x: x(model.currentHour),
        y: margin.top + 10,
        class: "now-label",
      });
      now.textContent = "NÅ";
      svg.append(now);
    }

    if (display.show_line) {
      const linePath = model.original
        .map((value, index) => `${index ? "L" : "M"} ${x(index)} ${y(value)}`)
        .join(" ");
      svg.append(svgNode("path", { d: linePath, class: "price-line" }));
    }

    if (!display.show_bars && !display.show_line) return;

    model.original.forEach((value, index) => {
      const hit = svgNode("rect", {
        x: margin.left + index * slot,
        y: margin.top,
        width: slot,
        height: innerHeight,
        fill: "transparent",
        class: "chart-hit",
      });
      const dot = svgNode("circle", {
        cx: x(index),
        cy: y(value),
        r: 3.5,
        class: "line-dot",
      });

      hit.addEventListener("pointermove", (event) => {
        const start = String(index).padStart(2, "0");
        const stop = String((index + 1) % 24).padStart(2, "0");
        tooltip.innerHTML = `
          <strong>${start}:00–${stop}:00</strong>
          ${display.show_bars
            ? `<span class="tooltip-row">${model.primaryLabel} <b>${priceText(model.supported[index])}</b></span>`
            : ""}
          ${display.show_line
            ? `<span class="tooltip-row">Uten støtte <b>${priceText(value)}</b></span>`
            : ""}`;
        tooltip.style.left = `${event.clientX}px`;
        tooltip.style.top = `${event.clientY}px`;
        tooltip.classList.add("visible");
      });
      hit.addEventListener("pointerleave", () => tooltip.classList.remove("visible"));
      svg.append(hit);
      if (display.show_line) svg.append(dot);
    });
  }
}

function createSensorPicker(hass, value, labelText, helperText, entities, required = false) {
  if (customElements.get("ha-entity-picker")) {
    const picker = document.createElement("ha-entity-picker");
    picker.hass = hass;
    picker.value = value || "";
    picker.label = labelText;
    picker.helper = helperText;
    picker.required = required;
    picker.includeDomains = ["sensor"];
    picker.includeEntities = entities;
    return { element: picker, control: picker, eventName: "value-changed" };
  }

  // HA laster enkelte redigeringskomponenter bare når andre visninger åpnes.
  // Et vanlig select-felt må derfor fungere selv om ha-entity-picker uteblir.
  const label = document.createElement("label");
  label.className = "native-field";
  const title = document.createElement("span");
  title.textContent = labelText;
  const select = document.createElement("select");
  select.required = required;
  for (const entityId of ["", ...entities]) {
    const option = document.createElement("option");
    option.value = entityId;
    option.textContent = entityId
      ? `${hass.states[entityId]?.attributes?.friendly_name || entityId} (${entityId})`
      : "Velg sensor";
    select.append(option);
  }
  select.value = value || "";
  const helper = document.createElement("small");
  helper.textContent = helperText;
  label.append(title, select, helper);
  return { element: label, control: select, eventName: "change" };
}

function sensorPickerValue(event) {
  return event.detail?.value ?? event.target.value;
}

class NordpoolPriceCardEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._config = {};
    this._hass = undefined;
    this._nameExpanded = false;
  }

  setConfig(config) {
    this._config = { ...config };
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  _render() {
    if (!this._hass) return;

    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; padding: 8px 0; }
        .sensor-field + .sensor-field { margin-top: 16px; }
        ha-entity-picker { display: block; width: 100%; }
        .native-field { display: grid; gap: 6px; color: var(--primary-text-color); font-size: 14px; }
        .native-field select { width: 100%; min-height: 40px; color: inherit; background: var(--card-background-color); border: 1px solid var(--divider-color); border-radius: 5px; padding: 0 8px; }
        .native-field small { color: var(--secondary-text-color); }
        .loading,
        .empty {
          margin: 8px 0 0;
          color: var(--secondary-text-color);
          font-size: 12px;
        }
        fieldset {
          margin: 18px 0 0;
          padding: 0;
          border: 0;
        }
        legend {
          margin-bottom: 9px;
          color: var(--primary-text-color);
          font-size: 14px;
          font-weight: 650;
        }
        .option {
          display: flex;
          align-items: center;
          gap: 10px;
          min-height: 38px;
          margin: 0;
          color: var(--primary-text-color);
          font-size: 14px;
          font-weight: 400;
          cursor: pointer;
        }
        .option.sub-option { padding-left: 26px; }
        .option input {
          width: 18px;
          height: 18px;
          margin: 0;
          accent-color: var(--primary-color);
        }
      </style>
      <div class="sensor-field" id="today-field"></div>
      <div class="sensor-field" id="tomorrow-field"></div>
      <fieldset>
        <legend>Vis i kortet</legend>
        <div class="display-options"></div>
      </fieldset>
    `;

    const stateEntries = Object.entries(this._hass.states);
    const todayEntities = stateEntries
      .filter(([, stateObj]) => isTodayState(stateObj))
      .map(([entityId]) => entityId)
      .sort((left, right) => left.localeCompare(right, "nb"));
    const tomorrowEntities = stateEntries
      .filter(([entityId, stateObj]) => (
        isTomorrowEntity(this._hass, entityId, stateObj)
      ))
      .map(([entityId]) => entityId)
      .sort((left, right) => left.localeCompare(right, "nb"));

    if (this._config.entity && !todayEntities.includes(this._config.entity)) {
      todayEntities.push(this._config.entity);
    }
    if (this._config.tomorrow_entity
      && !tomorrowEntities.includes(this._config.tomorrow_entity)) {
      tomorrowEntities.push(this._config.tomorrow_entity);
    }

    const todayPicker = createSensorPicker(
      this._hass, this._config.entity, "Strømstøttesensor",
      "Påkrevd · brukes til prisene for i dag", todayEntities, true,
    );
    this.shadowRoot.querySelector("#today-field").append(todayPicker.element);

    const tomorrowPicker = createSensorPicker(
      this._hass, this._config.tomorrow_entity, "I morgen-sensor",
      "Valgfri · viser valget mellom I dag og I morgen", tomorrowEntities,
    );
    this.shadowRoot.querySelector("#tomorrow-field").append(tomorrowPicker.element);

    if (!todayEntities.length) {
      const message = document.createElement("p");
      message.className = "empty";
      message.textContent = "Ingen kompatibel strømstøttesensor ble funnet.";
      this.shadowRoot.querySelector("#today-field").append(message);
    }

    todayPicker.control.addEventListener(todayPicker.eventName, (event) => {
      const entity = sensorPickerValue(event);
      const config = { ...this._config };
      if (entity) config.entity = entity;
      else delete config.entity;
      this._config = config;
      this.dispatchEvent(new CustomEvent("config-changed", {
        detail: { config },
        bubbles: true,
        composed: true,
      }));
    });

    tomorrowPicker.control.addEventListener(tomorrowPicker.eventName, (event) => {
      const tomorrowEntity = sensorPickerValue(event);
      const config = { ...this._config };
      if (tomorrowEntity) config.tomorrow_entity = tomorrowEntity;
      else delete config.tomorrow_entity;
      this._config = config;
      this.dispatchEvent(new CustomEvent("config-changed", {
        detail: { config },
        bubbles: true,
        composed: true,
      }));
    });

    this._renderDisplayOptions();
  }

  _renderDisplayOptions() {
    const container = this.shadowRoot.querySelector(".display-options");
    if (!container) return;

    const display = displayConfig(this._config);
    for (const [key, labelText] of DISPLAY_OPTIONS) {
      if (GRAPH_SUB_OPTIONS.has(key) && !display.show_graph) continue;

      const label = document.createElement("label");
      label.className = `option${GRAPH_SUB_OPTIONS.has(key) ? " sub-option" : ""}`;
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = display[key];
      checkbox.dataset.option = key;
      label.append(checkbox, document.createTextNode(labelText));
      container.append(label);

      checkbox.addEventListener("change", () => {
        const config = { ...this._config, [key]: checkbox.checked };
        if (key === "show_graph" && !checkbox.checked) {
          for (const graphKey of GRAPH_SUB_OPTIONS) config[graphKey] = false;
        }
        this._config = config;
        this.dispatchEvent(new CustomEvent("config-changed", {
          detail: { config },
          bubbles: true,
          composed: true,
        }));
        this._render();
      });
    }
  }
}

class NordpoolBadge extends HTMLElement {
  static getConfigElement() {
    return document.createElement("nordpool-badge-editor");
  }

  static getStubConfig(hass) {
    const stateEntries = Object.entries(hass?.states ?? {});
    const entity = stateEntries
      .find(([, stateObj]) => isTodayState(stateObj))?.[0];
    const sourceEntity = stateEntries
      .find(([entityId, stateObj]) => (
        isNordpoolSourceEntity(hass, entityId, stateObj)
      ))?.[0];
    return {
      ...BADGE_DEFAULTS,
      ...(entity ? { entity } : sourceEntity ? { entity: sourceEntity } : {}),
    };
  }

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._hass = undefined;
    this._config = undefined;
    this._tapTimer = undefined;
    this._holdTimer = undefined;
    this._holdTriggered = false;
  }

  disconnectedCallback() {
    this._clearActionTimers();
  }

  setConfig(config) {
    this._config = { ...config };
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  _render() {
    if (!this._config || !this._hass) return;

    const stateObj = this._config.entity
      ? this._hass.states[this._config.entity]
      : undefined;
    const priceStateObj = badgePriceState(this._hass, this._config.entity);
    const display = badgeConfig(this._config);
    const timeZone = priceStateObj?.attributes?.tidssone
      || stateObj?.attributes?.tidssone
      || this._hass.config?.time_zone;
    const label = badgeLabel(this._config, timeZone);

    this.shadowRoot.innerHTML = `
      <ha-badge>
        <ha-state-icon slot="icon"></ha-state-icon>
        <span class="state"></span>
      </ha-badge>
    `;

    const badge = this.shadowRoot.querySelector("ha-badge");
    badge.type = "button";
    badge.label = label || undefined;
    badge.setAttribute(
      "aria-label",
      [label, badgeStateText(stateObj, display.unit)].filter(Boolean).join(" "),
    );
    applyBadgePriceColors(badge, priceStateObj, this._config, timeZone);
    badge.addEventListener("click", () => {
      if (this._holdTriggered) {
        this._holdTriggered = false;
        return;
      }
      if (hasBadgeAction(this._config, "double_tap")) {
        clearTimeout(this._tapTimer);
        this._tapTimer = setTimeout(() => {
          this._tapTimer = undefined;
          performBadgeAction(this, this._hass, this._config, "tap");
        }, 250);
        return;
      }
      performBadgeAction(this, this._hass, this._config, "tap");
    });
    badge.addEventListener("dblclick", (event) => {
      if (!hasBadgeAction(this._config, "double_tap")) return;
      event.preventDefault();
      clearTimeout(this._tapTimer);
      this._tapTimer = undefined;
      performBadgeAction(this, this._hass, this._config, "double_tap");
    });
    badge.addEventListener("pointerdown", () => {
      if (!hasBadgeAction(this._config, "hold")) return;
      clearTimeout(this._holdTimer);
      this._holdTimer = setTimeout(() => {
        this._holdTimer = undefined;
        this._holdTriggered = true;
        performBadgeAction(this, this._hass, this._config, "hold");
      }, 500);
    });
    for (const eventName of ["pointerup", "pointercancel", "pointerleave"]) {
      badge.addEventListener(eventName, () => {
        clearTimeout(this._holdTimer);
        this._holdTimer = undefined;
      });
    }
    badge.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      performBadgeAction(this, this._hass, this._config, "tap");
    });

    const icon = this.shadowRoot.querySelector("ha-state-icon");
    icon.stateObj = stateObj;
    if (this._config.icon) icon.icon = this._config.icon;
    this.shadowRoot.querySelector(".state").textContent = badgeStateText(
      stateObj,
      display.unit,
    );
  }

  _clearActionTimers() {
    clearTimeout(this._tapTimer);
    clearTimeout(this._holdTimer);
    this._tapTimer = undefined;
    this._holdTimer = undefined;
  }
}

class NordpoolPriceMoreInfo extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._hass = undefined;
    this._params = undefined;
    this._open = false;
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  showDialog(params) {
    this._params = params;
    this._open = true;
    this._render();
  }

  closeDialog() {
    if (!this._open) return;
    this._open = false;
    this.shadowRoot.replaceChildren();
    this.dispatchEvent(new CustomEvent("dialog-closed", {
      bubbles: true,
      composed: true,
    }));
  }

  _render() {
    if (!this._open || !this._hass || !this._params) return;

    this.shadowRoot.innerHTML = `
      <style>
        ha-dialog {
          --dialog-content-padding: 0;
          --mdc-dialog-min-width: min(720px, 92vw);
          --mdc-dialog-max-width: min(720px, 92vw);
        }
        nordpool-price-card {
          display: block;
          min-height: 430px;
        }
        @media (max-width: 600px) {
          nordpool-price-card { min-height: 390px; }
        }
      </style>
      <ha-dialog open></ha-dialog>
    `;

    const dialog = this.shadowRoot.querySelector("ha-dialog");
    const stateObj = this._hass.states[this._params.entityId];
    dialog.hass = this._hass;
    dialog.open = true;
    dialog.setAttribute(
      "header-title",
      stateObj?.attributes?.friendly_name || "Strømpris",
    );
    dialog.addEventListener("closed", () => this.closeDialog());

    const card = document.createElement(CARD_TYPE);
    card.setConfig(this._params.config);
    card.hass = this._hass;
    dialog.append(card);
  }
}

class NordpoolBadgeEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._config = {};
    this._hass = undefined;
  }

  setConfig(config) {
    this._config = { ...config };
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  _render() {
    if (!this._hass) return;

    const entities = Object.entries(this._hass.states)
      .filter(([entityId, stateObj]) => (
        isBadgeEntity(this._hass, entityId, stateObj)
      ))
      .map(([entityId]) => entityId)
      .sort((left, right) => left.localeCompare(right, "nb"));
    if (this._config.entity && !entities.includes(this._config.entity)) {
      entities.push(this._config.entity);
    }

    const display = badgeConfig(this._config);
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; padding: 8px 0; }
        ha-entity-picker,
        ha-icon-picker,
        ha-select { display: block; width: 100%; margin-top: 16px; }
        .sensor-field,
        .icon-field,
        .unit-field { margin-top: 16px; }
        .native-field { display: grid; gap: 6px; color: var(--primary-text-color); font-size: 14px; }
        .native-field select,
        .native-field input { width: 100%; min-height: 40px; box-sizing: border-box; color: inherit; background: var(--card-background-color); border: 1px solid var(--divider-color); border-radius: 5px; padding: 0 8px; }
        .native-field small { color: var(--secondary-text-color); }
        .name-editor {
          margin-top: 18px;
        }
        .name-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 12px;
        }
        .name-head h3 {
          margin: 0;
          color: var(--primary-text-color);
          font-size: 16px;
          font-weight: 500;
        }
        .name-mode {
          display: grid;
          grid-template-columns: 1fr 1fr;
          padding: 2px;
          border-radius: 24px;
          background: color-mix(in srgb, var(--primary-text-color) 8%, transparent);
        }
        .name-mode button {
          min-height: 40px;
          padding: 0 18px;
          border: 0;
          border-radius: 22px;
          background: transparent;
          color: var(--primary-color);
          font: inherit;
          font-weight: 500;
          cursor: pointer;
        }
        .name-mode button.active {
          background: var(--primary-color);
          color: var(--text-primary-color, white);
        }
        .name-content {
          min-height: 92px;
          padding: 14px;
          border-bottom: 1px solid var(--divider-color);
          background: color-mix(in srgb, var(--primary-text-color) 5%, transparent);
        }
        .name-parts {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 12px;
        }
        .name-part {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          min-height: 36px;
          padding: 0 8px 0 13px;
          border: 1px solid var(--divider-color);
          border-radius: 18px;
          background: var(--card-background-color);
          color: var(--primary-text-color);
        }
        .remove-part {
          width: 28px;
          height: 28px;
          padding: 0;
          border: 0;
          border-radius: 50%;
          background: transparent;
          color: var(--secondary-text-color);
          cursor: pointer;
        }
        .add-name-part {
          position: relative;
          display: inline-block;
        }
        .add-name-part summary {
          display: inline-flex;
          align-items: center;
          gap: 9px;
          min-height: 42px;
          padding: 0 16px;
          border: 1px solid var(--divider-color);
          border-radius: 22px;
          color: var(--primary-text-color);
          cursor: pointer;
          list-style: none;
        }
        .add-name-part summary::-webkit-details-marker { display: none; }
        .add-name-part-menu {
          position: absolute;
          z-index: 2;
          top: calc(100% + 5px);
          left: 0;
          min-width: 180px;
          padding: 6px 0;
          border: 1px solid var(--divider-color);
          border-radius: 10px;
          background: var(--card-background-color);
          box-shadow: var(--ha-card-box-shadow, 0 5px 18px rgba(0, 0, 0, .3));
        }
        .add-name-part-menu button {
          display: block;
          width: 100%;
          min-height: 40px;
          padding: 0 14px;
          border: 0;
          background: transparent;
          color: var(--primary-text-color);
          font: inherit;
          text-align: left;
          cursor: pointer;
        }
        .add-name-part-menu button:hover {
          background: color-mix(in srgb, var(--primary-text-color) 8%, transparent);
        }
        .all-parts-added {
          color: var(--secondary-text-color);
          font-size: 13px;
        }
        .custom-name { display: block; width: 100%; box-sizing: border-box; margin-top: 2px; }
        @media (max-width: 460px) {
          .name-head { align-items: stretch; flex-direction: column; }
          .name-mode { width: 100%; }
        }
        .switch-option {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-top: 18px;
          color: var(--primary-text-color);
          font-size: 14px;
          cursor: pointer;
        }
        .actions-panel {
          display: block;
          margin-top: 18px;
          --expansion-panel-summary-padding: 4px 14px;
          --expansion-panel-content-padding: 0 14px 14px;
        }
        .actions-panel ha-icon {
          color: var(--secondary-text-color);
        }
        .actions-panel h3 {
          margin: 0;
          font-size: 16px;
          font-weight: 500;
        }
        .actions-content { padding-top: 8px; }
        details.actions-panel { border: 1px solid var(--divider-color); border-radius: 8px; padding: 12px 14px; }
        details.actions-panel summary { cursor: pointer; color: var(--primary-text-color); }
        .native-actions { display: grid; gap: 14px; padding-top: 14px; }
      </style>
      <div class="sensor-field"></div>
      <section class="name-editor" aria-labelledby="badge-name-heading">
        <div class="name-head">
          <h3 id="badge-name-heading">Navn</h3>
          <div class="name-mode" role="group" aria-label="Navnetype">
            <button type="button" data-name-mode="composed">Sammensatt</button>
            <button type="button" data-name-mode="custom">Egendefinert</button>
          </div>
        </div>
        <div class="name-content"></div>
      </section>
      <div class="icon-field"></div>
      <label class="switch-option">
        <span>Vis prisbasert bakgrunn</span>
        ${customElements.get("ha-switch")
          ? '<ha-switch class="background-switch"></ha-switch>'
          : '<input class="background-switch" type="checkbox">'}
      </label>
      <div class="unit-field"></div>
      ${customElements.get("ha-expansion-panel")
          ? '<ha-expansion-panel class="actions-panel" outlined><ha-icon slot="leading-icon" icon="mdi:format-list-bulleted"></ha-icon><h3 slot="header">Funksjoner</h3><div class="actions-content"></div></ha-expansion-panel>'
          : '<details class="actions-panel"><summary>Funksjoner</summary><div class="actions-content"></div></details>'}
    `;
    const picker = createSensorPicker(
      this._hass, this._config.entity, "Prissensor",
      "Nord Pool-sensor eller integrasjonens strømstøttesensor", entities, true,
    );
    this.shadowRoot.querySelector(".sensor-field").append(picker.element);
    picker.control.addEventListener(picker.eventName, (event) => {
      const config = badgeEntityConfig(this._config, sensorPickerValue(event));
      this._config = config;
      this.dispatchEvent(new CustomEvent("config-changed", {
        detail: { config },
        bubbles: true,
        composed: true,
      }));
    });

    this._renderNameEditor(display);

    const backgroundSwitch = this.shadowRoot.querySelector(".background-switch");
    backgroundSwitch.checked = display.show_background;
    backgroundSwitch.addEventListener("change", () => {
      this._changeConfig({ show_background: backgroundSwitch.checked });
    });

    const selectedState = this._config.entity
      ? this._hass.states[this._config.entity]
      : undefined;
    const nativeIcon = !customElements.get("ha-icon-picker");
    const iconPicker = document.createElement(nativeIcon ? "input" : "ha-icon-picker");
    if (nativeIcon) {
      iconPicker.type = "text";
      iconPicker.placeholder = selectedState?.attributes?.icon || "mdi:ab-testing";
      const label = document.createElement("label");
      label.className = "native-field";
      const title = document.createElement("span");
      title.textContent = "Ikon";
      const helper = document.createElement("small");
      helper.textContent = "Tomt valg bruker ikonet til den valgte entiteten";
      label.append(title, iconPicker, helper);
      this.shadowRoot.querySelector(".icon-field").append(label);
    } else {
      iconPicker.placeholder = selectedState?.attributes?.icon;
      iconPicker.label = "Ikon";
      iconPicker.helper = "Tomt valg bruker ikonet til den valgte entiteten";
      this.shadowRoot.querySelector(".icon-field").append(iconPicker);
    }
    iconPicker.value = this._config.icon || "";
    iconPicker.addEventListener(nativeIcon ? "change" : "value-changed", (event) => {
      const config = { ...this._config };
      const value = nativeIcon ? event.target.value : event.detail.value;
      if (value) config.icon = value;
      else delete config.icon;
      this._setConfig(config);
    });

    const nativeUnit = !customElements.get("ha-select");
    const unitPicker = document.createElement(nativeUnit ? "select" : "ha-select");
    if (nativeUnit) {
      const label = document.createElement("label");
      label.className = "native-field";
      const title = document.createElement("span");
      title.textContent = "Enhet";
      label.append(title, unitPicker);
      for (const unit of BADGE_UNITS) {
        const option = document.createElement("option");
        option.value = unit;
        option.textContent = unit;
        unitPicker.append(option);
      }
      this.shadowRoot.querySelector(".unit-field").append(label);
    } else {
      unitPicker.label = "Enhet";
      unitPicker.options = BADGE_UNITS.map((unit) => ({ value: unit, label: unit }));
      this.shadowRoot.querySelector(".unit-field").append(unitPicker);
    }
    unitPicker.value = display.unit;
    unitPicker.addEventListener(nativeUnit ? "change" : "selected", (event) => {
      this._changeConfig({ unit: nativeUnit ? event.target.value : event.detail.value });
    });

    this._renderActionsEditor();
  }

  _renderActionsEditor() {
    const panel = this.shadowRoot.querySelector(".actions-panel");
    if (panel.tagName === "DETAILS") {
      panel.open = Boolean(this._actionsExpanded);
      panel.addEventListener("toggle", () => { this._actionsExpanded = panel.open; });
    } else {
      panel.expanded = this._actionsExpanded;
      panel.addEventListener("expanded-changed", (event) => {
        this._actionsExpanded = event.detail.expanded;
      });
    }

    const container = this.shadowRoot.querySelector(".actions-content");
    const labels = {
      tap_action: "Tap",
      double_tap_action: "Double tap",
      hold_action: "Hold",
    };
    if (!customElements.get("ha-form")) {
      const fallback = document.createElement("div");
      fallback.className = "native-actions";
      for (const [key, labelText] of Object.entries(labels)) {
        const label = document.createElement("label");
        label.className = "native-field";
        const title = document.createElement("span");
        title.textContent = labelText;
        const select = document.createElement("select");
        const original = this._config[key];
        const current = original?.action || BADGE_ACTION_DEFAULTS[
          Object.keys(BADGE_ACTION_KEYS).find((gesture) => BADGE_ACTION_KEYS[gesture] === key)
        ];
        for (const [value, text] of [["more-info", "Mer info"], ["none", "Ingenting"]]) {
          const option = document.createElement("option");
          option.value = value;
          option.textContent = text;
          select.append(option);
        }
        if (!["more-info", "none"].includes(current)) {
          const option = document.createElement("option");
          option.value = current;
          option.textContent = `${current} (eksisterende valg)`;
          select.append(option);
        }
        select.value = current;
        select.addEventListener("change", () => {
          this._changeConfig({
            [key]: select.value === current && original
              ? original
              : { action: select.value },
          });
        });
        label.append(title, select);
        fallback.append(label);
      }
      container.append(fallback);
      return;
    }

    const form = document.createElement("ha-form");
    form.hass = this._hass;
    form.data = {
      entity: this._config.entity,
      tap_action: badgeActionConfig(this._config, "tap"),
      double_tap_action: badgeActionConfig(this._config, "double_tap"),
      hold_action: badgeActionConfig(this._config, "hold"),
    };
    const actions = ["more-info", "navigate", "url", "perform-action", "assist", "none"];
    form.schema = [
      {
        name: "tap_action",
        selector: { ui_action: { actions, default_action: "more-info" } },
      },
      {
        name: "double_tap_action",
        selector: { ui_action: { actions, default_action: "none" } },
      },
      {
        name: "hold_action",
        selector: { ui_action: { actions, default_action: "none" } },
      },
    ];
    form.computeLabel = (schema) => labels[schema.name] || schema.name;
    form.addEventListener("value-changed", (event) => {
      const value = event.detail.value;
      this._setConfig({
        ...this._config,
        tap_action: value.tap_action,
        double_tap_action: value.double_tap_action,
        hold_action: value.hold_action,
      });
    });
    container.append(form);
  }

  _renderNameEditor(display = badgeConfig(this._config)) {
    const custom = typeof this._config.name === "string";
    for (const button of this.shadowRoot.querySelectorAll("[data-name-mode]")) {
      const active = button.dataset.nameMode === (custom ? "custom" : "composed");
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
      button.addEventListener("click", () => {
        const config = { ...this._config };
        if (button.dataset.nameMode === "custom") config.name = "";
        else delete config.name;
        this._setConfig(config);
        this._render();
      });
    }

    const content = this.shadowRoot.querySelector(".name-content");
    if (custom) {
      const inputTag = customElements.get("ha-input")
        ? "ha-input"
        : customElements.get("ha-textfield")
          ? "ha-textfield"
          : "input";
      const native = inputTag === "input";
      const field = document.createElement(inputTag);
      field.className = "custom-name";
      if (native) {
        field.type = "text";
        field.setAttribute("aria-label", "Egendefinert navn");
      } else {
        field.label = "Egendefinert navn";
      }
      field.value = this._config.name;
      field.addEventListener("input", (event) => {
        this._changeConfig({ name: event.currentTarget.value });
      });
      content.append(field);
      return;
    }

    const options = [
      ["show_price", "Pris"],
      ["show_time_range", "Tid nå"],
    ];
    const selected = options.filter(([key]) => display[key]);
    const available = options.filter(([key]) => !display[key]);

    if (selected.length) {
      const parts = document.createElement("div");
      parts.className = "name-parts";
      for (const [key, label] of selected) {
        const part = document.createElement("span");
        part.className = "name-part";
        part.append(document.createTextNode(label));
        const remove = document.createElement("button");
        remove.className = "remove-part";
        remove.type = "button";
        remove.setAttribute("aria-label", `Fjern ${label}`);
        remove.textContent = "×";
        remove.addEventListener("click", () => {
          this._changeConfig({ [key]: false });
          this._render();
        });
        part.append(remove);
        parts.append(part);
      }
      content.append(parts);
    }

    if (!available.length) {
      const message = document.createElement("span");
      message.className = "all-parts-added";
      message.textContent = "Alle navnedeler er lagt til";
      content.append(message);
      return;
    }

    const add = document.createElement("details");
    add.className = "add-name-part";
    const summary = document.createElement("summary");
    summary.innerHTML = '<ha-icon icon="mdi:plus"></ha-icon><span>Legg til</span>';
    add.append(summary);
    const menu = document.createElement("div");
    menu.className = "add-name-part-menu";
    for (const [key, label] of available) {
      const option = document.createElement("button");
      option.type = "button";
      option.textContent = label;
      option.addEventListener("click", () => {
        this._changeConfig({ [key]: true });
        this._render();
      });
      menu.append(option);
    }
    add.append(menu);
    content.append(add);
  }

  _changeConfig(changes) {
    this._setConfig({ ...this._config, ...changes });
  }

  _setConfig(config) {
    this._config = config;
    this.dispatchEvent(new CustomEvent("config-changed", {
      detail: { config },
      bubbles: true,
      composed: true,
    }));
  }
}

function shadowRoots(root) {
  if (!root || typeof root.querySelectorAll !== "function") return [];

  const roots = [root];
  const seen = new Set(roots);
  for (let index = 0; index < roots.length; index += 1) {
    for (const element of roots[index].querySelectorAll("*")) {
      if (element.shadowRoot && !seen.has(element.shadowRoot)) {
        seen.add(element.shadowRoot);
        roots.push(element.shadowRoot);
      }
    }
  }
  return roots;
}

function recoverNordpoolBadges(root = document) {
  let recovered = 0;
  for (const searchRoot of shadowRoots(root)) {
    for (const badge of searchRoot.querySelectorAll("hui-badge")) {
      const isNordpoolBadge = badge.config?.type === `custom:${BADGE_TYPE}`;
      const hasLoadError = badge.querySelector?.("hui-error-badge");
      if (!isNordpoolBadge || !hasLoadError || typeof badge.load !== "function") {
        continue;
      }

      try {
        badge.load();
        recovered += 1;
      } catch (error) {
        console.debug("Nordpool Badge kunne ikke bygges på nytt ennå", error);
      }
    }
  }
  return recovered;
}

function recoverNordpoolBadgePickers(root = document) {
  if (!customElements.get(BADGE_TYPE)) return 0;

  let recovered = 0;
  for (const searchRoot of shadowRoots(root)) {
    for (const picker of searchRoot.querySelectorAll("hui-badge-picker")) {
      const stalled = picker.shadowRoot?.querySelector(".badge.spinner");
      if (!stalled
        || RECOVERED_BADGE_PICKERS.has(picker)
        || typeof picker._loadBages !== "function") {
        continue;
      }

      try {
        // Home Assistant beholder en avvist getBadgeStubConfig-promise i
        // velgeren. Bygg listen på nytt når custom-elementet er registrert.
        picker._loadBages();
        RECOVERED_BADGE_PICKERS.add(picker);
        recovered += 1;
      } catch (error) {
        console.debug("Nordpool Badge-velgeren kunne ikke lastes på nytt", error);
      }
    }
  }
  return recovered;
}

function scheduleBadgeRecovery() {
  if (typeof document === "undefined"
    || !document.documentElement
    || typeof window.setTimeout !== "function") {
    return;
  }

  // Home Assistant laster custom-ressurser uten å vente før badgevisningen
  // bygges. Forsøk på nytt både før og etter frontendens feiltidsavbrudd.
  for (const delay of [0, 250, 1000, 2500, 5000, 10000]) {
    window.setTimeout(() => {
      recoverNordpoolBadges(document);
      recoverNordpoolBadgePickers(document);
    }, delay);
  }
}

if (!customElements.get(CARD_TYPE)) {
  customElements.define(CARD_TYPE, NordpoolPriceCard);
}

if (!customElements.get("nordpool-price-card-editor")) {
  customElements.define("nordpool-price-card-editor", NordpoolPriceCardEditor);
}

if (!customElements.get(BADGE_TYPE)) {
  customElements.define(BADGE_TYPE, NordpoolBadge);
}

if (!customElements.get("nordpool-badge-editor")) {
  customElements.define("nordpool-badge-editor", NordpoolBadgeEditor);
}

if (!customElements.get(MORE_INFO_DIALOG_TYPE)) {
  customElements.define(MORE_INFO_DIALOG_TYPE, NordpoolPriceMoreInfo);
}

scheduleBadgeRecovery();
if (typeof window.addEventListener === "function") {
  window.addEventListener("location-changed", scheduleBadgeRecovery);
}

window.customCards = window.customCards || [];
if (!window.customCards.some((card) => card.type === CARD_TYPE)) {
  window.customCards.push({
    type: CARD_TYPE,
    name: CARD_NAME,
    description: "Timepriser før og etter beregnet strømstøtte.",
    preview: true,
    documentationURL: CARD_DOCS,
    getEntitySuggestion: (hass, entityId) => {
      const stateObj = hass.states[entityId];
      return isTodayState(stateObj)
        ? { config: { type: `custom:${CARD_TYPE}`, entity: entityId, ...DISPLAY_DEFAULTS } }
        : null;
    },
  });
}

window.customBadges = window.customBadges || [];
if (!window.customBadges.some((badge) => badge.type === BADGE_TYPE)) {
  window.customBadges.push({
    type: BADGE_TYPE,
    name: BADGE_NAME,
    description: "Viser gjeldende strømpris etter strømstøtte.",
    preview: true,
    documentationURL: BADGE_DOCS,
    getEntitySuggestion: (hass, entityId) => {
      const stateObj = hass.states[entityId];
      return isTodayState(stateObj)
        ? { config: { type: `custom:${BADGE_TYPE}`, entity: entityId } }
        : null;
    },
  });
}
