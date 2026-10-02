// Move native USDC from the deployer to another address (e.g. fund the relayer).
//   DEPLOYER_KEYFILE=... NETWORK=testnet node scripts/fund.mjs <to> <usdc>
import { readFileSync } from "node:fs";
import { createPublicClient, createWalletClient, http, parseEther, formatEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arc, arcTestnet } from "viem/chains";
const NETWORK = process.env.NETWORK || "testnet";
const chain = NETWORK === "mainnet" ? arc : arcTestnet;
const rpc = NETWORK === "mainnet" ? "https://rpc.mainnet.arc.io" : "https://rpc.testnet.arc.io";
const [to, amount] = process.argv.slice(2);
const keys = JSON.parse(readFileSync(process.env.DEPLOYER_KEYFILE, "utf8"));
const account = privateKeyToAccount(keys.deployer.private_key);
const pub = createPublicClient({ chain, transport: http(rpc) });
const w = createWalletClient({ chain, transport: http(rpc), account });
// Native USDC uses 18 decimals, like ether in viem's helpers.
const hash = await w.sendTransaction({ to, value: parseEther(amount), maxFeePerGas: 25_000_000_000n, maxPriorityFeePerGas: 1_000_000_000n });
await pub.waitForTransactionReceipt({ hash });
console.log(`sent ${amount} USDC to ${to}: ${hash}; deployer now ${formatEther(await pub.getBalance({ address: account.address }))}`);
