/* Small SVG charts drawn to scale, with a hover/focus tooltip and a table view.
   Colours come from CSS tokens, so both themes work. Claim 1 and Claim 2 are
   always drawn the same way (same mark, same size) and never combined. */
"use strict";

const Charts = (() => {
  const { el, svg, fmtMonth, fmtInt } = App;

  function monthRange(from, to) {
    const out = [];
    let [y, m] = from.split("-").map(Number);
    const [ty, tm] = to.split("-").map(Number);
    while (y < ty || (y === ty && m <= tm)) {
      out.push(y + "-" + String(m).padStart(2, "0"));
      m++; if (m > 12) { m = 1; y++; }
    }
    return out;
  }

  function niceMax(v) {
    if (v > 1 && v <= 4) return 4;
    const p = Math.pow(10, Math.floor(Math.log10(v)));
    for (const s of [1, 2, 2.5, 5, 10]) if (s * p >= v) return s * p;
    return 10 * p;
  }

  // Monthly on-topic contributions (neutral bars) with the number making Claim 1 and
  // Claim 2 as two dots. One y-axis: everything is a count of contributions.
  // rows: [[ "YYYY-MM", on, c1, c2 ], ...]
  function monthly(rows, opts) {
    const months = monthRange(opts.from, opts.to);
    const by = new Map(rows.map(r => [r[0], r]));
    const data = months.map(m => { const r = by.get(m); return { m, on: r ? r[1] : 0, c1: r ? r[2] : 0, c2: r ? r[3] : 0 }; });
    const max = niceMax(Math.max(1, ...data.map(d => d.on)));
    const W = 760, H = 230, L = 34, R = 10, T = 26, B = 34;
    const iw = W - L - R, ih = H - T - B, bw = iw / months.length;
    const x = i => L + i * bw, y = v => T + ih - (v / max) * ih;
    const g = svg("svg", { class: "chart", viewBox: `0 0 ${W} ${H}`, role: "img",
      "aria-label": opts.label || "Monthly on-topic contributions" });
    const ticks = [0, max / 2, max];
    for (const t of ticks) {
      g.append(svg("line", { class: t === 0 ? "axis" : "grid", x1: L, x2: W - R, y1: y(t), y2: y(t) }));
      g.append(svg("text", { x: L - 6, y: y(t) + 4, "text-anchor": "end" }, Number.isInteger(t) ? t : t.toFixed(1)));
    }
    // event markers
    for (const ev of (opts.markers || [])) {
      const i = months.indexOf(ev.m);
      if (i < 0) continue;
      const xx = x(i) + bw / 2;
      g.append(svg("line", { class: "marker", x1: xx, x2: xx, y1: T - 4, y2: T + ih }));
      g.append(svg("text", { x: xx + 3, y: T - 8 }, ev.label));
    }
    data.forEach((d, i) => {
      if (d.on) g.append(svg("rect", { class: "bar", x: x(i) + bw * 0.18, width: bw * 0.64, y: y(d.on), height: Math.max(0, y(0) - y(d.on)), rx: 2 }));
    });
    const r = Math.max(3.2, Math.min(4.5, bw * 0.22));
    data.forEach((d, i) => {
      if (!d.on) return;
      g.append(svg("circle", { class: "d1", cx: x(i) + bw * 0.36, cy: y(d.c1), r }));
      g.append(svg("circle", { class: "d2", cx: x(i) + bw * 0.64, cy: y(d.c2), r }));
    });
    // x labels: every January plus the first month
    data.forEach((d, i) => {
      if (i === 0 || d.m.endsWith("-01")) {
        g.append(svg("text", { x: x(i) + bw / 2, y: H - 14, "text-anchor": "middle" }, d.m.endsWith("-01") ? d.m.slice(0, 4) : fmtMonth(d.m)));
        g.append(svg("line", { class: "axis", x1: x(i) + bw / 2, x2: x(i) + bw / 2, y1: T + ih, y2: T + ih + 4 }));
      }
    });
    // hover layer
    const wrap = el("div", { class: "chart-wrap wide" });
    const tip = el("div", { class: "tooltip", hidden: true, role: "presentation" });
    data.forEach((d, i) => {
      const hit = svg("rect", { class: "hit", x: x(i), y: T, width: bw, height: ih });
      const show = ev => {
        App.put(tip, el("b", null, fmtMonth(d.m, true)), el("br"),
          d.on + " on-topic contribution" + (d.on === 1 ? "" : "s"), el("br"),
          "Claim 1 made in " + d.c1, el("br"), "Claim 2 made in " + d.c2);
        tip.hidden = false;
        const box = wrap.getBoundingClientRect();
        const px = ((x(i) + bw / 2) / W) * box.width;
        tip.style.left = Math.min(Math.max(0, px - 70), box.width - 150) + "px";
        tip.style.top = "0px";
        hit.classList.add("on");
      };
      hit.addEventListener("mouseenter", show);
      hit.addEventListener("click", show);   // a tap on a phone
      // on a touch screen the tooltip stays until another month is tapped
      hit.addEventListener("pointerleave", e => { if (e.pointerType === "mouse") { tip.hidden = true; hit.classList.remove("on"); } });
      g.append(hit);
    });
    wrap.append(g, tip);

    const legend = el("div", { class: "legend", "aria-hidden": "true" },
      el("span", null, el("i", { class: "swatch sw-bar" }), "On-topic contributions"),
      el("span", null, el("i", { class: "dot bg-c1" }), "Claim 1 made"),
      el("span", null, el("i", { class: "dot bg-c2" }), "Claim 2 made"));

    const table = el("table", { class: "data" },
      el("caption", { class: "visually-hidden" }, opts.label || "Monthly counts"),
      el("thead", null, el("tr", null, el("th", null, "Month"), el("th", { class: "n" }, "On-topic"),
        el("th", { class: "n" }, "Claim 1 made"), el("th", { class: "n" }, "Claim 2 made"))),
      el("tbody", null, data.filter(d => d.on).map(d => el("tr", null, el("td", null, fmtMonth(d.m, true)),
        el("td", { class: "n" }, d.on), el("td", { class: "n" }, d.c1), el("td", { class: "n" }, d.c2)))));
    return withTableToggle(el("div", { class: "chart-box" }, legend, wrap), table);
  }

  // A "Show as table" switch: the same numbers for screen readers, print and checking.
  function withTableToggle(chartNode, tableNode) {
    const tw = el("div", { class: "table-wrap", hidden: true }, tableNode);
    const btn = el("button", { class: "linkbtn", type: "button", "aria-expanded": "false" }, "Show as table");
    btn.addEventListener("click", () => {
      const on = tw.hidden;
      tw.hidden = !on; chartNode.hidden = on;
      btn.textContent = on ? "Show as chart" : "Show as table";
      btn.setAttribute("aria-expanded", String(on));
    });
    return el("div", { class: "stack" }, el("div", null, btn), chartNode, tw);
  }

  // ---------------------------------------------------------------------------
  // Monthly time series on one axis: either bars (one series) or lines (several),
  // with optional 95% bands. series: [{label, cls, values: [{v, lo, hi} | null per month]}]
  // opts: {months, kind: "bars"|"lines", percent, markers, label, tipExtra(i)}
  function timeSeries(series, opts) {
    const months = opts.months;
    const W = 860, H = 260, L = opts.percent ? 40 : 38, R = 12, T = 34, B = 30;
    const iw = W - L - R, ih = H - T - B, bw = iw / months.length;
    const vals = series.flatMap(s => s.values.filter(Boolean).map(v => Math.max(v.v, v.hi ?? v.v)));
    const max = opts.percent ? 1 : niceMax(Math.max(1, ...vals));
    const x = i => L + i * bw + bw / 2, y = v => T + ih - (v / max) * ih;
    const g = svg("svg", { class: "chart", viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": opts.label });
    const ticks = opts.percent ? [0, 0.25, 0.5, 0.75, 1] : [0, max / 2, max];
    for (const t of ticks) {
      g.append(svg("line", { class: t === 0 ? "axis" : "grid", x1: L, x2: W - R, y1: y(t), y2: y(t) }));
      g.append(svg("text", { x: L - 6, y: y(t) + 4, "text-anchor": "end" },
        opts.percent ? Math.round(t * 100) + "%" : (Number.isInteger(t) ? t : t.toFixed(max < 1 ? 2 : 1))));
    }
    (opts.markers || []).forEach((ev, k) => {
      const i = months.indexOf(ev.m);
      if (i < 0) return;
      g.append(svg("line", { class: "marker", x1: x(i), x2: x(i), y1: T - 4 - (k % 2) * 12, y2: T + ih }));
      g.append(svg("text", { x: x(i) + 3, y: T - 8 - (k % 2) * 12 }, ev.label));
    });
    // numbered news days: a short tick and number along the bottom edge of the plot
    const seen = {};
    (opts.news || []).forEach(ev => {
      const i = months.indexOf(ev.date.slice(0, 7));
      if (i < 0) return;
      const day = Number(ev.date.slice(8, 10)), xx = L + i * bw + bw * Math.min(0.95, Math.max(0.05, day / 31));
      const stack = seen[i] = (seen[i] || 0) + 1;
      g.append(svg("line", { class: "newsmark", x1: xx, x2: xx, y1: T, y2: T + ih }));
      g.append(svg("circle", { class: "newsdot", cx: xx, cy: T + ih - 9 - (stack - 1) * 17, r: 8 }));
      g.append(svg("text", { class: "newsnum", x: xx, y: T + ih - 5.5 - (stack - 1) * 17, "text-anchor": "middle" }, String(ev.no)));
    });
    months.forEach((m, i) => {
      if (i === 0 || m.endsWith("-01")) {
        g.append(svg("text", { x: x(i), y: H - 10, "text-anchor": "middle" }, m.endsWith("-01") ? m.slice(0, 4) : fmtMonth(m)));
        g.append(svg("line", { class: "axis", x1: x(i), x2: x(i), y1: T + ih, y2: T + ih + 4 }));
      }
    });
    if (opts.kind === "bars") {
      series[0].values.forEach((v, i) => {
        if (v && v.v > 0) g.append(svg("rect", { class: "bar " + (series[0].cls || ""), x: x(i) - bw * 0.32, width: bw * 0.64,
          y: y(v.v), height: Math.max(0, y(0) - y(v.v)), rx: 2 }));
      });
    } else {
      for (const s of series) {
        // bands
        let band = [];
        const flushBand = () => {
          if (band.length > 1) {
            const up = band.map(([i, v]) => `${x(i)},${y(v.hi)}`), dn = band.slice().reverse().map(([i, v]) => `${x(i)},${y(v.lo)}`);
            g.append(svg("polygon", { class: "band " + s.cls, points: up.concat(dn).join(" ") }));
          }
          band = [];
        };
        if (s.band !== false) { s.values.forEach((v, i) => { if (v && v.lo !== undefined) band.push([i, v]); else flushBand(); }); flushBand(); }
        // line segments, broken where a month is missing
        let seg = [];
        const flush = () => {
          if (seg.length > 1) g.append(svg("polyline", { class: "ln " + s.cls, points: seg.join(" ") }));
          seg = [];
        };
        s.values.forEach((v, i) => { if (v) seg.push(`${x(i)},${y(v.v)}`); else flush(); });
        flush();
        s.values.forEach((v, i) => { if (v) g.append(svg("circle", { class: "pt " + s.cls, cx: x(i), cy: y(v.v), r: 2.6 })); });
      }
    }
    // hover: one column per month
    const wrap = el("div", { class: "chart-wrap wide" });
    const tip = el("div", { class: "tooltip", hidden: true });
    const cross = svg("line", { class: "cross", x1: 0, x2: 0, y1: T, y2: T + ih, visibility: "hidden" });
    g.append(cross);
    months.forEach((m, i) => {
      const hit = svg("rect", { class: "hit", x: L + i * bw, y: T, width: bw, height: ih });
      const showMonth = () => {
        const lines = [el("b", null, fmtMonth(m, true))];
        for (const s of series) {
          const v = s.values[i];
          lines.push(el("br"), s.label + ": " + (v ? (opts.percent ? Math.round(100 * v.v) + "%" : fmtInt(v.v)) : "–"));
        }
        if (opts.tipExtra) lines.push(el("br"), opts.tipExtra(i));
        App.put(tip, ...lines);
        tip.hidden = false;
        const box = wrap.getBoundingClientRect();
        const px = (x(i) / W) * box.width;
        tip.style.left = Math.min(Math.max(0, px + 10), box.width - 170) + "px";
        tip.style.top = "0px";
        cross.setAttribute("x1", x(i)); cross.setAttribute("x2", x(i)); cross.setAttribute("visibility", "visible");
      };
      hit.addEventListener("mouseenter", showMonth);
      hit.addEventListener("click", showMonth);   // a tap on a phone
      hit.addEventListener("pointerleave", e => { if (e.pointerType === "mouse") { tip.hidden = true; cross.setAttribute("visibility", "hidden"); } });
      g.append(hit);
    });
    wrap.append(g, tip);
    return el("div", null, wrap, el("p", { class: "xs muted swipe" }, "Swipe the chart sideways to see every month."));
  }

  // Scatter of points {x, y, label, href}. Colour by class. Hover names the point.
  function scatter(points, opts) {
    const W = opts.width || 560, H = opts.height || 330, L = 46, R = 14, T = 14, B = 42;
    const iw = W - L - R, ih = H - T - B;
    const xs = points.map(p => p.x);
    const xmax = opts.xmax ?? niceMax(Math.max(1, ...xs)), xmin = 0;
    const ymax = opts.percent ? 1 : (opts.ymax ?? niceMax(Math.max(1, ...points.map(p => p.y))));
    const x = v => L + ((v - xmin) / (xmax - xmin)) * iw, y = v => T + ih - (v / ymax) * ih;
    const g = svg("svg", { class: "chart", viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": opts.label });
    const yt = opts.percent ? [0, 0.25, 0.5, 0.75, 1] : [0, ymax / 2, ymax];
    for (const t of yt) {
      g.append(svg("line", { class: t === 0 ? "axis" : "grid", x1: L, x2: W - R, y1: y(t), y2: y(t) }));
      g.append(svg("text", { x: L - 6, y: y(t) + 4, "text-anchor": "end" }, opts.percent ? Math.round(t * 100) + "%" : fmtInt(t)));
    }
    for (let k = 0; k <= 4; k++) {
      const t = xmin + (k / 4) * (xmax - xmin);
      g.append(svg("line", { class: "grid", x1: x(t), x2: x(t), y1: T, y2: T + ih }));
      g.append(svg("text", { x: x(t), y: T + ih + 16, "text-anchor": "middle" }, (Math.round(t * 10) / 10) + (opts.xunit || "")));
    }
    g.append(svg("text", { x: L + iw / 2, y: H - 4, "text-anchor": "middle" }, opts.xlabel));
    const wrap = el("div", { class: "chart-wrap wide" });
    const tip = el("div", { class: "tooltip", hidden: true });
    const hits = svg("g");   // the larger hover areas sit underneath every dot
    g.append(hits);
    for (const p of points) {
      const c = svg("circle", { class: "sc " + (opts.cls || ""), cx: x(p.x), cy: y(p.y), r: 4.2, tabindex: p.href ? 0 : null });
      // a larger invisible circle around each dot, so it is easier to hover or tap
      const big = svg("circle", { class: "schit", cx: x(p.x), cy: y(p.y), r: 9 });
      const show = () => {
        App.put(tip, ...p.tip.flatMap((t, k) => k ? [el("br"), t] : [k === 0 ? el("b", null, t) : t]));
        tip.hidden = false;
        const box = wrap.getBoundingClientRect();
        const px = (x(p.x) / W) * box.width, py = (y(p.y) / H) * box.height;
        tip.style.left = Math.min(Math.max(0, px + 10), box.width - 190) + "px";
        tip.style.top = Math.max(0, py - 60) + "px";
        c.classList.add("on");
      };
      const hide = () => { tip.hidden = true; c.classList.remove("on"); };
      for (const t of [c, big]) { t.addEventListener("mouseenter", show); t.addEventListener("mouseleave", hide); }
      c.addEventListener("focus", show); c.addEventListener("blur", hide);
      if (p.href) {
        for (const t of [c, big]) t.addEventListener("click", () => { location.hash = p.href; });
        c.addEventListener("keydown", e => { if (e.key === "Enter") location.hash = p.href; });
      }
      hits.append(big); g.append(c);
    }
    wrap.append(g, tip);
    return wrap;
  }

  // Plain table helper: cols [[label, numeric?]], rows [[cells]]
  function table(caption, cols, rows) {
    return el("table", { class: "data" },
      el("caption", { class: "visually-hidden" }, caption),
      el("thead", null, el("tr", null, cols.map(([c, n]) => el("th", { class: n ? "n" : null, scope: "col" }, c)))),
      el("tbody", null, rows.map(r => el("tr", null, r.map((c, i) => el("td", { class: cols[i][1] ? "n" : null }, c))))));
  }

  return { monthly, monthRange, withTableToggle, niceMax, timeSeries, scatter, table };
})();
