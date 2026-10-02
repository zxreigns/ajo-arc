// Wallet actions (loaded on demand): connect, sign a USDC EIP-3009 authorization, relay it, or send a plain tx.
import { createPublicClient, createWalletClient, custom, http, toHex, defineChain } from "viem";
import { ajoAbi, usdcAbi } from "../shared/abi.js";
import { USDC } from "../shared/config.js";

let net, chain, pub, wc, account;

export async function connect(n, key) {
  net = n;
  chain = defineChain({
    id: net.chainId, name: net.name,
    nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
    rpcUrls: { default: { http: [net.rpc] } },
    blockExplorers: { default: { name: "Arc Explorer", url: net.explorer } },
    testnet: key !== "mainnet",
  });
  pub = createPublicClient({ chain, transport: http(net.rpc) });
  wc = createWalletClient({ chain, transport: custom(window.ethereum) });
  [account] = await wc.requestAddresses();
  try { await wc.switchChain({ id: chain.id }); }
  catch { await wc.addChain({ chain }); await wc.switchChain({ id: chain.id }); }
  const balance = await pub.readContract({ address: USDC, abi: usdcAbi, functionName: "balanceOf", args: [account] });
  return { address: account, balance: balance.toString() };
}

function salt() { const b = new Uint8Array(32); crypto.getRandomValues(b); return toHex(b); }

async function signReceive(value, nonce) {
  const validBefore = BigInt(Math.floor(Date.now() / 1000) + 3600);
  const sig = await wc.signTypedData({
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

/** Join or contribute by signature; the relayer submits and is repaid relayFee from the signed amount. */
export async function signAndRelay({ kind, circle, relayFee, onSigned }) {
  const id = BigInt(circle.id);
  const s = salt();
  const value = BigInt(kind === "join" ? circle.deposit : circle.contribution) + BigInt(relayFee);
  const nonce = kind === "join"
    ? await pub.readContract({ address: net.ajo, abi: ajoAbi, functionName: "joinNonce", args: [id, account, s] })
    : await pub.readContract({ address: net.ajo, abi: ajoAbi, functionName: "contributeNonce", args: [id, circle.round, account, s] });
  const sig = await signReceive(value, nonce);
  onSigned?.();
  const body = { action: kind, circleId: circle.id, member: account, value, validAfter: 0, validBefore: sig.validBefore, salt: s, v: sig.v, r: sig.r, s: sig.s };
  const r = await fetch("/api/relay", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body, (_, v) => (typeof v === "bigint" ? v.toString() : v)) });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error || "The relayer couldn't submit it.");
  return j;
}

/** settle / leave: an ordinary transaction from the member's wallet (gas in USDC). */
export async function write(kind, id) {
  const fn = { settle: "settle", leave: "leave" }[kind];
  const hash = await wc.writeContract({ account, address: net.ajo, abi: ajoAbi, functionName: fn, args: [BigInt(id)], chain });
  const t0 = Date.now();
  await pub.waitForTransactionReceipt({ hash, pollingInterval: 250 });
  return { hash, ms: Date.now() - t0, explorer: `${net.explorer}/tx/${hash}` };
}
