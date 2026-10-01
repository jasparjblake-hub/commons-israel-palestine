/* The Commons on Israel and Palestine - core: data loading, helpers, router.
   Every page is drawn from the JSON files in data/, which scripts/build_site_data.py
   builds from the project's locked files. Text from the data is always inserted as
   text (never as HTML), so a quote can never change the page. */
"use strict";

const App = (() => {
  const cache = new Map();
  function load(path) {
    if (!cache.has(path)) {
      cache.set(path, fetch(path).then(r => {
        if (!r.ok) throw new Error("Could not load " + path + " (" + r.status + ")");
        return r.json();
      }));
    }
    return cache.get(path);
  }
  const shardOf = id => "data/shards/" + String(Number(id) % 32).padStart(2, "0") + ".json";
  const loadMpDetail = id => load(shardOf(id)).then(s => s[String(id)]);

  // el("div", {class: "x", onclick: fn}, child, "text", ...)
  function el(tag, attrs, ...kids) {
    const n = document.createElement(tag);
    if (attrs) for (const [k, v] of Object.entries(attrs)) {
      if (v === null || v === undefined || v === false) continue;
      if (k.startsWith("on") && typeof v === "function") n.addEventListener(k.slice(2), v);
      else if (k === "class") n.className = v;
      else if (k === "text") n.textContent = v;
      else if (v === true) n.setAttribute(k, "");
      else n.setAttribute(k, v);
    }
    for (const k of kids.flat(Infinity)) {
      if (k === null || k === undefined || k === false) continue;
      n.append(k instanceof Node ? k : document.createTextNode(String(k)));
    }
    return n;
  }
  // Replace a node's contents, skipping empty (null/false) entries.
  const put = (node, ...kids) => node.replaceChildren(...kids.flat(Infinity).filter(k => k !== null && k !== undefined && k !== false));
  const svgNS = "http://www.w3.org/2000/svg";
  function svg(tag, attrs, ...kids) {
    const n = document.createElementNS(svgNS, tag);
    if (attrs) for (const [k, v] of Object.entries(attrs)) if (v !== null && v !== undefined) n.setAttribute(k, v);
    for (const k of kids.flat()) if (k !== null && k !== undefined) n.append(k instanceof Node ? k : document.createTextNode(String(k)));
    return n;
  }

  // ---- formatting ----
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  function fmtDate(d) {
    if (!d) return "";
    const [y, m, day] = d.split("-").map(Number);
    return day + " " + MONTHS[m - 1] + " " + y;
  }
  function fmtMonth(ym, long) {
    const [y, m] = ym.split("-").map(Number);
    return (long ? MONTHS_LONG : MONTHS)[m - 1] + " " + y;
  }
  const fmtInt = n => Number(n).toLocaleString("en-GB");
  const pct = (x, dp = 0) => (x === null || x === undefined || isNaN(x)) ? "–" : (100 * x).toFixed(dp) + "%";

  function wilson(k, n, z = 1.96) {
    if (!n) return [null, null];
    const p = k / n, d = 1 + z * z / n;
    const c = (p + z * z / (2 * n)) / d;
    const h = (z / d) * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n));
    return [Math.max(0, c - h), Math.min(1, c + h)];
  }

  // Sort MPs by surname, ignoring titles such as "Mr", "Sir", "Dr".
  const TITLES = /^(the rt hon\.?|rt hon\.?|mr|mrs|ms|miss|dr|sir|dame|lord|lady|professor|prof)\.?\s+/i;
  function surnameKey(name) {
    let n = name.trim();
    while (TITLES.test(n)) n = n.replace(TITLES, "");
    const parts = n.split(/\s+/);
    return (parts[parts.length - 1] + " " + parts.slice(0, -1).join(" ")).toLowerCase();
  }

  // ---- shared vocabulary (neutral, descriptive) ----
  const CLAIM = {
    c1: { short: "Claim 1", long: "Harm to Palestinians / international law",
          def: "Israeli or allied conduct is harming Palestinians or breaching international law.", cls: "c1" },
    c2: { short: "Claim 2", long: "Israeli security / 7 October",
          def: "Hamas or allied conduct is harming Israelis, or Israel has security needs or a right to act.", cls: "c2" },
  };
  const CLAIM_CODE = {
    ASSERTED: "made in own voice", ATTRIBUTED: "reported as others' view",
    DEFERRED: "left to a court or process", REJECTED: "disputed", ABSENT: "not made",
  };
  const ASK = {
    arms: { label: "Arms restrictions", long: "UK arms exports to Israel restricted, suspended or ended", cls: "arms" },
    rec: { label: "Recognition", long: "UK recognition of a Palestinian state", cls: "rec" },
    cf: { label: "Ceasefire", long: "a ceasefire", cls: "cf" },
  };
  const ASK_CODE = { CALLED_FOR: "called for", OPPOSED: "opposed", ABSENT: "not raised" };
  const ROLE = { government: "Government frontbench", opposition: "Opposition frontbench", backbench: "Backbench" };
  const ROLE_SHORT = { government: "minister", opposition: "opposition frontbencher", backbench: "backbencher" };

  let META = null;

  // ---- router ----
  const SITE = "The Commons on Israel and Palestine";
  const routes = {};
  function route(name, fn) { routes[name] = fn; }
  function parse() {
    const h = decodeURIComponent(location.hash.replace(/^#/, ""));
    if (!h || h === "home") return { name: "home" };
    const m = h.match(/^mp-(\d+)$/);
    if (m) return { name: "mp", id: m[1] };
    return { name: h };
  }
  async function render() {
    const r = parse();
    const main = document.getElementById("main");
    document.querySelectorAll("nav.main a").forEach(a => {
      const t = a.getAttribute("href").slice(1);
      const on = t === r.name || (r.name === "mp" && t === "mps") || (r.name === "home" && t === "home");
      if (on) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    });
    const fn = routes[r.name] || routes.notfound;
    put(main, el("p", { class: "loading", role: "status" }, "Loading…"));
    try {
      if (!META) META = await load("data/meta.json");
      const view = await fn(r);
      put(main, view);
    } catch (e) {
      console.error(e);
      put(main, el("div", { class: "stack" },
        el("h1", null, "This page didn't load"),
        el("p", null, "The data files didn't load (" + e.message + "). Try reloading the page.")));
    }
    if (!r.keepScroll) window.scrollTo(0, 0);
    const h1 = main.querySelector("h1");
    if (h1) { h1.setAttribute("tabindex", "-1"); h1.focus({ preventScroll: true }); document.title = h1.textContent === SITE ? SITE : h1.textContent + " · " + SITE; }
  }
  window.addEventListener("hashchange", render);

  route("notfound", async () => el("div", { class: "stack" },
    el("h1", null, "Page not found"),
    el("p", null, el("a", { href: "#home" }, "Go to the home page"))));

  function start() {
    const y = document.getElementById("built");
    load("data/meta.json").then(m => { META = m; if (y) y.textContent = "Data last built " + fmtDate(m.built.slice(0, 10)) + "."; }).catch(() => {});
    const top = document.querySelector(".topbar"), mb = document.querySelector(".menu-btn");
    if (mb) mb.addEventListener("click", () => {
      const open = !top.classList.contains("open");
      top.classList.toggle("open", open);
      mb.setAttribute("aria-expanded", String(open));
      mb.textContent = open ? "Close" : "Menu";
    });
    // The skip link moves keyboard focus to the page content. It must not change the
    // address, because the address decides which page is shown.
    const skip = document.querySelector("a.skip");
    if (skip) skip.addEventListener("click", e => {
      e.preventDefault();
      const target = document.querySelector("#main h1") || document.getElementById("main");
      target.setAttribute("tabindex", "-1");
      target.focus();
    });
    window.addEventListener("hashchange", () => {
      if (top && top.classList.contains("open")) { top.classList.remove("open"); mb.setAttribute("aria-expanded", "false"); mb.textContent = "Menu"; }
    });
    render();
  }

  return { load, loadMpDetail, el, put, svg, fmtDate, fmtMonth, fmtInt, pct, wilson, surnameKey,
           CLAIM, CLAIM_CODE, ASK, ASK_CODE, ROLE, ROLE_SHORT, route, render, start,
           get META() { return META; } };
})();
