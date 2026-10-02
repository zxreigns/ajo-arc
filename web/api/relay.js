// POST /api/relay — submit a member's signed EIP-3009 authorization so they never need gas.
// The member signs `value` = amount due + relay fee; the contract pays the fee to the relayer
// in USDC, the same asset that pays Arc's gas.
import { relay, json, readBody, reason, limited, RELAY_FEE, pub, net, ajoAbi } from "./_lib.js";
import { isAddress, isHex } from "viem";

export default async function handler(req, res) {
  if (req.method === "GET") return json(res, 200, { network: net.name, ajo: net.ajo, relayFee: RELAY_FEE.toString() });
  if (req.method !== "POST") return json(res, 405, { error: "POST only" });
  const ip = (req.headers["x-forwarded-for"] || "").split(",")[0] || "anon";
  if (limited(`relay:${ip}`, 12)) return json(res, 429, { error: "Too many requests, try again in a minute." });
  const b = await readBody(req);
  try {
    if (b.action === "create") {
      // Organizing a circle is free for the person: the relayer pays the gas (~$0.002).
      const name = String(b.name || "").trim().slice(0, 64);
      const size = Number(b.size);
      const roundDuration = BigInt(b.roundDuration || 0);
      const out = await relay("createCircle", [name, BigInt(b.contribution), BigInt(b.deposit || 0), size, roundDuration]);
      const count = await pub.readContract({ address: net.ajo, abi: ajoAbi, functionName: "circleCount" });
      return json(res, 200, { ...out, circleId: count.toString() });
    }
    if (b.action !== "join" && b.action !== "contribute") return json(res, 400, { error: "unknown action" });
    if (!isAddress(b.member) || !isHex(b.salt) || !isHex(b.r) || !isHex(b.s)) return json(res, 400, { error: "bad signature fields" });
    const id = BigInt(b.circleId);
    const [c] = await pub.readContract({ address: net.ajo, abi: ajoAbi, functionName: "getCircle", args: [id] });
    const due = b.action === "join" ? c.deposit : c.contribution;
    if (BigInt(b.value) - due < RELAY_FEE) return json(res, 400, { error: `signed amount must include the ${Number(RELAY_FEE) / 1e6} USDC relay fee` });
    const fn = b.action === "join" ? "joinWithAuthorization" : "contributeWithAuthorization";
    const out = await relay(fn, [id, b.member, BigInt(b.value), BigInt(b.validAfter), BigInt(b.validBefore), b.salt, Number(b.v), b.r, b.s]);
    return json(res, 200, out);
  } catch (e) {
    return json(res, 400, { error: reason(e) });
  }
}
