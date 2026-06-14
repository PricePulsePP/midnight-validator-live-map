import createGlobe from "cobe";
import "./styles.css";

const state = {
  snapshot: null,
  selected: null,
  phi: 0.12,
  targetPhi: 0.12,
  dragging: false,
  dragStartX: 0,
  dragStartPhi: 0
};

document.querySelector("#app").innerHTML = `
  <div class="page-shell">
    <header class="topbar">
      <a class="brand" href="./" aria-label="Midnight Validator Live Map">
        <span class="brand-mark">M</span>
        <span><strong>MIDNIGHT</strong><small>VALIDATOR LIVE MAP</small></span>
      </a>
      <div class="live-state"><span class="pulse"></span><span id="live-label">Loading telemetry</span></div>
    </header>

    <main>
      <section class="hero">
        <div class="eyebrow">MIDNIGHT MAINNET · LIVE VALIDATORS</div>
        <h1>The organizations<br><em>securing Midnight.</em></h1>
        <p class="hero-copy">A live, hourly view of Midnight's federated validator network.</p>
      </section>

      <section class="map-section" aria-label="Validator globe">
        <div class="validator-rail rail-left" id="rail-left"></div>
        <div class="globe-stage">
          <div class="globe-halo"></div>
          <canvas id="globe" aria-label="Interactive globe centered on European validators"></canvas>
          <button class="featured-card" id="featured-card" type="button"></button>
          <div class="globe-caption"><span></span> Drag to explore · Select any validator</div>
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
const railLeft = document.querySelector("#rail-left");
const railRight = document.querySelector("#rail-right");
const featuredCard = document.querySelector("#featured-card");
const detailsCard = document.querySelector("#details-card");
const detailsHeading = document.querySelector("#details-heading");

let globe;

loadSnapshot();

async function loadSnapshot() {
  try {
    const response = await fetch(`./validators.json?refresh=${Date.now()}`, { cache: "no-cache" });
    if (!response.ok) throw new Error(`Snapshot request returned ${response.status}`);
    state.snapshot = await response.json();
    state.selected =
      state.snapshot.validators.find((node) => node.featured) ?? state.snapshot.validators[0];
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
  const featured = validators.find((node) => node.featured);
  const remaining = validators.filter((node) => !node.featured);
  const split = Math.ceil(remaining.length / 2);

  railLeft.innerHTML = remaining.slice(0, split).map(validatorButton).join("");
  railRight.innerHTML = remaining.slice(split).map(validatorButton).join("");
  featuredCard.innerHTML = validatorCardContents(featured, true);
  featuredCard.dataset.name = featured.name;
  featuredCard.setAttribute("aria-label", `View ${featured.organization}`);

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

function validatorButton(node) {
  return `
    <button class="validator-card ${node.online ? "" : "offline"}" data-name="${escapeHtml(node.name)}" type="button">
      ${validatorCardContents(node)}
    </button>
  `;
}

function validatorCardContents(node, featured = false) {
  return `
    <span class="logo-wrap" style="--accent:${node.accent}">
      <img src="./assets/logos/${escapeHtml(node.logo)}" alt="">
    </span>
    <span class="validator-copy">
      ${featured ? '<span class="featured-label">FEATURED VALIDATOR</span>' : ""}
      <strong>${escapeHtml(node.organization)}</strong>
      <small>${escapeHtml(node.secondary ?? node.city)}</small>
    </span>
    <span class="status-dot ${node.online ? "" : "offline"}"></span>
  `;
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
      size: node.featured ? 0.11 : 0.065
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
    width: size * Math.min(window.devicePixelRatio, 2),
    height: size * Math.min(window.devicePixelRatio, 2),
    phi: state.phi,
    theta: 0.75,
    dark: 1,
    diffuse: 1.25,
    mapSamples: 20_000,
    mapBrightness: 7,
    baseColor: [0.018, 0.025, 0.055],
    markerColor: [0.2, 0.55, 1],
    glowColor: [0.08, 0.2, 0.48],
    markers,
    onRender: (renderState) => {
      if (!state.dragging) {
        state.phi += (state.targetPhi - state.phi) * 0.035;
        state.targetPhi += 0.00025;
      }
      renderState.phi = state.phi;
      renderState.width = canvas.clientWidth * Math.min(window.devicePixelRatio, 2);
      renderState.height = canvas.clientHeight * Math.min(window.devicePixelRatio, 2);
    }
  });

  canvas.addEventListener("pointerdown", (event) => {
    state.dragging = true;
    state.dragStartX = event.clientX;
    state.dragStartPhi = state.phi;
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener("pointermove", (event) => {
    if (state.dragging) state.phi = state.dragStartPhi + (event.clientX - state.dragStartX) / 220;
  });
  canvas.addEventListener("pointerup", () => {
    state.dragging = false;
    state.targetPhi = state.phi;
  });
  window.addEventListener("resize", () => {
    size = resize();
  });
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
