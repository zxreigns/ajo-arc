// /api/demo — a live demo circle that anyone can push forward with one click, no wallet needed.
// Three demo members (Ada, Bayo, Chidi) hold only USDC. Each click signs the next member's
// EIP-3009 authorization server-side and the relayer submits it on Arc, exactly the path a real
// member's wallet signature takes through /api/relay.
import { relay, json, reason, limited, RELAY_FEE, pub, net, ajoAbi, usdcAbi, USDC, relayer, privateKeyToAccount } from "./_lib.js";
import { toHex } from "viem";
import { randomBytes } from "node:crypto";

const NAMES = ["Ada", "Bayo", "Chidi"];
export const DEMO_NAME = "Demo circle: Ada, Bayo & Chidi";
const CONTRIBUTION = BigInt(process.env.DEMO_CONTRIBUTION || "100000"); // 0.10 USDC
const DEPOSIT = BigInt(process.env.DEMO_DEPOSIT || "100000"); // 0.10 USDC
const TOPUP = BigInt(process.env.DEMO_TOPUP || "100000"); // 0.10 USDC
const usd = (v) => (Number(v) / 1e6).toFixed(BigInt(v) % 10000n === 0n ? 2 : 3);
const ROUND = 3600n;

export function demoMembers() {
  return members().map((m) => ({ name: m.name, address: m.account.address }));
}

function members() {
  return (process.env.DEMO_KEYS || "").split(",").filter(Boolean).map((k, i) => ({ name: NAMES[i], account: privateKeyToAccount(k.trim()) }));
}

export async function findDemoCircle() {
  const count = Number(await pub.readContract({ address: net.ajo, abi: ajoAbi, functionName: "circleCount" }));
  const me = relayer().account.address.toLowerCase();
  for (let id = count; id >= 1 && id > count - 40; id--) {
    const [c, m, paid] = await pub.readContract({ address: net.ajo, abi: ajoAbi, functionName: "getCircle", args: [BigInt(id)] });
    if (c.organizer.toLowerCase() === me && c.name === DEMO_NAME) return { id, c, m, paid };
  }
  return null;
}

async function signReceive(account, value, nonce) {
  const validBefore = BigInt(Math.floor(Date.now() / 1000) + 3600);
  const sig = await account.signTypedData({
    domain: { name: "USDC", version: "2", chainId: net.chainId, verifyingContract: USDC },
    types: {
      ReceiveWithAuthorization: [
        { name: "from", type: "address" }, { name: "to", type: "address" }, { name: "value", type: "uint256" },
        { name: "validAfter", type: "uint256" }, { name: "validBefore", type: "uint256" }, { name: "nonce", type: "bytes32" },
      ],
    },
    primaryType: "ReceiveWithAuthorization",
    message: { from: account.address, to: net.ajo, value, validAfter: 0n, validBefore, nonce },
  });
  return { validBefore, r: sig.slice(0, 66), s: "0x" + sig.slice(66, 130), v: parseInt(sig.slice(130, 132), 16) };
}

async function ensureFunds(account, need) {
  const bal = await pub.readContract({ address: USDC, abi: usdcAbi, functionName: "balanceOf", args: [account.address] });
  if (bal >= need) return null;
  return relay("transfer", [account.address, TOPUP], USDC, usdcAbi);
}

export default async function handler(req, res) {
  try {
    const ms = members();
    if (ms.length !== 3) return json(res, 503, { error: "demo not configured" });
    if (req.method === "GET") {
      const d = await findDemoCircle();
      return json(res, 200, { circleId: d?.id ?? null, members: ms.map((m) => ({ name: m.name, address: m.account.address })) });
    }
    if (req.method !== "POST") return json(res, 405, { error: "POST only" });
    const ip = (req.headers["x-forwarded-for"] || "").split(",")[0] || "anon";
    if (limited(`demo:${ip}`, 10) || limited("demo:all", 40)) return json(res, 429, { error: "The demo is busy, try again in a few seconds." });

    const d = await findDemoCircle();
    if (!d || d.c.status === 2) {
      const out = await relay("createCircle", [DEMO_NAME, CONTRIBUTION, DEPOSIT, 3, ROUND]);
      const id = Number(await pub.readContract({ address: net.ajo, abi: ajoAbi, functionName: "circleCount" }));
      return json(res, 200, { ...out, circleId: id, step: "created", label: `Started a new demo circle (${usd(CONTRIBUTION)} USDC a round, 3 members). Organizing cost the relayer the gas; nobody else paid anything.` });
    }
    const { id, c, m, paid } = d;
    const salt = toHex(randomBytes(32));
    if (c.status === 0) {
      const next = ms.find((x) => !m.map((a) => a.toLowerCase()).includes(x.account.address.toLowerCase()));
      const value = c.deposit + RELAY_FEE;
      await ensureFunds(next.account, value);
      const nonce = await pub.readContract({ address: net.ajo, abi: ajoAbi, functionName: "joinNonce", args: [BigInt(id), next.account.address, salt] });
      const s = await signReceive(next.account, value, nonce);
      const out = await relay("joinWithAuthorization", [BigInt(id), next.account.address, value, 0n, s.validBefore, salt, s.v, s.r, s.s]);
      const full = m.length + 1 === c.size;
      return json(res, 200, { ...out, circleId: id, step: "join", member: next.name,
        label: `${next.name} joined by signing a message: ${usd(c.deposit)} USDC deposit + ${usd(RELAY_FEE)} relay fee, no gas of their own.${full ? " Circle is full, round 1 is open." : ""}` });
    }
    // Active: the next member (in slot order) who has not paid this round.
    const idx = m.findIndex((_, i) => !paid[i]);
    const addr = m[idx];
    const who = ms.find((x) => x.account.address.toLowerCase() === addr.toLowerCase());
    const value = c.contribution + RELAY_FEE;
    await ensureFunds(who.account, value);
    const nonce = await pub.readContract({ address: net.ajo, abi: ajoAbi, functionName: "contributeNonce", args: [BigInt(id), c.round, who.account.address, salt] });
    const s = await signReceive(who.account, value, nonce);
    const out = await relay("contributeWithAuthorization", [BigInt(id), who.account.address, value, 0n, s.validBefore, salt, s.v, s.r, s.s]);
    const last = c.paidCount + 1 === c.size;
    const recipient = ms.find((x) => x.account.address.toLowerCase() === m[c.round].toLowerCase());
    return json(res, 200, { ...out, circleId: id, step: last ? "payout" : "contribute", member: who.name,
      label: last
        ? `${who.name} paid the last share, and the same transaction paid the ${usd(c.contribution * BigInt(c.size))} USDC pot to ${recipient.name}. Round ${c.round + 1} of 3 done.`
        : `${who.name} paid round ${c.round + 1} by signature (${usd(c.contribution)} USDC + ${usd(RELAY_FEE)} fee), no gas.` });
  } catch (e) {
    const r = reason(e);
    const raced = /AlreadyPaid|AlreadyMember|NotOpen|NotActive|authorization is used/i.test(r);
    return json(res, raced ? 409 : 400, { error: raced ? "Someone else just moved the demo forward. Refreshing." : r });
  }
}
