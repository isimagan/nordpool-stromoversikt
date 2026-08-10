const CARD_TYPE = "nordpool-price-card";
const CARD_NAME = "Nordpool priskort";
const CARD_DOCS = "https://github.com/isimagan/nordpool-stromoversikt#nordpool-priskort";

const SVG_NS = "http://www.w3.org/2000/svg";
const UNAVAILABLE_STATES = new Set(["unknown", "unavailable", "none", ""]);
const DISPLAY_OPTIONS = [
  ["show_date", "Vis dato"],
  ["show_mean", "Vis snittpris"],
  ["show_heading", "Vis overskrift"],
  ["show_graph", "Vis graf"],
  ["show_now_graph", "Marker gjeldende time i grafen"],
  ["show_mean_graph", "Vis snittpris i grafen"],
  ["show_description", "Vis forklaring"],
  ["show_now_price", "Vis nåpris"],
];
const DISPLAY_DEFAULTS = Object.fromEntries(
  DISPLAY_OPTIONS.map(([key]) => [key, true]),
);
const GRAPH_SUB_OPTIONS = new Set(["show_now_graph", "show_mean_graph"]);

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
  }

  .card-head {
    display: flex;
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
    height: 330px;
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

function isCompatibleState(stateObj) {
  const attrs = stateObj?.attributes ?? {};
  const has = (name) => Object.prototype.hasOwnProperty.call(attrs, name);
  return (has("idag") && has("original") && has("snittpris"))
    || (has("stotte") && has("pris") && has("snitt"));
}

function capitalize(value) {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}

function dayLabel(date) {
  return capitalize(date.toLocaleDateString("nb-NO", {
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

function displayConfig(config = {}) {
  return Object.fromEntries(
    Object.keys(DISPLAY_DEFAULTS).map((key) => [key, config[key] !== false]),
  );
}

function sensorModel(stateObj) {
  const attrs = stateObj?.attributes ?? {};
  const isTomorrow = Array.isArray(attrs.stotte) || Array.isArray(attrs.pris);
  const supported = numberList(isTomorrow ? attrs.stotte : attrs.idag);
  const original = numberList(isTomorrow ? attrs.pris : attrs.original);
  const validLength = supported.length >= 23 && supported.length <= 25;
  const available = Boolean(stateObj)
    && !UNAVAILABLE_STATES.has(String(stateObj.state).toLowerCase())
    && validLength
    && supported.length === original.length;

  const date = new Date();
  if (isTomorrow) date.setDate(date.getDate() + 1);

  let average = Number(isTomorrow ? stateObj?.state : attrs.snittpris);
  if (!Number.isFinite(average) && supported.length) {
    average = supported.reduce((sum, value) => sum + value, 0) / supported.length;
  }

  const currentHour = !isTomorrow && available
    ? Math.min(new Date().getHours(), supported.length - 1)
    : null;

  return {
    title: isTomorrow ? "Strømpris i morgen" : "Strømpris i dag",
    date: dayLabel(date),
    supported: available ? supported : [],
    original: available ? original : [],
    average,
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
      .find((entityId) => isCompatibleState(hass.states[entityId]));
    return entity ? { entity, ...DISPLAY_DEFAULTS } : { ...DISPLAY_DEFAULTS };
  }

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._hass = undefined;
    this._config = undefined;
  }

  setConfig(config) {
    this._config = { ...config };
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  getCardSize() {
    return 7;
  }

  getGridOptions() {
    return {
      rows: 7,
      columns: 12,
      min_rows: 5,
      min_columns: 6,
    };
  }

  _render() {
    if (!this._config || !this._hass) return;

    const stateObj = this._config.entity
      ? this._hass.states[this._config.entity]
      : undefined;
    const model = sensorModel(stateObj);
    const display = displayConfig(this._config);
    const showHead = display.show_date || display.show_heading || display.show_mean;
    const showLegend = display.show_description || display.show_now_price;

    this.shadowRoot.innerHTML = `
      <style>${styles}</style>
      <ha-card aria-label="Nordpool priskort">
        ${showHead ? `<div class="card-head">
          ${display.show_date || display.show_heading ? `<div>
            ${display.show_date ? `<div class="eyebrow">${model.date}</div>` : ""}
            ${display.show_heading ? `<h2>${model.title}</h2>` : ""}
          </div>` : ""}
          ${display.show_mean ? `<div class="average">
            <span class="eyebrow">Snitt etter støtte</span>
            <strong>${model.available ? priceText(model.average) : "Kommer"}</strong>
          </div>` : ""}
        </div>` : ""}
        ${display.show_graph ? `<div class="chart-wrap">
          <svg role="img" aria-label="Pris time for time"></svg>
        </div>` : ""}
        ${showLegend ? `<div class="legend">
          ${display.show_description ? `
            <span class="legend-item"><i class="legend-bar"></i>Etter strømstøtte</span>
            <span class="legend-item"><i class="legend-line"></i>Uten strømstøtte</span>
          ` : ""}
          ${display.show_now_price ? `<span class="now-price"></span>` : ""}
        </div>` : ""}
      </ha-card>
      <div class="tooltip"></div>
    `;

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

    if (display.show_graph) this._drawChart(model, display);
  }

  _drawChart(model, display) {
    const svg = this.shadowRoot.querySelector("svg");
    const tooltip = this.shadowRoot.querySelector(".tooltip");
    const width = 720;
    const height = 330;
    const margin = { top: 18, right: 10, bottom: 35, left: 43 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    const values = model.available ? [...model.original, ...model.supported] : [0, 2];
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
    svg.setAttribute("preserveAspectRatio", "none");

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
      const meanLabel = svgNode("text", {
        x: width - margin.right - 3,
        y: meanY - 5,
        class: "mean-label",
      });
      meanLabel.textContent = "SNITT";
      svg.append(meanLabel);
    }

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

      if (display.show_now_graph && index === model.currentHour) {
        const now = svgNode("text", {
          x: x(index),
          y: margin.top + 10,
          class: "now-label",
        });
        now.textContent = "NÅ";
        svg.append(now);
      }
    });

    const linePath = model.original
      .map((value, index) => `${index ? "L" : "M"} ${x(index)} ${y(value)}`)
      .join(" ");
    svg.append(svgNode("path", { d: linePath, class: "price-line" }));

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
          <span class="tooltip-row">Etter støtte <b>${priceText(model.supported[index])}</b></span>
          <span class="tooltip-row">Uten støtte <b>${priceText(value)}</b></span>`;
        tooltip.style.left = `${event.clientX}px`;
        tooltip.style.top = `${event.clientY}px`;
        tooltip.classList.add("visible");
      });
      hit.addEventListener("pointerleave", () => tooltip.classList.remove("visible"));
      svg.append(hit, dot);
    });
  }
}

class NordpoolPriceCardEditor extends HTMLElement {
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

    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; padding: 8px 0; }
        .field-label {
          display: block;
          margin-bottom: 7px;
          color: var(--secondary-text-color);
          font-size: 12px;
          font-weight: 650;
        }
        select {
          box-sizing: border-box;
          width: 100%;
          min-height: 48px;
          padding: 0 42px 0 13px;
          border: 1px solid var(--input-outlined-idle-border-color, var(--divider-color));
          border-radius: var(--ha-card-border-radius, 10px);
          background: var(--card-background-color, var(--secondary-background-color));
          color: var(--primary-text-color);
          font: inherit;
          outline: none;
        }
        select:focus {
          border-color: var(--primary-color);
          box-shadow: 0 0 0 2px color-mix(in srgb, var(--primary-color) 20%, transparent);
        }
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
      <label class="field-label" for="entity">Strømstøttesensor</label>
      <select id="entity">
        <option value="">Velg sensor</option>
      </select>
      <fieldset>
        <legend>Vis i kortet</legend>
        <div class="display-options"></div>
      </fieldset>
    `;

    const select = this.shadowRoot.querySelector("select");
    const compatible = Object.entries(this._hass.states)
      .filter(([, stateObj]) => isCompatibleState(stateObj))
      .sort(([left], [right]) => left.localeCompare(right, "nb"));

    for (const [entityId, stateObj] of compatible) {
      const option = document.createElement("option");
      option.value = entityId;
      option.textContent = stateObj.attributes.friendly_name || entityId;
      option.selected = entityId === this._config.entity;
      select.append(option);
    }

    if (this._config.entity && !compatible.some(([entityId]) => entityId === this._config.entity)) {
      const option = document.createElement("option");
      option.value = this._config.entity;
      option.textContent = this._config.entity;
      option.selected = true;
      select.append(option);
    }

    if (!compatible.length) {
      const message = document.createElement("p");
      message.className = "empty";
      message.textContent = "Ingen kompatible strømsensorer ble funnet.";
      this.shadowRoot.append(message);
    }

    select.addEventListener("change", (event) => {
      const entity = event.target.value;
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
          config.show_now_graph = false;
          config.show_mean_graph = false;
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

if (!customElements.get(CARD_TYPE)) {
  customElements.define(CARD_TYPE, NordpoolPriceCard);
}

if (!customElements.get("nordpool-price-card-editor")) {
  customElements.define("nordpool-price-card-editor", NordpoolPriceCardEditor);
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
      return isCompatibleState(stateObj)
        ? { config: { type: `custom:${CARD_TYPE}`, entity: entityId, ...DISPLAY_DEFAULTS } }
        : null;
    },
  });
}
