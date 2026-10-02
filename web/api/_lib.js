// Shared server helpers for the relay and demo endpoints (Vercel Node functions).
import { createPublicClient, createWalletClient, http, formatUnits, encodeFunctionData } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arc, arcTestnet } from "viem/chains";
import { ajoAbi, usdcAbi } from "../shared/abi.js";
import { NETWORKS, USDC } from "../shared/config.js";

export const NETWORK = process.env.NETWORK === "mainnet" ? "mainnet" : "testnet";
export const net = NETWORKS[NETWORK];
const chain = NETWORK === "mainnet" ? arc : arcTestnet;
const FLOOR = 20_000_000_000n; // Arc mempool floor (20 gwei, paid in USDC)

/** Fee the relayer keeps from each signed amount (USDC, 6 decimals). Covers ~100-200k gas at Arc's floor. */
export const RELAY_FEE = BigInt(process.env.RELAY_FEE || "5000");

export const pub = createPublicClient({ chain, transport: http(net.rpc) });

let _relayer;
export function relayer() {
  if (!_relayer) {
    if (!process.env.RELAYER_KEY) throw new Error("relayer not configured");
    const account = privateKeyToAccount(process.env.RELAYER_KEY);
    _relayer = createWalletClient({ chain, transport: http(net.rpc), account });
  }
  return _relayer;
}

export async function fees() {
  const f = await pub.estimateFeesPerGas();
  return { maxFeePerGas: f.maxFeePerGas > FLOOR ? f.maxFeePerGas : FLOOR, maxPriorityFeePerGas: 1_000_000_000n };
}

/** Simulate, send from the relayer, wait for finality. Returns timing and the USDC gas cost. */
export async function relay(functionName, args, to = net.ajo, abi = ajoAbi) {
  const w = relayer();
  const t0 = Date.now();
  const { request } = await pub.simulateContract({ address: to, abi, functionName, args, account: w.account });
  const gas = await pub.estimateContractGas({ address: to, abi, functionName, args, account: w.account });
  const hash = await w.writeContract({ ...request, gas: (gas * 13n) / 10n, ...(await fees()) });
  const rc = await pub.waitForTransactionReceipt({ hash, pollingInterval: 250 });
  if (rc.status !== "success") throw new Error(`transaction reverted: ${hash}`);
  return {
    hash,
    block: Number(rc.blockNumber),
    ms: Date.now() - t0,
    gasUsed: rc.gasUsed.toString(),
    gasCostUsdc: formatUnits(rc.gasUsed * rc.effectiveGasPrice, 18),
    explorer: `${net.explorer}/tx/${hash}`,
  };
}

export function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json");
  res.setHeader("cache-control", "no-store");
  res.end(JSON.stringify(body, (_, v) => (typeof v === "bigint" ? v.toString() : v)));
}

export async function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  const chunks = [];
  for await (const c of req) chunks.push(c);
  try { return JSON.parse(Buffer.concat(chunks).toString() || "{}"); } catch { return {}; }
}

/** Turn a viem/contract error into one plain sentence. */
export function reason(e) {
  const m = e?.shortMessage || e?.message || String(e);
  const named = /reverted with the following reason:\s*\n?(.*)/.exec(m) || /error\s+"?([A-Za-z]+)\(\)/.exec(m);
  return (named ? named[1] : m).split("\n")[0].slice(0, 240);
}

/** Tiny per-instance rate limiter (best effort on serverless). */
const hits = new Map();
export function limited(key, perMinute) {
  const now = Date.now();
  const arr = (hits.get(key) || []).filter((t) => now - t < 60_000);
  arr.push(now);
  hits.set(key, arr);
  return arr.length > perMinute;
}

export { ajoAbi, usdcAbi, USDC, formatUnits, encodeFunctionData, privateKeyToAccount };
