/* Timeline, Parties and Seats pages. */
"use strict";

(() => {
  const { el, load, fmtDate, fmtInt, fmtMonth, pct, wilson, CLAIM, ROLE, route } = App;

  const MAIN_PARTIES = ["Labour", "Conservative", "Liberal Democrat", "Scottish National Party", "Independent"];
  const groupOf = p => MAIN_PARTIES.includes(p) ? p : "Other parties";
  const GROUPS = MAIN_PARTIES.concat(["Other parties"]);
  const ROLES = [["government", "Ministers"], ["opposition", "Opposition frontbench"], ["backbench", "Backbenchers"]];
  const EVENTS = [
    { m: "2024-02", label: "Ceasefire vote, 21 Feb" },
    { m: "2024-07", label: "Election, 4 Jul" },
    { m: "2025-09", label: "UK recognition, 21 Sep" },
  ];
  const MIN_MONTH = 20;   // months with fewer on-topic contributions are left blank on share charts (as in step 2)

  let CUBE = null;
  async function cube() {
    if (!CUBE) {
      const c = await load("data/cube.json");
      const ix = Object.fromEntries(c.columns.map((k, i) => [k, i]));
      CUBE = { periods: c.periods, rows: c.rows.map(r => Object.fromEntries(Object.entries(ix).map(([k, i]) => [k, r[i]]))) };
    }
    return CUBE;
  }
  const sum = (rows, k) => rows.reduce((a, r) => a + r[k], 0);

  function chk(label, checked, onchange, id, count) {
    const input = el("input", { type: "checkbox", id, checked: !!checked });
    input.addEventListener("change", () => onchange(input.checked));
    return el("label", { class: "check", for: id }, input, el("span", null, label), count !== undefined ? el("span", { class: "cnt" }, count) : null);
  }
  function seg(options, value, onpick, label) {
    return el("div", { class: "seg", role: "group", "aria-label": label },
      options.map(([v, l]) => {
        const b = el("button", { type: "button", "aria-pressed": String(value === v) }, l);
        b.addEventListener("click", () => onpick(v));
        return b;
      }));
  }
  const panel = (...kids) => el("section", { class: "panel stack" }, ...kids);
  const h2 = t => el("h2", { class: "h-panel" }, t);

  // ================================================================ TIMELINE
  const TL = { parties: new Set(), roles: new Set(), from: "2023-10", to: null, ask: "called" };

  route("timeline", async () => {
    const C = await cube();
    const [meta, NEWS] = await Promise.all([load("data/meta.json"), load("data/news.json")]);
    const last = meta.window.last.slice(0, 7);
    if (!TL.to) TL.to = last;
    const allMonths = Charts.monthRange("2023-10", last);
    const root = el("div", { class: "stack-lg" });
    const controls = el("div", { class: "panel controls" });
    const out = el("div", { class: "stack-lg" });
    root.append(el("div", { class: "stack" },
      el("h1", null, "Timeline"),
      el("p", null, "How often the subject came up in the Commons each month, and how often each claim and call was made. Choose parties and roles to compare groups. Ministers speak more often than anyone else, so they carry a lot of weight in these totals.")),
      controls, out);

    function draw() {
      const months = allMonths.filter(m => m >= TL.from && m <= TL.to);
      const rows = C.rows.filter(r => (!TL.parties.size || TL.parties.has(groupOf(r.party))) && (!TL.roles.size || TL.roles.has(r.role)));
      const byM = new Map(months.map(m => [m, []]));
      rows.forEach(r => { if (byM.has(r.month)) byM.get(r.month).push(r); });
      const agg = months.map(m => { const rs = byM.get(m); return { m, on: sum(rs, "on_topic"), c1: sum(rs, "c1"), c2: sum(rs, "c2"),
        arms: sum(rs, "arms_" + TL.ask), rec: sum(rs, "rec_" + TL.ask), cf: sum(rs, "cf_" + TL.ask) }; });

      const sel = (TL.parties.size ? [...TL.parties].join(", ") : "All parties") + " · " + (TL.roles.size ? [...TL.roles].map(r => ROLES.find(x => x[0] === r)[1]).join(", ") : "all roles");
      const shareVal = (k) => agg.map(a => {
        if (a.on < MIN_MONTH) return null;
        const [lo, hi] = wilson(a[k], a.on);
        return { v: a[k] / a.on, lo, hi };
      });

      // charts
      const attention = Charts.timeSeries([{ label: "On-topic contributions", cls: "", values: agg.map(a => ({ v: a.on })) }],
        { months, kind: "bars", markers: EVENTS, label: "On-topic contributions per month, " + sel });
      const shares = Charts.timeSeries([
        { label: "Claim 1", cls: "c1", values: shareVal("c1") },
        { label: "Claim 2", cls: "c2", values: shareVal("c2") }],
        { months, kind: "lines", percent: true, markers: EVENTS, label: "Share of on-topic contributions making each claim, per month, " + sel,
          tipExtra: i => agg[i].on + " on-topic contributions" });
      const asks = Charts.timeSeries([
        { label: "Arms restrictions", cls: "arms", band: false, values: agg.map(a => ({ v: a.arms })) },
        { label: "Recognition", cls: "rec", band: false, values: agg.map(a => ({ v: a.rec })) },
        { label: "Ceasefire", cls: "cf", band: false, values: agg.map(a => ({ v: a.cf })) }],
        { months, kind: "lines", markers: EVENTS, label: "Contributions recording each call, per month, " + sel });

      const monthTable = Charts.table("Monthly figures, " + sel,
        [["Month"], ["On-topic", 1], ["Claim 1 made", 1], ["Claim 2 made", 1], ["Arms " + (TL.ask === "called" ? "called for" : "opposed"), 1],
          ["Recognition " + (TL.ask === "called" ? "called for" : "opposed"), 1], ["Ceasefire " + (TL.ask === "called" ? "called for" : "opposed"), 1]],
        agg.filter(a => a.on).map(a => [fmtMonth(a.m, true), a.on, a.c1, a.c2, a.arms, a.rec, a.cf]));

      // period summary (exact step 2 periods)
      const prow = C.periods.map(([p, from, to, label]) => {
        const rs = rows.filter(r => r.period === p);
        const on = sum(rs, "on_topic"), c1 = sum(rs, "c1"), c2 = sum(rs, "c2");
        const ci = k => { const [lo, hi] = wilson(k, on); return on ? pct(k / on) + " (" + pct(lo) + "–" + pct(hi) + ")" : "–"; };
        return [label, fmtDate(from) + " to " + fmtDate(to), fmtInt(on), ci(c1), ci(c2)];
      });

      App.put(out, 
        panel(el("div", { class: "chart-head" }, h2("How often the subject came up"), el("span", { class: "xs muted" }, sel)),
          Charts.withTableToggle(attention, monthTable.cloneNode(true)),
          el("p", { class: "xs muted" }, "On-topic contributions in the Commons Chamber each month. Months with few or none are mostly recesses.")),
        panel(el("div", { class: "chart-head" }, h2("Claims made"), el("span", { class: "xs muted" }, sel)),
          legend([["c1", "Claim 1: harm to Palestinians / international law"], ["c2", "Claim 2: Israeli security / 7 October"]]),
          Charts.withTableToggle(shares, monthTable.cloneNode(true)),
          el("p", { class: "xs muted" }, "The share of on-topic contributions that made each claim in the speaker's own voice. One contribution can make both, so the two lines don't add up to 100%. The shaded bands show the likely range. Months with fewer than 20 contributions in the selection are left blank.")),
        panel(el("div", { class: "chart-head" }, h2("Calls recorded"),
            seg([["called", "Calls for"], ["opposed", "Calls against"]], TL.ask, v => { TL.ask = v; draw(); }, "Calls for or against")),
          legend([["arms", "Arms restrictions"], ["rec", "Recognition"], ["cf", "Ceasefire"]]),
          Charts.withTableToggle(asks, monthTable),
          el("p", { class: "xs muted" }, "The number of contributions each month in which an MP was recorded calling " + (TL.ask === "called" ? "for" : "against") + " each one. These are counts, so they rise and fall with how often the Commons sat.")),
        newsPanel(months, agg, sel),
        panel(h2("The four periods"),
          el("p", { class: "small" }, "The periods were set before the data was looked at. The first two are the 2019 Parliament, the last two the 2024 Parliament."),
          el("div", { class: "table-wrap" }, Charts.table("Claims by period, " + sel,
            [["Period"], ["Dates"], ["On-topic", 1], ["Claim 1 (likely range)", 1], ["Claim 2 (likely range)", 1]], prow))),
        el("p", { class: "note" }, "These figures come from automated coding. Checked against blind hand-coding, the model records slightly more of both claims than a person would: about 11% more Claim 1 and 17% more Claim 2. That moves the levels a little but not the trends. Ministers answer for the Government, so a party's figures change a lot when it enters or leaves office."));
      drawControls();
    }

    function newsPanel(months, agg, sel) {
      const allNews = NEWS.events;
      const nm = new Map(NEWS.monthly.map(r => [r[0], r]));
      const coverage = Charts.timeSeries([{ label: "UK coverage index", cls: "neutral", band: false,
        values: months.map(m => nm.has(m) ? { v: nm.get(m)[1] } : null) }],
        { months, kind: "lines", news: allNews, label: "Monthly average of the UK news coverage index",
          tipExtra: i => nm.has(months[i]) ? nm.get(months[i])[2] + " days with data" : "no data" });
      const CAT = { "other": "Other", "truce, hostage or prisoner deal": "Truce, hostage or prisoner deal" };
      const arrow = (x, y) => el("span", { class: "nowrap" }, x + " → " + y);
      const evTable = Charts.table("The ten biggest UK news days, with the Commons in the 14 days before and after",
        [["No.", 1], ["Date"], ["Main story in the UK headlines that day"], ["Type"],
          ["On-topic contributions, before → after", 1], ["Claim 1 made, before → after", 1], ["Claim 2 made, before → after", 1]],
        NEWS.events.map(e => {
          const c = e.commons;
          const claim = k => c.shares
            ? el("span", null, arrow(Math.round(c[k + "_before"] * c.on_before), Math.round(c[k + "_after"] * c.on_after)),
                el("span", { class: "xs muted", style: "display:block" }, arrow(pct(c[k + "_before"]), pct(c[k + "_after"]))))
            : el("span", { class: "xs muted" }, "too few to compare");
          return [e.no, fmtDate(e.date),
            el("span", null, e.summary, e.on_topic ? null : el("span", { class: "xs muted", style: "display:block" }, "A wider regional story, not mainly about Israel and Palestine")),
            CAT[e.category] || e.category, arrow(c.on_before, c.on_after), claim("c1"), claim("c2")];
        }));
      const claimsByMonth = Charts.timeSeries([
        { label: "Claim 1 made", cls: "c1", band: false, values: agg.map(a => ({ v: a.c1 })) },
        { label: "Claim 2 made", cls: "c2", band: false, values: agg.map(a => ({ v: a.c2 })) }],
        { months, kind: "lines", news: allNews, label: "Contributions making each claim, per month, " + sel,
          tipExtra: i => agg[i].on + " on-topic contributions" });
      return panel(h2("Major UK news days"),
        el("p", { class: "small" }, "The ten days when UK online news coverage of the subject rose furthest above its usual level for that day of the week, and what was said in the Commons in the 14 days either side. The two charts below share the same months and the same numbered days, so the news lines up with the claims made in the Commons."),
        el("div", { class: "table-wrap" }, evTable),
        el("p", { class: "xs muted" }, "Before and after cover the 14 days either side of each news day, for the whole House, leaving out the day itself. Shares are only compared where both fortnights had at least 20 on-topic contributions; that was true for five of the eight days about Israel and Palestine. Which debates happen to fall in a fortnight, and recesses, move these figures a great deal, so five days are an illustration, not evidence that news changes what MPs say."),
        el("h3", { class: "small-h" }, "UK news coverage, monthly average"),
        coverage,
        el("h3", { class: "small-h" }, "Contributions making each claim, per month"),
        legend([["c1", "Claim 1: harm to Palestinians / international law"], ["c2", "Claim 2: Israeli security / 7 October"]]),
        claimsByMonth,
        el("p", { class: "xs muted" }, "Counts of on-topic contributions making each claim, for the parties and roles chosen above (" + sel + "). Counts rise and fall with how often the Commons sat."),
        el("p", { class: "xs muted" }, "Coverage source: the GDELT Project's count of UK online articles mentioning Gaza, Israel, Israeli, Palestinian, Palestine or Hamas, divided by all the articles GDELT monitored worldwide that day. It is an index, not a share of UK news. " +
          NEWS.missing_days + " days had no usable figure and are left out, never counted as zero."),
        el("p", { class: "xs muted" }, "The rule for picking the days was fixed before anything was compared with the Commons, and was revised twice before that point because early versions picked mostly weekends. Each day was described from its UK headlines under rules set in advance, without looking at what MPs said, and the descriptions were then checked and locked. Harm to either side was not the main story on any of the ten days."));
    }

    function drawControls() {
      const counts = new Map();
      C.rows.forEach(r => counts.set(groupOf(r.party), (counts.get(groupOf(r.party)) || 0) + r.on_topic));
      const mSel = (id, val, on, label) => {
        const s = el("select", { id }, allMonths.map(m => el("option", { value: m, selected: m === val }, fmtMonth(m, true))));
        s.addEventListener("change", () => on(s.value));
        return el("label", { class: "flabel-inline", for: id }, label, s);
      };
      App.put(controls, 
        el("fieldset", { class: "fgroup" }, el("legend", null, "Party at the time"),
          el("div", { class: "checks-row" }, GROUPS.map((g, i) => chk(g, TL.parties.has(g), on => { on ? TL.parties.add(g) : TL.parties.delete(g); draw(); }, "tl-p" + i, fmtInt(counts.get(g) || 0))))),
        el("fieldset", { class: "fgroup" }, el("legend", null, "Speaking as"),
          el("div", { class: "checks-row" }, ROLES.map(([k, l]) => chk(l, TL.roles.has(k), on => { on ? TL.roles.add(k) : TL.roles.delete(k); draw(); }, "tl-r-" + k)))),
        el("div", { class: "fgroup" }, el("span", { class: "flabel" }, "Months"),
          el("div", { class: "checks-row" },
            mSel("tl-from", TL.from, v => { TL.from = v; if (TL.to < v) TL.to = v; draw(); }, "From "),
            mSel("tl-to", TL.to, v => { TL.to = v; if (TL.from > v) TL.from = v; draw(); }, "to "),
            el("button", { type: "button", class: "linkbtn", onclick: () => { TL.from = "2023-10"; TL.to = "2024-05"; draw(); } }, "2019 Parliament"),
            el("button", { type: "button", class: "linkbtn", onclick: () => { TL.from = "2024-07"; TL.to = allMonths[allMonths.length - 1]; draw(); } }, "2024 Parliament"),
            el("button", { type: "button", class: "linkbtn", onclick: () => { TL.from = "2023-10"; TL.to = allMonths[allMonths.length - 1]; draw(); } }, "Whole period"))),
        el("p", { class: "xs muted" }, "Ticking nothing in a group includes everything. The numbers beside each party are its on-topic contributions over the whole period."));
    }
    draw();
    return root;
  });

  function legend(items) {
    return el("div", { class: "legend", "aria-hidden": "true" }, items.map(([cls, l]) => el("span", null, el("i", { class: "dot bg-" + cls }), l)));
  }

  // ================================================================ PARTIES
  const PA = { period: "p24", minOn: 1 };
  const PERIOD_LABEL = { pre: "2019 Parliament (to May 2024)", p24: "2024 Parliament (from July 2024)", all: "Whole period" };
  const EDM_PARTY = { Lab: "Labour", Con: "Conservative", LD: "Liberal Democrat", SNP: "Scottish National Party", SF: "Sinn Féin",
    Ind: "Independent", DUP: "Democratic Unionist Party", RUK: "Reform UK", Other: "Other parties",
    Green: "Green Party", PC: "Plaid Cymru", SDLP: "SDLP", APNI: "Alliance", TUV: "TUV", UUP: "UUP" };

  route("parties", async () => {
    const [C, mps, ep] = await Promise.all([cube(), load("data/mps.json"), load("data/edm_party.json")]);
    const root = el("div", { class: "stack-lg" });
    const out = el("div", { class: "stack-lg" });
    const ctl = el("div", { class: "panel controls" });
    root.append(el("div", { class: "stack" },
      el("h1", null, "Parties"),
      el("p", null, "Each party's record side by side. Parties are listed by how many on-topic contributions their MPs made, and are shown in the same neutral colour."),
      el("p", { class: "note" }, "Whether a party is in government changes these figures a great deal. Before July 2024 most Conservative contributions were ministers answering for the Government; after it, most Labour contributions were. Compare like with like using the role split below.")),
      ctl, out);

    function draw() {
      App.put(ctl, 
        el("div", { class: "fgroup" }, el("span", { class: "flabel" }, "Period"),
          seg([["pre", "2019 Parliament"], ["p24", "2024 Parliament"], ["all", "Whole period"]], PA.period, v => { PA.period = v; draw(); }, "Period")));
      const inP = r => PA.period === "all" || (PA.period === "pre" ? (r.period === "P1" || r.period === "P2") : (r.period === "P3" || r.period === "P4"));
      const rows = C.rows.filter(inP);
      const groups = GROUPS.map(g => ({ g, rs: rows.filter(r => groupOf(r.party) === g) }))
        .map(o => Object.assign(o, { on: sum(o.rs, "on_topic") })).filter(o => o.on > 0).sort((a, b) => b.on - a.on);

      // A. claims, dot rows
      // A plain filled bar: the share of the party's contributions that made the claim.
      const ciCell = (k, n, cls) => {
        if (n < 20) return el("span", { class: "xs muted" }, "too few to compare");
        const [lo, hi] = wilson(k, n), v = k / n;
        return el("div", { class: "pbar" },
          el("div", { class: "hbar-track", role: "img", "aria-label": pct(v) + " of contributions, likely range " + pct(lo) + " to " + pct(hi) },
            el("span", { class: "hbar-fill bg-" + cls, style: "width:" + (100 * v).toFixed(1) + "%" })),
          el("span", { class: "num small" }, el("b", null, pct(v)),
            el("span", { class: "xs muted", style: "display:block;white-space:nowrap" }, fmtInt(k) + " of " + fmtInt(n))));
      };
      const claimRows = groups.map(o => el("div", { class: "prow" },
        el("div", null, el("b", null, o.g), el("div", { class: "xs muted" }, fmtInt(o.on) + " contributions")),
        ciCell(sum(o.rs, "c1"), o.on, "c1"), ciCell(sum(o.rs, "c2"), o.on, "c2")));

      // B. by role
      const roleTable = Charts.table("Claims by party and role",
        [["Party"]].concat(ROLES.map(([, l]) => [l])),
        groups.map(o => [o.g].concat(ROLES.map(([k]) => {
          const rs = o.rs.filter(r => r.role === k), n = sum(rs, "on_topic");
          if (!n) return el("span", { class: "muted" }, "–");
          return el("span", null, el("span", { class: "c1t" }, "Claim 1 " + pct(sum(rs, "c1") / n)), " · ",
            el("span", { class: "c2t" }, "Claim 2 " + pct(sum(rs, "c2") / n)), el("span", { class: "xs muted", style: "display:block" }, n + " contributions" + (n < 20 ? ", too few to compare" : "")));
        }))));

      // C. MP-level calls
      const P = PA.period;
      const partyFor = m => P === "pre" ? m.party_2019 : P === "p24" ? m.party_2024 : m.party;
      const onFor = m => P === "pre" ? m.pre.on : P === "p24" ? m.p24.on : m.on_topic;
      const askFor = (m, k) => {
        const a = m.asks[k], b = m.asks24[k];
        return P === "all" ? a : P === "p24" ? b : { called: a.called - b.called, opposed: a.opposed - b.opposed };
      };
      const pool = mps.filter(m => onFor(m) >= PA.minOn && partyFor(m));
      const mpGroups = GROUPS.map(g => ({ g, ms: pool.filter(m => groupOf(partyFor(m)) === g) })).filter(o => o.ms.length)
        .sort((a, b) => (groups.findIndex(x => x.g === a.g) + 99 * (groups.findIndex(x => x.g === a.g) < 0)) - (groups.findIndex(x => x.g === b.g) + 99 * (groups.findIndex(x => x.g === b.g) < 0)));
      const frac = (k, n) => el("span", null, k + " of " + n, el("span", { class: "xs muted", style: "display:block" }, pct(k / n)));
      const callTable = Charts.table("Calls recorded, by party",
        [["Party"], ["MPs", 1], ["Called for arms restrictions", 1], ["Opposed arms restrictions", 1], ["Called for recognition", 1], ["Opposed recognition", 1], ["Called for a ceasefire", 1]],
        mpGroups.map(o => { const n = o.ms.length; const c = (k, f) => o.ms.filter(m => askFor(m, k)[f] > 0).length;
          return [o.g, n, frac(c("arms", "called"), n), frac(c("arms", "opposed"), n), frac(c("rec", "called"), n), frac(c("rec", "opposed"), n), frac(c("cf", "called"), n)]; }));
      const minSel = el("select", { id: "pa-min" }, [[1, "spoke on the subject at least once"], [5, "spoke on it 5 or more times"], [20, "spoke on it 20 or more times"]]
        .map(([v, l]) => el("option", { value: v, selected: PA.minOn === v }, l)));
      minSel.addEventListener("change", () => { PA.minOn = Number(minSel.value); draw(); });

      // D. motions
      const edmRows = ep.rows.map(r => [EDM_PARTY[r.party] || r.party, r.n,
        frac(r.any, r.n), frac(r.rec, r.n), frac(r.arms, r.n), frac(r.c1, r.n), frac(r.c2, r.n)]);

      App.put(out, 
        panel(h2("Claims made, " + PERIOD_LABEL[P]),
          el("div", { class: "prow prow-head xs muted" }, el("span", null, "Party"),
            el("span", null, el("i", { class: "swatch sw-c1" }), " Claim 1: harm to Palestinians / international law"),
            el("span", null, el("i", { class: "swatch sw-c2" }), " Claim 2: Israeli security / 7 October")),
          claimRows,
          el("p", { class: "xs muted" }, "Each bar shows the percentage of a party's on-topic contributions that made the claim in the speaker's own voice, from 0% to 100%. A contribution can make both claims or neither, so each claim is measured on its own and the two don't add up to 100%. Party is the party at the time of speaking. Groups with fewer than 20 contributions are not compared.")),
        panel(h2("Claims made, by role"),
          el("div", { class: "table-wrap" }, roleTable),
          el("p", { class: "xs muted" }, "Ministers' contributions are mostly answers and statements for the Government.")),
        panel(h2("Calls recorded, by party"),
          el("label", { class: "flabel-inline small", for: "pa-min" }, "Count MPs who ", minSel),
          el("div", { class: "table-wrap" }, callTable),
          el("p", { class: "xs muted" }, "MPs who were recorded at least once in the period. The more often an MP spoke, the more chances they had to make a call, so a low figure partly reflects how often a party's MPs spoke. Party is the party in that Parliament. The calls are coded automatically: 94% of recorded recognition calls and 71% of arms-restriction calls were confirmed by hand.")),
        panel(h2("Early Day Motions signed, 2024 Parliament"),
          el("div", { class: "table-wrap" }, Charts.table("Motion signing by party",
            [["Party"], ["MPs", 1], ["Any on-topic motion", 1], ["A motion calling for recognition", 1], ["A motion calling for arms restrictions", 1], ["A motion making Claim 1", 1], ["A motion making Claim 2", 1]], edmRows)),
          el("p", { class: "xs muted" }, "All MPs elected in July 2024, by party at the election, leaving out ministers, whips and the Speaker's chair, who don't sign motions. Sinn Féin MPs don't take their seats, so they can't sign. Parties with fewer than five such MPs are grouped (" + ep.other.join(", ") + "). No motion opposed either call.")));
    }
    draw();
    return root;
  });

  // ================================================================ SEATS
  const MEASURES = {
    muslim_pc: ["Muslim population share", "%"], jewish_pc: ["Jewish population share", "%"],
    ethnic_minority_pc: ["Ethnic minority share", "%"], degree_pc: ["Degree-level share (16+)", "%"],
    young_adult_pc: ["Adults aged 18–34", "%"], child_poverty_pc: ["Child poverty, after housing costs", "%"],
    majority_pc: ["2024 majority", " pts"],
  };
  const OUTCOMES = {
    claims: "Claim 1 and Claim 2 in speeches",
    rec: "Called for recognition before the UK recognised Palestine",
    arms: "Called for arms restrictions",
    edm_rec: "Signed a motion calling for recognition",
    edm_arms: "Signed a motion calling for arms restrictions",
    on: "Number of on-topic contributions",
  };
  const SE = { x: "muslim_pc", out: "claims", parties: new Set(), roles: new Set(), nations: new Set(), minOn: 5, useHand: false };
  const PARTY_CODE = { Lab: "Labour", Con: "Conservative", LD: "Liberal Democrat", SNP: "Scottish National Party", Ind: "Independent" };

  route("seats", async () => {
    const [mps, seats] = await Promise.all([load("data/mps.json"), load("data/seats.json")]);
    const byId = new Map(mps.map(m => [m.id, m]));
    const root = el("div", { class: "stack-lg" });
    const ctl = el("div", { class: "panel controls" });
    const out = el("div", { class: "stack" });
    root.append(el("div", { class: "stack" },
      el("h1", null, "Seats"),
      el("p", null, "Pick a figure about the seat and something MPs said or signed, and see them side by side. Each dot is one MP on the 2024 boundaries. Select a dot to open that MP's page."),
      el("p", { class: "note" }, "This page shows patterns, and patterns can come from many things at once. Party matters far more than any seat figure, so filter by party to compare like with like. A pattern here says nothing about what any voter thinks. The results that were tested, with their limits, are on the Findings page.")),
      ctl, out);

    function draw() {
      const isEdm = SE.out.startsWith("edm_");
      // the people in view
      let pts;
      if (isEdm) {
        pts = seats.filter(s => s.mp_2024 && !s.mp_2024.gov_post && !s.mp_2024.chair).map(s => {
          const party = PARTY_CODE[s.mp_2024.party] || (byId.get(s.mp_2024.id) || {}).party_2024 || s.mp_2024.party;
          return { s, id: s.mp_2024.id, name: s.mp_2024.name, party, role: null,
            y: SE.out === "edm_rec" ? s.mp_2024.edm_rec_before_uk : s.mp_2024.edm_arms };
        });
      } else {
        pts = mps.filter(m => m.gss && m.p24.on >= SE.minOn).map(m => {
          const s = seats.find(x => x.gss === m.gss);
          const recCalled = m.asks24.rec.first_call && m.asks24.rec.first_call < "2025-09-01" && (!SE.useHand || m.after_hand_check.rec_called);
          const armsCalled = m.asks24.arms.called > 0 && (!SE.useHand || m.after_hand_check.arms_called);
          return { s, id: m.id, name: m.name, party: m.party_2024 || m.party, role: m.main_role_2024, m,
            y: SE.out === "rec" ? !!recCalled : SE.out === "arms" ? armsCalled : null };
        });
      }
      pts = pts.filter(p => p.s && p.s[SE.x] !== null && p.s[SE.x] !== undefined)
        .filter(p => !SE.parties.size || SE.parties.has(groupOf(p.party)))
        .filter(p => isEdm || !SE.roles.size || SE.roles.has(p.role))
        .filter(p => !SE.nations.size || SE.nations.has(p.s.nation));
      const [xl, xu] = MEASURES[SE.x];

      drawControls(isEdm);
      const head = el("p", { class: "small", role: "status", "aria-live": "polite" }, el("b", null, fmtInt(pts.length)), " MPs shown");
      let body;
      if (SE.out === "claims" || SE.out === "on") {
        const mk = (k) => pts.map(p => ({ x: p.s[SE.x], y: k === "on" ? p.m.p24.on : p.m.p24[k] / p.m.p24.on, href: "#mp-" + p.id,
          tip: [p.name, p.s.name + " · " + p.party, xl + ": " + p.s[SE.x].toFixed(1) + xu,
            k === "on" ? p.m.p24.on + " on-topic contributions" : (k === "c1" ? "Claim 1" : "Claim 2") + " made in " + p.m.p24[k] + " of " + p.m.p24.on]}));
        const xmax = Charts.niceMax(Math.max(...pts.map(p => p.s[SE.x]), 1));
        if (SE.out === "claims") {
          body = el("div", { class: "grid2" },
            el("div", { class: "stack", style: "gap:.4rem" }, el("h3", { class: "small-h" }, el("i", { class: "swatch sw-c1" }), " Claim 1: harm to Palestinians / international law"),
              Charts.scatter(mk("c1"), { percent: true, cls: "c1", xmax, xlabel: xl + " (" + xu.trim() + ")", label: "Claim 1 share against " + xl })),
            el("div", { class: "stack", style: "gap:.4rem" }, el("h3", { class: "small-h" }, el("i", { class: "swatch sw-c2" }), " Claim 2: Israeli security / 7 October"),
              Charts.scatter(mk("c2"), { percent: true, cls: "c2", xmax, xlabel: xl + " (" + xu.trim() + ")", label: "Claim 2 share against " + xl })));
        } else {
          body = Charts.scatter(mk("on"), { cls: "neutral", xmax, xlabel: xl + " (" + xu.trim() + ")", label: "On-topic contributions against " + xl, width: 860 });
        }
        const t = Charts.table("MPs shown", [["MP"], ["Seat"], ["Party"], [xl, 1], ["On-topic", 1], ["Claim 1 made", 1], ["Claim 2 made", 1]],
          pts.slice().sort((a, b) => b.s[SE.x] - a.s[SE.x]).map(p => [el("a", { href: "#mp-" + p.id }, p.name), p.s.name, p.party, p.s[SE.x].toFixed(1), p.m.p24.on, p.m.p24.c1, p.m.p24.c2]));
        body = Charts.withTableToggle(body, t);
        App.put(out, head, body,
          el("p", { class: "xs muted" }, SE.out === "claims"
            ? "Each share is the proportion of the MP's on-topic contributions since July 2024 that made the claim in their own voice. MPs who spoke only a few times can sit at 0% or 100% by chance, which is why the default shows MPs with at least five contributions."
            : "On-topic contributions since July 2024. Ministers speak far more often than other MPs."));
      } else {
        // binary outcome by fifths of the seat measure
        const vals = pts.map(p => p.s[SE.x]).sort((a, b) => a - b);
        const q = k => vals[Math.min(vals.length - 1, Math.floor(k * vals.length / 5))];
        const cuts = [q(1), q(2), q(3), q(4)];
        const band = v => cuts.filter(c => v >= c).length;
        const bands = [0, 1, 2, 3, 4].map(b => ({ b, ps: pts.filter(p => band(p.s[SE.x]) === b) }));
        const cls = SE.out.includes("rec") ? "rec" : "arms";
        const rows = bands.filter(o => o.ps.length).map(o => {
          const lo = Math.min(...o.ps.map(p => p.s[SE.x])), hi = Math.max(...o.ps.map(p => p.s[SE.x]));
          const k = o.ps.filter(p => p.y).length, n = o.ps.length, [a, b] = wilson(k, n);
          return el("div", { class: "hbar" },
            el("span", { class: "small" }, ["Lowest fifth", "Second fifth", "Middle fifth", "Fourth fifth", "Highest fifth"][o.b],
              el("span", { class: "xs muted", style: "display:block" }, lo.toFixed(1) + " to " + hi.toFixed(1) + xu)),
            el("div", { class: "hbar-track", role: "img", "aria-label": k + " of " + n + ", " + pct(k / n) },
              el("span", { class: "hbar-fill bg-" + cls, style: "width:" + (100 * k / n).toFixed(1) + "%" }),
              el("span", { class: "hbar-rng", style: `left:${100 * a}%;width:${100 * (b - a)}%` })),
            el("span", { class: "small num" }, k + " of " + n, el("span", { class: "xs muted", style: "display:block" }, pct(k / n))));
        });
        App.put(out, head,
          el("h3", { class: "small-h" }, el("i", { class: "swatch sw-" + cls }), " " + OUTCOMES[SE.out] + ", by " + xl.toLowerCase()),
          el("div", { class: "hbars" }, rows),
          el("p", { class: "xs muted" }, "MPs are split into five equal groups by the seat figure. Each bar shows the share recorded " +
            (isEdm ? "signing such a motion in the 2024 Parliament. This covers every MP elected in July 2024 except ministers, whips and the Speaker's chair, including those who never spoke on the subject. No motion opposed either call."
              : "making the call in a speech since July 2024. The thin line shows the likely range. Coded automatically: " + (SE.out === "rec" ? "94% of recorded recognition calls" : "71% of recorded arms-restriction calls") + " were confirmed by hand.")));
      }
    }

    function drawControls(isEdm) {
      const xs = el("select", { id: "se-x" }, Object.entries(MEASURES).map(([k, [l]]) => el("option", { value: k, selected: SE.x === k }, l)));
      xs.addEventListener("change", () => { SE.x = xs.value; draw(); });
      const ys = el("select", { id: "se-y" }, Object.entries(OUTCOMES).map(([k, l]) => el("option", { value: k, selected: SE.out === k }, l)));
      ys.addEventListener("change", () => { SE.out = ys.value; draw(); });
      const mn = el("select", { id: "se-min", disabled: isEdm }, [[1, "1 or more"], [5, "5 or more"], [20, "20 or more"]].map(([v, l]) => el("option", { value: v, selected: SE.minOn === v }, l)));
      mn.addEventListener("change", () => { SE.minOn = Number(mn.value); draw(); });
      App.put(ctl, 
        el("div", { class: "ctl-grid" },
          el("label", { class: "flabel-inline", for: "se-x" }, "Seat figure", xs),
          el("label", { class: "flabel-inline", for: "se-y" }, "Compare with", ys),
          el("label", { class: "flabel-inline", for: "se-min" }, "On-topic contributions since July 2024", mn)),
        el("fieldset", { class: "fgroup" }, el("legend", null, "Party"),
          el("div", { class: "checks-row" }, GROUPS.map((g, i) => chk(g, SE.parties.has(g), on => { on ? SE.parties.add(g) : SE.parties.delete(g); draw(); }, "se-p" + i)))),
        isEdm ? null : el("fieldset", { class: "fgroup" }, el("legend", null, "Mainly speaking as"),
          el("div", { class: "checks-row" }, ROLES.map(([k, l]) => chk(l, SE.roles.has(k), on => { on ? SE.roles.add(k) : SE.roles.delete(k); draw(); }, "se-r-" + k)))),
        el("fieldset", { class: "fgroup" }, el("legend", null, "Nation"),
          el("div", { class: "checks-row" }, ["England", "Scotland", "Wales", "Northern Ireland"].map(n => chk(n, SE.nations.has(n), on => { on ? SE.nations.add(n) : SE.nations.delete(n); draw(); }, "se-n-" + n.replace(/\s/g, ""))))),
        (SE.out === "rec" || SE.out === "arms") ? chk("Apply the hand-check corrections", SE.useHand, on => { SE.useHand = on; draw(); }, "se-hand") : null,
        el("p", { class: "xs muted" }, "Ticking nothing in a group includes everything. Religion figures are not available for Northern Ireland."));
    }
    draw();
    return root;
  });
})();
