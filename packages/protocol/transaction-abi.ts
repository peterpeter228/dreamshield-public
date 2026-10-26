// Verbatim entries extracted from pinned @somnia-chain/markets-sdk 0.32.1 dist/tradeAbi.js (MIT).
export const transactionAbi = [
  {
    "name": "createPendingOrder",
    "type": "function",
    "stateMutability": "payable",
    "inputs": [
      {
        "type": "tuple",
        "name": "orderWithTrigger",
        "components": [
          {
            "type": "tuple",
            "name": "order",
            "components": [
              {
                "type": "bool",
                "name": "isBid"
              },
              {
                "type": "address",
                "name": "owner"
              },
              {
                "type": "uint64",
                "name": "userData"
              },
              {
                "type": "uint256",
                "name": "quantity"
              }
            ]
          },
          {
            "type": "uint8",
            "name": "orderType"
          },
          {
            "type": "uint256",
            "name": "triggerPrice"
          },
          {
            "type": "uint8",
            "name": "triggerOperator"
          },
          {
            "type": "uint256",
            "name": "limitPrice"
          },
          {
            "type": "address",
            "name": "builder"
          },
          {
            "type": "uint96",
            "name": "builderFeeBpsTimes1k"
          }
        ]
      }
    ],
    "outputs": [
      {
        "type": "uint128",
        "name": "pendingOrderId"
      }
    ]
  },
  {
    "name": "cancelPendingOrder",
    "type": "function",
    "stateMutability": "nonpayable",
    "inputs": [
      {
        "type": "uint128",
        "name": "orderId"
      }
    ],
    "outputs": []
  }
] as const;
