import { createPublicClient, createWalletClient, custom, http, formatUnits, parseUnits, toHex, isAddress, defineChain } from "viem";
import { ajoAbi, usdcAbi } from "../shared/abi.js";
import { NETWORKS, USDC } from "../shared/config.js";

/* global __NETWORK__ */
const NET_KEY = __NETWORK__;
const net = NETWORKS[NET_KEY];
const chain = defineChain({
  id: net.chainId,
  name: net.name,
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
  rpcUrls: { default: { http: [net.rpc] } },
  blockExplorers: { default: { name: "Arc Explorer", url: net.explorer } },
  testnet: NET_KEY !== "mainnet",
});
const pub = createPublicClient({ chain, transport: http(net.rpc) });
const $ = (id) => document.getElementById(id);
const usd = (v, d = 2) => Number(formatUnits(BigInt(v), 6)).toFixed(d);
const short = (a) => `${a.slice(0, 6)}…${a.slice(-4)}`;
const txLink = (h) => `${net.explorer}/tx/${h}`;
const addrLink = (a) => `${net.explorer}/address/${a}`;
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
let RELAY_FEE = 5000n;

// ------------------------------------------------------------------ chrome
$("netPill").textContent = net.name;
if (NET_KEY === "mainnet") $("netPill").classList.add("main");
document.querySelectorAll(".netname").forEach((e) => (e.textContent = net.name));
$("contractLink").textContent = short(net.ajo);
$("contractLink").href = addrLink(net.ajo);

fetch("/api/relay").then((r) => r.json()).then((j) => {
  if (j.relayFee) { RELAY_FEE = BigInt(j.relayFee); $("feeFact").textContent = usd(RELAY_FEE, 3); }
}).catch(() => {});

// --------------------------------------------------------------- demo ring
let demo = { members: [], circleId: null };
const STATUS = ["Open", "Active", "Completed"];

async function loadDemo() {
  try {
    const j = await (await fetch("/api/demo")).json();
    demo = j;
    await renderDemo();
  } catch (e) {
    $("demoStatus").textContent = "Couldn't reach the demo right now.";
  }
}

async function renderDemo() {
  const names = Object.fromEntries(demo.members.map((m) => [m.address.toLowerCase(), m.name]));
  if (!demo.circleId) {
    $("demoStatus").textContent = "No demo circle yet. The first click starts one.";
    $("stepBtn").textContent = "Start a demo circle";
    $("stepBtn").disabled = false;
    demo.members.forEach((m, i) => paintMember(i, m.name, "waiting to join", ""));
    $("potAmt").textContent = "0.00";
    return;
  }
  const [c, mem, paid, deps] = await pub.readContract({ address: net.ajo, abi: ajoAbi, functionName: "getCircle", args: [BigInt(demo.circleId)] });
  $("demoId").textContent = `circle #${demo.circleId}`;
  const status = Number(c.status);
  const memL = mem.map((a) => a.toLowerCase());
  demo.members.forEach((m, i) => {
    const slot = memL.indexOf(m.address.toLowerCase());
    let cls = "", st = "not joined yet";
    if (slot >= 0) {
      st = `slot ${slot + 1} · deposit ${usd(deps[slot])}`;
      if (status === 1) {
        if (paid[slot]) { cls = "paid"; st = "paid this round"; } else st = "owes this round";
        if (slot === Number(c.round)) { cls += " turn"; st += " · gets the pot"; }
      }
      if (status === 2) { cls = "paid"; st = "circle complete"; }
    }
    paintMember(i, m.name, st, cls);
  });
  $("potAmt").textContent = usd(c.pot);
  const next = (label) => { $("stepBtn").textContent = label; $("stepBtn").disabled = false; };
  if (status === 0) {
    const nxt = demo.members.find((m) => !memL.includes(m.address.toLowerCase()));
    $("demoStatus").innerHTML = `Filling up: <b>${mem.length} of ${c.size}</b> joined. ${usd(c.contribution)} USDC a round, ${usd(c.deposit)} deposit.`;
    $("potSub").textContent = "USDC";
    next(`${nxt.name} joins by signature`);
  } else if (status === 1) {
    const r = Number(c.round);
    const recip = names[memL[r]] || short(mem[r]);
    const idx = paid.findIndex((p) => !p);
    const payer = names[memL[idx]];
    $("demoStatus").innerHTML = `Round <b>${r + 1} of ${c.size}</b>. The pot goes to <b>${recip}</b>. ${Number(c.paidCount)} of ${c.size} shares in.`;
    $("potSub").textContent = `USDC → ${recip}`;
    next(Number(c.paidCount) + 1 === Number(c.size) ? `${payer} pays the last share → pot to ${recip}` : `${payer} pays round ${r + 1}`);
  } else {
    $("demoStatus").innerHTML = `Circle complete: all ${c.size} members received the pot once. Next click starts a fresh one.`;
    $("potSub").textContent = "done";
    next("Start a new demo circle");
  }
  loadFeed(BigInt(demo.circleId), names);
}

function paintMember(i, name, st, cls) {
  const el = $(`m${i}`);
  el.className = `member m${i} ${cls}`;
  el.innerHTML = `<div class="avatar">${esc(name[0])}</div><div class="nm">${esc(name)}</div><div class="st">${esc(st)}</div>`;
}

async function loadFeed(id, names) {
  try {
    const latest = await pub.getBlockNumber();
    const from = latest > 4500n ? latest - 4500n : 0n;
    const evs = await pub.getContractEvents({ address: net.ajo, abi: ajoAbi, fromBlock: from > BigInt(net.deployBlock) ? from : BigInt(net.deployBlock), toBlock: latest, args: { id } });
    const nm = (a) => names[a?.toLowerCase()] || short(a);
    const rows = evs.reverse().map((e) => {
      const a = e.args; let t = "";
      switch (e.eventName) {
        case "CircleCreated": t = `Circle created: ${usd(a.contribution)} USDC × ${a.size} members`; break;
        case "Joined": t = `${nm(a.member)} joined (slot ${Number(a.slot) + 1})${a.relayFee > 0n ? ` · gasless, fee ${usd(a.relayFee, 3)}` : ""}`; break;
        case "CircleStarted": t = "Circle full, round 1 open"; break;
        case "Contributed": t = `${nm(a.member)} paid round ${Number(a.round) + 1}${a.relayFee > 0n ? " by signature" : ""}`; break;
        case "PotPaid": t = `💰 ${usd(a.amount)} USDC pot paid to ${nm(a.recipient)}`; break;
        case "Defaulted": t = `${nm(a.member)} missed; ${usd(a.coveredFromDeposit)} covered from deposit`; break;
        case "CircleCompleted": t = "Circle completed"; break;
        case "DepositReturned": t = `${nm(a.member)}'s ${usd(a.amount)} deposit returned`; break;
        default: t = e.eventName;
      }
      return `<li><span>${esc(t)}</span><a href="${txLink(e.transactionHash)}" target="_blank" rel="noopener">${e.transactionHash.slice(0, 10)}…</a></li>`;
    });
    $("feed").innerHTML = rows.join("") || `<li class="muted">No events in the last ~40 minutes. Full history on the <a href="${addrLink(net.ajo)}" target="_blank" rel="noopener">explorer</a>.</li>`;
  } catch {
    $("feed").innerHTML = `<li class="muted">Couldn't read events. See the <a href="${addrLink(net.ajo)}" target="_blank" rel="noopener">explorer</a>.</li>`;
  }
}

$("stepBtn").addEventListener("click", async () => {
  const btn = $("stepBtn");
  btn.disabled = true;
  const label = btn.textContent;
  btn.textContent = "Signing and submitting…";
  const out = $("stepResult");
  try {
    const r = await fetch("/api/demo", { method: "POST" });
    const j = await r.json();
    out.hidden = false;
    if (!r.ok) {
      out.className = r.status === 409 ? "result" : "result err";
      out.textContent = j.error || "Something went wrong.";
    } else {
      out.className = "result ok";
      out.innerHTML = `${esc(j.label)}<br><span class="t">final in ${j.ms} ms · gas ${Number(j.gasCostUsdc).toFixed(4)} USDC, paid by the relayer · <a href="${j.explorer}" target="_blank" rel="noopener">view tx</a></span>`;
      demo.circleId = j.circleId;
      if (j.step === "payout") { $("ring").querySelector(".pot").classList.add("pop"); setTimeout(() => $("ring").querySelector(".pot").classList.remove("pop"), 500); }
    }
  } catch (e) {
    out.hidden = false; out.className = "result err"; out.textContent = "Network error, try again.";
  }
  btn.textContent = label;
  await renderDemo();
  setTimeout(() => renderDemo().catch(() => {}), 2500); // public RPC log index can trail a block or two
});

// ------------------------------------------------------------------ wallet
let wallet = null, account = null;

async function connect() {
  if (!window.ethereum) { $("walletNote").innerHTML = "No browser wallet found. Install MetaMask or Rabby, or open this page in your wallet's browser."; return null; }
  wallet = createWalletClient({ chain, transport: custom(window.ethereum) });
  [account] = await wallet.requestAddresses();
  try {
    await wallet.switchChain({ id: chain.id });
  } catch {
    await wallet.addChain({ chain });
    await wallet.switchChain({ id: chain.id });
  }
  const bal = await pub.readContract({ address: USDC, abi: usdcAbi, functionName: "balanceOf", args: [account] });
  $("connectBtn").textContent = short(account);
  $("walletNote").innerHTML = `Connected <span class="mono">${short(account)}</span> on ${net.name} · ${usd(bal)} USDC.`;
  return account;
}
$("connectBtn").addEventListener("click", () => connect().catch((e) => alert(e.shortMessage || e.message)));
async function needWallet() { return account || (await connect()); }

/** Ask the wallet to sign a USDC ReceiveWithAuthorization to the Ajo contract (EIP-3009). */
async function signReceive(value, nonce) {
  const validBefore = BigInt(Math.floor(Date.now() / 1000) + 3600);
  const sig = await wallet.signTypedData({
    account,
    domain: { name: "USDC", version: "2", chainId: net.chainId, verifyingContract: USDC },
    types: {
      ReceiveWithAuthorization: [
        { name: "from", type: "address" }, { name: "to", type: "address" }, { name: "value", type: "uint256" },
        { name: "validAfter", type: "uint256" }, { name: "validBefore", type: "uint256" }, { name: "nonce", type: "bytes32" },
      ],
    },
    primaryType: "ReceiveWithAuthorization",
    message: { from: account, to: net.ajo, value, validAfter: 0n, validBefore, nonce },
  });
  return { validBefore, r: sig.slice(0, 66), s: "0x" + sig.slice(66, 130), v: parseInt(sig.slice(130, 132), 16) };
}

function randSalt() { const b = new Uint8Array(32); crypto.getRandomValues(b); return toHex(b); }

async function relay(body) {
  const r = await fetch("/api/relay", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body, (_, v) => (typeof v === "bigint" ? v.toString() : v)) });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error || "relay failed");
  return j;
}

$("createForm").addEventListener("submit", async (ev) => {
  ev.preventDefault();
  const f = new FormData(ev.target), msg = $("createMsg");
  msg.className = "msg"; msg.textContent = "Creating…";
  try {
    const j = await relay({
      action: "create", name: f.get("name"),
      contribution: parseUnits(String(f.get("contribution")), 6), deposit: parseUnits(String(f.get("deposit") || "0"), 6),
      size: Number(f.get("size")), roundDuration: Number(f.get("roundDuration")),
    });
    const link = `${location.origin}/?circle=${j.circleId}#start`;
    msg.innerHTML = `Circle <b>#${j.circleId}</b> created in ${j.ms} ms (gas paid by the relayer). Share this link with your members: <a href="${link}">${link}</a>`;
    $("openForm").elements.namedItem("id").value = j.circleId;
    openCircle(j.circleId);
  } catch (e) { msg.className = "msg err"; msg.textContent = e.message; }
});

$("openForm").addEventListener("submit", (ev) => { ev.preventDefault(); openCircle(new FormData(ev.target).get("id")); });

async function openCircle(id, note = "") {
  const box = $("circleView");
  box.innerHTML = `<div class="cv muted">Loading…</div>`;
  try {
    const [c, mem, paid, deps] = await pub.readContract({ address: net.ajo, abi: ajoAbi, functionName: "getCircle", args: [BigInt(id)] });
    if (Number(c.size) === 0) { box.innerHTML = `<div class="cv msg err">No circle #${esc(id)}.</div>`; return; }
    const st = Number(c.status);
    const me = account?.toLowerCase();
    const memL = mem.map((a) => a.toLowerCase());
    const mine = me && memL.includes(me);
    const now = Math.floor(Date.now() / 1000);
    const rows = mem.map((a, i) => `<tr><td>${i + 1}</td><td><a href="${addrLink(a)}" target="_blank" rel="noopener" class="mono">${short(a)}</a>${a.toLowerCase() === me ? " (you)" : ""}</td><td>${st === 1 ? (paid[i] ? '<span class="pill ok">paid</span>' : '<span class="pill">due</span>') : ""}${st === 1 && i === Number(c.round) ? " ← pot" : ""}</td><td>${usd(deps[i])}</td></tr>`).join("");
    const acts = [];
    if (st === 0 && !mine) acts.push(`<button class="btn" data-act="join">Join · sign ${usd(c.deposit + RELAY_FEE, 3)} USDC</button>`);
    if (st === 1 && mine && !paid[memL.indexOf(me)]) acts.push(`<button class="btn" data-act="contribute">Pay round ${Number(c.round) + 1} · sign ${usd(c.contribution + RELAY_FEE, 3)} USDC</button>`);
    if (st === 1 && now > Number(c.deadline)) acts.push(`<button class="btn ghost" data-act="settle">Settle round (deadline passed)</button>`);
    if (st === 0 && mine) acts.push(`<button class="btn ghost" data-act="leave">Leave (refund deposit)</button>`);
    if (!account) acts.push(`<button class="btn ghost" data-act="connect">Connect wallet to act</button>`);
    box.innerHTML = `<div class="cv">
      <b>#${esc(id)} · ${esc(c.name)}</b> <span class="pill">${STATUS[st]}</span><br>
      ${usd(c.contribution)} USDC a round · ${c.size} members · deposit ${usd(c.deposit)} · ${st === 1 ? `round ${Number(c.round) + 1}, deadline ${new Date(Number(c.deadline) * 1000).toLocaleString()}` : `${mem.length}/${c.size} joined`}
      <table>${rows || '<tr><td class="muted">No members yet.</td></tr>'}</table>
      <div class="acts">${acts.join("")}</div><div class="msg" id="cvMsg">${note}</div></div>`;
    box.querySelectorAll("[data-act]").forEach((b) => b.addEventListener("click", () => act(b.dataset.act, id, c)));
  } catch (e) { box.innerHTML = `<div class="cv msg err">${esc(e.shortMessage || e.message)}</div>`; }
}

async function act(kind, id, c) {
  const msg = $("cvMsg");
  try {
    if (kind === "connect") { await connect(); return openCircle(id); }
    await needWallet();
    msg.className = "msg"; msg.textContent = "Check your wallet…";
    let out;
    if (kind === "join" || kind === "contribute") {
      const salt = randSalt();
      const value = (kind === "join" ? c.deposit : c.contribution) + RELAY_FEE;
      const nonce = kind === "join"
        ? await pub.readContract({ address: net.ajo, abi: ajoAbi, functionName: "joinNonce", args: [BigInt(id), account, salt] })
        : await pub.readContract({ address: net.ajo, abi: ajoAbi, functionName: "contributeNonce", args: [BigInt(id), c.round, account, salt] });
      const s = await signReceive(value, nonce);
      msg.textContent = "Signed. Relaying…";
      out = await relay({ action: kind, circleId: id, member: account, value, validAfter: 0, validBefore: s.validBefore, salt, v: s.v, r: s.r, s: s.s });
    } else {
      const fn = { settle: "settle", leave: "leave" }[kind];
      const hash = await wallet.writeContract({ account, address: net.ajo, abi: ajoAbi, functionName: fn, args: [BigInt(id)], chain });
      const t0 = Date.now();
      await pub.waitForTransactionReceipt({ hash, pollingInterval: 250 });
      out = { hash, ms: Date.now() - t0, explorer: txLink(hash) };
    }
    const note = `${kind === "join" ? "Joined" : kind === "contribute" ? "Paid" : "Done"} in ${out.ms} ms${out.gasCostUsdc ? `, gas ${Number(out.gasCostUsdc).toFixed(4)} USDC paid by the relayer` : ""} · <a href="${out.explorer}" target="_blank" rel="noopener">view tx</a>`;
    msg.innerHTML = note;
    setTimeout(() => openCircle(id, note), 600);
  } catch (e) { msg.className = "msg err"; msg.textContent = e.shortMessage || e.message; }
}

// ------------------------------------------------------------------ record
$("recordForm").addEventListener("submit", async (ev) => {
  ev.preventDefault();
  const a = String(new FormData(ev.target).get("addr")).trim();
  if (!isAddress(a)) { $("recordOut").innerHTML = `<p class="msg err">That isn't an address.</p>`; return; }
  const [paid, missed, received, done] = await pub.readContract({ address: net.ajo, abi: ajoAbi, functionName: "records", args: [a] });
  $("recordOut").innerHTML = `<div class="rec"><div><b>${paid}</b>rounds paid</div><div><b>${missed}</b>rounds missed</div><div><b>${received}</b>pots received</div><div><b>${done}</b>circles completed</div></div>`;
});

// -------------------------------------------------------------------- boot
loadDemo();
setInterval(() => { if (!document.hidden && demo.circleId) renderDemo().catch(() => {}); }, 15000);
const q = new URLSearchParams(location.search).get("circle");
if (q) { $("openForm").elements.namedItem("id").value = q; openCircle(q); }
if (demo.members.length === 0) fetch("/api/demo").catch(() => {});
