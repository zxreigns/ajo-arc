// End-to-end check against a live Arc network, calling the same handlers Vercel runs.
//   KEYFILE=/path/keys.json NETWORK=testnet node scripts/e2e.mjs [demoSteps]
// KEYFILE holds { relayer: {private_key}, demo_ada|demo_bayo|demo_chidi: {private_key} }.
import { readFileSync } from "node:fs";
import { Readable } from "node:stream";

const keys = JSON.parse(readFileSync(process.env.KEYFILE, "utf8"));
process.env.RELAYER_KEY = keys.relayer.private_key;
process.env.DEMO_KEYS = [keys.demo_ada, keys.demo_bayo, keys.demo_chidi].map((k) => k.private_key).join(",");
const steps = Number(process.argv[2] || 13);

const demo = (await import("../api/demo.js")).default;
const relayH = (await import("../api/relay.js")).default;

function call(handler, method, body) {
  return new Promise((resolve) => {
    const req = Readable.from(body ? [Buffer.from(JSON.stringify(body))] : []);
    req.method = method; req.headers = { "x-forwarded-for": `e2e-${Math.random()}` };
    const res = { statusCode: 200, setHeader() {}, end(s) { resolve({ status: this.statusCode, body: JSON.parse(s) }); } };
    handler(req, res);
  });
}

console.log("GET /api/demo", (await call(demo, "GET")).body);
const times = [];
for (let i = 0; i < steps; i++) {
  const r = await call(demo, "POST");
  if (r.status !== 200) { console.log("step", i, r.status, r.body); break; }
  times.push(r.body.ms);
  console.log(`#${i} [${r.body.step}] ${r.body.label} | ${r.body.ms} ms | gas ${r.body.gasCostUsdc} USDC | ${r.body.hash}`);
}
if (times.length) console.log(`median wall time per step (submit to final receipt, from this box): ${times.sort((a, b) => a - b)[Math.floor(times.length / 2)]} ms`);
