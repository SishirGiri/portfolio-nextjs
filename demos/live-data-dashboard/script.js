/* ============================================================
   Live Data Dashboard - script.js
   All charts hand-built with SVG. No external libraries.
   ============================================================ */

(() => {
  'use strict';

  /* ----------------------------------------------------------
     0. Constants & helpers
     ---------------------------------------------------------- */
  const COLORS = {
    cyan: '#00d4ff',
    violet: '#7c3aed',
    pink: '#f472b6',
    green: '#22c55e',
    amber: '#f59e0b',
    red: '#ef4444',
    textFaint: '#5b6a85',
    grid: 'rgba(255,255,255,0.06)',
  };

  const CATEGORIES = ['Electronics', 'Apparel', 'Home', 'Books', 'Toys', 'Sports'];
  const TRAFFIC   = ['Direct', 'Organic', 'Social', 'Referral', 'Paid'];
  const TRAFFIC_COLORS = ['#00d4ff', '#7c3aed', '#f472b6', '#22c55e', '#f59e0b'];

  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  // Format helpers
  const fmtMoney = (n) => '$' + Math.round(n).toLocaleString('en-US');
  const fmtNum   = (n) => Math.round(n).toLocaleString('en-US');
  const fmtPct   = (n) => n.toFixed(1) + '%';
  const clamp    = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  // Create an SVG element with attributes
  function svgEl(tag, attrs = {}, text) {
    const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    if (text != null) el.textContent = text;
    return el;
  }

  // Smooth random walk step (keeps value in [min, max])
  function walk(value, volatility, min, max) {
    const delta = (Math.random() - 0.5) * 2 * volatility;
    return clamp(value + delta, min, max);
  }

  /* ----------------------------------------------------------
     1. Application state
     ---------------------------------------------------------- */
  const WINDOW_SIZE = 30; // visible timepoints in the line chart

  const state = {
    paused: false,
    range: '24H',
    category: 'all',
    search: '',
    sort: { key: 'date', dir: 'desc' },
    // KPI current values
    kpi: {
      revenue: 184200,
      users: 12840,
      conversion: 3.4,
      session: 4 * 60 + 12, // seconds
    },
    // Line chart series (arrays of WINDOW_SIZE points)
    series: {
      revenue: [],
      users: [],
    },
    // Sales by category (units)
    sales: {},
    // Traffic source distribution (percentages summing to 100)
    traffic: { Direct: 32, Organic: 28, Social: 18, Referral: 14, Paid: 8 },
    orders: [],
  };

  /* ----------------------------------------------------------
     2. Seed data generation
     ---------------------------------------------------------- */
  // Range affects the scale of generated data
  const RANGE_SCALE = { '24H': 1, '7D': 6.5, '30D': 26 };

  function seedSeries() {
    const s = RANGE_SCALE[state.range];
    state.series.revenue = [];
    state.series.users = [];
    let rev = 5200 * s + Math.random() * 800;
    let usr = 640 + Math.random() * 80;
    for (let i = 0; i < WINDOW_SIZE; i++) {
      rev = walk(rev, 420 * s, 1800 * s, 9200 * s);
      usr = walk(usr, 55, 280, 1180);
      state.series.revenue.push(rev);
      state.series.users.push(usr);
    }
  }

  function seedSales() {
    const s = RANGE_SCALE[state.range];
    state.sales = {};
    for (const c of CATEGORIES) {
      state.sales[c] = Math.round((180 + Math.random() * 320) * s);
    }
  }

  function seedTraffic() {
    // Random but always sums to ~100
    const r = TRAFFIC.map(() => 5 + Math.random() * 35);
    const sum = r.reduce((a, b) => a + b, 0);
    TRAFFIC.forEach((name, i) => {
      state.traffic[name] = (r[i] / sum) * 100;
    });
  }

  // Realistic sample orders
  const FIRST_NAMES = ['Ava','Liam','Mia','Noah','Zoe','Ethan','Aria','Lucas','Maya','Leo','Iris','Kai','Nina','Owen','Ruby','Theo','Sara','Finn','Ella','Jude'];
  const LAST_NAMES  = ['Bennett','Carter','Diaz','Ellis','Foster','Grant','Hayes','Iqbal','Jensen','Khan','Lim','Mercer','Nash','Owusu','Patel','Quinn','Reyes','Sato','Turner','Vega'];
  const PRODUCTS = {
    Electronics: ['Aurora Wireless Earbuds','Nimbus 4K Monitor','Pulse Smartwatch','Helix Mechanical Keyboard','Volt Power Bank'],
    Apparel:     ['Drift Hoodie','Linen Overshirt','Trail Running Shoes','Merino Beanie','Canvas Tote'],
    Home:        ['Ceramic Pour-Over','Linen Throw Blanket','LED Desk Lamp','Aroma Diffuser','Cast Iron Skillet'],
    Books:       ['Designing Data-Intensive Apps','Atomic Habits','The Pragmatic Programmer','Sapiens','Deep Work'],
    Toys:        ['Magnetic Tile Set','Wooden Train Kit','Glow Puzzle Cube','Stomp Rocket','Plush Companion'],
    Sports:      ['Adjustable Dumbbell','Yoga Mat Pro','Resistance Band Set','Insulated Bottle','Foam Roller'],
  };
  const STATUSES = ['paid','paid','paid','pending','shipped','shipped','refund'];

  function randPick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  function seedOrders() {
    state.orders = [];
    const now = Date.now();
    for (let i = 0; i < 14; i++) {
      const cat = randPick(CATEGORIES);
      const product = randPick(PRODUCTS[cat]);
      const qty = 1 + Math.floor(Math.random() * 4);
      const base = 28 + Math.random() * 320;
      const amount = Math.round(base * qty * 100) / 100;
      const id = 'ORD-' + (4821 + i).toString().padStart(4, '0');
      const name = randPick(FIRST_NAMES) + ' ' + randPick(LAST_NAMES);
      const ago = Math.floor(Math.random() * 1000 * 60 * 60 * 36); // up to 36h
      const date = new Date(now - ago);
      state.orders.push({
        id, customer: name, category: cat, product, qty,
        amount, status: randPick(STATUSES), date,
      });
    }
  }

  /* ----------------------------------------------------------
     3. Live tick: nudge values & push new chart point
     ---------------------------------------------------------- */
  function tick() {
    if (state.paused) return;

    const s = RANGE_SCALE[state.range];

    // KPI random walks
    state.kpi.revenue    = walk(state.kpi.revenue, 1800 * s, 60000, 420000);
    state.kpi.users      = walk(state.kpi.users, 220, 4000, 26000);
    state.kpi.conversion = walk(state.kpi.conversion, 0.18, 1.2, 7.5);
    state.kpi.session    = walk(state.kpi.session, 12, 90, 600);

    // Line chart: shift window & append
    const newRev = walk(state.series.revenue[WINDOW_SIZE - 1], 420 * s, 1800 * s, 9200 * s);
    const newUsr = walk(state.series.users[WINDOW_SIZE - 1], 55, 280, 1180);
    state.series.revenue.push(newRev);
    state.series.users.push(newUsr);
    if (state.series.revenue.length > WINDOW_SIZE) state.series.revenue.shift();
    if (state.series.users.length > WINDOW_SIZE) state.series.users.shift();

    // Sales: small drift on random category
    const driftCat = randPick(CATEGORIES);
    state.sales[driftCat] = Math.max(20, state.sales[driftCat] + Math.round((Math.random() - 0.45) * 40 * s));

    // Occasionally add a fresh order at the top
    if (Math.random() < 0.4) {
      const cat = state.category === 'all' ? randPick(CATEGORIES) : state.category;
      const product = randPick(PRODUCTS[cat]);
      const qty = 1 + Math.floor(Math.random() * 3);
      const amount = Math.round((28 + Math.random() * 320) * qty * 100) / 100;
      state.orders.unshift({
        id: 'ORD-' + (4835 + Math.floor(Math.random() * 9000)).toString().padStart(4, '0'),
        customer: randPick(FIRST_NAMES) + ' ' + randPick(LAST_NAMES),
        category: cat, product, qty, amount,
        status: randPick(STATUSES), date: new Date(),
      });
      if (state.orders.length > 16) state.orders.pop();
    }

    renderAll();
  }

  /* ----------------------------------------------------------
     4. KPI cards
     ---------------------------------------------------------- */
  const KPI_DEFS = [
    { key: 'revenue',    label: 'Revenue',        accent: COLORS.cyan,   fmt: fmtMoney, icon: 'dollar' },
    { key: 'users',      label: 'Active Users',   accent: COLORS.violet, fmt: fmtNum,   icon: 'users' },
    { key: 'conversion', label: 'Conversion',     accent: COLORS.pink,   fmt: fmtPct,   icon: 'chart' },
    { key: 'session',    label: 'Avg Session',    accent: COLORS.green,  fmt: fmtTime,  icon: 'clock' },
  ];

  const ICON_PATHS = {
    dollar: '<path d="M12 2v20M16.5 6.5C16 5 14.5 4 12 4 9 4 7.5 5.5 7.5 7.5S9 10.5 12 11s4.5 1.5 4.5 4-2 4-4.5 4-4-1-4.5-2.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
    users:  '<circle cx="9" cy="8" r="3.2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5M16 11a3 3 0 1 0 0-6M21 19c0-2.6-2-4.4-4.5-4.7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
    chart:  '<path d="M4 20V4M4 20h16M8 16l3-4 3 3 4-6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
    clock:  '<circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 7.5V12l3 2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
  };

  function fmtTime(sec) {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return m + ':' + s.toString().padStart(2, '0');
  }

  function buildKpiCards() {
    const host = $('#kpis');
    host.innerHTML = '';
    KPI_DEFS.forEach((def) => {
      const card = document.createElement('div');
      card.className = 'kpi';
      card.style.setProperty('--accent', def.accent);
      card.dataset.key = def.key;
      card.innerHTML = `
        <div class="kpi__head">
          <span class="kpi__label">${def.label}</span>
          <span class="kpi__icon">
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">${ICON_PATHS[def.icon]}</svg>
          </span>
        </div>
        <div class="kpi__value" data-value="0">--</div>
        <div class="kpi__row">
          <span class="trend up" data-trend>—</span>
          <svg class="kpi__spark" width="84" height="28" viewBox="0 0 84 28" aria-hidden="true">
            <path data-spark stroke="${def.accent}"></path>
          </svg>
        </div>`;
      host.appendChild(card);
      // store reference to the previous value for trend calc
      def._prev = state.kpi[def.key];
    });
  }

  // Animated counter: eases from displayed value to target
  function animateValue(el, from, to, duration, formatter) {
    const start = performance.now();
    function frame(now) {
      const t = clamp((now - start) / duration, 0, 1);
      // easeOutCubic
      const e = 1 - Math.pow(1 - t, 3);
      const val = from + (to - from) * e;
      el.textContent = formatter(val);
      if (t < 1) requestAnimationFrame(frame);
      else el.textContent = formatter(to);
    }
    requestAnimationFrame(frame);
  }

  function renderKpis() {
    KPI_DEFS.forEach((def) => {
      const card = $(`.kpi[data-key="${def.key}"]`);
      if (!card) return;
      const valEl = $('.kpi__value', card);
      const trendEl = $('[data-trend]', card);
      const sparkEl = $('[data-spark]', card);

      const cur = state.kpi[def.key];
      const prev = def._prev ?? cur;
      const shownFrom = parseFloat(valEl.dataset.value) || prev;

      animateValue(valEl, shownFrom, cur, 650, def.fmt);
      valEl.dataset.value = cur;

      const delta = ((cur - prev) / (prev || 1)) * 100;
      const up = delta >= 0;
      trendEl.classList.toggle('up', up);
      trendEl.classList.toggle('down', !up);
      trendEl.innerHTML =
        `<svg viewBox="0 0 12 12" width="11" height="11" aria-hidden="true">
           <path d="${up ? 'M6 2L10 8H2Z' : 'M6 10L2 4H10Z'}" fill="currentColor"/>
         </svg>${Math.abs(delta).toFixed(2)}%`;

      def._prev = cur;

      // Sparkline from line series (downsample to ~12 pts)
      const source = def.key === 'revenue' ? state.series.revenue
                   : def.key === 'users'   ? state.series.users
                   : null;
      if (source && source.length) {
        sparkEl.setAttribute('d', sparkPath(source, 84, 28));
      } else {
        // synthetic small sparkline for conversion/session
        const synth = Array.from({ length: 12 }, (_, i) =>
          def.key === 'conversion'
            ? 2 + Math.sin(i / 2) * 1.2 + Math.random()
            : 200 + Math.sin(i / 2) * 80 + Math.random() * 40
        );
        sparkEl.setAttribute('d', sparkPath(synth, 84, 28));
      }
    });
  }

  // Build a sparkline <path d=...> normalized into w x h box
  function sparkPath(data, w, h) {
    const lo = Math.min(...data);
    const hi = Math.max(...data);
    const span = hi - lo || 1;
    const pad = 3;
    const stepX = (w - pad * 2) / (data.length - 1);
    return data.map((v, i) => {
      const x = pad + i * stepX;
      const y = pad + (h - pad * 2) * (1 - (v - lo) / span);
      return (i === 0 ? 'M' : 'L') + x.toFixed(1) + ',' + y.toFixed(1);
    }).join(' ');
  }

  /* ----------------------------------------------------------
     5. Line chart (multi-series, streaming)
     ---------------------------------------------------------- */
  const lineSvg = $('#lineChart');
  const lineTooltip = $('#lineTooltip');
  const LINE = { w: 800, h: 300, padL: 52, padR: 16, padT: 16, padB: 30 };

  function renderLineChart() {
    const { w, h, padL, padR, padT, padB } = LINE;
    lineSvg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    lineSvg.innerHTML = '';

    const plotW = w - padL - padR;
    const plotH = h - padT - padB;

    const rev = state.series.revenue;
    const usr = state.series.users;
    const allVals = [...rev, ...usr];
    const maxV = Math.max(...allVals) * 1.1;
    const minV = 0;

    // --- defs: gradients ---
    const defs = svgEl('defs');
    const grad = (id, c1, c2) => {
      const g = svgEl('linearGradient', { id, x1: 0, y1: 0, x2: 0, y2: 1 });
      g.appendChild(svgEl('stop', { offset: '0%', 'stop-color': c1, 'stop-opacity': 0.45 }));
      g.appendChild(svgEl('stop', { offset: '100%', 'stop-color': c2, 'stop-opacity': 0 }));
      defs.appendChild(g);
    };
    grad('gradRev', COLORS.cyan, COLORS.cyan);
    grad('gradUsr', COLORS.violet, COLORS.violet);
    lineSvg.appendChild(defs);

    // --- gridlines + y axis labels (5 ticks) ---
    const ticks = 5;
    for (let i = 0; i <= ticks; i++) {
      const y = padT + (plotH * i) / ticks;
      lineSvg.appendChild(svgEl('line', {
        class: 'grid-line', x1: padL, y1: y, x2: w - padR, y2: y,
      }));
      const val = maxV - ((maxV - minV) * i) / ticks;
      lineSvg.appendChild(svgEl('text', {
        class: 'axis-text', x: padL - 8, y: y + 3, 'text-anchor': 'end',
      }, formatAxisValue(val)));
    }

    // --- x axis labels (5 evenly spaced) ---
    const xLabels = 5;
    for (let i = 0; i < xLabels; i++) {
      const idx = Math.round((WINDOW_SIZE - 1) * i / (xLabels - 1));
      const x = padL + (plotW * i) / (xLabels - 1);
      const label = state.range === '24H'
        ? `${(24 - idx)}h`
        : state.range === '7D'
        ? `D-${Math.round((WINDOW_SIZE - idx) * 7 / WINDOW_SIZE)}`
        : `D-${Math.round((WINDOW_SIZE - idx) * 30 / WINDOW_SIZE)}`;
      lineSvg.appendChild(svgEl('text', {
        class: 'axis-text', x, y: h - padB + 18, 'text-anchor': 'middle',
      }, label === 'D-0' ? 'now' : label));
    }

    // --- build smooth path (Catmull-Rom -> Bezier) ---
    const xAt = (i) => padL + (plotW * i) / (WINDOW_SIZE - 1);
    const yAt = (v) => padT + plotH * (1 - (v - minV) / (maxV - minV || 1));

    const buildPath = (data) => smoothPath(data.map((v, i) => [xAt(i), yAt(v)]));
    const buildArea = (data) => {
      const pts = data.map((v, i) => [xAt(i), yAt(v)]);
      let d = smoothPath(pts);
      d += ` L${xAt(data.length - 1)},${padT + plotH} L${xAt(0)},${padT + plotH} Z`;
      return d;
    };

    // Revenue area + line
    lineSvg.appendChild(svgEl('path', { class: 'area-path', d: buildArea(rev), fill: 'url(#gradRev)' }));
    const revPath = svgEl('path', {
      class: 'line-path', d: buildPath(rev), stroke: COLORS.cyan,
      filter: 'drop-shadow(0 0 6px rgba(0,212,255,0.6))',
    });
    lineSvg.appendChild(revPath);

    // Users line
    lineSvg.appendChild(svgEl('path', {
      class: 'line-path', d: buildPath(usr), stroke: COLORS.violet,
      filter: 'drop-shadow(0 0 6px rgba(124,58,237,0.6))',
    }));

    // Latest-value pulsing dots
    [[rev, COLORS.cyan], [usr, COLORS.violet]].forEach(([data, color]) => {
      const lx = xAt(data.length - 1);
      const ly = yAt(data[data.length - 1]);
      const ring = svgEl('circle', { cx: lx, cy: ly, r: 5, fill: 'none', stroke: color, 'stroke-width': 1.5, opacity: 0.6 });
      ring.innerHTML = `<animate attributeName="r" from="4" to="11" dur="1.4s" repeatCount="indefinite"/>
                        <animate attributeName="opacity" from="0.7" to="0" dur="1.4s" repeatCount="indefinite"/>`;
      lineSvg.appendChild(ring);
      lineSvg.appendChild(svgEl('circle', { cx: lx, cy: ly, r: 3.2, fill: color }));
    });

    // animate stroke draw
    requestAnimationFrame(() => {
      const len = revPath.getTotalLength ? revPath.getTotalLength() : 0;
      if (len) {
        revPath.style.strokeDasharray = len;
        revPath.style.strokeDashoffset = len;
        revPath.getBoundingClientRect(); // reflow
        revPath.style.transition = 'stroke-dashoffset 0.7s ease';
        revPath.style.strokeDashoffset = 0;
      }
    });

    // hover interaction layer
    const hoverLine = svgEl('line', { class: 'hover-line', x1: 0, y1: padT, x2: 0, y2: padT + plotH, opacity: 0 });
    lineSvg.appendChild(hoverLine);
    const hoverDotRev = svgEl('circle', { r: 4, fill: COLORS.cyan, stroke: '#fff', 'stroke-width': 1.5, opacity: 0 });
    const hoverDotUsr = svgEl('circle', { r: 4, fill: COLORS.violet, stroke: '#fff', 'stroke-width': 1.5, opacity: 0 });
    lineSvg.appendChild(hoverDotRev);
    lineSvg.appendChild(hoverDotUsr);

    lineSvg.onmousemove = (e) => {
      const rect = lineSvg.getBoundingClientRect();
      const px = ((e.clientX - rect.left) / rect.width) * w;
      const rel = clamp((px - padL) / plotW, 0, 1);
      const i = Math.round(rel * (WINDOW_SIZE - 1));
      const x = xAt(i);
      hoverLine.setAttribute('x1', x);
      hoverLine.setAttribute('x2', x);
      hoverLine.setAttribute('opacity', 1);
      hoverDotRev.setAttribute('cx', x);
      hoverDotRev.setAttribute('cy', yAt(rev[i]));
      hoverDotRev.setAttribute('opacity', 1);
      hoverDotUsr.setAttribute('cx', x);
      hoverDotUsr.setAttribute('cy', yAt(usr[i]));
      hoverDotUsr.setAttribute('opacity', 1);

      // position tooltip in CSS px
      const cssX = (x / w) * rect.width;
      const cssY = (yAt(Math.max(rev[i], usr[i])) / h) * rect.height;
      lineTooltip.style.left = cssX + 'px';
      lineTooltip.style.top = cssY + 'px';
      lineTooltip.classList.add('is-visible');
      lineTooltip.innerHTML =
        `<div class="tt-row"><i class="dot dot--cyan"></i> Revenue: <strong>${fmtMoney(rev[i])}</strong></div>
         <div class="tt-row"><i class="dot dot--violet"></i> Users: <strong>${fmtNum(usr[i])}</strong></div>`;
    };
    lineSvg.onmouseleave = () => {
      hoverLine.setAttribute('opacity', 0);
      hoverDotRev.setAttribute('opacity', 0);
      hoverDotUsr.setAttribute('opacity', 0);
      lineTooltip.classList.remove('is-visible');
    };
  }

  function formatAxisValue(v) {
    if (v >= 1000) return (v / 1000).toFixed(v >= 10000 ? 0 : 1) + 'k';
    return Math.round(v).toString();
  }

  // Catmull-Rom spline -> SVG bezier path for smooth curves
  function smoothPath(pts) {
    if (pts.length < 2) return '';
    let d = `M${pts[0][0]},${pts[0][1]}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2] || p2;
      const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
      const cp1y = p1[1] + (p2[1] - p0[1]) / 6;
      const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
      const cp2y = p2[1] - (p3[1] - p1[1]) / 6;
      d += ` C${cp1x.toFixed(2)},${cp1y.toFixed(2)} ${cp2x.toFixed(2)},${cp2y.toFixed(2)} ${p2[0].toFixed(2)},${p2[1].toFixed(2)}`;
    }
    return d;
  }

  /* ----------------------------------------------------------
     6. Bar chart (sales by category)
     ---------------------------------------------------------- */
  const barSvg = $('#barChart');
  const barTooltip = $('#barTooltip');
  const BAR = { w: 480, h: 260, padL: 40, padR: 12, padT: 12, padB: 44 };

  function renderBarChart() {
    const { w, h, padL, padR, padT, padB } = BAR;
    barSvg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    barSvg.innerHTML = '';

    const plotW = w - padL - padR;
    const plotH = h - padT - padB;

    const entries = CATEGORIES
      .map((c) => ({ name: c, value: state.sales[c] || 0 }))
      .filter((e) => state.category === 'all' || e.name === state.category);
    // when a single category is selected, still show all for comparison but highlight
    const showAll = state.category === 'all' ? entries : CATEGORIES.map((c) => ({ name: c, value: state.sales[c] || 0 }));

    const maxV = Math.max(...showAll.map((e) => e.value)) * 1.15 || 1;
    const barCount = showAll.length;
    const slot = plotW / barCount;
    const barW = slot * 0.55;

    // y gridlines
    const ticks = 4;
    for (let i = 0; i <= ticks; i++) {
      const y = padT + (plotH * i) / ticks;
      barSvg.appendChild(svgEl('line', { class: 'grid-line', x1: padL, y1: y, x2: w - padR, y2: y }));
      const val = maxV - (maxV * i) / ticks;
      barSvg.appendChild(svgEl('text', { class: 'axis-text', x: padL - 6, y: y + 3, 'text-anchor': 'end' }, formatAxisValue(val)));
    }

    const grad = svgEl('linearGradient', { id: 'barGrad', x1: 0, y1: 0, x2: 0, y2: 1 });
    grad.appendChild(svgEl('stop', { offset: '0%', 'stop-color': COLORS.cyan }));
    grad.appendChild(svgEl('stop', { offset: '100%', 'stop-color': COLORS.violet }));
    const defs = svgEl('defs'); defs.appendChild(grad);
    barSvg.appendChild(defs);

    showAll.forEach((e, i) => {
      const x = padL + slot * i + (slot - barW) / 2;
      const barH = (e.value / maxV) * plotH;
      const y = padT + plotH - barH;
      const isActive = state.category === 'all' || e.name === state.category;

      const rect = svgEl('rect', {
        x, y: padT + plotH, width: barW, height: 0, rx: 4,
        fill: isActive ? 'url(#barGrad)' : 'rgba(255,255,255,0.08)',
        opacity: isActive ? 1 : 0.5,
      });
      barSvg.appendChild(rect);
      // animate grow
      requestAnimationFrame(() => {
        rect.style.transition = 'height 0.6s cubic-bezier(.2,.7,.2,1), y 0.6s cubic-bezier(.2,.7,.2,1)';
        rect.setAttribute('y', y);
        rect.setAttribute('height', barH);
      });

      // value label on top
      barSvg.appendChild(svgEl('text', {
        class: 'axis-text', x: x + barW / 2, y: y - 6, 'text-anchor': 'middle',
        fill: isActive ? COLORS.cyan : COLORS.textFaint,
      }, formatAxisValue(e.value)));

      // x label
      barSvg.appendChild(svgEl('text', {
        class: 'axis-text', x: x + barW / 2, y: h - padB + 18, 'text-anchor': 'middle',
        fill: isActive ? '#e6edf7' : COLORS.textFaint,
      }, e.name));

      // hover
      rect.style.cursor = 'pointer';
      rect.addEventListener('mouseenter', (ev) => {
        const rectB = barSvg.getBoundingClientRect();
        barTooltip.style.left = (((x + barW / 2) / w) * rectB.width) + 'px';
        barTooltip.style.top = ((y / h) * rectB.height) + 'px';
        barTooltip.classList.add('is-visible');
        barTooltip.innerHTML = `<strong>${e.name}</strong>: ${fmtNum(e.value)} units`;
      });
      rect.addEventListener('mouseleave', () => barTooltip.classList.remove('is-visible'));
    });
  }

  /* ----------------------------------------------------------
     7. Donut chart (traffic sources)
     ---------------------------------------------------------- */
  const donutSvg = $('#donutChart');
  const donutLegend = $('#donutLegend');

  function renderDonutChart() {
    const size = 200, cx = size / 2, cy = size / 2, r = 78, strokeW = 22;
    donutSvg.setAttribute('viewBox', `0 0 ${size} ${size}`);
    donutSvg.innerHTML = '';

    const data = TRAFFIC.map((name, i) => ({ name, value: state.traffic[name], color: TRAFFIC_COLORS[i] }));
    const total = data.reduce((s, d) => s + d.value, 0) || 1;

    // background track
    donutSvg.appendChild(svgEl('circle', { cx, cy, r, fill: 'none', stroke: 'rgba(255,255,255,0.05)', 'stroke-width': strokeW }));

    const circumference = 2 * Math.PI * r;
    let offset = 0;
    data.forEach((d) => {
      const frac = d.value / total;
      const dash = frac * circumference;
      const seg = svgEl('circle', {
        cx, cy, r, fill: 'none', stroke: d.color, 'stroke-width': strokeW,
        'stroke-dasharray': `${dash} ${circumference - dash}`,
        'stroke-dashoffset': -offset,
        transform: `rotate(-90 ${cx} ${cy})`,
        'stroke-linecap': 'butt',
        style: 'transition: stroke-dasharray 0.6s ease;',
        filter: `drop-shadow(0 0 4px ${d.color}88)`,
      });
      donutSvg.appendChild(seg);
      offset += dash;
    });

    // center text
    donutSvg.appendChild(svgEl('text', {
      x: cx, y: cy - 4, 'text-anchor': 'middle',
      fill: '#fff', 'font-size': 22, 'font-weight': 700, 'font-family': 'JetBrains Mono, monospace',
    }, '100%'));
    donutSvg.appendChild(svgEl('text', {
      x: cx, y: cy + 16, 'text-anchor': 'middle',
      fill: COLORS.textFaint, 'font-size': 10, 'letter-spacing': '1px',
    }, 'TRAFFIC'));

    // legend
    donutLegend.innerHTML = '';
    data.forEach((d) => {
      const li = document.createElement('li');
      li.innerHTML = `
        <span class="lname"><i class="swatch" style="background:${d.color}"></i>${d.name}</span>
        <span class="lval">${d.value.toFixed(1)}%</span>`;
      donutLegend.appendChild(li);
    });
  }

  /* ----------------------------------------------------------
     8. Data table (sortable + filterable)
     ---------------------------------------------------------- */
  const tableBody = $('#tableBody');
  const rowCountEl = $('#rowCount');

  function getFilteredOrders() {
    const q = state.search.trim().toLowerCase();
    return state.orders.filter((o) => {
      if (state.category !== 'all' && o.category !== state.category) return false;
      if (q) {
        const hay = `${o.id} ${o.customer} ${o.product} ${o.category} ${o.status}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }

  function renderTable() {
    const rows = getFilteredOrders();
    const { key, dir } = state.sort;
    const mul = dir === 'asc' ? 1 : -1;
    rows.sort((a, b) => {
      let av = a[key], bv = b[key];
      if (key === 'date') { av = a.date.getTime(); bv = b.date.getTime(); }
      if (typeof av === 'string') return av.localeCompare(bv) * mul;
      return (av - bv) * mul;
    });

    tableBody.innerHTML = '';
    rows.forEach((o) => {
      const tr = document.createElement('tr');
      const statusLabel = o.status.charAt(0).toUpperCase() + o.status.slice(1);
      tr.innerHTML = `
        <td class="id-cell">${o.id}</td>
        <td>${o.customer}</td>
        <td>${o.category}</td>
        <td>${o.product}</td>
        <td class="num">${o.qty}</td>
        <td class="num amount-cell">$${o.amount.toFixed(2)}</td>
        <td><span class="badge badge--${o.status}">${statusLabel}</span></td>
        <td class="num">${formatDate(o.date)}</td>`;
      tableBody.appendChild(tr);
    });

    rowCountEl.textContent = rows.length;

    // update sort indicators
    $$('#dataTable thead th').forEach((th) => {
      const isActive = th.dataset.key === key;
      th.classList.toggle('is-sorted', isActive);
      const ind = th.querySelector('.sort-ind');
      if (ind) ind.remove();
      const span = document.createElement('span');
      span.className = 'sort-ind';
      span.textContent = isActive ? (dir === 'asc' ? '▲' : '▼') : '↕';
      th.appendChild(span);
    });
  }

  function formatDate(d) {
    const pad = (n) => n.toString().padStart(2, '0');
    return `${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  /* ----------------------------------------------------------
     9. Render orchestrator + event wiring
     ---------------------------------------------------------- */
  function renderAll() {
    renderKpis();
    renderLineChart();
    renderBarChart();
    renderDonutChart();
    renderTable();
  }

  function regenOnFilterChange() {
    // Changing range/category/search -> regenerate stream scales for line & sales
    seedSeries();
    seedSales();
    renderAll();
  }

  function bindEvents() {
    // Pause / resume
    const pauseBtn = $('#pauseBtn');
    const liveBadge = $('#liveBadge');
    pauseBtn.addEventListener('click', () => {
      state.paused = !state.paused;
      pauseBtn.setAttribute('aria-pressed', String(state.paused));
      $('.btn__label', pauseBtn).textContent = state.paused ? 'Resume' : 'Pause';
      liveBadge.classList.toggle('is-paused', state.paused);
      $('.live-text', liveBadge).textContent = state.paused ? 'PAUSED' : 'LIVE';
    });

    // Category dropdown
    $('#categorySelect').addEventListener('change', (e) => {
      state.category = e.target.value;
      renderAll();
    });

    // Range segmented toggle
    $$('#rangeToggle .seg__btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        $$('#rangeToggle .seg__btn').forEach((b) => {
          b.classList.remove('is-active');
          b.setAttribute('aria-selected', 'false');
        });
        btn.classList.add('is-active');
        btn.setAttribute('aria-selected', 'true');
        state.range = btn.dataset.range;
        regenOnFilterChange();
      });
    });

    // Search
    let searchTimer;
    $('#searchInput').addEventListener('input', (e) => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        state.search = e.target.value;
        renderTable();
      }, 120);
    });

    // Sortable headers
    const sortHandler = (th) => {
      const key = th.dataset.key;
      if (state.sort.key === key) {
        state.sort.dir = state.sort.dir === 'asc' ? 'desc' : 'asc';
      } else {
        state.sort.key = key;
        state.sort.dir = (key === 'amount' || key === 'date') ? 'desc' : 'asc';
      }
      renderTable();
    };
    $$('#dataTable thead th').forEach((th) => {
      th.addEventListener('click', () => sortHandler(th));
      th.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); sortHandler(th); }
      });
    });

    // Redraw charts on resize (viewBox handles scaling, but tooltips recalc on hover)
    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(renderAll, 150);
    });
  }

  /* ----------------------------------------------------------
     10. Live clock
     ---------------------------------------------------------- */
  function tickClock() {
    const d = new Date();
    const pad = (n) => n.toString().padStart(2, '0');
    $('#clock').textContent = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  }

  /* ----------------------------------------------------------
     11. Boot
     ---------------------------------------------------------- */
  function init() {
    seedOrders();
    seedSeries();
    seedSales();
    seedTraffic();
    buildKpiCards();
    bindEvents();
    renderAll();
    tickClock();
    setInterval(tickClock, 1000);
    setInterval(tick, 2000); // live stream every 2s
  }

  // DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
