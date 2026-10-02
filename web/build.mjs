// Bundle the browser app into public/js/ (viem is split out and loaded only when a wallet is used).
// NETWORK=testnet|mainnet.
import { build } from "esbuild";
import { rmSync } from "node:fs";
const network = process.env.NETWORK === "mainnet" ? "mainnet" : "testnet";
rmSync("public/js", { recursive: true, force: true });
await build({
  entryPoints: ["src/main.js"],
  bundle: true,
  splitting: true,
  minify: true,
  format: "esm",
  target: "es2020",
  outdir: "public/js",
  chunkNames: "c-[hash]",
  define: { __NETWORK__: JSON.stringify(network) },
  legalComments: "none",
});
console.log(`built public/js for ${network}`);
