// Network constants for Arc (from docs.arc.io: connect-to-arc, contract-addresses).
export const USDC = "0x3600000000000000000000000000000000000000"; // ERC-20 interface of native USDC, 6 decimals

export const NETWORKS = {
  testnet: {
    name: "Arc Testnet",
    chainId: 5042002,
    rpc: "https://rpc.testnet.arc.io",
    explorer: "https://explorer.testnet.arc.io",
    ajo: "0x2c92a5b906ca661bb7c17eded4c98d0e3ddbbe29",
    deployBlock: 65080609,
  },
  mainnet: {
    name: "Arc",
    chainId: 5042,
    rpc: "https://rpc.mainnet.arc.io",
    explorer: "https://explorer.arc.io",
    ajo: "0x155693f3b34feeb510979eb31380102f735cabcf",
    deployBlock: 23855745,
  },
};
