// Deploy Ajo to Arc. Usage:
//   DEPLOYER_KEYFILE=/path/to/keys.json NETWORK=testnet node scripts/deploy.mjs
// The key file is JSON with { "deployer": { "private_key": "0x..." } } and never enters the repo.
import { readFileSync, writeFileSync } from "node:fs";
import { createPublicClient, createWalletClient, http, formatUnits } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arc, arcTestnet } from "viem/chains";

const NETWORK = process.env.NETWORK || "testnet";
const chain = NETWORK === "mainnet" ? arc : arcTestnet;
const rpc = NETWORK === "mainnet" ? "https://rpc.mainnet.arc.io" : "https://rpc.testnet.arc.io";
const USDC = "0x3600000000000000000000000000000000000000";
const MAX_RELAY_FEE = 50_000n; // 0.05 USDC cap per signed action
const FLOOR = 20_000_000_000n; // Arc mempool floor: 20 gwei

const keys = JSON.parse(readFileSync(process.env.DEPLOYER_KEYFILE, "utf8"));
const account = privateKeyToAccount(keys.deployer.private_key);
const art = JSON.parse(readFileSync(new URL("../../contracts/out/Ajo.sol/Ajo.json", import.meta.url)));
const pub = createPublicClient({ chain, transport: http(rpc) });
const wallet = createWalletClient({ chain, transport: http(rpc), account });

const { encodeDeployData } = await import("viem");
const data = encodeDeployData({ abi: art.abi, bytecode: art.bytecode.object, args: [USDC, MAX_RELAY_FEE] });
const gas = await pub.estimateGas({ account, data });
const fees = await pub.estimateFeesPerGas();
const maxFeePerGas = fees.maxFeePerGas > FLOOR ? fees.maxFeePerGas : FLOOR;
console.log(`deployer ${account.address} on ${chain.name}; gas ${gas}, est cost ${formatUnits(gas * maxFeePerGas, 18)} USDC`);
const t0 = Date.now();
const hash = await wallet.sendTransaction({ data, gas: (gas * 12n) / 10n, maxFeePerGas, maxPriorityFeePerGas: 1_000_000_000n });
const rc = await pub.waitForTransactionReceipt({ hash });
console.log(`deployed ${rc.contractAddress} block ${rc.blockNumber} in ${Date.now() - t0} ms; tx ${hash}; paid ${formatUnits(rc.gasUsed * rc.effectiveGasPrice, 18)} USDC`);

const file = new URL("../shared/deployments.json", import.meta.url);
let dep = {};
try { dep = JSON.parse(readFileSync(file, "utf8")); } catch {}
dep[NETWORK] = { chainId: chain.id, ajo: rc.contractAddress, deployBlock: Number(rc.blockNumber), deployTx: hash, deployer: account.address, maxRelayFee: MAX_RELAY_FEE.toString() };
writeFileSync(file, JSON.stringify(dep, null, 2) + "\n");
