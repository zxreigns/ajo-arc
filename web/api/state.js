// GET /api/state — read-only chain state for the site, so the first view needs no wallet library.
//   ?demo=1          the live demo circle, its members and recent events
//   ?circle=<id>     any circle and its recent events
//   ?record=<addr>   the savings record of an address
import { json, pub, net, ajoAbi } from "./_lib.js";
import { findDemoCircle, demoMembers } from "./demo.js";
import { isAddress } from "viem";

const SPAN = 9990n; // public RPC log window (~85 min of Arc blocks)

function circleJson(id, c, m, paid, deps) {
  return {
    id: Number(id), name: c.name, organizer: c.organizer,
    contribution: c.contribution.toString(), deposit: c.deposit.toString(),
    roundDuration: Number(c.roundDuration), deadline: Number(c.deadline), createdAt: Number(c.createdAt),
    size: Number(c.size), round: Number(c.round), paidCount: Number(c.paidCount), status: Number(c.status), pot: c.pot.toString(),
    members: m.map((a, i) => ({ address: a, paid: !!paid[i], deposit: (deps?.[i] ?? 0n).toString() })),
  };
}

async function readCircle(id) {
  const [c, m, paid, deps] = await pub.readContract({ address: net.ajo, abi: ajoAbi, functionName: "getCircle", args: [BigInt(id)] });
  if (Number(c.size) === 0) return null;
  return circleJson(id, c, m, paid, deps);
}

async function events(id) {
  const latest = await pub.getBlock();
  const to = latest.number;
  const floor = BigInt(net.deployBlock);
  const from = to > SPAN ? (to - SPAN > floor ? to - SPAN : floor) : floor;
  const evs = await pub.getContractEvents({ address: net.ajo, abi: ajoAbi, fromBlock: from, toBlock: to, args: { id: BigInt(id) } });
  const now = Number(latest.timestamp);
  return evs.slice(-30).reverse().map((e) => ({
    name: e.eventName, hash: e.transactionHash, block: Number(e.blockNumber),
    ago: Math.max(0, Math.round(Number(to - e.blockNumber) * 0.51)), at: now - Math.round(Number(to - e.blockNumber) * 0.51),
    args: Object.fromEntries(Object.entries(e.args || {}).map(([k, v]) => [k, typeof v === "bigint" ? v.toString() : v])),
  }));
}

export default async function handler(req, res) {
  const q = new URL(req.url || "/", "http://x").searchParams;
  try {
    res.setHeader("cache-control", "no-store");
    if (q.get("record")) {
      const a = q.get("record").trim();
      if (!isAddress(a)) return json(res, 400, { error: "That isn't an address." });
      const [paid, missed, received, done] = await pub.readContract({ address: net.ajo, abi: ajoAbi, functionName: "records", args: [a] });
      return json(res, 200, { address: a, paid: Number(paid), missed: Number(missed), received: Number(received), circlesCompleted: Number(done) });
    }
    if (q.get("circle")) {
      const id = Number(q.get("circle"));
      if (!Number.isInteger(id) || id < 1) return json(res, 400, { error: "Circle numbers start at 1." });
      const c = await readCircle(id);
      if (!c) return json(res, 404, { error: `There is no circle #${id} yet.` });
      return json(res, 200, { circle: c, events: q.get("events") === "0" ? [] : await events(id).catch(() => []) });
    }
    if (q.get("demo")) {
      const members = demoMembers();
      const d = await findDemoCircle();
      if (!d) return json(res, 200, { network: net.name, circle: null, members, events: [] });
      const c = await readCircle(d.id);
      return json(res, 200, { network: net.name, circle: c, members, events: await events(d.id).catch(() => []) });
    }
    const count = await pub.readContract({ address: net.ajo, abi: ajoAbi, functionName: "circleCount" });
    return json(res, 200, { network: net.name, chainId: net.chainId, ajo: net.ajo, circles: Number(count) });
  } catch (e) {
    return json(res, 502, { error: "Couldn't read Arc right now. Try again in a moment." });
  }
}
