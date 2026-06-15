import createGlobe from "cobe";
import "./styles.css";

const state = {
  snapshot: null,
  selected: null,
  phi: -1.42,
  targetPhi: -1.42,
  theta: 0.7,
  targetTheta: 0.7,
  scale: 1.38,
  targetScale: 1.38,
  dragging: false,
  dragStartX: 0,
  dragStartY: 0,
  dragStartPhi: 0,
  dragStartTheta: 0,
  pinchDistance: null
};

document.querySelector("#app").innerHTML = `
  <div class="page-shell">
    <header class="topbar">
      <a class="brand" href="./" aria-label="Midnight Validator Live Map">
        <span class="brand-mark"><img src="./assets/midnight-mark.svg" alt=""></span>
        <span><strong>MIDNIGHT</strong><small>VALIDATOR LIVE MAP</small></span>
      </a>
      <div class="live-state"><span class="pulse"></span><span id="live-label">Loading telemetry</span></div>
    </header>

    <main>
      <section class="hero">
        <div class="eyebrow">MIDNIGHT MAINNET · LIVE VALIDATORS</div>
        <h1>The Validators that<br><em>Secure Midnight.</em></h1>
        <p class="hero-subheadline">Federated today, decentralization is next.</p>
        <p class="hero-copy">A live, hourly view of the Midnight network.</p>
      </section>

      <section class="map-section" aria-label="Validator globe">
        <div class="validator-rail rail-left" id="rail-left"></div>
        <div class="globe-stage">
          <div class="globe-halo"></div>
          <div class="globe-grid" aria-hidden="true"></div>
          <canvas id="globe" aria-label="Interactive globe centered on European validators"></canvas>
          <div class="globe-labels" id="globe-labels"></div>
          <div class="globe-controls" aria-label="Globe controls">
            <button type="button" data-zoom="in" aria-label="Zoom in">+</button>
            <button type="button" data-zoom="out" aria-label="Zoom out">−</button>
            <button type="button" data-reset aria-label="Reset to Europe">EU</button>
          </div>
          <div class="globe-caption"><span></span> Drag to pan · Scroll or pinch to zoom · Select a logo</div>
        </div>
        <div class="validator-rail rail-right" id="rail-right"></div>
      </section>

      <section class="stats" id="stats"></section>

      <section class="details-section">
        <div>
          <div class="eyebrow">VALIDATOR DETAILS</div>
          <h2 id="details-heading">Select a validator</h2>
        </div>
        <article class="details-card" id="details-card"></article>
      </section>
    </main>

    <footer>
      <span>Independent visualization using public Midnight telemetry.</span>
      <a href="https://telemetry.midnight.network/" target="_blank" rel="noreferrer">Source telemetry ↗</a>
    </footer>
  </div>
`;

const canvas = document.querySelector("#globe");
const globeLabels = document.querySelector("#globe-labels");
const railLeft = document.querySelector("#rail-left");
const railRight = document.querySelector("#rail-right");
const detailsCard = document.querySelector("#details-card");
const detailsHeading = document.querySelector("#details-heading");

let globe;
let logoElements = [];

loadSnapshot();

async function loadSnapshot() {
  try {
    const response = await fetch(`./validators.json?refresh=${Date.now()}`, { cache: "no-cache" });
    if (!response.ok) throw new Error(`Snapshot request returned ${response.status}`);
    state.snapshot = await response.json();
    state.selected = state.snapshot.validators[0];
    render();
    initGlobe();
  } catch (error) {
    document.querySelector("#live-label").textContent = "Telemetry unavailable";
    detailsCard.innerHTML = `<p class="error">The validator snapshot is temporarily unavailable.</p>`;
    console.error(error);
  }
}

function render() {
  const validators = state.snapshot.validators;
  const split = Math.ceil(validators.length / 2);
  globeLabels.innerHTML = validators.map(mapLogoButton).join("");
  railLeft.innerHTML = validators.slice(0, split).map(validatorButton).join("");
  railRight.innerHTML = validators.slice(split).map(validatorButton).join("");

  const online = validators.filter((node) => node.online);
  const organizations = new Set(validators.map((node) => node.organization));
  const cities = new Set(online.map((node) => node.city).filter(Boolean));
  const propagation = online
    .map((node) => node.propagationMs)
    .filter(Number.isFinite);
  const averagePropagation =
    propagation.length > 0
      ? Math.round(propagation.reduce((total, value) => total + value, 0) / propagation.length)
      : null;

  document.querySelector("#stats").innerHTML = [
    ["Validators online", `${online.length}/${validators.length}`],
    ["Validator brands", organizations.size],
    ["European cities", cities.size],
    ["Avg propagation", averagePropagation == null ? "—" : `${averagePropagation}ms`],
    ["Best block", formatInteger(state.snapshot.bestBlock)],
    ["Last refreshed", relativeTime(state.snapshot.generatedAt)]
  ]
    .map(([label, value]) => `<div class="stat"><strong>${value}</strong><span>${label}</span></div>`)
    .join("");

  document.querySelector("#live-label").textContent = `${online.length} validators online`;
  bindValidatorButtons();
  renderDetails();
}

function mapLogoButton(node, index, validators) {
  const offset = logoOffset(index, validators.length);
  return `
    <button
      class="map-logo ${node.online ? "" : "offline"}"
      data-name="${escapeHtml(node.name)}"
      style="--pin-x:${offset.x}px;--pin-y:${offset.y}px;--accent:${node.accent}"
      type="button"
      aria-label="View ${escapeHtml(node.organization)} in ${escapeHtml(node.city)}"
    >
      <span class="map-logo-image"><img src="./assets/logos/${escapeHtml(node.logo)}" alt=""></span>
      <span class="map-logo-label"><strong>${escapeHtml(node.organization)}</strong><small>${escapeHtml(node.secondary ?? node.city)}</small></span>
    </button>
  `;
}

function validatorButton(node) {
  return `
    <button class="validator-card ${node.online ? "" : "offline"}" data-name="${escapeHtml(node.name)}" type="button">
      <span class="logo-wrap" style="--accent:${node.accent}">
        <img src="./assets/logos/${escapeHtml(node.logo)}" alt="">
      </span>
      <span class="validator-copy">
        <strong>${escapeHtml(node.organization)}</strong>
        <small>${escapeHtml(node.secondary ?? node.city)}</small>
      </span>
      <span class="status-dot ${node.online ? "" : "offline"}"></span>
    </button>
  `;
}

function logoOffset(index, count) {
  if (count <= 1) return { x: 0, y: 0 };
  const compact = window.innerWidth <= 680;
  const innerCount = Math.min(6, count);
  const innerRing = index < innerCount;
  const ringIndex = innerRing ? index : index - innerCount;
  const ringCount = innerRing ? innerCount : count - innerCount;
  const angle = -Math.PI / 2 + (ringIndex / ringCount) * Math.PI * 2 + (innerRing ? 0 : Math.PI / 7);
  const radius = innerRing ? (compact ? 48 : 76) : (compact ? 76 : 132);
  return { x: Math.round(Math.cos(angle) * radius), y: Math.round(Math.sin(angle) * radius) };
}

function markerId(node) {
  return node.name.replaceAll(/[^a-zA-Z0-9_-]/g, "-");
}

function bindValidatorButtons() {
  document.querySelectorAll("[data-name]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selected = state.snapshot.validators.find((node) => node.name === button.dataset.name);
      renderDetails();
    });
  });
}

function renderDetails() {
  const node = state.selected;
  document.querySelectorAll("[data-name]").forEach((button) => {
    button.classList.toggle("selected", button.dataset.name === node.name);
  });
  detailsHeading.textContent = node.organization;
  detailsCard.innerHTML = `
    <div class="detail-identity">
      <span class="logo-wrap large" style="--accent:${node.accent}">
        <img src="./assets/logos/${escapeHtml(node.logo)}" alt="">
      </span>
      <div><strong>${escapeHtml(node.organization)}</strong><span>${escapeHtml(node.secondary ?? node.name)}</span></div>
      <span class="status-pill ${node.online ? "" : "offline"}">${node.online ? "Online" : "Offline"}</span>
    </div>
    <dl>
      ${detail("Location", node.city)}
      ${detail("Node", node.name)}
      ${detail("Propagation", Number.isFinite(node.propagationMs) ? `${node.propagationMs}ms` : "—")}
      ${detail("Peers", node.peers ?? "—")}
      ${detail("Block", formatInteger(node.height))}
      ${detail("Block time", Number.isFinite(node.blockTimeMs) ? `${(node.blockTimeMs / 1000).toFixed(3)}s` : "—")}
      ${detail("Version", node.version ?? "—")}
      ${detail("Validator", shorten(node.validator))}
    </dl>
  `;
}

function detail(label, value) {
  return `<div><dt>${label}</dt><dd>${escapeHtml(value)}</dd></div>`;
}

function initGlobe() {
  const markers = state.snapshot.validators
    .filter((node) => node.online && Number.isFinite(node.lat) && Number.isFinite(node.lon))
    .map((node) => ({
      location: [node.lat, node.lon],
      size: 0.052,
      id: markerId(node),
      color: hexToRgb(node.accent)
    }));
  const arcs = state.snapshot.validators
    .filter((node) => node.online && Number.isFinite(node.lat) && Number.isFinite(node.lon))
    .slice(1)
    .map((node, index, validators) => ({
      from: [validators[index].lat, validators[index].lon],
      to: [node.lat, node.lon],
      color: [0.18, 0.4, 0.95]
    }));

  const resize = () => {
    const size = Math.min(canvas.parentElement.clientWidth, 720);
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    return size;
  };

  let size = resize();
  globe = createGlobe(canvas, {
    devicePixelRatio: Math.min(window.devicePixelRatio, 2),
    width: size,
    height: size,
    phi: state.phi,
    theta: state.theta,
    dark: 0,
    diffuse: 1.1,
    scale: state.scale,
    mapSamples: 38_000,
    mapBrightness: 2.4,
    mapBaseBrightness: 0.02,
    baseColor: [1, 1, 1],
    markerColor: [0.2, 0.55, 1],
    glowColor: [0.82, 0.86, 0.94],
    markers,
    arcs,
    arcColor: [0.18, 0.4, 0.95],
    arcWidth: 0.45,
    arcHeight: 0.055,
    markerElevation: 0.035
  });
  canvas.parentElement.append(globeLabels);
  logoElements = [...globeLabels.querySelectorAll(".map-logo")].map((element) => ({
    element,
    node: state.snapshot.validators.find((node) => node.name === element.dataset.name)
  }));
  requestAnimationFrame(renderGlobeFrame);

  canvas.addEventListener("pointerdown", (event) => {
    state.dragging = true;
    state.dragStartX = event.clientX;
    state.dragStartY = event.clientY;
    state.dragStartPhi = state.phi;
    state.dragStartTheta = state.theta;
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener("pointermove", (event) => {
    if (state.dragging) {
      state.phi = state.dragStartPhi + (event.clientX - state.dragStartX) / 220;
      state.theta = clamp(state.dragStartTheta - (event.clientY - state.dragStartY) / 260, -1.25, 1.25);
    }
  });
  const stopDragging = () => {
    state.dragging = false;
    state.targetPhi = state.phi;
    state.targetTheta = state.theta;
  };
  canvas.addEventListener("pointerup", stopDragging);
  canvas.addEventListener("pointercancel", stopDragging);
  canvas.addEventListener("wheel", (event) => {
    event.preventDefault();
    setZoom(state.targetScale - event.deltaY * 0.0012);
  }, { passive: false });
  canvas.addEventListener("touchmove", (event) => {
    if (event.touches.length !== 2) return;
    const distance = touchDistance(event.touches);
    if (state.pinchDistance != null) setZoom(state.targetScale + (distance - state.pinchDistance) / 250);
    state.pinchDistance = distance;
  }, { passive: false });
  canvas.addEventListener("touchend", () => {
    state.pinchDistance = null;
  });
  document.querySelectorAll("[data-zoom]").forEach((button) => {
    button.addEventListener("click", () => setZoom(state.targetScale + (button.dataset.zoom === "in" ? 0.12 : -0.12)));
  });
  document.querySelector("[data-reset]").addEventListener("click", resetGlobe);
  window.addEventListener("resize", () => {
    size = resize();
  });
}

function renderGlobeFrame() {
  if (!state.dragging) {
    state.phi += (state.targetPhi - state.phi) * 0.035;
    state.theta += (state.targetTheta - state.theta) * 0.035;
    state.scale += (state.targetScale - state.scale) * 0.08;
  }
  globe.update({
    phi: state.phi,
    theta: state.theta,
    scale: state.scale,
    width: canvas.clientWidth,
    height: canvas.clientHeight
  });
  updateLogoPositions();
  requestAnimationFrame(renderGlobeFrame);
}

function resetGlobe() {
  state.targetPhi = -1.42;
  state.targetTheta = 0.7;
  state.targetScale = 1.38;
}

function setZoom(value) {
  state.targetScale = clamp(value, 0.82, 1.55);
}

function touchDistance(touches) {
  return Math.hypot(touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function hexToRgb(hex) {
  const value = hex.replace("#", "");
  return [0, 2, 4].map((offset) => parseInt(value.slice(offset, offset + 2), 16) / 255);
}

function updateLogoPositions() {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  if (!width || !height) return;
  for (const { element, node } of logoElements) {
    if (!Number.isFinite(node.lat) || !Number.isFinite(node.lon)) {
      element.style.opacity = "0";
      continue;
    }
    const point = projectLocation(node.lat, node.lon, width, height);
    element.style.left = `${point.x}px`;
    element.style.top = `${point.y}px`;
    element.style.setProperty("--visible", point.visible ? "1" : "0");
  }
}

function projectLocation(lat, lon, width, height) {
  const latRad = (lat * Math.PI) / 180;
  const lonRad = (lon * Math.PI) / 180 - Math.PI;
  const cosLat = Math.cos(latRad);
  const point = [-cosLat * Math.cos(lonRad), Math.sin(latRad), cosLat * Math.sin(lonRad)];
  const cosTheta = Math.cos(state.theta);
  const cosPhi = Math.cos(state.phi);
  const sinTheta = Math.sin(state.theta);
  const sinPhi = Math.sin(state.phi);
  const x3d = cosPhi * point[0] + sinPhi * point[2];
  const y3d =
    sinPhi * sinTheta * point[0] +
    cosTheta * point[1] -
    cosPhi * sinTheta * point[2];
  const z3d =
    -sinPhi * cosTheta * point[0] +
    sinTheta * point[1] +
    cosPhi * cosTheta * point[2];
  return {
    x: ((x3d / (width / height)) * state.scale + 1) * width * 0.5,
    y: (-y3d * state.scale + 1) * height * 0.5,
    visible: z3d >= 0 || x3d * x3d + y3d * y3d >= 0.64
  };
}

function formatInteger(value) {
  return Number.isFinite(value) ? new Intl.NumberFormat("en-US").format(value) : "—";
}

function relativeTime(value) {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 60_000));
  return minutes < 2 ? "Just now" : `${minutes}m ago`;
}

function shorten(value) {
  if (!value) return "—";
  return value.length > 20 ? `${value.slice(0, 9)}…${value.slice(-7)}` : value;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
