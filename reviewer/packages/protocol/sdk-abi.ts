// Generated verbatim ABI declarations from @somnia-chain/markets-sdk@0.32.1 (MIT).
// Source: dist/readsAbi.js and dist/tradeAbi.js; no guessed contract signatures.
export const poolReadAbi = [
  {
    "name": "marginBank",
    "type": "function",
    "stateMutability": "view",
    "inputs": [],
    "outputs": [
      {
        "type": "address"
      }
    ]
  },
  {
    "name": "oracle",
    "type": "function",
    "stateMutability": "view",
    "inputs": [],
    "outputs": [
      {
        "type": "address"
      }
    ]
  },
  {
    "name": "getMarkPrice",
    "type": "function",
    "stateMutability": "view",
    "inputs": [],
    "outputs": [
      {
        "type": "uint256"
      }
    ]
  },
  {
    "name": "getIndexPrice",
    "type": "function",
    "stateMutability": "view",
    "inputs": [],
    "outputs": [
      {
        "type": "uint256",
        "name": "price"
      },
      {
        "type": "uint256",
        "name": "updatedAt"
      }
    ]
  },
  {
    "name": "getCurrentFundingRate",
    "type": "function",
    "stateMutability": "view",
    "inputs": [],
    "outputs": [
      {
        "type": "int256"
      }
    ]
  },
  {
    "name": "getCumulativeFundingPerUnit",
    "type": "function",
    "stateMutability": "view",
    "inputs": [],
    "outputs": [
      {
        "type": "int256"
      }
    ]
  },
  {
    "name": "getProjectedCumulativeFundingPerUnit",
    "type": "function",
    "stateMutability": "view",
    "inputs": [],
    "outputs": [
      {
        "type": "int256"
      }
    ]
  },
  {
    "name": "getOpenInterest",
    "type": "function",
    "stateMutability": "view",
    "inputs": [],
    "outputs": [
      {
        "type": "uint256",
        "name": "openInterest"
      }
    ]
  },
  {
    "name": "getOneBase",
    "type": "function",
    "stateMutability": "view",
    "inputs": [],
    "outputs": [
      {
        "type": "uint256"
      }
    ]
  },
  {
    "name": "getFundingParameters",
    "type": "function",
    "stateMutability": "view",
    "inputs": [],
    "outputs": [
      {
        "type": "tuple",
        "components": [
          {
            "type": "uint256",
            "name": "fundingCalculationWindowSec"
          },
          {
            "type": "uint256",
            "name": "fundingSettlementIntervalSec"
          },
          {
            "type": "int256",
            "name": "interestRatePerWindow"
          },
          {
            "type": "uint256",
            "name": "maxFundingRatePerWindow"
          },
          {
            "type": "uint256",
            "name": "dampener"
          },
          {
            "type": "uint256",
            "name": "emaSmoothingAlpha"
          },
          {
            "type": "uint256",
            "name": "maxOracleStalenessSec"
          }
        ]
      }
    ]
  },
  {
    "name": "getLastFundingUpdateTimestampNs",
    "type": "function",
    "stateMutability": "view",
    "inputs": [],
    "outputs": [
      {
        "type": "uint64"
      }
    ]
  },
  {
    "name": "getEmaPremium",
    "type": "function",
    "stateMutability": "view",
    "inputs": [],
    "outputs": [
      {
        "type": "int256"
      }
    ]
  },
  {
    "name": "getTimeWeightedPremium",
    "type": "function",
    "stateMutability": "view",
    "inputs": [],
    "outputs": [
      {
        "type": "int256"
      }
    ]
  },
  {
    "name": "getLastObservedPremium",
    "type": "function",
    "stateMutability": "view",
    "inputs": [],
    "outputs": [
      {
        "type": "int256"
      }
    ]
  },
  {
    "name": "getPremiumWindowState",
    "type": "function",
    "stateMutability": "view",
    "inputs": [],
    "outputs": [
      {
        "type": "int256",
        "name": "accumulator"
      },
      {
        "type": "uint64",
        "name": "intervalStartNs"
      },
      {
        "type": "uint64",
        "name": "observedAtNs"
      },
      {
        "type": "uint64",
        "name": "validUntilNs"
      }
    ]
  },
  {
    "name": "tryGetMarkPrice",
    "type": "function",
    "stateMutability": "view",
    "inputs": [],
    "outputs": [
      {
        "type": "bool",
        "name": "ok"
      },
      {
        "type": "uint256",
        "name": "price"
      }
    ]
  },
  {
    "name": "getOrderBookParameters",
    "type": "function",
    "stateMutability": "view",
    "inputs": [],
    "outputs": [
      {
        "type": "tuple",
        "components": [
          {
            "type": "uint256",
            "name": "tickSize"
          },
          {
            "type": "uint256",
            "name": "minQuantity"
          },
          {
            "type": "uint256",
            "name": "lotSize"
          }
        ]
      }
    ]
  },
  {
    "name": "getPerpPoolParameters",
    "type": "function",
    "stateMutability": "view",
    "inputs": [],
    "outputs": [
      {
        "type": "tuple",
        "components": [
          {
            "type": "uint256",
            "name": "initialMarginBps"
          },
          {
            "type": "uint256",
            "name": "maintenanceMarginBps"
          },
          {
            "type": "uint256",
            "name": "closeOutMarginBps"
          },
          {
            "type": "uint256",
            "name": "maxOpenInterest"
          },
          {
            "type": "uint256",
            "name": "maxPositionSize"
          },
          {
            "type": "uint256",
            "name": "takerFeeBpsTimes1k"
          },
          {
            "type": "int256",
            "name": "makerFeeBpsTimes1k"
          },
          {
            "type": "uint256",
            "name": "insuranceFundShareBps"
          }
        ]
      }
    ]
  },
  {
    "name": "getEffectiveIMF",
    "type": "function",
    "stateMutability": "view",
    "inputs": [],
    "outputs": [
      {
        "type": "uint256"
      }
    ]
  },
  {
    "name": "getHealthSnapshot",
    "type": "function",
    "stateMutability": "view",
    "inputs": [],
    "outputs": [
      {
        "type": "tuple",
        "name": "snapshot",
        "components": [
          {
            "type": "uint256",
            "name": "oneBase"
          },
          {
            "type": "uint256",
            "name": "markPrice"
          },
          {
            "type": "int256",
            "name": "projectedCumulativeFunding"
          },
          {
            "type": "uint256",
            "name": "effectiveIMFBps"
          },
          {
            "type": "uint256",
            "name": "maintenanceMarginBps"
          },
          {
            "type": "uint256",
            "name": "closeOutMarginBps"
          }
        ]
      }
    ]
  },
  {
    "name": "tryGetHealthSnapshot",
    "type": "function",
    "stateMutability": "view",
    "inputs": [],
    "outputs": [
      {
        "type": "bool",
        "name": "ok"
      },
      {
        "type": "tuple",
        "name": "snapshot",
        "components": [
          {
            "type": "uint256",
            "name": "oneBase"
          },
          {
            "type": "uint256",
            "name": "markPrice"
          },
          {
            "type": "int256",
            "name": "projectedCumulativeFunding"
          },
          {
            "type": "uint256",
            "name": "effectiveIMFBps"
          },
          {
            "type": "uint256",
            "name": "maintenanceMarginBps"
          },
          {
            "type": "uint256",
            "name": "closeOutMarginBps"
          }
        ]
      }
    ]
  },
  {
    "name": "getReducingCapacity",
    "type": "function",
    "stateMutability": "view",
    "inputs": [
      {
        "type": "address",
        "name": "account"
      }
    ],
    "outputs": [
      {
        "type": "tuple",
        "name": "capacity",
        "components": [
          {
            "type": "int128",
            "name": "positionSize"
          },
          {
            "type": "uint256",
            "name": "pendingBidQuantity"
          },
          {
            "type": "uint256",
            "name": "pendingAskQuantity"
          },
          {
            "type": "uint256",
            "name": "pendingOppositeQuantity"
          },
          {
            "type": "uint256",
            "name": "effectiveReducingCapacity"
          }
        ]
      }
    ]
  },
  {
    "name": "isRestricted",
    "type": "function",
    "stateMutability": "view",
    "inputs": [],
    "outputs": [
      {
        "type": "bool"
      }
    ]
  },
  {
    "name": "getMarketStatus",
    "type": "function",
    "stateMutability": "view",
    "inputs": [],
    "outputs": [
      {
        "type": "uint8"
      }
    ]
  }
] as const;
export const bankReadAbi = [
  {
    "name": "getSystemConfig",
    "type": "function",
    "stateMutability": "view",
    "inputs": [],
    "outputs": [
      {
        "type": "tuple",
        "components": [
          {
            "type": "address",
            "name": "marginBank"
          },
          {
            "type": "address",
            "name": "collateralToken"
          },
          {
            "type": "address",
            "name": "perpPoolFactory"
          },
          {
            "type": "address",
            "name": "liquidationEngine"
          },
          {
            "type": "address",
            "name": "insuranceFund"
          },
          {
            "type": "address",
            "name": "feeRecipient"
          },
          {
            "type": "uint16",
            "name": "maxLeverageLimit"
          },
          {
            "type": "bool",
            "name": "fullyWired"
          }
        ]
      }
    ]
  },
  {
    "name": "getPosition",
    "type": "function",
    "stateMutability": "view",
    "inputs": [
      {
        "type": "address",
        "name": "account"
      },
      {
        "type": "address",
        "name": "perpPool"
      }
    ],
    "outputs": [
      {
        "type": "tuple",
        "components": [
          {
            "type": "int128",
            "name": "size"
          },
          {
            "type": "uint128",
            "name": "avgEntryPrice"
          },
          {
            "type": "int256",
            "name": "entryFundingIndex"
          },
          {
            "type": "uint64",
            "name": "lastUpdatedTimestampNs"
          }
        ]
      }
    ]
  },
  {
    "name": "getAccountState",
    "type": "function",
    "stateMutability": "view",
    "inputs": [
      {
        "type": "address",
        "name": "account"
      }
    ],
    "outputs": [
      {
        "type": "tuple",
        "components": [
          {
            "type": "int256",
            "name": "unlockedCollateralBalance"
          },
          {
            "type": "uint256",
            "name": "lockedCollateral"
          },
          {
            "type": "address[]",
            "name": "activePerpPools"
          }
        ]
      }
    ]
  },
  {
    "name": "getAccountEquity",
    "type": "function",
    "stateMutability": "view",
    "inputs": [
      {
        "type": "address",
        "name": "account"
      }
    ],
    "outputs": [
      {
        "type": "int256"
      }
    ]
  },
  {
    "name": "getWithdrawableCollateral",
    "type": "function",
    "stateMutability": "view",
    "inputs": [
      {
        "type": "address",
        "name": "account"
      }
    ],
    "outputs": [
      {
        "type": "uint256"
      }
    ]
  },
  {
    "name": "getActivePerpPools",
    "type": "function",
    "stateMutability": "view",
    "inputs": [
      {
        "type": "address",
        "name": "account"
      }
    ],
    "outputs": [
      {
        "type": "address[]"
      }
    ]
  },
  {
    "name": "getAccountHealth",
    "type": "function",
    "stateMutability": "view",
    "inputs": [
      {
        "type": "address",
        "name": "account"
      }
    ],
    "outputs": [
      {
        "type": "int256",
        "name": "equity"
      },
      {
        "type": "uint256",
        "name": "imReq"
      },
      {
        "type": "uint256",
        "name": "mmReq"
      },
      {
        "type": "uint256",
        "name": "cmReq"
      }
    ]
  },
  {
    "name": "getMarginStatus",
    "type": "function",
    "stateMutability": "view",
    "inputs": [
      {
        "type": "address",
        "name": "account"
      }
    ],
    "outputs": [
      {
        "type": "uint8"
      }
    ]
  },
  {
    "name": "tryGetAccountEquity",
    "type": "function",
    "stateMutability": "view",
    "inputs": [
      {
        "type": "address",
        "name": "account"
      }
    ],
    "outputs": [
      {
        "type": "bool",
        "name": "ok"
      },
      {
        "type": "int256",
        "name": "equity"
      }
    ]
  },
  {
    "name": "getCollateralBasis",
    "type": "function",
    "stateMutability": "view",
    "inputs": [
      {
        "type": "address",
        "name": "account"
      }
    ],
    "outputs": [
      {
        "type": "uint256"
      }
    ]
  },
  {
    "name": "getInsuranceFundAddress",
    "type": "function",
    "stateMutability": "view",
    "inputs": [],
    "outputs": [
      {
        "type": "address"
      }
    ]
  },
  {
    "name": "isInsuranceFundCoverageEnabled",
    "type": "function",
    "stateMutability": "view",
    "inputs": [
      {
        "type": "address",
        "name": "perpPool"
      }
    ],
    "outputs": [
      {
        "type": "bool"
      }
    ]
  },
  {
    "name": "getPoolTier",
    "type": "function",
    "stateMutability": "view",
    "inputs": [
      {
        "type": "address",
        "name": "perpPool"
      }
    ],
    "outputs": [
      {
        "type": "uint256"
      }
    ]
  },
  {
    "name": "quoteMeetsIMForOrder",
    "type": "function",
    "stateMutability": "view",
    "inputs": [
      {
        "type": "address",
        "name": "account"
      },
      {
        "type": "address",
        "name": "perpPool"
      },
      {
        "type": "uint256",
        "name": "additionalSize"
      },
      {
        "type": "uint256",
        "name": "orderPrice"
      }
    ],
    "outputs": [
      {
        "type": "bool"
      }
    ]
  },
  {
    "name": "meetsIMForFill",
    "type": "function",
    "stateMutability": "view",
    "inputs": [
      {
        "type": "address",
        "name": "account"
      },
      {
        "type": "address",
        "name": "perpPool"
      },
      {
        "type": "uint256",
        "name": "additionalSize"
      },
      {
        "type": "uint256",
        "name": "orderPrice"
      }
    ],
    "outputs": [
      {
        "type": "bool"
      }
    ]
  },
  {
    "name": "quoteOrderTopUp",
    "type": "function",
    "stateMutability": "view",
    "inputs": [
      {
        "type": "address",
        "name": "account"
      },
      {
        "type": "address",
        "name": "perpPool"
      },
      {
        "type": "uint256",
        "name": "lockAmount"
      },
      {
        "type": "uint256",
        "name": "feeHeadroom"
      },
      {
        "type": "uint256",
        "name": "increasingQuantity"
      },
      {
        "type": "uint256",
        "name": "orderPrice"
      }
    ],
    "outputs": [
      {
        "type": "uint256",
        "name": "topUp"
      }
    ]
  },
  {
    "name": "isolationAllowsMarket",
    "type": "function",
    "stateMutability": "view",
    "inputs": [
      {
        "type": "address",
        "name": "account"
      },
      {
        "type": "address",
        "name": "market"
      }
    ],
    "outputs": [
      {
        "type": "bool"
      }
    ]
  },
  {
    "name": "isolated",
    "type": "function",
    "stateMutability": "view",
    "inputs": [
      {
        "type": "address",
        "name": "account"
      }
    ],
    "outputs": [
      {
        "type": "bool"
      }
    ]
  },
  {
    "name": "getMaxLeverage",
    "type": "function",
    "stateMutability": "view",
    "inputs": [
      {
        "type": "address",
        "name": "account"
      },
      {
        "type": "address",
        "name": "perpPool"
      }
    ],
    "outputs": [
      {
        "type": "uint16"
      }
    ]
  },
  {
    "name": "getMaxLeverageLimit",
    "type": "function",
    "stateMutability": "view",
    "inputs": [],
    "outputs": [
      {
        "type": "uint16"
      }
    ]
  },
  {
    "name": "getCreditFloor",
    "type": "function",
    "stateMutability": "view",
    "inputs": [
      {
        "type": "address",
        "name": "account"
      }
    ],
    "outputs": [
      {
        "type": "uint256"
      }
    ]
  },
  {
    "name": "getVoucherLeverageCap",
    "type": "function",
    "stateMutability": "view",
    "inputs": [],
    "outputs": [
      {
        "type": "uint16"
      }
    ]
  },
  {
    "name": "isVoucherMarketAllowed",
    "type": "function",
    "stateMutability": "view",
    "inputs": [
      {
        "type": "address",
        "name": "perpPool"
      }
    ],
    "outputs": [
      {
        "type": "bool"
      }
    ]
  },
  {
    "name": "getCreditGranter",
    "type": "function",
    "stateMutability": "view",
    "inputs": [],
    "outputs": [
      {
        "type": "address"
      }
    ]
  },
  {
    "name": "isPerpPoolRegistered",
    "type": "function",
    "stateMutability": "view",
    "inputs": [
      {
        "type": "address",
        "name": "perpPool"
      }
    ],
    "outputs": [
      {
        "type": "bool"
      }
    ]
  },
  {
    "name": "getSideHoldersPaginated",
    "type": "function",
    "stateMutability": "view",
    "inputs": [
      {
        "type": "address",
        "name": "pool"
      },
      {
        "type": "bool",
        "name": "isLong"
      },
      {
        "type": "uint256",
        "name": "start"
      },
      {
        "type": "uint256",
        "name": "count"
      }
    ],
    "outputs": [
      {
        "type": "address[]",
        "name": "holders"
      }
    ]
  },
  {
    "name": "getSideHolderStatesPaginated",
    "type": "function",
    "stateMutability": "view",
    "inputs": [
      {
        "type": "address",
        "name": "pool"
      },
      {
        "type": "bool",
        "name": "isLong"
      },
      {
        "type": "uint256",
        "name": "start"
      },
      {
        "type": "uint256",
        "name": "count"
      }
    ],
    "outputs": [
      {
        "type": "tuple[]",
        "name": "states",
        "components": [
          {
            "type": "address",
            "name": "account"
          },
          {
            "type": "bool",
            "name": "priceable"
          },
          {
            "type": "uint8",
            "name": "status"
          },
          {
            "type": "int256",
            "name": "equity"
          },
          {
            "type": "uint256",
            "name": "imReq"
          },
          {
            "type": "uint256",
            "name": "mmReq"
          },
          {
            "type": "uint256",
            "name": "cmReq"
          },
          {
            "type": "tuple",
            "name": "position",
            "components": [
              {
                "type": "int128",
                "name": "size"
              },
              {
                "type": "uint128",
                "name": "avgEntryPrice"
              },
              {
                "type": "int256",
                "name": "entryFundingIndex"
              },
              {
                "type": "uint64",
                "name": "lastUpdatedTimestampNs"
              }
            ]
          },
          {
            "type": "int256",
            "name": "unlockedCollateralBalance"
          },
          {
            "type": "uint256",
            "name": "lockedCollateral"
          }
        ]
      },
      {
        "type": "uint256",
        "name": "listLength"
      },
      {
        "type": "bool",
        "name": "poolPriceable"
      },
      {
        "type": "tuple",
        "name": "poolSnapshot",
        "components": [
          {
            "type": "uint256",
            "name": "oneBase"
          },
          {
            "type": "uint256",
            "name": "markPrice"
          },
          {
            "type": "int256",
            "name": "projectedCumulativeFunding"
          },
          {
            "type": "uint256",
            "name": "effectiveIMFBps"
          },
          {
            "type": "uint256",
            "name": "maintenanceMarginBps"
          },
          {
            "type": "uint256",
            "name": "closeOutMarginBps"
          },
          {
            "type": "uint256",
            "name": "staticIMFBps"
          }
        ]
      }
    ]
  },
  {
    "name": "getBankruptcyPrice",
    "type": "function",
    "stateMutability": "view",
    "inputs": [
      {
        "type": "address",
        "name": "account"
      },
      {
        "type": "address",
        "name": "perpPool"
      }
    ],
    "outputs": [
      {
        "type": "uint256",
        "name": "price"
      }
    ]
  },
  {
    "name": "NoOpenPosition",
    "type": "error",
    "inputs": []
  },
  {
    "name": "AdlZeroNotional",
    "type": "error",
    "inputs": []
  },
  {
    "name": "getLeverageImSurcharge",
    "type": "function",
    "stateMutability": "view",
    "inputs": [
      {
        "type": "address",
        "name": "account"
      }
    ],
    "outputs": [
      {
        "type": "uint256"
      }
    ]
  },
  {
    "name": "quoteFundingPayer",
    "type": "function",
    "stateMutability": "view",
    "inputs": [
      {
        "type": "address",
        "name": "child"
      }
    ],
    "outputs": [
      {
        "type": "address",
        "name": "payer"
      }
    ]
  },
  {
    "name": "quoteWalletCapacity",
    "type": "function",
    "stateMutability": "view",
    "inputs": [
      {
        "type": "address",
        "name": "wallet"
      }
    ],
    "outputs": [
      {
        "type": "uint256"
      }
    ]
  },
  {
    "name": "getMainFundedPrincipal",
    "type": "function",
    "stateMutability": "view",
    "inputs": [
      {
        "type": "address",
        "name": "child"
      }
    ],
    "outputs": [
      {
        "type": "uint256"
      }
    ]
  },
  {
    "name": "getMainFundingPayer",
    "type": "function",
    "stateMutability": "view",
    "inputs": [
      {
        "type": "address",
        "name": "child"
      }
    ],
    "outputs": [
      {
        "type": "address"
      }
    ]
  },
  {
    "name": "getLinkedWalletRegistry",
    "type": "function",
    "stateMutability": "view",
    "inputs": [],
    "outputs": [
      {
        "type": "address"
      }
    ]
  }
] as const;
export const stopReadAbi = [
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
    "name": "createTriggerOrder",
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
      },
      {
        "type": "uint8",
        "name": "intent"
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
    "name": "createLinkedPendingOrders",
    "type": "function",
    "stateMutability": "payable",
    "inputs": [
      {
        "type": "tuple",
        "name": "gteOrder",
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
      },
      {
        "type": "tuple",
        "name": "lteOrder",
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
        "name": "gteOrderId"
      },
      {
        "type": "uint128",
        "name": "lteOrderId"
      }
    ]
  },
  {
    "name": "linkPendingOrders",
    "type": "function",
    "stateMutability": "nonpayable",
    "inputs": [
      {
        "type": "uint128",
        "name": "orderIdA"
      },
      {
        "type": "uint128",
        "name": "orderIdB"
      }
    ],
    "outputs": []
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
  },
  {
    "name": "cancelPendingOrders",
    "type": "function",
    "stateMutability": "nonpayable",
    "inputs": [
      {
        "type": "uint128[]",
        "name": "orderIds"
      }
    ],
    "outputs": []
  },
  {
    "name": "getPendingOrder",
    "type": "function",
    "stateMutability": "view",
    "inputs": [
      {
        "type": "uint128",
        "name": "orderId"
      }
    ],
    "outputs": [
      {
        "type": "bool",
        "name": "live"
      },
      {
        "type": "tuple",
        "name": "order",
        "components": [
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
          },
          {
            "type": "uint128",
            "name": "orderId"
          },
          {
            "type": "uint256",
            "name": "somiPaid"
          },
          {
            "type": "uint128",
            "name": "siblingOrderId"
          },
          {
            "type": "uint8",
            "name": "intent"
          }
        ]
      }
    ]
  },
  {
    "name": "somiPaymentPerOrder",
    "type": "function",
    "stateMutability": "view",
    "inputs": [],
    "outputs": [
      {
        "type": "uint256"
      }
    ]
  },
  {
    "name": "claimSomi",
    "type": "function",
    "stateMutability": "nonpayable",
    "inputs": [],
    "outputs": []
  },
  {
    "name": "unclaimedSomi",
    "type": "function",
    "stateMutability": "view",
    "inputs": [
      {
        "type": "address",
        "name": "user"
      }
    ],
    "outputs": [
      {
        "type": "uint256"
      }
    ]
  }
] as const;
// Events from SDK dist/accountView/stopEvents.js, common/perp lifecycle ABI.
export const stopEventsAbi = [
  {
    "name": "PendingOrderCreated",
    "type": "event",
    "inputs": [
      {
        "type": "uint128",
        "name": "orderId",
        "indexed": true
      },
      {
        "type": "address",
        "name": "owner",
        "indexed": true
      },
      {
        "type": "bool",
        "name": "isBid"
      },
      {
        "type": "uint256",
        "name": "quantity"
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
        "type": "uint8",
        "name": "orderType"
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
  },
  {
    "name": "PendingOrderIntentSet",
    "type": "event",
    "inputs": [
      {
        "type": "uint128",
        "name": "orderId",
        "indexed": true
      },
      {
        "type": "uint8",
        "name": "intent"
      }
    ]
  },
  {
    "name": "PendingOrdersLinked",
    "type": "event",
    "inputs": [
      {
        "type": "uint128",
        "name": "gteOrderId",
        "indexed": true
      },
      {
        "type": "uint128",
        "name": "lteOrderId",
        "indexed": true
      },
      {
        "type": "address",
        "name": "owner",
        "indexed": true
      }
    ]
  },
  {
    "name": "PendingOrderUnlinked",
    "type": "event",
    "inputs": [
      {
        "type": "uint128",
        "name": "orderId",
        "indexed": true
      }
    ]
  },
  {
    "name": "PendingOrderTriggered",
    "type": "event",
    "inputs": [
      {
        "type": "uint128",
        "name": "pendingOrderId",
        "indexed": true
      },
      {
        "type": "bool",
        "name": "success"
      },
      {
        "type": "uint8",
        "name": "dropReason"
      },
      {
        "type": "uint128",
        "name": "placedOrderId",
        "indexed": true
      }
    ]
  },
  {
    "name": "PendingOrderCancelled",
    "type": "event",
    "inputs": [
      {
        "type": "uint128",
        "name": "orderId",
        "indexed": true
      }
    ]
  },
  {
    "name": "LinkedOrderCancelled",
    "type": "event",
    "inputs": [
      {
        "type": "uint128",
        "name": "cancelledOrderId",
        "indexed": true
      },
      {
        "type": "uint128",
        "name": "triggeredOrderId",
        "indexed": true
      },
      {
        "type": "address",
        "name": "owner",
        "indexed": true
      },
      {
        "type": "uint256",
        "name": "somiCredited"
      }
    ]
  },
  {
    "name": "InertOrderCancelled",
    "type": "event",
    "inputs": [
      {
        "type": "uint128",
        "name": "orderId",
        "indexed": true
      },
      {
        "type": "address",
        "name": "owner",
        "indexed": true
      },
      {
        "type": "uint256",
        "name": "somiCredited"
      }
    ]
  }
] as const;
export const factoryReadAbi = [
  {
    "name": "getPerpPools",
    "type": "function",
    "stateMutability": "view",
    "inputs": [],
    "outputs": [
      {
        "type": "address[]"
      }
    ]
  },
  {
    "name": "perpPoolCount",
    "type": "function",
    "stateMutability": "view",
    "inputs": [],
    "outputs": [
      {
        "type": "uint256"
      }
    ]
  },
  {
    "name": "getBaseTokenForPool",
    "type": "function",
    "stateMutability": "view",
    "inputs": [
      {
        "type": "address",
        "name": "perpPool"
      }
    ],
    "outputs": [
      {
        "type": "address"
      }
    ]
  },
  {
    "name": "getPoolForBaseToken",
    "type": "function",
    "stateMutability": "view",
    "inputs": [
      {
        "type": "address",
        "name": "baseToken"
      }
    ],
    "outputs": [
      {
        "type": "address"
      }
    ]
  },
  {
    "name": "isDeployedByFactory",
    "type": "function",
    "stateMutability": "view",
    "inputs": [
      {
        "type": "address",
        "name": "perpPool"
      }
    ],
    "outputs": [
      {
        "type": "bool"
      }
    ]
  },
  {
    "name": "supportsInterface",
    "type": "function",
    "stateMutability": "view",
    "inputs": [
      {
        "type": "bytes4",
        "name": "interfaceId"
      }
    ],
    "outputs": [
      {
        "type": "bool"
      }
    ]
  },
  {
    "name": "getPerpPoolStatuses",
    "type": "function",
    "stateMutability": "view",
    "inputs": [],
    "outputs": [
      {
        "type": "tuple[]",
        "name": "statuses",
        "components": [
          {
            "type": "address",
            "name": "perpPool"
          },
          {
            "type": "address",
            "name": "baseToken"
          },
          {
            "type": "bool",
            "name": "restricted"
          }
        ]
      }
    ]
  },
  {
    "name": "getUnrestrictedPerpPools",
    "type": "function",
    "stateMutability": "view",
    "inputs": [],
    "outputs": [
      {
        "type": "address[]",
        "name": "perpPools"
      }
    ]
  },
  {
    "name": "getRestrictedPerpPools",
    "type": "function",
    "stateMutability": "view",
    "inputs": [],
    "outputs": [
      {
        "type": "address[]",
        "name": "perpPools"
      }
    ]
  },
  {
    "name": "getStopOrderRegistry",
    "type": "function",
    "stateMutability": "view",
    "inputs": [
      {
        "type": "address",
        "name": "perpPool"
      }
    ],
    "outputs": [
      {
        "type": "address",
        "name": "stopOrderRegistry"
      }
    ]
  }
] as const;
export const tokenReadAbi = [
  {
    "name": "decimals",
    "type": "function",
    "stateMutability": "view",
    "inputs": [],
    "outputs": [
      {
        "type": "uint8"
      }
    ]
  },
  {
    "name": "balanceOf",
    "type": "function",
    "stateMutability": "view",
    "inputs": [
      {
        "type": "address",
        "name": "account"
      }
    ],
    "outputs": [
      {
        "type": "uint256"
      }
    ]
  },
  {
    "name": "symbol",
    "type": "function",
    "stateMutability": "view",
    "inputs": [],
    "outputs": [
      {
        "type": "string"
      }
    ]
  },
  {
    "name": "name",
    "type": "function",
    "stateMutability": "view",
    "inputs": [],
    "outputs": [
      {
        "type": "string"
      }
    ]
  },
  {
    "name": "allowance",
    "type": "function",
    "stateMutability": "view",
    "inputs": [
      {
        "type": "address",
        "name": "owner"
      },
      {
        "type": "address",
        "name": "spender"
      }
    ],
    "outputs": [
      {
        "type": "uint256"
      }
    ]
  }
] as const;
export const operatorReadAbi = [
  {
    "name": "isOperatorAuthorized",
    "type": "function",
    "stateMutability": "view",
    "inputs": [
      {
        "type": "address",
        "name": "owner"
      },
      {
        "type": "address",
        "name": "operator"
      },
      {
        "type": "bytes4",
        "name": "selector"
      }
    ],
    "outputs": [
      {
        "type": "bool"
      }
    ]
  }
] as const;
