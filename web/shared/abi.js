// Generated from contracts/out/Ajo.sol/Ajo.json (forge build)
export const ajoAbi = [
 {
  "type": "constructor",
  "inputs": [
   {
    "name": "usdc_",
    "type": "address",
    "internalType": "contract IUSDC"
   },
   {
    "name": "maxRelayFee_",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "stateMutability": "nonpayable"
 },
 {
  "type": "function",
  "name": "CONTRIBUTE",
  "inputs": [],
  "outputs": [
   {
    "name": "",
    "type": "bytes32",
    "internalType": "bytes32"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "JOIN",
  "inputs": [],
  "outputs": [
   {
    "name": "",
    "type": "bytes32",
    "internalType": "bytes32"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "MAX_MEMBERS",
  "inputs": [],
  "outputs": [
   {
    "name": "",
    "type": "uint16",
    "internalType": "uint16"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "MIN_MEMBERS",
  "inputs": [],
  "outputs": [
   {
    "name": "",
    "type": "uint16",
    "internalType": "uint16"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "circleCount",
  "inputs": [],
  "outputs": [
   {
    "name": "",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "contribute",
  "inputs": [
   {
    "name": "id",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "outputs": [],
  "stateMutability": "nonpayable"
 },
 {
  "type": "function",
  "name": "contributeNonce",
  "inputs": [
   {
    "name": "id",
    "type": "uint256",
    "internalType": "uint256"
   },
   {
    "name": "round",
    "type": "uint16",
    "internalType": "uint16"
   },
   {
    "name": "member",
    "type": "address",
    "internalType": "address"
   },
   {
    "name": "salt",
    "type": "bytes32",
    "internalType": "bytes32"
   }
  ],
  "outputs": [
   {
    "name": "",
    "type": "bytes32",
    "internalType": "bytes32"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "contributeWithAuthorization",
  "inputs": [
   {
    "name": "id",
    "type": "uint256",
    "internalType": "uint256"
   },
   {
    "name": "member",
    "type": "address",
    "internalType": "address"
   },
   {
    "name": "value",
    "type": "uint256",
    "internalType": "uint256"
   },
   {
    "name": "validAfter",
    "type": "uint256",
    "internalType": "uint256"
   },
   {
    "name": "validBefore",
    "type": "uint256",
    "internalType": "uint256"
   },
   {
    "name": "salt",
    "type": "bytes32",
    "internalType": "bytes32"
   },
   {
    "name": "v",
    "type": "uint8",
    "internalType": "uint8"
   },
   {
    "name": "r",
    "type": "bytes32",
    "internalType": "bytes32"
   },
   {
    "name": "s",
    "type": "bytes32",
    "internalType": "bytes32"
   }
  ],
  "outputs": [],
  "stateMutability": "nonpayable"
 },
 {
  "type": "function",
  "name": "createCircle",
  "inputs": [
   {
    "name": "name",
    "type": "string",
    "internalType": "string"
   },
   {
    "name": "contribution",
    "type": "uint128",
    "internalType": "uint128"
   },
   {
    "name": "deposit",
    "type": "uint128",
    "internalType": "uint128"
   },
   {
    "name": "size",
    "type": "uint16",
    "internalType": "uint16"
   },
   {
    "name": "roundDuration",
    "type": "uint64",
    "internalType": "uint64"
   }
  ],
  "outputs": [
   {
    "name": "id",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "stateMutability": "nonpayable"
 },
 {
  "type": "function",
  "name": "depositOf",
  "inputs": [
   {
    "name": "",
    "type": "uint256",
    "internalType": "uint256"
   },
   {
    "name": "",
    "type": "address",
    "internalType": "address"
   }
  ],
  "outputs": [
   {
    "name": "",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "getCircle",
  "inputs": [
   {
    "name": "id",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "outputs": [
   {
    "name": "circle",
    "type": "tuple",
    "internalType": "struct Ajo.Circle",
    "components": [
     {
      "name": "name",
      "type": "string",
      "internalType": "string"
     },
     {
      "name": "organizer",
      "type": "address",
      "internalType": "address"
     },
     {
      "name": "contribution",
      "type": "uint128",
      "internalType": "uint128"
     },
     {
      "name": "deposit",
      "type": "uint128",
      "internalType": "uint128"
     },
     {
      "name": "roundDuration",
      "type": "uint64",
      "internalType": "uint64"
     },
     {
      "name": "deadline",
      "type": "uint64",
      "internalType": "uint64"
     },
     {
      "name": "createdAt",
      "type": "uint64",
      "internalType": "uint64"
     },
     {
      "name": "size",
      "type": "uint16",
      "internalType": "uint16"
     },
     {
      "name": "round",
      "type": "uint16",
      "internalType": "uint16"
     },
     {
      "name": "paidCount",
      "type": "uint16",
      "internalType": "uint16"
     },
     {
      "name": "status",
      "type": "uint8",
      "internalType": "enum Ajo.Status"
     },
     {
      "name": "pot",
      "type": "uint256",
      "internalType": "uint256"
     }
    ]
   },
   {
    "name": "members",
    "type": "address[]",
    "internalType": "address[]"
   },
   {
    "name": "paidThisRound",
    "type": "bool[]",
    "internalType": "bool[]"
   },
   {
    "name": "deposits",
    "type": "uint256[]",
    "internalType": "uint256[]"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "hasPaid",
  "inputs": [
   {
    "name": "",
    "type": "uint256",
    "internalType": "uint256"
   },
   {
    "name": "",
    "type": "uint256",
    "internalType": "uint256"
   },
   {
    "name": "",
    "type": "address",
    "internalType": "address"
   }
  ],
  "outputs": [
   {
    "name": "",
    "type": "bool",
    "internalType": "bool"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "isMember",
  "inputs": [
   {
    "name": "",
    "type": "uint256",
    "internalType": "uint256"
   },
   {
    "name": "",
    "type": "address",
    "internalType": "address"
   }
  ],
  "outputs": [
   {
    "name": "",
    "type": "bool",
    "internalType": "bool"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "join",
  "inputs": [
   {
    "name": "id",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "outputs": [],
  "stateMutability": "nonpayable"
 },
 {
  "type": "function",
  "name": "joinNonce",
  "inputs": [
   {
    "name": "id",
    "type": "uint256",
    "internalType": "uint256"
   },
   {
    "name": "member",
    "type": "address",
    "internalType": "address"
   },
   {
    "name": "salt",
    "type": "bytes32",
    "internalType": "bytes32"
   }
  ],
  "outputs": [
   {
    "name": "",
    "type": "bytes32",
    "internalType": "bytes32"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "joinWithAuthorization",
  "inputs": [
   {
    "name": "id",
    "type": "uint256",
    "internalType": "uint256"
   },
   {
    "name": "member",
    "type": "address",
    "internalType": "address"
   },
   {
    "name": "value",
    "type": "uint256",
    "internalType": "uint256"
   },
   {
    "name": "validAfter",
    "type": "uint256",
    "internalType": "uint256"
   },
   {
    "name": "validBefore",
    "type": "uint256",
    "internalType": "uint256"
   },
   {
    "name": "salt",
    "type": "bytes32",
    "internalType": "bytes32"
   },
   {
    "name": "v",
    "type": "uint8",
    "internalType": "uint8"
   },
   {
    "name": "r",
    "type": "bytes32",
    "internalType": "bytes32"
   },
   {
    "name": "s",
    "type": "bytes32",
    "internalType": "bytes32"
   }
  ],
  "outputs": [],
  "stateMutability": "nonpayable"
 },
 {
  "type": "function",
  "name": "leave",
  "inputs": [
   {
    "name": "id",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "outputs": [],
  "stateMutability": "nonpayable"
 },
 {
  "type": "function",
  "name": "maxRelayFee",
  "inputs": [],
  "outputs": [
   {
    "name": "",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "owed",
  "inputs": [
   {
    "name": "",
    "type": "address",
    "internalType": "address"
   }
  ],
  "outputs": [
   {
    "name": "",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "recipientOf",
  "inputs": [
   {
    "name": "id",
    "type": "uint256",
    "internalType": "uint256"
   },
   {
    "name": "round",
    "type": "uint16",
    "internalType": "uint16"
   }
  ],
  "outputs": [
   {
    "name": "",
    "type": "address",
    "internalType": "address"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "records",
  "inputs": [
   {
    "name": "",
    "type": "address",
    "internalType": "address"
   }
  ],
  "outputs": [
   {
    "name": "paid",
    "type": "uint32",
    "internalType": "uint32"
   },
   {
    "name": "missed",
    "type": "uint32",
    "internalType": "uint32"
   },
   {
    "name": "received",
    "type": "uint32",
    "internalType": "uint32"
   },
   {
    "name": "circlesCompleted",
    "type": "uint32",
    "internalType": "uint32"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "settle",
  "inputs": [
   {
    "name": "id",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "outputs": [],
  "stateMutability": "nonpayable"
 },
 {
  "type": "function",
  "name": "usdc",
  "inputs": [],
  "outputs": [
   {
    "name": "",
    "type": "address",
    "internalType": "contract IUSDC"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "withdrawOwed",
  "inputs": [],
  "outputs": [],
  "stateMutability": "nonpayable"
 },
 {
  "type": "event",
  "name": "CircleCompleted",
  "inputs": [
   {
    "name": "id",
    "type": "uint256",
    "indexed": true,
    "internalType": "uint256"
   }
  ],
  "anonymous": false
 },
 {
  "type": "event",
  "name": "CircleCreated",
  "inputs": [
   {
    "name": "id",
    "type": "uint256",
    "indexed": true,
    "internalType": "uint256"
   },
   {
    "name": "organizer",
    "type": "address",
    "indexed": true,
    "internalType": "address"
   },
   {
    "name": "name",
    "type": "string",
    "indexed": false,
    "internalType": "string"
   },
   {
    "name": "contribution",
    "type": "uint256",
    "indexed": false,
    "internalType": "uint256"
   },
   {
    "name": "deposit",
    "type": "uint256",
    "indexed": false,
    "internalType": "uint256"
   },
   {
    "name": "size",
    "type": "uint16",
    "indexed": false,
    "internalType": "uint16"
   },
   {
    "name": "roundDuration",
    "type": "uint64",
    "indexed": false,
    "internalType": "uint64"
   }
  ],
  "anonymous": false
 },
 {
  "type": "event",
  "name": "CircleStarted",
  "inputs": [
   {
    "name": "id",
    "type": "uint256",
    "indexed": true,
    "internalType": "uint256"
   },
   {
    "name": "deadline",
    "type": "uint64",
    "indexed": false,
    "internalType": "uint64"
   }
  ],
  "anonymous": false
 },
 {
  "type": "event",
  "name": "Contributed",
  "inputs": [
   {
    "name": "id",
    "type": "uint256",
    "indexed": true,
    "internalType": "uint256"
   },
   {
    "name": "round",
    "type": "uint16",
    "indexed": true,
    "internalType": "uint16"
   },
   {
    "name": "member",
    "type": "address",
    "indexed": true,
    "internalType": "address"
   },
   {
    "name": "amount",
    "type": "uint256",
    "indexed": false,
    "internalType": "uint256"
   },
   {
    "name": "relayer",
    "type": "address",
    "indexed": false,
    "internalType": "address"
   },
   {
    "name": "relayFee",
    "type": "uint256",
    "indexed": false,
    "internalType": "uint256"
   }
  ],
  "anonymous": false
 },
 {
  "type": "event",
  "name": "Defaulted",
  "inputs": [
   {
    "name": "id",
    "type": "uint256",
    "indexed": true,
    "internalType": "uint256"
   },
   {
    "name": "round",
    "type": "uint16",
    "indexed": true,
    "internalType": "uint16"
   },
   {
    "name": "member",
    "type": "address",
    "indexed": true,
    "internalType": "address"
   },
   {
    "name": "coveredFromDeposit",
    "type": "uint256",
    "indexed": false,
    "internalType": "uint256"
   }
  ],
  "anonymous": false
 },
 {
  "type": "event",
  "name": "DepositReturned",
  "inputs": [
   {
    "name": "id",
    "type": "uint256",
    "indexed": true,
    "internalType": "uint256"
   },
   {
    "name": "member",
    "type": "address",
    "indexed": true,
    "internalType": "address"
   },
   {
    "name": "amount",
    "type": "uint256",
    "indexed": false,
    "internalType": "uint256"
   },
   {
    "name": "pushed",
    "type": "bool",
    "indexed": false,
    "internalType": "bool"
   }
  ],
  "anonymous": false
 },
 {
  "type": "event",
  "name": "Joined",
  "inputs": [
   {
    "name": "id",
    "type": "uint256",
    "indexed": true,
    "internalType": "uint256"
   },
   {
    "name": "member",
    "type": "address",
    "indexed": true,
    "internalType": "address"
   },
   {
    "name": "slot",
    "type": "uint16",
    "indexed": false,
    "internalType": "uint16"
   },
   {
    "name": "relayer",
    "type": "address",
    "indexed": false,
    "internalType": "address"
   },
   {
    "name": "relayFee",
    "type": "uint256",
    "indexed": false,
    "internalType": "uint256"
   }
  ],
  "anonymous": false
 },
 {
  "type": "event",
  "name": "Left",
  "inputs": [
   {
    "name": "id",
    "type": "uint256",
    "indexed": true,
    "internalType": "uint256"
   },
   {
    "name": "member",
    "type": "address",
    "indexed": true,
    "internalType": "address"
   }
  ],
  "anonymous": false
 },
 {
  "type": "event",
  "name": "OwedWithdrawn",
  "inputs": [
   {
    "name": "account",
    "type": "address",
    "indexed": true,
    "internalType": "address"
   },
   {
    "name": "amount",
    "type": "uint256",
    "indexed": false,
    "internalType": "uint256"
   }
  ],
  "anonymous": false
 },
 {
  "type": "event",
  "name": "PotPaid",
  "inputs": [
   {
    "name": "id",
    "type": "uint256",
    "indexed": true,
    "internalType": "uint256"
   },
   {
    "name": "round",
    "type": "uint16",
    "indexed": true,
    "internalType": "uint16"
   },
   {
    "name": "recipient",
    "type": "address",
    "indexed": true,
    "internalType": "address"
   },
   {
    "name": "amount",
    "type": "uint256",
    "indexed": false,
    "internalType": "uint256"
   },
   {
    "name": "pushed",
    "type": "bool",
    "indexed": false,
    "internalType": "bool"
   }
  ],
  "anonymous": false
 },
 {
  "type": "error",
  "name": "AlreadyMember",
  "inputs": []
 },
 {
  "type": "error",
  "name": "AlreadyPaid",
  "inputs": []
 },
 {
  "type": "error",
  "name": "BadAmount",
  "inputs": []
 },
 {
  "type": "error",
  "name": "BadParams",
  "inputs": []
 },
 {
  "type": "error",
  "name": "NotAMember",
  "inputs": []
 },
 {
  "type": "error",
  "name": "NotActive",
  "inputs": []
 },
 {
  "type": "error",
  "name": "NotOpen",
  "inputs": []
 },
 {
  "type": "error",
  "name": "NothingToClaim",
  "inputs": []
 },
 {
  "type": "error",
  "name": "RoundStillOpen",
  "inputs": []
 },
 {
  "type": "error",
  "name": "TransferFailed",
  "inputs": []
 }
];

export const usdcAbi = [
  { type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ name: "a", type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "transfer", stateMutability: "nonpayable", inputs: [{ name: "to", type: "address" }, { name: "v", type: "uint256" }], outputs: [{ type: "bool" }] },
  { type: "function", name: "approve", stateMutability: "nonpayable", inputs: [{ name: "s", type: "address" }, { name: "v", type: "uint256" }], outputs: [{ type: "bool" }] },
  { type: "function", name: "allowance", stateMutability: "view", inputs: [{ name: "o", type: "address" }, { name: "s", type: "address" }], outputs: [{ type: "uint256" }] },
];
