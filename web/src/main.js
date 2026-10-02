// Ajo site: light first-view bundle. Chain reads go through /api/state, so viem (wallet.js) loads only
// when someone connects a wallet or signs.
import { NETWORKS } from "../shared/config.js";

/* global __NETWORK__ */
const NET_KEY = __NETWORK__;
const net = NETWORKS[NET_KEY];
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const fmt = (v, d = 2) => (Number(BigInt(v)) / 1e6).toFixed(d);
const short = (a) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "");
const txLink = (h) => `${net.explorer}/tx/${h}`;
const addrLink = (a) => `${net.explorer}/address/${a}`;
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const NS = "http://www.w3.org/2000/svg";
let RELAY_FEE = 5000n;

const ICON = {
  join: '<svg viewBox="0 0 20 20"><circle cx="10" cy="7" r="3.2"/><path d="M4 17c.8-3.3 3.2-5 6-5s5.2 1.7 6 5"/></svg>',
  pay: '<svg viewBox="0 0 20 20"><circle cx="10" cy="10" r="7"/><path d="M10 6.5v7M7.8 8.3c0-1 1-1.6 2.2-1.6s2.2.6 2.2 1.6c0 2.3-4.4 1.2-4.4 3.4 0 1 1 1.6 2.2 1.6s2.2-.6 2.2-1.6"/></svg>',
  pot: '<svg viewBox="0 0 20 20"><path d="M4 8h12l-1.2 8H5.2z"/><path d="M7 8V6.5a3 3 0 0 1 6 0V8"/></svg>',
  done: '<svg viewBox="0 0 20 20"><path d="m4.5 10.5 3.5 3.5 7.5-8"/></svg>',
  new: '<svg viewBox="0 0 20 20"><circle cx="10" cy="10" r="6.5" stroke-dasharray="2.5 2.5"/><path d="M10 7v6M7 10h6"/></svg>',
  warn: '<svg viewBox="0 0 20 20"><path d="M10 3 18 17H2z"/><path d="M10 8v4m0 2.5v.1"/></svg>',
};

// ------------------------------------------------------------------ chrome
function chrome() {
  const testnet = NET_KEY !== "mainnet";
  $("netName").textContent = net.name;
  $("eyebrowNet").textContent = testnet ? "Live on Arc Testnet" : "Live on Arc";
  $("ppNet").textContent = testnet ? "ARC TESTNET" : "ARC";
  document.querySelectorAll(".netname").forEach((e) => (e.textContent = net.name));
  $("contractLink").textContent = short(net.ajo);
  $("contractLink").href = addrLink(net.ajo);
  $("feedAll").href = addrLink(net.ajo);
  $("themeBtn").addEventListener("click", () => {
    const t = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = t;
    try { localStorage.setItem("ajo-theme", t); } catch {}
  });
  const nav = $("nav");
  const onScroll = () => nav.classList.toggle("scrolled", scrollY > 8);
  addEventListener("scroll", onScroll, { passive: true }); onScroll();
  // reveal on scroll (classes added here so the page is complete without JS)
  const els = document.querySelectorAll(".sec-head, .steps li, .compare .col, .metric, .passport, .panel, .why .compare");
  if ("IntersectionObserver" in window && !reduced) {
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { rootMargin: "0px 0px -8% 0px" });
    els.forEach((el, i) => { el.classList.add("rv"); el.style.transitionDelay = `${(i % 4) * 70}ms`; io.observe(el); });
  } else els.forEach((el) => el.classList.add("in"));
  // duplicate the names for a seamless marquee
  const tr = $("namesTrack"); tr.innerHTML += tr.innerHTML;
  fetch("/api/relay").then((r) => r.json()).then((j) => {
    if (j.relayFee) { RELAY_FEE = BigInt(j.relayFee); document.querySelectorAll(".feeV").forEach((e) => (e.textContent = fmt(RELAY_FEE, 3))); }
  }).catch(() => {});
}

let toastT;
function toast(msg) {
  const t = $("toast"); t.textContent = msg; t.classList.add("show");
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("show"), 2600);
}

// -------------------------------------------------------------- ring (svg)
function el(tag, attrs = {}, parent) {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
}
const C = 200, R = 140, POT_R = 74;
function pos(i, n, r = R) { const a = -Math.PI / 2 + (i * 2 * Math.PI) / n; return [C + r * Math.cos(a), C + r * Math.sin(a)]; }

function buildRing(svg, n, mini) {
  svg.innerHTML = "";
  svg.setAttribute("viewBox", mini ? "0 0 400 400" : "-22 -22 444 444");
  svg.dataset.n = n;
  const uid = Math.random().toString(36).slice(2, 7);
  const defs = el("defs", {}, svg);
  const cp = el("clipPath", { id: `pc${uid}` }, defs); el("circle", { cx: C, cy: C, r: POT_R }, cp);
  const lg = el("linearGradient", { id: `lq${uid}`, x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
  el("stop", { offset: "0", "stop-color": "#ffd88a" }, lg); el("stop", { offset: "1", "stop-color": "#e09a1c" }, lg);
  const rg = el("radialGradient", { id: `gl${uid}` }, defs);
  el("stop", { offset: "0", "stop-color": "#f4b740", "stop-opacity": ".35" }, rg); el("stop", { offset: "1", "stop-color": "#f4b740", "stop-opacity": "0" }, rg);
  if (!mini) {
    const o = el("g", { class: "orbit" }, svg);
    el("circle", { cx: C, cy: C, r: 182, fill: "none", stroke: "currentColor", "stroke-opacity": ".10", "stroke-dasharray": "1 9", "stroke-width": 3, "stroke-linecap": "round", style: "color:var(--indigo2)" }, o);
    const o2 = el("g", { class: "orbit2" }, svg);
    el("circle", { cx: C, cy: C, r: 166, fill: "none", stroke: "currentColor", "stroke-opacity": ".14", "stroke-dasharray": "14 10", style: "color:var(--indigo2)" }, o2);
  }
  el("circle", { class: "glow", cx: C, cy: C, r: 120, fill: `url(#gl${uid})`, opacity: 0 }, svg);
  el("circle", { class: "track", cx: C, cy: C, r: R }, svg);
  const circ = 2 * Math.PI * R;
  el("circle", { class: "seg", cx: C, cy: C, r: R, "stroke-dasharray": circ, "stroke-dashoffset": circ, transform: `rotate(-90 ${C} ${C})` }, svg);
  el("circle", { class: "potbg", cx: C, cy: C, r: POT_R }, svg);
  const lq = el("g", { "clip-path": `url(#pc${uid})` }, svg);
  const liquid = el("g", { class: "liquid", style: `transform:translateY(${C + POT_R}px)` }, lq);
  const wave = (cls, op) => {
    let d = `M 40 0`;
    for (let x = 40; x < 560; x += 80) d += ` q 40 ${x % 160 === 40 ? -8 : 8} 80 0`;
    d += ` V 200 H 40 Z`;
    el("path", { class: cls, d, fill: `url(#lq${uid})`, opacity: op }, liquid);
  };
  wave("wave2", ".55"); wave("wave", "1");
  const nr = mini ? (n <= 4 ? 40 : n <= 8 ? 28 : n <= 12 ? 18 : 12) : n <= 4 ? 30 : n <= 8 ? 22 : 14;
  const nodes = el("g", { class: "nodes" }, svg);
  for (let i = 0; i < n; i++) {
    const [x, y] = pos(i, n);
    const g = el("g", { class: "node ghost", "data-i": i, transform: `translate(${x} ${y})` }, nodes);
    el("circle", { class: "halo", r: nr + 7 }, g);
    el("circle", { class: "disc", r: nr }, g);
    el("circle", { class: "spin", r: nr + 3.5, "stroke-dasharray": `${nr * 1.6} ${nr * 6}` }, g);
    if (nr >= 12) { const t = el("text", { class: "ini", y: 1, style: `font-size:${Math.round(nr * 0.78)}px` }, g); t.textContent = ""; }
    const b = el("g", { class: "badge", transform: `translate(${nr * 0.72} ${-nr * 0.72})` }, g);
    el("circle", { r: mini ? 9 : 8 }, b);
    if (!mini) el("path", { d: "M-3.5 0 l2.4 2.4 l4.6 -5" }, b);
    if (!mini) {
      const [lx, ly] = pos(i, n, R + nr + 26);
      const up = ly < C - 40;
      const lab = el("g", { class: "lab", transform: `translate(${lx - x} ${ly - y + (up ? -8 : 2)})` }, g);
      el("text", { class: "nm", y: 0 }, lab);
      el("text", { class: "st", y: 15 }, lab);
    }
  }
  el("g", { class: "fx" }, svg);
  return { nr };
}

/** model: { members:[{label, initials, state:'ghost'|'in'|'paid', turn, got, status, hot}], fill, progress } */
function paintRing(svg, model, mini = false) {
  const n = model.members.length;
  if (Number(svg.dataset.n) !== n) buildRing(svg, n, mini);
  const circ = 2 * Math.PI * R;
  svg.querySelector(".seg").setAttribute("stroke-dashoffset", String(circ * (1 - Math.min(1, model.progress || 0))));
  const lvl = C + POT_R - Math.max(0, Math.min(1, model.fill)) * POT_R * 2 - (model.fill > 0 ? 4 : -6);
  svg.querySelector(".liquid").style.transform = `translateY(${lvl}px)`;
  svg.querySelector(".glow").setAttribute("opacity", model.fill > 0 ? String(0.4 + model.fill * 0.6) : "0");
  svg.querySelectorAll(".node").forEach((g, i) => {
    const m = model.members[i];
    g.setAttribute("class", `node ${m.state}${m.turn ? " turn" : ""}${m.got ? " got" : ""}${m.busy ? " busy" : ""}`);
    const ini = g.querySelector(".ini"); if (ini) ini.textContent = m.initials;
    const nm = g.querySelector(".nm"); if (nm) nm.textContent = m.label;
    const st = g.querySelector(".st"); if (st) { st.textContent = m.status; st.setAttribute("class", `st${m.hot ? " hot" : ""}`); }
  });
}

function tween(dur, fn) {
  return new Promise((res) => {
    if (reduced) { fn(1); return res(); }
    const t0 = performance.now();
    const tick = (t) => { const p = Math.min(1, (t - t0) / dur); fn(p); p < 1 ? requestAnimationFrame(tick) : res(); };
    requestAnimationFrame(tick);
  });
}
const ease = (p) => 1 - Math.pow(1 - p, 3);
function coins(svg, from, to, count = 6, dur = 800) {
  const fx = svg.querySelector(".fx");
  const jobs = [];
  for (let k = 0; k < count; k++) {
    const c = el("circle", { class: "coin", r: 5.5, cx: from[0], cy: from[1], opacity: 0 }, fx);
    const bend = (k % 2 ? 1 : -1) * (30 + k * 8);
    const mx = (from[0] + to[0]) / 2 + (to[1] - from[1]) * bend / 300, my = (from[1] + to[1]) / 2 - (to[0] - from[0]) * bend / 300;
    jobs.push(sleep(k * 70).then(() => tween(dur, (p) => {
      const e = ease(p), u = 1 - e;
      c.setAttribute("cx", u * u * from[0] + 2 * u * e * mx + e * e * to[0]);
      c.setAttribute("cy", u * u * from[1] + 2 * u * e * my + e * e * to[1]);
      c.setAttribute("opacity", p < .1 ? p * 10 : p > .9 ? (1 - p) * 10 : 1);
    })).then(() => c.remove()));
  }
  return Promise.all(jobs);
}
function burst(svg, at, text) {
  const fx = svg.querySelector(".fx");
  const ring = el("circle", { class: "burst", cx: at[0], cy: at[1], r: 20 }, fx);
  const t = el("text", { class: "float", x: at[0], y: at[1] - 44 }, fx); t.textContent = text;
  return tween(1300, (p) => {
    ring.setAttribute("r", 20 + ease(p) * 40); ring.setAttribute("opacity", 1 - p);
    t.setAttribute("y", at[1] - 44 - ease(p) * 22); t.setAttribute("opacity", p < .15 ? p / .15 : p > .75 ? (1 - p) / .25 : 1);
  }).then(() => { ring.remove(); t.remove(); });
}

// --------------------------------------------------------------- demo
let demo = { circle: null, members: [], events: [] };
const session = new Map(); // tx hash -> { ms, gas, label, step, at }
let busy = false, playing = false;

const nameOf = (a) => demo.members.find((m) => m.address.toLowerCase() === a?.toLowerCase())?.name;

function demoModel() {
  const c = demo.circle;
  const mems = demo.members.length ? demo.members : [{ name: "Ada" }, { name: "Bayo" }, { name: "Chidi" }];
  if (!c) return { members: mems.map((m) => ({ label: m.name, initials: m.name[0], state: "ghost", status: "not joined" })), fill: 0, progress: 0 };
  const slots = c.members.map((m) => m.address.toLowerCase());
  const per = fmt(c.contribution);
  const potTotal = fmt(BigInt(c.contribution) * BigInt(c.size));
  return {
    members: mems.map((m) => {
      const s = slots.indexOf(m.address?.toLowerCase());
      const base = { label: m.name, initials: m.name[0] };
      if (s < 0) return { ...base, state: "ghost", status: "not joined" };
      if (c.status === 0) return { ...base, state: "in", status: `joined · slot ${s + 1}` };
      if (c.status === 2) return { ...base, state: "in", got: true, status: "got the pot ✓" };
      const paid = c.members[s].paid, turn = s === c.round;
      return { ...base, state: paid ? "paid" : "in", turn, got: s < c.round,
        status: turn ? `gets ${potTotal}` : paid ? "paid ✓" : `owes ${per}`, hot: turn };
    }),
    fill: c.status === 1 ? Number(BigInt(c.pot)) / Number(BigInt(c.contribution) * BigInt(c.size)) : 0,
    progress: c.status === 2 ? 1 : c.status === 1 ? c.round / c.size : 0,
  };
}

function actor() {
  const c = demo.circle;
  if (!c || c.status === 2) return null;
  if (c.status === 0) return demo.members.find((m) => !c.members.some((x) => x.address.toLowerCase() === m.address.toLowerCase()));
  const idx = c.members.findIndex((m) => !m.paid);
  return demo.members.find((m) => m.address.toLowerCase() === c.members[idx]?.address.toLowerCase());
}
const memberIndex = (m) => demo.members.findIndex((x) => x.address === m?.address);

function renderDemo() {
  const c = demo.circle;
  const model = demoModel();
  paintRing($("ring"), model);
  const fee = fmt(RELAY_FEE, 3);
  const setBtn = (label, sub) => { $("stepBtn").querySelector(".b-label").textContent = label; $("stepSub").textContent = sub; };
  $("cTitle").textContent = "Ada, Bayo & Chidi";
  if (c) { $("cId").textContent = `circle #${c.id}`; $("cLink").href = addrLink(net.ajo); }
  if (!c || c.status === 2) {
    $("potV").textContent = c ? fmt(BigInt(c.contribution) * BigInt(c.size)) : "0.00";
    $("potK").textContent = c ? "paid out ×3" : "pot";
    $("potS").textContent = c ? "circle complete" : "USDC";
    $("stStatus").innerHTML = c ? `Circle complete: <b>all ${c.size} members got the pot once</b>, deposits returned.` : "No demo circle yet. The first click starts one.";
    setBtn("Start a new demo circle", "The relayer creates it on Arc. Nobody pays a cent.");
  } else if (c.status === 0) {
    const nx = actor();
    $("potV").textContent = "0.00"; $("potK").textContent = "pot"; $("potS").textContent = `filling · ${c.members.length}/${c.size} joined`;
    $("stStatus").innerHTML = `Filling up: <b>${c.members.length} of ${c.size}</b> joined · ${fmt(c.contribution)} USDC a round · ${fmt(c.deposit)} deposit`;
    setBtn(`${nx?.name || "Next member"} joins by signature`, `Signs ${fmt(BigInt(c.deposit) + RELAY_FEE, 3)} USDC (deposit + ${fee} fee). No gas.`);
  } else {
    const recip = nameOf(c.members[c.round].address) || short(c.members[c.round].address);
    const nx = actor();
    const last = c.paidCount + 1 === c.size;
    $("potV").textContent = fmt(c.pot); $("potK").textContent = `round ${c.round + 1} of ${c.size}`; $("potS").textContent = `USDC → ${recip}`;
    $("stStatus").innerHTML = `Round <b>${c.round + 1} of ${c.size}</b> · the pot goes to <b>${esc(recip)}</b> · ${c.paidCount} of ${c.size} shares in`;
    setBtn(last ? `${nx?.name} pays the last share` : `${nx?.name} pays round ${c.round + 1}`,
      last ? `Same transaction pays the ${fmt(BigInt(c.contribution) * BigInt(c.size))} USDC pot to ${recip}.` : `Signs ${fmt(BigInt(c.contribution) + RELAY_FEE, 3)} USDC. The relayer pays the gas.`);
  }
  if (!busy) { $("stepBtn").disabled = false; $("playBtn").disabled = false; }
  renderFeed();
}

function describe(e) {
  const a = e.args || {}; const nm = (x) => esc(nameOf(x) || short(x));
  switch (e.name) {
    case "CircleCreated": return ["new", `New circle: <b>${fmt(a.contribution)} USDC × ${a.size}</b>`, "relayer paid the gas"];
    case "Joined": return ["join", `<b>${nm(a.member)}</b> joined · slot ${Number(a.slot) + 1}`, BigInt(a.relayFee || 0) > 0n ? "by signature · no gas" : "direct"];
    case "CircleStarted": return ["done", "Circle full · <b>round 1 open</b>", ""];
    case "Contributed": return ["pay", `<b>${nm(a.member)}</b> paid round ${Number(a.round) + 1}`, BigInt(a.relayFee || 0) > 0n ? "by signature · no gas" : "direct"];
    case "PotPaid": return ["pot", `<b>${fmt(a.amount)} USDC pot</b> → ${nm(a.recipient)}`, "same transaction"];
    case "Defaulted": return ["warn", `${nm(a.member)} missed · ${fmt(a.coveredFromDeposit)} from deposit`, ""];
    case "CircleCompleted": return ["done", "<b>Circle complete</b>", ""];
    case "DepositReturned": return ["done", `${nm(a.member)}'s ${fmt(a.amount)} deposit returned`, ""];
    default: return ["new", esc(e.name), ""];
  }
}
const ago = (s) => (s < 60 ? `${s}s ago` : s < 3600 ? `${Math.round(s / 60)} min ago` : `${Math.round(s / 3600)} h ago`);

function renderFeed(freshHash) {
  const rows = [];
  const seen = new Set();
  const known = new Set(demo.events.map((e) => e.hash));
  for (const [h, s] of [...session.entries()].reverse()) {
    if (known.has(h)) continue;
    rows.push({ cls: s.step === "payout" ? "pot" : s.step === "join" ? "join" : s.step === "created" ? "new" : "pay", html: esc(s.short), hash: h, s });
  }
  for (const e of demo.events) {
    const [cls, html, note] = describe(e);
    const s = session.get(e.hash);
    rows.push({ cls, html, hash: e.hash, s: seen.has(e.hash) ? null : s, note, ago: e.ago });
    seen.add(e.hash);
  }
  if (!rows.length) {
    $("receipts").innerHTML = `<li class="r empty-row">${demo.circle ? "No moves in the last hour. Press the button and watch one land." : "Nothing yet. The first click writes the first line."}</li>`;
    return;
  }
  const klass = (c) => (c === "pot" ? "pay" : c === "done" ? "done" : c === "join" ? "join" : "");
  $("receipts").innerHTML = rows.slice(0, 24).map((r) => {
    const meta = r.s ? `<span class="fast">final in ${r.s.ms} ms</span> · relayer paid ${Number(r.s.gas).toFixed(4)} gas`
      : [r.note, r.ago != null ? ago(r.ago) : ""].filter(Boolean).join(" · ");
    return `<li class="r ${klass(r.cls)}${r.hash === freshHash ? " new" : ""}"><span class="r-ic">${ICON[r.cls] || ICON.new}</span><span class="r-t">${r.html}<span class="r-meta">${meta}</span></span><a href="${txLink(r.hash)}" target="_blank" rel="noopener" title="View this transaction on the Arc explorer">${r.hash.slice(0, 6)}…↗</a></li>`;
  }).join("");
}

async function loadState(fresh) {
  const r = await fetch(`/api/state?demo=1${fresh ? `&t=${Date.now()}` : ""}`);
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || "state");
  const j = await r.json();
  const changed = JSON.stringify(j.circle) !== JSON.stringify(demo.circle);
  demo = { circle: j.circle, members: j.members || [], events: j.events || [] };
  return changed;
}

// timer
let timerRaf = 0;
function timerStart(who) {
  const t = $("timer"); t.className = "timer run";
  $("tPhase").textContent = who ? `${who} signs · relayer submits · Arc finalizes…` : "Relayer submits · Arc finalizes…";
  const t0 = performance.now();
  const tick = () => { $("tMs").textContent = `${((performance.now() - t0) / 1000).toFixed(2)} s`; timerRaf = requestAnimationFrame(tick); };
  cancelAnimationFrame(timerRaf); tick();
}
function timerDone(j) {
  cancelAnimationFrame(timerRaf);
  const t = $("timer"); t.className = "timer ok";
  $("tPhase").innerHTML = `Final on Arc · relayer paid ${Number(j.gasCostUsdc).toFixed(4)} USDC gas · <a href="${esc(j.explorer)}" target="_blank" rel="noopener">view tx ↗</a>`;
  $("tMs").textContent = `${j.ms} ms`;
}
function timerFail(msg, soft) {
  cancelAnimationFrame(timerRaf);
  $("timer").className = soft ? "timer" : "timer err";
  $("tPhase").textContent = msg; $("tMs").textContent = "";
}

async function step() {
  if (busy) return null;
  busy = true;
  const btn = $("stepBtn"); btn.disabled = true; btn.classList.add("busy"); $("playBtn").disabled = !playing;
  const before = demo.circle ? JSON.parse(JSON.stringify(demo.circle)) : null;
  const who = actor();
  const idx = memberIndex(who);
  const model = demoModel();
  if (idx >= 0) { model.members[idx].busy = true; paintRing($("ring"), model); }
  timerStart(who?.name);
  let j = null;
  try {
    const r = await fetch("/api/demo", { method: "POST" });
    j = await r.json();
    if (!r.ok) { timerFail(j.error || "Something went wrong. Try again.", r.status === 409 || r.status === 429); j = null; }
  } catch { timerFail("Network hiccup. Try again."); }
  if (j) {
    timerDone(j);
    const shortLbl = j.step === "created" ? "New demo circle created" : j.step === "join" ? `${j.member} joined by signature` : j.step === "payout" ? `${j.member} paid the last share · pot paid out` : `${j.member} paid by signature`;
    session.set(j.hash, { ms: j.ms, gas: j.gasCostUsdc, step: j.step, short: shortLbl });
    $("statFinal").textContent = (j.ms / 1000).toFixed(2).replace(/0$/, "");
    $("statFinalK").textContent = "last step, measured live just now";
    const svg = $("ring");
    const n = demo.members.length || 3;
    if (j.step === "contribute" || j.step === "payout") {
      paintRing(svg, demoModel());
      await coins(svg, pos(idx, n), [C, C], 6, 750);
      $("pot").classList.remove("bump"); void $("pot").offsetWidth; $("pot").classList.add("bump");
    }
    if (j.step === "payout" && before) {
      const ri = memberIndex(demo.members.find((m) => m.address.toLowerCase() === before.members[before.round].address.toLowerCase()));
      // show the full pot for a beat, then stream it out
      const full = demoModel(); full.fill = 1; full.members[idx].state = "paid"; paintRing(svg, full);
      $("potV").textContent = fmt(BigInt(before.contribution) * BigInt(before.size));
      await sleep(reduced ? 0 : 450);
      const out = demoModel(); out.fill = 0; paintRing(svg, out);
      await coins(svg, [C, C], pos(ri, n), 12, 900);
      burst(svg, pos(ri, n), `+${fmt(BigInt(before.contribution) * BigInt(before.size))}`);
    }
    try { await loadState(true); } catch {}
    renderDemo(); renderFeed(j.hash);
    setTimeout(() => loadState(true).then(() => renderDemo()).catch(() => {}), 2500); // logs can trail a block
  } else {
    try { await loadState(true); } catch {}
    renderDemo();
  }
  busy = false; btn.classList.remove("busy"); btn.disabled = false; if (!playing) $("playBtn").disabled = false;
  return j;
}

async function play() {
  const pb = $("playBtn");
  if (playing) { playing = false; return; }
  playing = true; pb.querySelector("span").textContent = "Stop"; pb.classList.add("on");
  for (let i = 0; i < 8 && playing; i++) {
    const j = await step();
    if (!j || j.step === "payout") break;
    await sleep(500);
  }
  playing = false; pb.querySelector("span").textContent = "Play round"; pb.classList.remove("on"); pb.disabled = false;
}

async function bootDemo() {
  paintRing($("ring"), demoModel());
  try { await loadState(); renderDemo(); }
  catch { $("stStatus").textContent = "Couldn't reach Arc just now. Retrying…"; setTimeout(bootDemo, 4000); return; }
  $("stepBtn").addEventListener("click", step);
  $("playBtn").addEventListener("click", play);
  setInterval(async () => {
    if (document.hidden || busy) return;
    try { if (await loadState()) renderDemo(); } catch {}
  }, 12000);
  initPassport();
}

// ------------------------------------------------------------ passport
function hashBytes(addr) {
  const h = addr.toLowerCase().replace(/^0x/, "");
  const out = []; for (let i = 0; i < 40; i += 2) out.push(parseInt(h.slice(i, i + 2), 16) || 0);
  return out;
}
function identicon(addr) {
  const b = hashBytes(addr);
  const pal = ["#f4b740", "#9aa6ff", "#f5f0e2", "#5e6cf5"];
  let s = `<svg viewBox="0 0 96 118" aria-hidden="true"><rect width="96" height="118" fill="#0d1450"/>`;
  let k = 0;
  for (let row = 0; row < 5; row++) for (let col = 0; col < 2; col++) {
    const v = b[k++ % b.length], col2 = 3 - col, cx1 = 12 + col * 24, cx2 = 12 + col2 * 24, cy = 12 + row * 23.5;
    const c = pal[v % 4], kind = (v >> 2) % 4;
    for (const cx of [cx1, cx2]) {
      if (kind === 0) s += `<circle cx="${cx}" cy="${cy}" r="9" fill="none" stroke="${c}" stroke-width="1.6"/><circle cx="${cx}" cy="${cy}" r="3" fill="${c}"/>`;
      else if (kind === 1) s += `<circle cx="${cx}" cy="${cy}" r="8.5" fill="${c}" opacity=".9"/>`;
      else if (kind === 2) s += `<circle cx="${cx}" cy="${cy}" r="9" fill="none" stroke="${c}" stroke-width="1.4" stroke-dasharray="2 2.6"/>`;
      else s += `<path d="M${cx - 8} ${cy}h16M${cx} ${cy - 8}v16" stroke="${c}" stroke-width="1.6"/>`;
    }
  }
  return s + `</svg>`;
}
function scoreRing(pct, label) {
  const r = 38, c = 2 * Math.PI * r, off = c * (1 - (pct ?? 0));
  return `<svg viewBox="0 0 92 92"><circle class="bg" cx="46" cy="46" r="${r}"/><circle class="fg" cx="46" cy="46" r="${r}" stroke-dasharray="${c}" stroke-dashoffset="${c}" data-off="${off}"/><text x="46" y="48" font-size="${pct == null ? 22 : 26}">${label}</text><text x="46" y="64" font-size="9" style="font-family:var(--mono);letter-spacing:.12em" fill-opacity=".6">ON TIME</text></svg>`;
}
function countUp(node, to) {
  if (reduced || to === 0) { node.textContent = to; return; }
  tween(900, (p) => (node.textContent = Math.round(ease(p) * to)));
}
let ppSeq = 0;
async function showPassport(addr, label) {
  const seq = ++ppSeq;
  const card = $("passportCard"); card.classList.add("loading");
  $("recordMsg").className = "msg"; $("recordMsg").textContent = "";
  document.querySelectorAll("#ppQuick button").forEach((b) => b.classList.toggle("on", b.dataset.addr?.toLowerCase() === addr.toLowerCase()));
  try {
    const r = await fetch(`/api/state?record=${encodeURIComponent(addr)}`);
    const j = await r.json();
    if (seq !== ppSeq) return;
    if (!r.ok) throw new Error(j.error || "Lookup failed.");
    card.classList.remove("loading", "flip"); void card.offsetWidth; card.classList.add("flip");
    const total = j.paid + j.missed;
    const pct = total ? j.paid / total : null;
    const tier = !total ? "New saver · no rounds yet" : j.missed === 0 && j.circlesCompleted >= 3 ? "Trusted saver" : j.missed === 0 ? "On-time saver" : pct >= 0.9 ? "Reliable saver" : "Building a record";
    $("ppName").textContent = label || nameOf(addr) || "Saver";
    $("ppAddr").textContent = short(addr);
    $("ppTier").textContent = tier;
    $("ppPhoto").innerHTML = identicon(addr);
    $("ppScore").innerHTML = scoreRing(pct, pct == null ? "–" : `${Math.round(pct * 100)}%`);
    requestAnimationFrame(() => requestAnimationFrame(() => { const fg = $("ppScore").querySelector(".fg"); if (fg) fg.setAttribute("stroke-dashoffset", fg.dataset.off); }));
    countUp($("ppPaid"), j.paid); countUp($("ppMissed"), j.missed); countUp($("ppRecv"), j.received); countUp($("ppDone"), j.circlesCompleted);
    const stamps = [];
    for (let i = 0; i < j.circlesCompleted; i++) stamps.push(`<span class="stamp new" style="--rot:${(i * 37) % 24 - 12}deg;animation-delay:${200 + i * 90}ms"><span>circle<b>✓</b>${i + 1}</span></span>`);
    for (let i = 0; i < j.received; i++) stamps.push(`<span class="stamp recv new" style="--rot:${(i * 53) % 26 - 13}deg;animation-delay:${260 + (j.circlesCompleted + i) * 90}ms"><span>pot<b>↓</b>${i + 1}</span></span>`);
    const MAX = 7;
    $("ppStamps").innerHTML = stamps.length ? stamps.slice(0, MAX).join("") + (stamps.length > MAX ? `<span class="pp-none">+${stamps.length - MAX} more</span>` : "") : `<span class="pp-none">No stamps yet. The first completed circle earns one.</span>`;
    const pad = (n) => String(n).padStart(3, "0");
    const fill = (s) => (s + "<".repeat(44)).slice(0, 44);
    const holder = ($("ppName").textContent || "SAVER").toUpperCase().replace(/[^A-Z0-9]/g, "<");
    $("ppMrz").textContent = fill(`P<ARC<${holder}<<SAVINGS<RECORD`) + "\n" + fill(`${addr.slice(2, 26).toUpperCase()}<${pad(j.paid)}<${pad(j.missed)}<${pad(j.received)}<${pad(j.circlesCompleted)}`);
  } catch (e) {
    if (seq !== ppSeq) return;
    card.classList.remove("loading");
    $("recordMsg").className = "msg err"; $("recordMsg").textContent = e.message;
  }
}
function initPassport() {
  const q = $("ppQuick");
  q.innerHTML = demo.members.map((m) => `<button type="button" data-addr="${m.address}" data-name="${esc(m.name)}"><i>${esc(m.name[0])}</i>${esc(m.name)}</button>`).join("");
  q.addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) { $("recordAddr").value = b.dataset.addr; showPassport(b.dataset.addr, b.dataset.name); } });
  $("recordForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const a = $("recordAddr").value.trim();
    if (!/^0x[0-9a-fA-F]{40}$/.test(a)) { $("recordMsg").className = "msg err"; $("recordMsg").textContent = "That isn't an address. It should start with 0x and have 40 more characters."; return; }
    showPassport(a);
  });
  // lazy: load the first passport when it scrolls near
  const first = demo.members[0];
  const go = () => first && showPassport(first.address, first.name);
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { io.disconnect(); go(); } }, { rootMargin: "300px" });
    io.observe($("passportCard"));
  } else go();
  // tilt + sheen on fine pointers
  const stage = document.querySelector(".pp-stage"), card = $("passportCard");
  if (matchMedia("(pointer:fine)").matches && !reduced) {
    stage.addEventListener("pointermove", (e) => {
      const r = card.getBoundingClientRect(); const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      card.style.setProperty("--ry", `${(x - .5) * 10}deg`); card.style.setProperty("--rx", `${(.5 - y) * 8}deg`);
      card.style.setProperty("--mx", `${x * 100}%`); card.style.setProperty("--my", `${y * 100}%`);
    });
    stage.addEventListener("pointerleave", () => { card.style.setProperty("--rx", "0deg"); card.style.setProperty("--ry", "0deg"); });
  }
}

// ---------------------------------------------------------------- app
const DUR = { 3600: ["hour", "hours"], 86400: ["day", "days"], 604800: ["week", "weeks"], 2592000: ["month", "months"] };
function toUnits(v) {
  const s = String(v ?? "").trim();
  if (!/^\d*(\.\d{0,6})?$/.test(s) || s === "" || s === ".") throw new Error("Amounts are in USDC with up to 6 decimals.");
  const [i, f = ""] = s.split(".");
  return (BigInt(i || "0") * 1000000n + BigInt((f + "000000").slice(0, 6))).toString();
}
function summary() {
  const f = new FormData($("createForm"));
  const c = Number(f.get("contribution")) || 0, n = Math.max(2, Math.min(20, Number(f.get("size")) || 2)), d = Number(f.get("deposit")) || 0;
  const [u, us] = DUR[f.get("roundDuration")] || ["round", "rounds"];
  const nice = (x) => (Math.round(x * 100) / 100).toLocaleString(undefined, { maximumFractionDigits: 2 });
  $("summary").innerHTML = `<span class="big">${nice(c * n)} USDC pot every ${u}</span>Each of the <b>${n}</b> members puts in <b>${nice(c)} USDC</b> ${u === "hour" ? "an" : "a"} ${u}. One member takes the pot each ${u}, so over <b>${n} ${us}</b> everyone gets it once.${d > 0 ? ` The <b>${nice(d)} USDC</b> deposit covers a missed round and comes back at the end.` : " No deposit: a missed round shrinks the pot."}`;
}
function initApp() {
  const form = $("createForm");
  form.addEventListener("input", summary);
  form.querySelectorAll(".stepper button").forEach((b) => b.addEventListener("click", () => {
    const i = form.elements.namedItem("size"); i.value = Math.max(2, Math.min(20, Number(i.value) + Number(b.dataset.d))); summary();
  }));
  summary();
  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const f = new FormData(form), msg = $("createMsg"), btn = $("createBtn");
    msg.className = "msg"; msg.textContent = "";
    let body;
    try {
      body = { action: "create", name: String(f.get("name")).trim(), contribution: toUnits(f.get("contribution")), deposit: toUnits(f.get("deposit") || "0"), size: Number(f.get("size")), roundDuration: Number(f.get("roundDuration")) };
      if (BigInt(body.contribution) === 0n) throw new Error("Each round needs an amount above zero.");
      if (!(body.size >= 2 && body.size <= 20)) throw new Error("A circle has 2 to 20 members.");
    } catch (e) { msg.className = "msg err"; msg.textContent = e.message; return; }
    btn.disabled = true; btn.classList.add("busy"); btn.firstChild.textContent = "Creating on Arc… ";
    try {
      const r = await fetch("/api/relay", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Couldn't create the circle.");
      const link = `${location.origin}/?circle=${j.circleId}#start`;
      msg.innerHTML = "";
      const box = document.createElement("div"); box.className = "success";
      box.innerHTML = `<b>Circle #${esc(j.circleId)} is live.</b><div class="cv-meta">Created in ${j.ms} ms · gas paid by the relayer · <a href="${esc(j.explorer)}" target="_blank" rel="noopener">view tx ↗</a></div><div class="share"><span>${esc(link)}</span><button type="button" class="btn sm primary" data-copy="${esc(link)}">Copy link</button></div>`;
      msg.appendChild(box);
      form.querySelector(".success [data-copy]")?.addEventListener("click", (e) => copy(e.target.dataset.copy));
      $("openForm").elements.namedItem("id").value = j.circleId;
      openCircle(j.circleId);
    } catch (e) { msg.className = "msg err"; msg.textContent = e.message; }
    btn.disabled = false; btn.classList.remove("busy"); btn.firstChild.textContent = "Create circle ";
  });
  $("openForm").addEventListener("submit", (ev) => { ev.preventDefault(); openCircle(new FormData(ev.target).get("id")); });
  $("connectBtn").addEventListener("click", () => connect().catch(walletErr));
  const q = new URLSearchParams(location.search).get("circle");
  if (q) { $("openForm").elements.namedItem("id").value = q; openCircle(q); }
}
async function copy(text) {
  try { await navigator.clipboard.writeText(text); toast("Link copied. Send it to your members."); }
  catch { prompt("Copy this link", text); }
}

// wallet (lazy)
let W = null, account = null;
async function wallet() { if (!W) W = await import("./wallet.js"); return W; }
function walletErr(e) {
  const m = e?.shortMessage || e?.message || String(e);
  toast(/reject|denied|cancel/i.test(m) ? "You cancelled in your wallet." : m.split("\n")[0].slice(0, 140));
}
async function connect() {
  if (!window.ethereum) { toast("No browser wallet found. Open this page in MetaMask, Rabby or Coinbase Wallet."); return null; }
  const btn = $("connectBtn"); btn.querySelector("span").textContent = "Connecting…";
  try {
    const w = await wallet();
    const { address, balance } = await w.connect(net, NET_KEY);
    account = address;
    btn.classList.add("on"); btn.querySelector("span").textContent = short(address);
    $("walletNote").innerHTML = `Connected <span class="mono">${short(address)}</span> on ${esc(net.name)} · <b>${fmt(balance)} USDC</b>. That's all you need: no gas token.`;
    const q = $("ppQuick");
    if (!q.querySelector("[data-me]")) q.insertAdjacentHTML("beforeend", `<button type="button" data-me="1" data-addr="${address}" data-name="You"><i>✦</i>My record</button>`);
    return address;
  } catch (e) { btn.querySelector("span").textContent = "Connect wallet"; throw e; }
}

let viewing = null;
async function openCircle(id, note = "") {
  const box = $("circleView");
  viewing = id;
  if (!box.querySelector(".cv")) box.innerHTML = `<div class="skel-row"></div><div class="skel-row"></div><div class="skel-row"></div>`;
  try {
    const r = await fetch(`/api/state?circle=${encodeURIComponent(id)}&events=0&t=${Date.now()}`);
    const j = await r.json();
    if (viewing !== id) return;
    if (!r.ok) { box.innerHTML = `<div class="empty"><p>${esc(j.error || "Couldn't open that circle.")}</p></div>`; return; }
    const c = j.circle, me = account?.toLowerCase();
    const slots = c.members.map((m) => m.address.toLowerCase());
    const mine = me && slots.includes(me);
    const myPaid = mine && c.members[slots.indexOf(me)].paid;
    const now = Math.floor(Date.now() / 1000);
    const pills = ["<span class=\"pill gold\">Filling up</span>", "<span class=\"pill ok\">Active</span>", "<span class=\"pill\">Completed</span>"];
    const [u] = DUR[c.roundDuration] || [`${Math.round(c.roundDuration / 3600)} h`];
    const meta = [`${fmt(c.contribution)} USDC ${u === "hour" ? "an" : "a"} ${u}`, `${c.size} members`, `deposit ${fmt(c.deposit)}`,
      c.status === 0 ? `${c.members.length}/${c.size} joined` : c.status === 1 ? `round ${c.round + 1} · due ${new Date(c.deadline * 1000).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}` : "every member got the pot"];
    const list = c.members.map((m, i) => `<li><span class="pill">${i + 1}</span><a class="mono" href="${addrLink(m.address)}" target="_blank" rel="noopener">${short(m.address)}${m.address.toLowerCase() === me ? " · you" : ""}</a>${c.status === 1 ? (m.paid ? '<span class="pill ok">paid</span>' : '<span class="pill">due</span>') : ""}${c.status === 1 && i === c.round ? '<span class="pill gold">gets pot</span>' : ""}</li>`).join("") || `<li class="muted">Nobody yet. Be the first.</li>`;
    const acts = [];
    if (c.status === 0 && !mine) acts.push(`<button class="btn primary" data-act="join">Join · sign ${fmt(BigInt(c.deposit) + RELAY_FEE, 3)} USDC</button>`);
    if (c.status === 1 && mine && !myPaid) acts.push(`<button class="btn primary" data-act="contribute">Pay round ${c.round + 1} · sign ${fmt(BigInt(c.contribution) + RELAY_FEE, 3)} USDC</button>`);
    if (c.status === 1 && now > c.deadline) acts.push(`<button class="btn ghost" data-act="settle">Settle round (deadline passed)</button>`);
    if (c.status === 0 && mine) acts.push(`<button class="btn ghost" data-act="leave">Leave and refund deposit</button>`);
    if (!account && c.status !== 2) acts.unshift(`<button class="btn ghost" data-act="connect">Connect wallet</button>`);
    const link = `${location.origin}/?circle=${c.id}#start`;
    box.innerHTML = `<div class="cv">
      <div class="cv-head"><div><span class="kicker">Circle #${c.id}</span><br><b>${esc(c.name)}</b></div>${pills[c.status]}</div>
      <div class="cv-meta">${meta.map(esc).join("<span>·</span>")}</div>
      <div class="cv-body"><div class="mini"><svg class="ring" viewBox="0 0 400 400" id="miniRing"></svg></div><ul class="mlist">${list}</ul></div>
      <div class="acts">${acts.join("")}</div>
      <p class="msg" id="cvMsg">${note}</p>
      <div class="share"><span>${esc(link)}</span><button type="button" class="btn sm ghost" data-copy="${esc(link)}">Copy invite</button></div>
    </div>`;
    const mm = [];
    for (let i = 0; i < c.size; i++) {
      const m = c.members[i];
      mm.push(m ? { label: "", initials: String(i + 1), state: c.status === 1 && m.paid ? "paid" : "in", turn: c.status === 1 && i === c.round, got: c.status === 2 || (c.status === 1 && i < c.round), status: "" } : { label: "", initials: "", state: "ghost", status: "" });
    }
    paintRing($("miniRing"), { members: mm, fill: c.status === 1 ? Number(BigInt(c.pot)) / Number(BigInt(c.contribution) * BigInt(c.size)) : 0, progress: c.status === 2 ? 1 : c.status === 1 ? c.round / c.size : 0 }, true);
    box.querySelector("[data-copy]").addEventListener("click", (e) => copy(e.target.dataset.copy));
    box.querySelectorAll("[data-act]").forEach((b) => b.addEventListener("click", () => act(b.dataset.act, c, b)));
  } catch (e) { box.innerHTML = `<div class="empty"><p>Couldn't reach Arc. Try again in a moment.</p></div>`; }
}

async function act(kind, c, btn) {
  const msg = $("cvMsg");
  try {
    if (kind === "connect") { if (await connect()) openCircle(c.id); return; }
    if (!account && !(await connect())) return;
    btn.disabled = true; btn.classList.add("busy");
    msg.className = "msg"; msg.textContent = kind === "join" || kind === "contribute" ? "Check your wallet: it asks for a signature, not a transaction." : "Confirm in your wallet…";
    const w = await wallet();
    const out = kind === "join" || kind === "contribute"
      ? await w.signAndRelay({ kind, circle: c, relayFee: RELAY_FEE, onSigned: () => (msg.textContent = "Signed. The relayer is submitting it on Arc…") })
      : await w.write(kind, c.id);
    const note = `<span class="msg ok">${kind === "join" ? "You're in" : kind === "contribute" ? "Paid" : "Done"} · final in ${out.ms} ms${out.gasCostUsdc ? ` · gas ${Number(out.gasCostUsdc).toFixed(4)} USDC paid by the relayer` : ""} · <a href="${esc(out.explorer)}" target="_blank" rel="noopener">view tx ↗</a></span>`;
    msg.innerHTML = note;
    toast(kind === "join" ? "Joined. No gas spent." : kind === "contribute" ? "Paid. No gas spent." : "Done.");
    setTimeout(() => openCircle(c.id, note), 700);
  } catch (e) {
    btn.disabled = false; btn.classList.remove("busy");
    const m = e?.shortMessage || e?.message || String(e);
    msg.className = "msg err"; msg.textContent = /reject|denied|cancel/i.test(m) ? "You cancelled in your wallet." : m.split("\n")[0].slice(0, 200);
  }
}

// -------------------------------------------------------------------- boot
chrome();
bootDemo();
initApp();
