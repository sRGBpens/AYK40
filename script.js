/* ------------------------------------------------------------------
   A Fortieth — client script
   - Loads activities from data.json
   - Renders categorized list with status chips
   - Handles signup via Formspree (or mailto fallback)
   - Admin mode (?admin=YOUR_PASSPHRASE) lets the owner cycle status
     and export updated data.json
   ------------------------------------------------------------------ */

// =======================  CONFIG  ================================
// 1) Formspree endpoint (recommended). Create a free form at
//    https://formspree.io and paste its endpoint URL below.
//    Leave blank to use the mailto fallback.
const FORMSPREE_ENDPOINT = ""; // e.g. "https://formspree.io/f/xxxxxxxx"

// 2) Mailto fallback. If Formspree is not configured, the form
//    opens the user's mail client with a pre-filled message.
const OWNER_EMAIL = "you@example.com";

// 3) Admin passphrase. Access via  yoursite.com/?admin=YOUR_PASS
//    Anyone with the URL can toggle status locally and export JSON.
//    This is a courtesy gate, not real security — never put secrets here.
const ADMIN_PASS = "hello40";
// ==================================================================

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];

const state = {
  data: null,
  isAdmin: false,
  currentItem: null // { categoryId, itemId, title }
};

// -------- Load data and kick off --------
async function init() {
  checkAdmin();
  try {
    const res = await fetch("data.json", { cache: "no-store" });
    if (!res.ok) throw new Error("Could not load data.json");
    state.data = await res.json();
  } catch (e) {
    console.error(e);
    document.getElementById("categories").innerHTML =
      `<p style="text-align:center;color:var(--wine);padding:4rem 0">Could not load activities. Please refresh.</p>`;
    return;
  }
  renderAll();
  bindUI();
}

// -------- Admin mode detection --------
function checkAdmin() {
  const params = new URLSearchParams(location.search);
  const pass = params.get("admin");
  if (pass && pass === ADMIN_PASS) {
    state.isAdmin = true;
    document.body.classList.add("admin-on");
    document.getElementById("admin-bar").hidden = false;
  }
}

// -------- Render --------
function renderAll() {
  const d = state.data;
  document.getElementById("site-title").textContent = d.title;
  document.getElementById("site-subtitle").textContent = d.subtitle;
  document.getElementById("site-intro").textContent = d.intro;
  document.title = `${d.title} — ${d.subtitle}`;

  // TOC
  const toc = document.getElementById("toc");
  toc.innerHTML = d.categories
    .map(c => `<a href="#${c.id}">${escapeHtml(c.title)}</a>`)
    .join("");

  // Categories
  const wrap = document.getElementById("categories");
  wrap.innerHTML = d.categories.map(renderCategory).join("");

  // Wire signup buttons
  wrap.querySelectorAll("[data-signup]").forEach(btn => {
    btn.addEventListener("click", onSignupClick);
  });

  // Wire play buttons
  wrap.querySelectorAll(".play-btn").forEach(btn => {
    btn.addEventListener("click", onPlayClick);
  });

  // Wire admin chip toggles
  if (state.isAdmin) {
    wrap.querySelectorAll(".chip").forEach(chip => {
      chip.addEventListener("click", onAdminChipClick);
    });
  }
}

function renderCategory(cat, idx) {
  const num = ROMAN[idx] || (idx + 1);
  const items = cat.items.map((it, i) => renderItem(cat, it, i)).join("");
  const music = renderMusic(cat);
  return `
    <section class="category" id="${cat.id}" aria-labelledby="${cat.id}-title">
      <header class="cat-head">
        <p class="cat-num">${num}</p>
        <h2 class="cat-title" id="${cat.id}-title">${escapeHtml(cat.title)}</h2>
        <p class="cat-epigraph">
          ${escapeHtml(cat.epigraph || "")}
          ${music.button}
        </p>
        ${music.panel}
      </header>
      <ol class="items">${items}</ol>
    </section>
  `;
}

function renderMusic(cat) {
  const m = cat.music;
  if (!m || !m.spotifyId) return { button: "", panel: "" };
  const id = extractSpotifyId(m.spotifyId);
  const label = `Play ${m.song || "track"}${m.artist ? " by " + m.artist : ""}`;
  const button = `
    <button class="play-btn" type="button"
      data-music-for="${cat.id}"
      data-track="${escapeHtml(id)}"
      aria-label="${escapeHtml(label)}"
      aria-expanded="false"
      aria-controls="player-${cat.id}"
      title="${escapeHtml(label)}">
      <svg class="icon-play" viewBox="0 0 20 20" aria-hidden="true"><polygon points="7,4.5 7,15.5 16,10" /></svg>
      <svg class="icon-pause" viewBox="0 0 20 20" aria-hidden="true"><rect x="6" y="5" width="2.5" height="10" rx="0.5" /><rect x="11.5" y="5" width="2.5" height="10" rx="0.5" /></svg>
    </button>
  `;
  const panel = `
    <div class="player-panel" id="player-${cat.id}" data-panel-for="${cat.id}" hidden></div>
  `;
  return { button, panel };
}

/**
 * Accept a Spotify track URL, embed URL, or bare ID and return the bare ID.
 */
function extractSpotifyId(input) {
  if (!input) return "";
  const m = String(input).match(/track\/([a-zA-Z0-9]+)/);
  return m ? m[1] : String(input).trim();
}

function renderItem(cat, item, i) {
  const num = String(i + 1).padStart(2, "0");
  const statusLabel = {
    open: "Open",
    assigned: "Claimed",
    completed: "Done"
  }[item.status] || "Open";

  const action =
    item.status === "open"
      ? `<button class="sign-link" data-signup data-cat="${cat.id}" data-item="${item.id}">Sign up →</button>`
      : "";

  const chip = `<span class="chip ${item.status}" data-cat="${cat.id}" data-item="${item.id}" title="${state.isAdmin ? 'Click to cycle' : ''}">${statusLabel}</span>`;

  const notes = item.notes
    ? `<p class="item-notes">${escapeHtml(item.notes)}</p>`
    : "";

  return `
    <li class="item ${item.status}" data-item="${item.id}">
      <span class="item-num">${num}</span>
      <div class="item-body">
        <p class="item-title">${escapeHtml(item.title)}</p>
        ${notes}
      </div>
      <div class="item-action">
        ${action}
        ${chip}
      </div>
    </li>
  `;
}

// -------- Music playback (Spotify iframe API) --------
// The API is loaded asynchronously via <script async> in index.html.
// When it's ready, Spotify calls window.onSpotifyIframeApiReady.
let SpotifyAPI = null;
const pendingPlayActions = [];

window.onSpotifyIframeApiReady = (IFrameAPI) => {
  SpotifyAPI = IFrameAPI;
  // Run anything that was queued before the API was ready
  while (pendingPlayActions.length) pendingPlayActions.shift()();
};

function onPlayClick(e) {
  const btn = e.currentTarget;
  const catId = btn.dataset.musicFor;
  const trackId = btn.dataset.track;
  const panel = document.querySelector(`[data-panel-for="${catId}"]`);
  if (!panel) return;

  const isOpen = !panel.hidden;

  // Always close every player first (keeps only one playing at a time,
  // and destroys any prior controller so its audio actually stops).
  closeAllPlayers();

  if (isOpen) return; // was open → we just closed it

  // Open + autoplay. Queue if the Spotify API hasn't loaded yet.
  const startPlayback = () => openAndPlay(btn, panel, trackId);
  if (SpotifyAPI) startPlayback();
  else pendingPlayActions.push(startPlayback);
}

function openAndPlay(btn, panel, trackId) {
  // Spotify replaces the element we pass in with its own iframe, so we
  // create a fresh placeholder div for it on every open.
  panel.innerHTML = "";
  const mount = document.createElement("div");
  panel.appendChild(mount);
  panel.hidden = false;
  btn.setAttribute("aria-expanded", "true");
  btn.classList.add("is-playing");

  SpotifyAPI.createController(
    mount,
    { uri: `spotify:track:${trackId}`, width: "100%", height: 80 },
    (controller) => {
      panel._spotifyController = controller;
      // 'ready' fires once the embed can accept playback commands.
      // Calling play() then works because the user-gesture chain is
      // still valid from the original button click.
      const playWhenReady = () => {
        try { controller.play(); } catch (err) { /* embed will still be visible */ }
      };
      controller.addListener("ready", playWhenReady);
      // Some embeds don't emit 'ready' — try after a small grace window too
      setTimeout(playWhenReady, 800);

      // Keep our button in sync if the user pauses from inside the embed
      controller.addListener("playback_update", (e) => {
        const data = e && e.data;
        if (!data) return;
        if (data.isPaused) btn.classList.remove("is-playing");
        else btn.classList.add("is-playing");
      });
    }
  );
}

function closeAllPlayers() {
  document.querySelectorAll(".player-panel").forEach(p => {
    if (p._spotifyController) {
      try { p._spotifyController.destroy(); } catch (_) {}
      p._spotifyController = null;
    }
    p.hidden = true;
    p.innerHTML = "";
  });
  document.querySelectorAll(".play-btn").forEach(b => {
    b.setAttribute("aria-expanded", "false");
    b.classList.remove("is-playing");
  });
}

// -------- Signup flow --------
function onSignupClick(e) {
  const btn = e.currentTarget;
  const catId = btn.dataset.cat;
  const itemId = btn.dataset.item;
  const cat = state.data.categories.find(c => c.id === catId);
  const item = cat.items.find(i => i.id === itemId);

  state.currentItem = {
    categoryId: catId,
    categoryTitle: cat.title,
    itemId,
    title: item.title,
    notes: item.notes || ""
  };

  document.getElementById("signup-title").textContent = item.title;
  document.getElementById("signup-note").textContent =
    `In ${cat.title}. ${item.notes || ""}`.trim();
  document.getElementById("signup-activity").value = item.title;
  document.getElementById("signup-category").value = cat.title;

  const modal = document.getElementById("signup-modal");
  modal.hidden = false;
  document.body.style.overflow = "hidden";
  setTimeout(() => modal.querySelector("input[name=name]").focus(), 80);
}

function closeModal() {
  const modal = document.getElementById("signup-modal");
  modal.hidden = true;
  document.body.style.overflow = "";
  document.getElementById("form-status").textContent = "";
  document.getElementById("form-status").classList.remove("error");
  document.getElementById("signup-form").reset();
  document.getElementById("signup-submit").disabled = false;
}

async function onFormSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const statusEl = document.getElementById("form-status");
  const submitBtn = document.getElementById("signup-submit");
  statusEl.classList.remove("error");
  statusEl.textContent = "Sending…";
  submitBtn.disabled = true;

  const payload = {
    name: form.name.value.trim(),
    contact: form.contact.value.trim(),
    message: form.message.value.trim(),
    activity: form.activity.value,
    category: form.category.value
  };

  if (!payload.name || !payload.contact) {
    statusEl.textContent = "Please enter your name and a way to reach you.";
    statusEl.classList.add("error");
    submitBtn.disabled = false;
    return;
  }

  if (FORMSPREE_ENDPOINT) {
    try {
      const res = await fetch(FORMSPREE_ENDPOINT, {
        method: "POST",
        headers: { "Accept": "application/json", "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error("Formspree response " + res.status);
      closeModal();
      showToast();
    } catch (err) {
      console.error(err);
      statusEl.textContent = "Couldn't send. Please try again, or email directly.";
      statusEl.classList.add("error");
      submitBtn.disabled = false;
    }
  } else {
    // Mailto fallback
    const subject = `40th Signup: ${payload.activity}`;
    const body =
`Hi!

I'd like to sign up for: ${payload.activity}
Category: ${payload.category}

Name: ${payload.name}
Contact: ${payload.contact}

Note:
${payload.message || "(none)"}
`;
    const url = `mailto:${encodeURIComponent(OWNER_EMAIL)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = url;
    setTimeout(() => { closeModal(); showToast("Opening your email…"); }, 400);
  }
}

function showToast(text) {
  const t = document.getElementById("toast");
  if (text) t.querySelector("span").textContent = text;
  t.hidden = false;
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => { t.hidden = true; }, 3000);
}

// -------- Admin: cycle status and export --------
const CYCLE = { open: "assigned", assigned: "completed", completed: "open" };

function onAdminChipClick(e) {
  if (!state.isAdmin) return;
  const chip = e.currentTarget;
  const catId = chip.dataset.cat;
  const itemId = chip.dataset.item;
  const cat = state.data.categories.find(c => c.id === catId);
  const item = cat.items.find(i => i.id === itemId);
  item.status = CYCLE[item.status] || "open";
  renderAll(); // re-render to reflect new state
}

function exportJson() {
  const blob = new Blob([JSON.stringify(state.data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "data.json";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  showToast("data.json downloaded");
}

// -------- UI bindings --------
function bindUI() {
  document.querySelectorAll("[data-close]").forEach(el =>
    el.addEventListener("click", closeModal)
  );
  document.getElementById("signup-form").addEventListener("submit", onFormSubmit);
  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && !document.getElementById("signup-modal").hidden) {
      closeModal();
    }
  });
  const exp = document.getElementById("admin-export");
  if (exp) exp.addEventListener("click", exportJson);
  const exit = document.getElementById("admin-exit");
  if (exit) exit.addEventListener("click", () => {
    location.href = location.pathname;
  });
}

// -------- Utilities --------
function escapeHtml(s) {
  if (s == null) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

document.addEventListener("DOMContentLoaded", init);
