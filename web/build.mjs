// Bundle the browser app (viem included) into public/app.js. NETWORK=testnet|mainnet.
import { build } from "esbuild";
const network = process.env.NETWORK === "mainnet" ? "mainnet" : "testnet";
await build({
  entryPoints: ["src/main.js"],
  bundle: true,
  minify: true,
  format: "esm",
  target: "es2020",
  outfile: "public/app.js",
  define: { __NETWORK__: JSON.stringify(network) },
  legalComments: "none",
});
console.log(`built public/app.js for ${network}`);
