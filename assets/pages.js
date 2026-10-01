/* Home, MP explorer and MP pages. */
"use strict";

(() => {
  const { el, load, loadMpDetail, fmtDate, fmtInt, pct, wilson, surnameKey, CLAIM, CLAIM_CODE, ASK, ASK_CODE, ROLE, ROLE_SHORT, route } = App;

  const RECOG_CUTOFF = "2025-09-01";
  const MARKERS = [
    { m: "2024-07", label: "Election" },
    { m: "2025-09", label: "UK recognition" },
  ];
  // Accuracy figures from the project's blind hand-checks (see the Method page).
  const ACC = {
    arms: "Coded automatically. In blind checks, 71% of the arms-restriction calls the model recorded were confirmed, and it caught about 77% of real ones.",
    rec: "Coded automatically. In blind checks, 94% of the recognition calls the model recorded were confirmed, and it caught 94% of real ones.",
    cf: "Coded automatically. In blind checks, 87% of the ceasefire calls the model recorded were confirmed.",
    claims: "Checked against blind hand-coding, the model records slightly more of both claims than a person would: about 11% more Claim 1 and 17% more Claim 2.",
  };

  // ================================================================ HOME
  route("home", async () => {
    const [meta, mps] = await Promise.all([load("data/meta.json"), load("data/mps.json")]);
    const t = meta.totals;
    const speakers = mps.filter(m => m.on_topic > 0).length;
    const page = el("div", { class: "stack-lg" },
      el("section", { class: "hero" },
        el("h1", null, "The Commons on Israel and Palestine"),
        el("p", { class: "lede" }, "This site gathers " + fmtInt(t.on_topic) + " contributions on Israel and Palestine made in the House of Commons by " +
          fmtInt(speakers) + " MPs between " + fmtDate(meta.window.first_sitting) + " and " + fmtDate(meta.window.last) +
          ". For each one it records what was said and what the MP asked the Government to do."),
        el("p", null, "You can look up any MP, see which concerns they raised and when, read the exact words behind every entry, and compare this with the demography of the seat they represent. Early Day Motions they signed are included too."),
        el("div", { class: "row" },
          el("a", { class: "btn primary", href: "#mps" }, "Browse MPs"),
          el("a", { class: "btn", href: "#method" }, "How the data was made"))),

      el("section", { class: "stack" },
        el("h2", null, "What is recorded"),
        el("p", null, "Each contribution was read by an AI model that was not told who was speaking. It looked for two kinds of claim, and judged each one separately."),
        el("ul", { class: "claim-list" },
          el("li", null, el("b", null, "Claim 1"), " is that Israeli or allied conduct is harming Palestinians or breaking international law."),
          el("li", null, el("b", null, "Claim 2"), " is that Hamas or allied conduct is harming Israelis, or that Israel has security needs or a right to act.")),
        el("p", null, "A contribution can make both claims, one or neither. The numbers are only labels taken from the coding scheme. The two claims are always shown side by side and are never added together into a single score."),
        el("p", null, "The model also noted whether an MP called for, or opposed, three things: restrictions on UK arms exports to Israel, UK recognition of a Palestinian state, and a ceasefire."),
        el("p", { class: "small muted" }, "The ", el("a", { href: "#method" }, "Method page"), " explains this process in much more detail, including how the model was chosen, the exact instructions it was given, and how its coding was checked by hand.")),

      el("section", { class: "stack" },
        el("h2", null, "Reading the data"),
        el("ul", { class: "claim-list" },
          el("li", null, "Entries describe what was recorded, for example “recorded calling for recognition”. No MP or party is given a label."),
          el("li", null, "Most entries were coded by the model and have not been checked by a person. Those that have are marked ", el("span", { class: "tag checked" }, "hand-checked"), ". Every entry shows the words it is based on and links to the speech in Hansard."),
          el("li", null, "If no call is recorded for an MP, they may simply not have spoken about it."),
          el("li", null, "Links between a seat's demography and what its MP said are associations. They do not show cause, and they say nothing about how any voter or community thinks."))),

      el("section", { class: "stack" },
        el("h2", null, "Sections"),
        el("dl", { class: "sections" },
          section("#mps", "MPs", "Each MP's contributions, the claims and calls recorded in them, motions signed and figures for their seat."),
          section("#timeline", "Timeline", "How often the subject came up each month, and how often each claim was made."),
          section("#parties", "Parties", "Each party's record side by side, split by ministers, opposition frontbench and backbenchers."),
          section("#seats", "Seats", "A seat's demography and election figures next to what its MP was recorded saying."),
          section("#findings", "Findings", "What the analysis found, and the limits on each result."),
          section("#method", "Method", "How the data was collected, coded and checked, including what went wrong."),
          section("#downloads", "Downloads", "The data as CSV files."))));
    return page;
  });
  const section = (href, title, text, soon) => [el("dt", null, el("a", { href }, title)),
    el("dd", null, text + (soon ? " Still being built." : ""))];

  // ================================================================ EXPLORER
  const PERIODS = {
    all: { label: "Whole period", get: m => ({ on: m.on_topic, c1: m.c1, c2: m.c2 }) },
    pre: { label: "2019 Parliament", get: m => m.pre },
    p24: { label: "2024 Parliament", get: m => m.p24 },
  };
  // Recorded calls for an MP in a period. With useHand, the calls the hand check found
  // were not calls are taken out (asks_hc); calls that were never checked stay in.
  function asksFor(m, period, useHand = F.useHand) {
    const A = k => (useHand && m.asks_hc && m.asks_hc[k]) || m.asks[k];
    const B = k => (useHand && m.asks24_hc && m.asks24_hc[k]) || m.asks24[k];
    const one = k => period === "all" ? A(k) : period === "p24" ? B(k)
      : { called: A(k).called - B(k).called, opposed: A(k).opposed - B(k).opposed };
    return { arms: one("arms"), rec: one("rec"), cf: one("cf") };
  }
  const SEAT_MEASURES = {
    muslim_pc: "Muslim population share (%)",
    jewish_pc: "Jewish population share (%)",
    child_poverty_pc: "Child poverty, after housing costs (%)",
    majority_pc: "2024 majority (% of valid votes)",
    ethnic_minority_pc: "Ethnic minority share (%)",
    degree_pc: "Degree-level share, ages 16+ (%)",
    young_adult_pc: "Adults aged 18–34 (% of adults)",
  };
  const ASK_FILTERS = [
    ["arms_called", "Called for arms restrictions", (a) => a.arms.called > 0],
    ["arms_opposed", "Opposed arms restrictions", (a) => a.arms.opposed > 0],
    ["rec_called", "Called for recognition", (a) => a.rec.called > 0],
    ["rec_before", "Called for recognition before the UK recognised Palestine", null],
    ["rec_opposed", "Opposed recognition", (a) => a.rec.opposed > 0],
    ["cf_called", "Called for a ceasefire", (a) => a.cf.called > 0],
  ];
  const EDM_FILTERS = [
    ["edm_any", "Signed any on-topic motion", m => m.edm["2024"].on_topic > 0],
    ["edm_rec", "Signed a motion calling for recognition (tabled before 1 Sep 2025)", m => m.edm["2024"].rec_before_uk],
    ["edm_arms", "Signed a motion calling for arms restrictions", m => m.edm["2024"].arms],
  ];

  const F = {   // explorer state, kept while moving between pages
    q: "", period: "all", minOn: 1, parties: new Set(), roles: new Set(), nations: new Set(),
    asks: new Set(), edms: new Set(), useHand: false, handOnly: false,
    seatKey: "", seatMin: "", seatMax: "", city: "",
    sort: "name", dir: 1, shown: 50,
  };

  let MPS = null, SEATS = null;
  async function data() {
    if (!MPS) {
      const [mps, seats] = await Promise.all([load("data/mps.json"), load("data/seats.json")]);
      SEATS = new Map(seats.map(s => [s.gss, s]));
      MPS = mps.map(m => Object.assign(m, { _key: surnameKey(m.name), _seat: m.gss ? SEATS.get(m.gss) : null }));
    }
    return { MPS, SEATS };
  }

  function recBefore(m, period, useHand = F.useHand) {
    const A = (useHand && m.asks_hc && m.asks_hc.rec) || m.asks.rec;
    const B = (useHand && m.asks24_hc && m.asks24_hc.rec) || m.asks24.rec;
    if (period === "pre") return !!A.first_call && A.first_call < "2024-07-04";
    const fc = period === "p24" ? B.first_call : A.first_call;
    return !!fc && fc < RECOG_CUTOFF;
  }

  function passes(m, skip) {
    const P = PERIODS[F.period].get(m);
    if (P.on < F.minOn) return false;
    if (F.q) {
      const q = F.q.toLowerCase();
      if (!(m.name.toLowerCase().includes(q) || (m.seat_2024 || "").toLowerCase().includes(q) || (m.seat_2019 || "").toLowerCase().includes(q))) return false;
    }
    if (skip !== "party" && F.parties.size && !F.parties.has(m.party)) return false;
    if (skip !== "role" && F.roles.size && !F.roles.has(m.main_role_2024 || "none")) return false;
    if (skip !== "nation" && F.nations.size && !F.nations.has(m.nation || "none")) return false;
    if (F.asks.size) {
      const A = asksFor(m, F.period);
      for (const [k, , fn] of ASK_FILTERS) {
        if (!F.asks.has(k)) continue;
        if (k === "rec_before") { if (!recBefore(m, F.period)) return false; continue; }
        if (!fn(A)) return false;
      }
    }
    for (const [k, , fn] of EDM_FILTERS) if (F.edms.has(k) && !fn(m)) return false;
    if (F.handOnly && !m.hand_check.length) return false;
    if (F.seatKey || F.city) {
      const s = m._seat;
      if (!s) return false;
      if (F.seatKey) {
        const v = s[F.seatKey];
        if (v === null || v === undefined) return false;
        if (F.seatMin !== "" && v < Number(F.seatMin)) return false;
        if (F.seatMax !== "" && v > Number(F.seatMax)) return false;
      }
      if (F.city === "city" && s.city !== true) return false;
      if (F.city === "town" && s.city !== false) return false;
    }
    return true;
  }

  function sortRows(rows) {
    const P = PERIODS[F.period].get;
    const share = (m, k) => { const p = P(m); return p.on >= 5 ? p[k] / p.on : -1; };
    const A = m => asksFor(m, F.period);
    const keyf = {
      name: m => m._key, party: m => (m.party || "").toLowerCase() + " " + m._key,
      on: m => P(m).on, c1: m => share(m, "c1"), c2: m => share(m, "c2"),
      arms: m => A(m).arms.called * 1000 + A(m).arms.opposed, rec: m => A(m).rec.called * 1000 + A(m).rec.opposed,
      edm: m => m.edm["2024"].on_topic + m.edm["2019"].on_topic,
    }[F.sort];
    return rows.slice().sort((a, b) => {
      const x = keyf(a), y = keyf(b);
      if (x < y) return -F.dir; if (x > y) return F.dir;
      return a._key < b._key ? -1 : 1;
    });
  }

  route("mps", async () => {
    await data();
    const root = el("div", { class: "stack" });
    const head = el("div", { class: "stack" },
      el("p", { class: "eyebrow" }, "MP explorer"),
      el("h1", null, "MPs"),
      el("p", null, "Every MP who spoke in the debates covered: 694 in all. The list starts with the " + fmtInt(MPS.filter(m => m.on_topic > 0).length) + " who spoke on Israel and Palestine itself; set the minimum to \u201CAny\u201D to include the rest. Use the filters to narrow the list, and select a name to see that MP's contributions, the words behind each entry and links to Hansard."),
      el("p", { class: "note" }, "These figures come from automated coding. " + ACC.claims + " Of the calls it records, 94% for recognition and 71% for arms restrictions were confirmed by hand. Shares are only shown for MPs with at least five on-topic contributions."));
    const filters = el("aside", { class: "filters panel", "aria-label": "Filters", "data-collapsed": "true" });
    const results = el("section", { "aria-label": "Results", class: "stack", style: "min-width:0" });
    root.append(head, el("div", { class: "explorer" }, filters, results));

    // Redrawing removes the box that has focus, which can fire its "change" event in the
    // middle of a redraw. A redraw asked for during another one waits until it has finished.
    let drawing = false;
    const rerender = (keepShown) => {
      if (drawing) { setTimeout(() => rerender(keepShown)); return; }
      drawing = true;
      try { if (!keepShown) F.shown = 50; drawFilters(); drawResults(); } finally { drawing = false; }
    };

    function chk(label, checked, onchange, count, id) {
      const input = el("input", { type: "checkbox", id, checked: !!checked });
      input.addEventListener("change", () => onchange(input.checked));
      return el("label", { class: "check", for: id }, input, el("span", null, label),
        count !== undefined ? el("span", { class: "cnt" }, count) : null);
    }
    function toggleSet(set, v, on) { if (on) set.add(v); else set.delete(v); rerender(); }

    function drawFilters() {
      const counts = (key, skip) => {
        const c = new Map();
        for (const m of MPS) if (passes(m, skip)) { const v = key(m); c.set(v, (c.get(v) || 0) + 1); }
        return c;
      };
      const pc = counts(m => m.party, "party");
      const parties = [...new Set(MPS.map(m => m.party))].sort((a, b) => (pc.get(b) || 0) - (pc.get(a) || 0) || a.localeCompare(b));
      const rc = counts(m => m.main_role_2024 || "none", "role");
      const nc = counts(m => m.nation || "none", "nation");

      const search = el("input", { type: "search", id: "f-q", value: F.q, placeholder: "Name or seat", "aria-label": "Search by name or seat" });
      search.addEventListener("input", () => {
        F.q = search.value; rerender();
        const s2 = document.getElementById("f-q");   // the box was redrawn: put the cursor back
        if (s2) { s2.focus(); s2.setSelectionRange(s2.value.length, s2.value.length); }
      });

      const periodSeg = el("div", { class: "seg", role: "group", "aria-label": "Period" },
        Object.entries(PERIODS).map(([k, p]) => {
          const b = el("button", { type: "button", "aria-pressed": String(F.period === k) }, p.label);
          b.addEventListener("click", () => { F.period = k; rerender(); });
          return b;
        }));
      const minSel = el("select", { id: "f-min" },
        [[0, "Any, including MPs with none"], [1, "1 or more"], [5, "5 or more"], [20, "20 or more"]]
          .map(([v, l]) => el("option", { value: v, selected: F.minOn === v }, l)));
      minSel.addEventListener("change", () => { F.minOn = Number(minSel.value); rerender(); });

      const seatSel = el("select", { id: "f-seat" }, el("option", { value: "" }, "No seat filter"),
        Object.entries(SEAT_MEASURES).map(([k, l]) => el("option", { value: k, selected: F.seatKey === k }, l)));
      seatSel.addEventListener("change", () => { F.seatKey = seatSel.value; rerender(); });
      const smin = el("input", { type: "number", id: "f-smin", value: F.seatMin, step: "0.1", inputmode: "decimal" });
      const smax = el("input", { type: "number", id: "f-smax", value: F.seatMax, step: "0.1", inputmode: "decimal" });
      smin.addEventListener("change", () => { F.seatMin = smin.value; rerender(); });
      smax.addEventListener("change", () => { F.seatMax = smax.value; rerender(); });
      const citySel = el("select", { id: "f-city" },
        [["", "City or town: any"], ["city", "City seats"], ["town", "Town and village seats"]].map(([v, l]) => el("option", { value: v, selected: F.city === v }, l)));
      citySel.addEventListener("change", () => { F.city = citySel.value; rerender(); });

      const toggle = el("button", { type: "button", class: "btn filters-toggle", "aria-expanded": String(filters.dataset.collapsed !== "true") },
        filters.dataset.collapsed === "true" ? "Show filters" : "Hide filters");
      toggle.addEventListener("click", () => { filters.dataset.collapsed = filters.dataset.collapsed === "true" ? "false" : "true"; drawFilters(); });

      App.put(filters, 
        toggle,
        el("div", { class: "fgroup" }, el("label", { class: "flabel", for: "f-q" }, "Search"), search),
        el("div", { class: "fgroup" }, el("span", { class: "flabel" }, "Counts for"), periodSeg,
          el("span", { class: "xs muted" }, "The 2019 Parliament sat until May 2024. The 2024 Parliament began in July 2024.")),
        el("div", { class: "fgroup" }, el("label", { class: "flabel", for: "f-min" }, "On-topic contributions in this period"), minSel),
        el("fieldset", { class: "fgroup" }, el("legend", null, "Party (latest)"),
          parties.map((p, i) => chk(p, F.parties.has(p), on => toggleSet(F.parties, p, on), pc.get(p) || 0, "f-p" + i))),
        el("fieldset", { class: "fgroup" }, el("legend", null, "Main role in the 2024 Parliament"),
          [["government", "Government frontbench"], ["opposition", "Opposition frontbench"], ["backbench", "Backbench"], ["none", "Did not speak on topic after July 2024"]]
            .map(([k, l]) => chk(l, F.roles.has(k), on => toggleSet(F.roles, k, on), rc.get(k) || 0, "f-r-" + k))),
        el("fieldset", { class: "fgroup" }, el("legend", null, "Calls recorded in this period"),
          ASK_FILTERS.map(([k, l]) => chk(l, F.asks.has(k), on => toggleSet(F.asks, k, on), undefined, "f-a-" + k)),
          chk("Apply the hand-check corrections", F.useHand, on => { F.useHand = on; rerender(); }, undefined, "f-hand"),
          el("span", { class: "xs muted" }, "Ticking this takes out the 15 recorded calls that the hand check found were not calls, almost all of them ministers describing Government policy. Calls that were never checked, including every call made before July 2024, stay in. Leave it unticked to see the figures used in the analysis.")),
        el("fieldset", { class: "fgroup" }, el("legend", null, "Early Day Motions, 2024 Parliament"),
          EDM_FILTERS.map(([k, l]) => chk(l, F.edms.has(k), on => toggleSet(F.edms, k, on), undefined, "f-e-" + k)),
          el("span", { class: "xs muted" }, "Ministers and whips don't sign motions. No motion opposed either call.")),
        el("fieldset", { class: "fgroup" }, el("legend", null, "Seat, 2024 boundaries"), seatSel,
          F.seatKey ? el("div", { class: "range2" },
            el("label", { for: "f-smin" }, "From", smin), el("label", { for: "f-smax" }, "To", smax)) : null,
          citySel,
          el("span", { class: "xs muted" }, "These only include MPs who sat for a seat on the boundaries used from the July 2024 election.")),
        el("fieldset", { class: "fgroup" }, el("legend", null, "Nation, 2024 seat"),
          ["England", "Scotland", "Wales", "Northern Ireland"].map(n => chk(n, F.nations.has(n), on => toggleSet(F.nations, n, on), nc.get(n) || 0, "f-n-" + n.replace(/\s/g, "")))),
        el("fieldset", { class: "fgroup" }, el("legend", null, "Hand check"),
          chk("Only MPs with hand-checked records", F.handOnly, on => { F.handOnly = on; rerender(); }, undefined, "f-ho")),
        el("button", { type: "button", class: "btn", onclick: () => { resetF(); rerender(); } }, "Clear all filters"));
    }

    function resetF() {
      Object.assign(F, { q: "", period: "all", minOn: 1, useHand: false, handOnly: false, seatKey: "", seatMin: "", seatMax: "", city: "" });
      for (const s of [F.parties, F.roles, F.nations, F.asks, F.edms]) s.clear();
    }

    function drawResults() {
      const rows = sortRows(MPS.filter(m => passes(m)));
      const P = PERIODS[F.period].get;
      const cols = [["name", "MP"], ["party", "Party"], ["on", "On-topic", true], ["c1", "Claim 1 share"], ["c2", "Claim 2 share"],
        ["arms", "Arms restrictions"], ["rec", "Recognition"], ["edm", "Motions signed", true]];
      const th = ([k, label, n]) => {
        const b = el("button", { type: "button", class: "sortbtn" }, label,
          el("span", { class: "arr", "aria-hidden": "true" }, F.sort === k ? (F.dir > 0 ? "▲" : "▼") : "↕"));
        b.addEventListener("click", () => { if (F.sort === k) F.dir = -F.dir; else { F.sort = k; F.dir = k === "name" || k === "party" ? 1 : -1; } F.shown = 50; drawResults(); });
        return el("th", { class: n ? "n" : null, scope: "col", "aria-sort": F.sort === k ? (F.dir > 0 ? "ascending" : "descending") : "none" }, b);
      };
      const askCell = (m, k) => {
        const a = asksFor(m, F.period)[k];
        const raw = asksFor(m, F.period, false)[k], hc = asksFor(m, F.period, true)[k];
        const removed = (raw.called - hc.called) + (raw.opposed - hc.opposed);
        const parts = [];
        if (a.called) parts.push(el("span", null, "Called for ×" + a.called));
        if (a.opposed) parts.push(el("span", null, "Opposed ×" + a.opposed));
        if (k === "rec" && recBefore(m, F.period)) parts.push(el("span", { class: "xs muted" }, "before UK recognition"));
        if (!F.useHand && removed) parts.push(el("span", { class: "tag corrected", title: "The hand check found " + removed + " of these were not calls." },
          "hand check: " + removed + (removed === 1 ? " not a call" : " not calls")));
        return parts.length ? el("div", { style: "display:grid;gap:1px" }, parts) : el("span", { class: "muted" }, "–");
      };
      const shareCell = (p, k) => p.on >= 5
        ? el("div", { class: "share", title: p[k] + " of " + p.on + " on-topic contributions" },
            el("span", { class: "v" }, pct(p[k] / p.on)),
            el("span", { class: "track" }, el("span", { class: "fill " + k, style: "width:" + (100 * p[k] / p.on).toFixed(1) + "%" })))
        : el("span", { class: "muted", title: "Fewer than 5 on-topic contributions in this period" }, "–");

      const tbody = el("tbody", null, rows.slice(0, F.shown).map(m => {
        const p = P(m);
        const seat = F.period === "pre" ? (m.seat_2019 || m.seat_2024) : (m.seat_2024 || m.seat_2019);
        return el("tr", null,
          el("td", { class: "mpname", "data-label": "MP" }, el("a", { href: "#mp-" + m.id }, m.name),
            el("span", { class: "seat" }, seat || ""),
            m.hand_check.length ? el("span", { class: "tag checked" }, "hand-checked") : null),
          el("td", { "data-label": "Party" }, m.party, m.parties.length > 1 ? el("span", { class: "xs muted", style: "display:block", title: m.parties.join(" → ") }, "party changed") : null),
          el("td", { class: "n", "data-label": "On-topic" }, p.on),
          el("td", { "data-label": "Claim 1 share" }, shareCell(p, "c1")),
          el("td", { "data-label": "Claim 2 share" }, shareCell(p, "c2")),
          el("td", { "data-label": "Arms restrictions" }, askCell(m, "arms")),
          el("td", { "data-label": "Recognition" }, askCell(m, "rec")),
          el("td", { class: "n", "data-label": "Motions signed" }, m.edm["2024"].on_topic + m.edm["2019"].on_topic || el("span", { class: "muted" }, "–")));
      }));
      const table = el("table", { class: "data cards" },
        el("caption", { class: "visually-hidden" }, "MPs matching the filters. Column headers sort the table."),
        el("thead", null, el("tr", null, cols.map(th))), tbody);

      const more = el("div", { class: "more" });
      if (rows.length > F.shown) {
        more.append(el("button", { type: "button", class: "btn", onclick: () => { F.shown += 50; drawResults(); } }, "Show 50 more"),
          el("button", { type: "button", class: "linkbtn", onclick: () => { F.shown = rows.length; drawResults(); } }, "Show all " + rows.length));
      }
      more.append(el("button", { type: "button", class: "linkbtn", onclick: () => downloadCsv(rows) }, "Download these rows (CSV)"));

      const SORTS = [["name", 1, "Name, A to Z"], ["party", 1, "Party"], ["on", -1, "Most on-topic contributions"],
        ["c1", -1, "Highest Claim 1 share"], ["c2", -1, "Highest Claim 2 share"], ["arms", -1, "Most arms-restriction calls"],
        ["rec", -1, "Most recognition calls"], ["edm", -1, "Most motions signed"]];
      const sortSel = el("select", { id: "f-sort", "aria-label": "Sort by" }, SORTS.map(([k, d, l]) =>
        el("option", { value: k, selected: F.sort === k }, l)));
      sortSel.addEventListener("change", () => { const o = SORTS.find(x => x[0] === sortSel.value); F.sort = o[0]; F.dir = o[1]; F.shown = 50; drawResults(); });

      App.put(results, 
        el("label", { class: "sort-phone flabel-inline small", for: "f-sort" }, "Sort by", sortSel),
        el("div", { class: "results-head" },
          el("p", { role: "status", "aria-live": "polite" }, el("b", null, fmtInt(rows.length)), " of " + fmtInt(MPS.length) + " MPs",
            el("span", { class: "muted" }, " · counts for " + PERIODS[F.period].label.toLowerCase() + (rows.length > F.shown ? " · showing " + F.shown : ""))),
          activeChips()),
        rows.length ? el("div", { class: "table-wrap" }, table) : el("p", { class: "panel" }, "No MPs match these filters."),
        more,
        el("p", { class: "xs muted" }, "Each share is the proportion of an MP's on-topic contributions that made the claim in their own voice."));
    }

    function activeChips() {
      const chips = [];
      const add = (label, clear) => chips.push(el("span", { class: "chip" }, label,
        el("button", { type: "button", "aria-label": "Remove filter: " + label, onclick: () => { clear(); rerender(); } }, "×")));
      if (F.q) add("“" + F.q + "”", () => { F.q = ""; });
      F.parties.forEach(p => add(p, () => F.parties.delete(p)));
      F.roles.forEach(r => add(ROLE[r] || "No 2024 contribution", () => F.roles.delete(r)));
      F.asks.forEach(a => add(ASK_FILTERS.find(x => x[0] === a)[1], () => F.asks.delete(a)));
      F.edms.forEach(a => add(EDM_FILTERS.find(x => x[0] === a)[1], () => F.edms.delete(a)));
      F.nations.forEach(n => add(n, () => F.nations.delete(n)));
      if (F.seatKey) add(SEAT_MEASURES[F.seatKey] + (F.seatMin !== "" ? " ≥ " + F.seatMin : "") + (F.seatMax !== "" ? " ≤ " + F.seatMax : ""), () => { F.seatKey = ""; F.seatMin = ""; F.seatMax = ""; });
      if (F.city) add(F.city === "city" ? "City seats" : "Town and village seats", () => { F.city = ""; });
      if (F.useHand) add("Hand-check corrections applied", () => { F.useHand = false; });
      if (F.handOnly) add("Hand-checked only", () => { F.handOnly = false; });
      return chips.length ? el("div", { class: "active-filters", "aria-label": "Active filters" }, chips) : el("span");
    }

    function downloadCsv(rows) {
      const P = PERIODS[F.period].get;
      const head = ["member_id", "name", "party_latest", "seat_2019_parliament", "seat_2024_parliament", "period",
        "on_topic", "claim1_made", "claim2_made", "arms_called_for", "arms_opposed", "recognition_called_for",
        "recognition_opposed", "recognition_called_before_1sep2025", "ceasefire_called_for", "edm_on_topic_2024_parl", "hand_check",
        "hand_check_corrections_applied"];
      const q = v => { const s = String(v ?? ""); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
      const lines = [head.join(",")].concat(rows.map(m => {
        const p = P(m), a = asksFor(m, F.period);
        return [m.id, m.name, m.party, m.seat_2019, m.seat_2024, PERIODS[F.period].label, p.on, p.c1, p.c2,
          a.arms.called, a.arms.opposed, a.rec.called, a.rec.opposed, recBefore(m, F.period) ? 1 : 0, a.cf.called,
          m.edm["2024"].on_topic, m.hand_check.map(h => h.ask + " " + h.code + ": " + h.status).join("; "), F.useHand ? "yes" : "no"].map(q).join(",");
      }));
      const blob = new Blob(["﻿" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
      const a = el("a", { href: URL.createObjectURL(blob), download: "mps-filtered.csv" });
      document.body.append(a); a.click(); a.remove();
    }

    drawFilters(); drawResults();
    return root;
  });

  // ================================================================ MP PAGE
  route("mp", async (r) => {
    const { MPS, SEATS } = await data();
    const m = MPS.find(x => x.id === r.id);
    if (!m) return el("div", { class: "stack" }, el("h1", null, "MP not found"), el("p", null, el("a", { href: "#mps" }, "Back to all MPs")));
    const [d, edms, meta] = await Promise.all([loadMpDetail(m.id), load("data/edms.json"), load("data/meta.json")]);
    const edmBy = new Map(edms.map(e => [e.id, e]));

    const page = el("div", { class: "stack-lg" });
    // ---- head
    const seats = [];
    if (m.seat_2019) seats.push(el("span", null, el("span", { class: "muted" }, "2019 Parliament: "), m.seat_2019));
    if (m.seat_2024) seats.push(el("span", null, el("span", { class: "muted" }, "2024 Parliament: "), m.seat_2024));
    page.append(el("div", { class: "mp-head" },
      el("p", { class: "crumbs" }, el("a", { href: "#mps" }, "← All MPs")),
      el("p", { class: "eyebrow" }, m.parties.join(" → ")),
      el("h1", null, m.name),
      el("div", { class: "mp-meta" }, seats,
        el("span", null, el("span", { class: "muted" }, "Contributions in the data: "), fmtDate(m.first) + " to " + fmtDate(m.last))),
      m.parties.length > 1 ? el("p", { class: "note" }, "This MP's party changed during the period. Each contribution below shows the party they belonged to at the time.") : null,
      m.hand_check.length ? el("p", { class: "note" },
        "Some of the calls recorded for this MP were checked by hand. The result is shown beside each one below.") : null));

    // ---- summary panels
    page.append(el("div", { class: "grid2" }, claimsPanel(m), asksPanel(m), edmPanel(m), seatPanel(m, SEATS)));

    // ---- monthly chart
    page.append(el("section", { class: "panel stack" },
      el("div", { class: "chart-head" }, el("h2", null, "Month by month"),
        el("span", { class: "xs muted" }, "On-topic contributions each month, and how many made each claim")),
      d.months.length ? Charts.monthly(d.months, { from: "2023-10", to: meta.window.last.slice(0, 7), markers: MARKERS,
        label: "On-topic contributions by " + m.name + " each month, with the number making Claim 1 and Claim 2" })
        : el("p", { class: "muted" }, "No on-topic contributions."),
      el("p", { class: "xs muted" }, "Gaps are mostly recess months, when the Commons does not sit.")));

    // ---- contributions
    page.append(contributionsSection(m, d));

    // ---- motions
    page.append(el("section", { class: "stack" },
      el("h2", null, "Early Day Motions signed"),
      d.edms.length ? el("div", { class: "edm-list panel" }, d.edms.map(id => {
        const e = edmBy.get(id);
        const bits = [];
        if (e.c1 === "ASSERTED") bits.push("asserts Claim 1");
        if (e.c2 === "ASSERTED") bits.push("asserts Claim 2");
        if (e.arms === "CALLED_FOR") bits.push("calls for arms restrictions");
        if (e.rec === "CALLED_FOR") bits.push("calls for recognition");
        if (e.cf === "CALLED_FOR") bits.push("calls for a ceasefire");
        return el("div", { class: "edm-item" }, el("span", { class: "muted num" }, fmtDate(e.date)),
          el("div", null, el("a", { href: e.url, target: "_blank", rel: "noopener" }, e.title + " ↗"),
            el("div", { class: "xs muted" }, "EDM " + e.uin + " · " + (bits.length ? bits.join(" · ") : "no claim or ask recorded") +
              (e.reviewed ? " · asks hand-checked" : " · automated coding"))));
      })) : el("p", { class: "muted" }, "No on-topic Early Day Motion signed." +
        (m.main_role_2024 === "government" ? " Ministers do not sign motions, by convention." : "")),
      el("p", { class: "xs muted" }, "No motion in either Parliament opposed arms restrictions or recognition, so signatures can only show support for a call.")));
    return page;
  });

  function claimsPanel(m) {
    const rows = [["Whole period", { on: m.on_topic, c1: m.c1, c2: m.c2 }], ["2019 Parliament", m.pre], ["2024 Parliament", m.p24]];
    const block = (label, p) => {
      if (!p.on) return null;
      const line = (k) => {
        const [lo, hi] = wilson(p[k], p.on);
        const v = p[k] / p.on;
        return el("div", { class: "claimrow" },
          el("span", { class: "lbl" }, el("i", { class: "swatch sw-" + k }), CLAIM[k].short + " made in",
            el("b", null, p.on >= 5 ? pct(v) : p[k] + " of " + p.on)),
          p.on >= 5 ? el("span", { class: "xs muted num" }, p[k] + " of " + p.on) : el("span"),
          p.on >= 5 ? el("div", { class: "ci-bar", style: "grid-column:1/-1", role: "img",
            "aria-label": CLAIM[k].short + ": " + pct(v) + ", 95% range " + pct(lo) + " to " + pct(hi) },
            el("span", { class: "rng bg-" + k, style: `left:${100 * lo}%;width:${100 * (hi - lo)}%` }),
            el("span", { class: "pt bg-" + k, style: `left:${100 * v}%` })) : null);
      };
      return el("div", { class: "stack", style: "gap:.4rem" },
        el("div", { class: "row", style: "justify-content:space-between" }, el("b", { class: "small" }, label),
          el("span", { class: "xs muted" }, p.on + " on-topic contribution" + (p.on === 1 ? "" : "s"))),
        line("c1"), line("c2"));
    };
    return el("section", { class: "panel stack" },
      el("h2", { style: "font-size:1.2rem" }, "Claims made"),
      rows.map(([l, p]) => block(l, p)),
      m.on_topic ? null : el("p", { class: "muted small" }, "No on-topic contributions."),
      el("p", { class: "xs muted" }, "The proportion of on-topic contributions that made each claim in the MP's own voice. The pale band shows the likely range, which is wide when an MP spoke only a few times. Proportions are shown from five contributions upward. " + ACC.claims));
  }

  function asksPanel(m) {
    const hc = (ask) => m.hand_check.filter(h => h.ask === ask);
    const STATUS = { CONFIRMED: "confirmed", REJECTED: "not a call", UNSURE: "unclear", "NONE MISSED": "no missed calls found" };
    const item = (k, askName) => {
      const a = m.asks[k], b = m.asks24[k];
      const lines = [];
      if (!a.called && !a.opposed) lines.push(el("span", { class: "muted" }, "No call for or against recorded."));
      if (a.called) lines.push(el("span", null, "Recorded calling for it in " + a.called + " contribution" + (a.called === 1 ? "" : "s") +
        (a.first_call ? ", first on " + fmtDate(a.first_call) : "") + (b.called ? " (" + b.called + " in the 2024 Parliament)" : "") + "."));
      if (a.opposed) lines.push(el("span", null, "Recorded opposing it in " + a.opposed + " contribution" + (a.opposed === 1 ? "" : "s") + "."));
      if (k === "rec" && a.called) lines.push(el("span", { class: "xs muted" }, m.rec_before_uk ? "The first call came before the UK recognised Palestine (cutoff 1 Sep 2025)." : "No call recorded before the UK recognised Palestine (cutoff 1 Sep 2025)."));
      if (k === "cf" && a.called) lines.push(el("span", { class: "xs muted" }, "Immediate or unconditional: " + m.cf_terms.immediate +
        ". With conditions: " + m.cf_terms.conditional + ". Terms not stated: " + (m.cf_terms.unspecified ?? 0) + "."));
      const checks = askName ? hc(askName).map(h => {
        if (h.status === "REJECTED") {
          const f = h.code === "OPPOSED" ? "opposed" : "called";
          const total = a[f], removed = total - ((m.asks_hc && m.asks_hc[k]) ? m.asks_hc[k][f] : total), rest = total - removed;
          return el("div", { class: "correction" }, "Hand check of \u201C" + ASK_CODE[h.code] + "\u201D: ",
            el("b", null, removed + " of these " + total + (removed === 1 ? " was not a call" : " were not calls")),
            ". On checking, the quoted words were a statement of Government policy or otherwise not a call." +
            (rest ? " The other " + rest + " " + (rest === 1 ? "was" : "were") + " not checked." : "") + " The figure above is the model's.");
        }
        return el("div", { class: "correction" },
          h.status === "NONE MISSED" ? "Hand check for missed calls: " : "Hand check of \u201C" + ASK_CODE[h.code] + "\u201D: ", el("b", null, STATUS[h.status] || h.status), ".");
      }) : [];
      return el("div", { class: "ask" },
        el("div", { class: "top" }, el("i", { class: "swatch sw-" + k }), el("span", { class: "what" }, ASK[k].label)),
        lines, checks,
        el("span", { class: "xs muted" }, ACC[k]));
    };
    return el("section", { class: "panel stack" },
      el("h2", { style: "font-size:1.2rem" }, "Calls recorded"),
      el("div", { class: "asks" }, item("arms", "arms_exports"), item("rec", "recognition"), item("cf", null)),
      null);
  }

  function edmPanel(m) {
    const e24 = m.edm["2024"], e19 = m.edm["2019"];
    const yn = v => v ? "Yes" : "No";
    return el("section", { class: "panel stack" },
      el("h2", { style: "font-size:1.2rem" }, "Early Day Motions"),
      el("dl", { class: "kv" },
        el("dt", null, "On-topic motions signed, 2024 Parliament"), el("dd", null, e24.on_topic),
        el("dt", null, "Signed one calling for recognition (tabled before 1 Sep 2025)"), el("dd", null, yn(e24.rec_before_uk)),
        el("dt", null, "Signed one calling for arms restrictions"), el("dd", null, yn(e24.arms)),
        el("dt", null, "Of those, motions making Claim 1 / Claim 2"), el("dd", null, e24.c1 + " / " + e24.c2),
        el("dt", null, "On-topic motions signed, 2019 Parliament"), el("dd", null, e19.on_topic)),
      el("p", { class: "xs muted" }, "Calls in motions were checked by hand. Claims in motions were coded automatically. Ministers and whips don't sign motions."));
  }

  const SEAT_ROWS = [
    ["muslim_pc", "Muslim population share", "%", "gb"], ["jewish_pc", "Jewish population share", "%", "gb"],
    ["ethnic_minority_pc", "Ethnic minority share", "%"], ["degree_pc", "Degree-level share (16+)", "%"],
    ["young_adult_pc", "Adults aged 18–34", "% of adults"], ["child_poverty_pc", "Child poverty, after housing costs", "%"],
    ["majority_pc", "2024 majority", "% of valid votes"],
  ];
  function seatPanel(m, SEATS) {
    const s = m._seat;
    if (!s) return el("section", { class: "panel stack" }, el("h2", { style: "font-size:1.2rem" }, "Seat"),
      el("p", { class: "small muted" }, m.seat_2019 && !m.seat_2024
        ? "This MP sat for " + m.seat_2019 + " before the 2024 election. Seat figures are only available for the boundaries used from July 2024."
        : "No seat on the 2024 boundaries in the data."));
    const all = [...SEATS.values()];
    const rank = (k, v) => {
      const vals = all.map(x => x[k]).filter(x => x !== null && x !== undefined);
      const below = vals.filter(x => x < v).length, above = vals.filter(x => x > v).length, n = vals.length;
      let text;
      if (!above) text = "the highest of " + n + " seats";
      else if (!below) text = "the lowest of " + n + " seats";
      else text = "higher than " + Math.min(99, Math.max(1, Math.round(100 * below / (n - 1)))) + "% of the other " + (n - 1) + " seats";
      return text;
    };
    const num = v => v < 1 ? v.toFixed(2) : v.toFixed(1);
    return el("section", { class: "panel stack" },
      el("h2", { style: "font-size:1.2rem" }, "Seat: " + s.name),
      el("p", { class: "xs muted" }, s.region + ", " + s.nation + " · 2024 boundaries · 2024 winning party: " + s.winner_party_2024),
      el("dl", { class: "kv" }, SEAT_ROWS.map(([k, label, unit]) => {
        const v = s[k];
        if (v === null || v === undefined) return [el("dt", null, label), el("dd", { class: "muted" }, "not available")];
        return [el("dt", null, label), el("dd", null, num(v) + unit,
          el("span", { class: "muted", style: "display:block" }, rank(k, v)))];
      }), el("dt", null, "City or town"), el("dd", null, s.city === null ? "–" : s.city ? "City" : "Town or village")),
      s.challenger !== null ? el("p", { class: "xs muted" }, "2024: a candidate classified as Gaza-focused on their own published material took 5% or more of the vote: " +
        ({ "1": "yes", "0": "no", "UNKNOWN": "not determinable" }[s.challenger] || s.challenger) + ".") : null,
      el("p", { class: "xs muted" }, "Census 2021 (Scotland 2022), from the House of Commons Library. Northern Ireland's census did not ask a comparable religion question. These figures describe the area, not the MP or its voters."));
  }

  function contributionsSection(m, d) {
    const S = { q: "", period: "all", only: "", shown: 20 };
    const box = el("section", { class: "stack" });
    const listWrap = el("div");
    const search = el("input", { type: "search", id: "c-q", placeholder: "Search debate titles and quoted words", "aria-label": "Search contributions" });
    search.addEventListener("input", () => { S.q = search.value.toLowerCase(); S.shown = 20; draw(); });
    const per = el("select", { id: "c-per", "aria-label": "Period" },
      [["all", "Whole period"], ["pre", "2019 Parliament"], ["p24", "2024 Parliament"]].map(([v, l]) => el("option", { value: v }, l)));
    per.addEventListener("change", () => { S.period = per.value; S.shown = 20; draw(); });
    const only = el("select", { id: "c-only", "aria-label": "Show only" },
      [["", "All on-topic contributions"], ["c1", "Claim 1 made"], ["c2", "Claim 2 made"], ["both", "Both claims made"],
        ["arms", "Arms restrictions raised"], ["rec", "Recognition raised"], ["cf", "Ceasefire raised"], ["hc", "Hand-checked"]]
        .map(([v, l]) => el("option", { value: v }, l)));
    only.addEventListener("change", () => { S.only = only.value; S.shown = 20; draw(); });
    box.append(el("h2", null, "Contributions"),
      el("p", { class: "small" }, "Every on-topic contribution, newest first. Each entry shows the words the coding is based on, and the Hansard link opens the full speech."),
      el("div", { class: "toolbar" }, search, per, only), listWrap);

    function match(c) {
      if (S.period === "pre" && c.d >= "2024-07-04") return false;
      if (S.period === "p24" && c.d < "2024-07-04") return false;
      const o = S.only;
      if (o === "c1" && c.c1 !== "ASSERTED") return false;
      if (o === "c2" && c.c2 !== "ASSERTED") return false;
      if (o === "both" && !(c.c1 === "ASSERTED" && c.c2 === "ASSERTED")) return false;
      if (o === "arms" && !(c.arms && c.arms !== "ABSENT")) return false;
      if (o === "rec" && !(c.rec && c.rec !== "ABSENT")) return false;
      if (o === "cf" && !(c.cf && c.cf !== "ABSENT")) return false;
      if (o === "hc" && !c.hc.length) return false;
      if (S.q && !(c.t + " " + c.q1 + " " + c.q2 + " " + c.qa + " " + c.qr + " " + c.qc).toLowerCase().includes(S.q)) return false;
      return true;
    }
    function codeRow(swatch, label, value, quote) {
      return el("div", { class: "code" },
        el("span", { class: "k" }, el("i", { class: "swatch sw-" + swatch }), label),
        el("span", null, el("span", { class: "v" }, value), quote ? [" ", el("q", null, quote)] : null));
    }
    // A few codes returned by the model are not in the scheme. They are shown as such and not counted.
    const label = (map, v) => map[v] || "not counted (the model returned an unusable code)";
    function card(c) {
      const rows = [];
      if (c.c1 !== "ABSENT") rows.push(codeRow("c1", "Claim 1", label(CLAIM_CODE, c.c1), c.q1));
      if (c.c2 !== "ABSENT") rows.push(codeRow("c2", "Claim 2", label(CLAIM_CODE, c.c2), c.q2));
      if (c.arms && c.arms !== "ABSENT") rows.push(codeRow("arms", "Arms restrictions", label(ASK_CODE, c.arms), c.qa));
      if (c.rec && c.rec !== "ABSENT") rows.push(codeRow("rec", "Recognition", label(ASK_CODE, c.rec), c.qr));
      if (c.cf && c.cf !== "ABSENT") rows.push(codeRow("cf", "Ceasefire", label(ASK_CODE, c.cf) + (c.cft ? " (" + c.cft.toLowerCase() + ")" : ""), c.qc));
      if (!rows.length) rows.push(el("p", { class: "small muted" }, "Neither claim was made in the MP's own voice, and no call was recorded."));
      const VERD = { YES: "confirmed as a call", NO: "not a call", UNSURE: "unsure" };
      return el("article", { class: "contrib" },
        el("div", { class: "top" },
          el("div", null, el("span", { class: "title" }, c.t), el("div", { class: "ctx" }, fmtDate(c.d) + " · speaking as " + (c.role === "opposition" ? "an " : "a ") + (ROLE_SHORT[c.role] || c.role) + (c.party ? " · " + c.party : ""))),
          el("a", { class: "small", href: c.u, target: "_blank", rel: "noopener" }, "Read in Hansard ↗")),
        el("div", { class: "codes" }, rows),
        c.hc.length ? el("div", { class: "hc" }, c.hc.map(h => el("div", null, "Hand check of “" + (ASK_CODE[h.code] || h.code) + " " + (h.ask === "arms_exports" ? "arms restrictions" : "recognition") + "”: " + (VERD[h.verdict] || h.verdict)))) : null);
    }
    function draw() {
      const rows = d.contributions.filter(match).slice().reverse();
      const shown = rows.slice(0, S.shown);
      App.put(listWrap, 
        el("p", { class: "small muted", role: "status", "aria-live": "polite" }, rows.length + " of " + d.contributions.length + " on-topic contributions" + (m.off_topic ? " · " + m.off_topic + " further contribution" + (m.off_topic === 1 ? "" : "s") + " in these debates judged off topic" : "")),
        el("div", { class: "contribs" }, shown.map(card)),
        rows.length > S.shown ? el("div", { class: "more" }, el("button", { type: "button", class: "btn", onclick: () => { S.shown += 20; draw(); } }, "Show 20 more")) : null);
    }
    draw();
    return box;
  }
})();
