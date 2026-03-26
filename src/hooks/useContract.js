import { useCallback, useMemo } from "react";
import { ethers } from "ethers";
import {
  CONTRACT_ADDRESS,
  ABI,
  TOKEN_ADDRESS,
  TOKEN_ABI,
  PAIR_ABI,
  ORACLE_ABI,
  ERC20_METADATA_ABI,
  RPC_URL,
  EVENTS_LOOKBACK_BLOCKS,
  EVENTS_CHUNK_SIZE,
} from "../contract/config";

function scaleTo1e18(amount, decimals) {
  const value = BigInt(amount.toString());

  if (decimals === 18) return value;
  if (decimals < 18) return value * 10n ** BigInt(18 - decimals);

  return value / 10n ** BigInt(decimals - 18);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toNumber(value) {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return value;
  const str = String(value);
  if (!str) return 0;
  return str.startsWith("0x") ? parseInt(str, 16) : Number(str);
}

export function useContract(signer) {
  const readProvider = useMemo(() => {
  return new ethers.JsonRpcProvider(RPC_URL);
}, []);

  const stakingReader = useMemo(() => {
    return readProvider
      ? new ethers.Contract(CONTRACT_ADDRESS, ABI, readProvider)
      : null;
  }, [readProvider]);

  const stakingContract = useMemo(() => {
    return signer ? new ethers.Contract(CONTRACT_ADDRESS, ABI, signer) : null;
  }, [signer]);

  const tokenContract = useMemo(() => {
    return signer
      ? new ethers.Contract(TOKEN_ADDRESS, TOKEN_ABI, signer)
      : null;
  }, [signer]);

  // ─── READ FUNCTIONS ────────────────────────────────

  const fetchPlans = useCallback(async () => {
    if (!stakingReader) return [];
    try {
      return await stakingReader.getAllPlans();
    } catch (err) {
      console.error("fetchPlans error:", err);
      return [];
    }
  }, [stakingReader]);

  const fetchUserStakes = useCallback(
    async (userAddress) => {
      if (!stakingReader || !userAddress) return [];
      try {
        return await stakingReader.getUserAllStakes(userAddress);
      } catch (err) {
        console.error("fetchUserStakes error:", err);
        return [];
      }
    },
    [stakingReader]
  );

  const fetchClaimable = useCallback(
    async (userAddress, index) => {
      if (!stakingReader || !userAddress) return "0";
      try {
        const amount = await stakingReader.claimable(userAddress, index);
        return ethers.formatEther(amount);
      } catch (err) {
        console.error("fetchClaimable error:", err);
        return "0";
      }
    },
    [stakingReader]
  );

  const fetchStats = useCallback(async () => {
    if (!stakingReader) {
      return { totalStaked: "0", totalStakers: "0", maxTVL: "0" };
    }

    try {
      const [totalStaked, totalStakers, maxTVL] = await Promise.all([
        stakingReader.totalStaked(),
        stakingReader.totalUniqueStakers(),
        stakingReader.maxTVL(),
      ]);

      return {
        totalStaked: ethers.formatEther(totalStaked),
        totalStakers: totalStakers.toString(),
        maxTVL: ethers.formatEther(maxTVL),
      };
    } catch (err) {
      console.error("fetchStats error:", err);
      return { totalStaked: "0", totalStakers: "0", maxTVL: "0" };
    }
  }, [stakingReader]);

  const fetchTokenPrice = useCallback(async () => {
    if (!stakingReader || !readProvider) return "0";

    try {
      const price = await stakingReader.getSafeTokenPrice();
      return ethers.formatUnits(price, 8);
    } catch {
      try {
        const [pairAddr, feedAddr, crpAddr] = await Promise.all([
          stakingReader.pairAddress(),
          stakingReader.priceFeed(),
          stakingReader.crypPayToken(),
        ]);

        if (
          !pairAddr ||
          !feedAddr ||
          !crpAddr ||
          pairAddr === ethers.ZeroAddress ||
          feedAddr === ethers.ZeroAddress ||
          crpAddr === ethers.ZeroAddress
        ) {
          return "0";
        }

        const pair = new ethers.Contract(pairAddr, PAIR_ABI, readProvider);
        const oracle = new ethers.Contract(feedAddr, ORACLE_ABI, readProvider);

        const [reserveData, token0, token1, oracleDecimalsRaw, roundData] =
          await Promise.all([
            pair.getReserves(),
            pair.token0(),
            pair.token1(),
            oracle.decimals(),
            oracle.latestRoundData(),
          ]);

        const reserve0 = reserveData[0];
        const reserve1 = reserveData[1];

        const quoteUsdPrice = roundData[1];
        if (quoteUsdPrice <= 0n) return "0";

        const token0Meta = new ethers.Contract(
          token0,
          ERC20_METADATA_ABI,
          readProvider
        );
        const token1Meta = new ethers.Contract(
          token1,
          ERC20_METADATA_ABI,
          readProvider
        );

        const [d0Raw, d1Raw] = await Promise.all([
          token0Meta.decimals(),
          token1Meta.decimals(),
        ]);

        const d0 = Number(d0Raw);
        const d1 = Number(d1Raw);
        const oracleDecimals = Number(oracleDecimalsRaw);

        const r0 = scaleTo1e18(reserve0, d0);
        const r1 = scaleTo1e18(reserve1, d1);

        let pairPriceInQuote = 0n;

        if (token0.toLowerCase() === crpAddr.toLowerCase()) {
          if (r0 === 0n) return "0";
          pairPriceInQuote = (r1 * 10n ** 18n) / r0;
        } else if (token1.toLowerCase() === crpAddr.toLowerCase()) {
          if (r1 === 0n) return "0";
          pairPriceInQuote = (r0 * 10n ** 18n) / r1;
        } else {
          return "0";
        }

        const tokenUsdScaled =
          (pairPriceInQuote * BigInt(quoteUsdPrice.toString())) / 10n ** 18n;

        return ethers.formatUnits(tokenUsdScaled, oracleDecimals);
      } catch (fallbackErr) {
        console.error("Token price fallback error:", fallbackErr);
        return "0";
      }
    }
  }, [stakingReader, readProvider]);

  const fetchTVLValue = useCallback(async () => {
    if (!stakingReader) return "0";

    try {
      const tvl = await stakingReader.getTVLValue();
      return ethers.formatUnits(tvl, 18);
    } catch {
      try {
        const [totalStakedRaw, priceStr] = await Promise.all([
          stakingReader.totalStaked(),
          fetchTokenPrice(),
        ]);

        const totalStakedNum = Number(ethers.formatEther(totalStakedRaw));
        const priceNum = Number(priceStr);

        if (!totalStakedNum || !priceNum) return "0";

        return (totalStakedNum * priceNum).toString();
      } catch (err) {
        console.error("TVL fallback error:", err);
        return "0";
      }
    }
  }, [stakingReader, fetchTokenPrice]);

  const fetchTotalDistributed = useCallback(async () => {
    if (!stakingReader) return "0";
    try {
      const total = await stakingReader.totalReleasedDistributed();
      return ethers.formatEther(total);
    } catch (err) {
      console.error("fetchTotalDistributed error:", err);
      return "0";
    }
  }, [stakingReader]);

  const fetchTotalWithdrawn = useCallback(async () => {
    if (!stakingReader) return "0";
    try {
      const total = await stakingReader.totalGlobalWithdrawn();
      return ethers.formatEther(total);
    } catch (err) {
      console.error("fetchTotalWithdrawn error:", err);
      return "0";
    }
  }, [stakingReader]);

  const fetchUserStakeCount = useCallback(
    async (userAddress) => {
      if (!stakingReader || !userAddress) return "0";
      try {
        const count = await stakingReader.userStakeCount(userAddress);
        return count.toString();
      } catch (err) {
        console.error("fetchUserStakeCount error:", err);
        return "0";
      }
    },
    [stakingReader]
  );

  const fetchTotalStakedInPlan = useCallback(
    async (planId) => {
      if (!stakingReader) return "0";
      try {
        const total = await stakingReader.totalStakedInPlan(planId);
        return ethers.formatEther(total);
      } catch (err) {
        console.error("fetchTotalStakedInPlan error:", err);
        return "0";
      }
    },
    [stakingReader]
  );

  const fetchProjectedRelease = useCallback(
    async (planId, amount) => {
      if (!stakingReader) return "0";
      try {
        const projected = await stakingReader.projectedTotalRelease(
          planId,
          ethers.parseEther(amount.toString())
        );
        return ethers.formatEther(projected);
      } catch (err) {
        console.error("fetchProjectedRelease error:", err);
        return "0";
      }
    },
    [stakingReader]
  );

  const fetchPlanPaused = useCallback(
    async (planId) => {
      if (!stakingReader) return false;
      try {
        return await stakingReader.planPaused(planId);
      } catch (err) {
        console.error("fetchPlanPaused error:", err);
        return false;
      }
    },
    [stakingReader]
  );

  const fetchPlanEmergency = useCallback(
    async (planId) => {
      if (!stakingReader) return false;
      try {
        return await stakingReader.planEmergency(planId);
      } catch (err) {
        console.error("fetchPlanEmergency error:", err);
        return false;
      }
    },
    [stakingReader]
  );

  const fetchPlanClaimPaused = useCallback(
    async (planId) => {
      if (!stakingReader) return false;
      try {
        return await stakingReader.planClaimPaused(planId);
      } catch (err) {
        console.error("fetchPlanClaimPaused error:", err);
        return false;
      }
    },
    [stakingReader]
  );

  const fetchPlanEmergencyWithdrawPaused = useCallback(
    async (planId) => {
      if (!stakingReader) return false;
      try {
        return await stakingReader.planEmergencyWithdrawPaused(planId);
      } catch (err) {
        console.error("fetchPlanEmergencyWithdrawPaused error:", err);
        return false;
      }
    },
    [stakingReader]
  );

  const fetchEmergencyMode = useCallback(async () => {
    if (!stakingReader) return false;
    try {
      return await stakingReader.emergencyMode();
    } catch (err) {
      console.error("fetchEmergencyMode error:", err);
      return false;
    }
  }, [stakingReader]);

  const fetchHasStakedBefore = useCallback(
    async (userAddress) => {
      if (!stakingReader || !userAddress) return false;
      try {
        return await stakingReader.hasStakedBefore(userAddress);
      } catch (err) {
        console.error("fetchHasStakedBefore error:", err);
        return false;
      }
    },
    [stakingReader]
  );

  const fetchUSDtoINR = useCallback(async () => {
    try {
      const response = await fetch(
        "https://api.exchangerate-api.com/v4/latest/USD"
      );
      const data = await response.json();
      return data.rates?.INR || 83.5;
    } catch {
      return 83.5;
    }
  }, []);

  const fetchOwner = useCallback(async () => {
    if (!stakingReader) return "";
    try {
      return await stakingReader.owner();
    } catch (err) {
      console.error("fetchOwner error:", err);
      return "";
    }
  }, [stakingReader]);

  const fetchPairAddress = useCallback(async () => {
    if (!stakingReader) return "";
    try {
      return await stakingReader.pairAddress();
    } catch (err) {
      console.error("fetchPairAddress error:", err);
      return "";
    }
  }, [stakingReader]);

  const fetchPriceFeedAddress = useCallback(async () => {
    if (!stakingReader) return "";
    try {
      return await stakingReader.priceFeed();
    } catch (err) {
      console.error("fetchPriceFeedAddress error:", err);
      return "";
    }
  }, [stakingReader]);

  const fetchPaused = useCallback(async () => {
    if (!stakingReader) return false;
    try {
      return await stakingReader.paused();
    } catch (err) {
      console.error("fetchPaused error:", err);
      return false;
    }
  }, [stakingReader]);

  const fetchTWAPPrice = useCallback(async () => {
    if (!stakingReader) return "0";
    try {
      const price = await stakingReader.getTWAPPrice();
      return ethers.formatUnits(price, 18);
    } catch (err) {
      console.error("fetchTWAPPrice error:", err);
      return "0";
    }
  }, [stakingReader]);

  const fetchCrypPayToken = useCallback(async () => {
    if (!stakingReader) return "";
    try {
      return await stakingReader.crypPayToken();
    } catch (err) {
      console.error("fetchCrypPayToken error:", err);
      return "";
    }
  }, [stakingReader]);

  const transferOwnership = useCallback(
    async (newOwner) => {
      if (!stakingContract) throw new Error("Wallet not connected");
      const tx = await stakingContract.transferOwnership(newOwner, {
        gasLimit: 100000n,
      });
      await tx.wait();
      return tx;
    },
    [stakingContract]
  );

  const fetchContractEvents = useCallback(
    async (userAddress) => {
      if (!stakingReader || !readProvider) return [];

      const filterAddress =
        userAddress && ethers.isAddress(userAddress) ? userAddress : null;

      const iface = new ethers.Interface([
        "event UserStaked(address indexed user, uint256 indexed planId, string planName, uint256 amount, uint256 unlockTime)",
        "event UserClaimed(address indexed user, uint256 indexed stakeIndex, uint256 amount, uint256 totalClaimed, uint256 remaining)",
        "event UserWithdrawn(address indexed user, uint256 indexed planId, uint256 principalReleased, uint256 totalClaimed, uint256 unlockTime)",
        "event EmergencyWithdrawn(address indexed user, uint256 indexed planId, uint256 amount, uint256 penalty)",
      ]);

      const eventMeta = [
        {
          name: "UserStaked",
          type: "Stake",
        },
        {
          name: "UserClaimed",
          type: "Claim",
        },
        {
          name: "UserWithdrawn",
          type: "Withdraw",
        },
        {
          name: "EmergencyWithdrawn",
          type: "Emergency",
        },
      ];

      const getApiBase = () => {
        const rpc = String(RPC_URL || "").toLowerCase();
        if (
          rpc.includes("testnet") ||
          rpc.includes("prebsc") ||
          rpc.includes("chapel")
        ) {
          return "https://api-testnet.bscscan.com/api";
        }
        return "https://api.bscscan.com/api";
      };

      const parseEventFromLog = async (log, parsedName) => {
        try {
          const parsed = iface.parseLog({
            topics: log.topics,
            data: log.data,
          });

          if (!parsed) return null;

          const blockNumber = toNumber(log.blockNumber);
          const timestamp =
            toNumber(log.timeStamp) ||
            toNumber(log.timestamp) ||
            0;

          if (parsedName === "UserStaked") {
            return {
              type: "Stake",
              user: parsed.args?.user ?? parsed.args?.[0] ?? "",
              planId: Number(parsed.args?.planId ?? parsed.args?.[1] ?? 0),
              stakeIndex: null,
              planName: parsed.args?.planName ?? parsed.args?.[2] ?? "",
              amount: ethers.formatEther(
                parsed.args?.amount ?? parsed.args?.[3] ?? 0
              ),
              txHash: log.transactionHash || "",
              blockNumber,
              logIndex: toNumber(log.logIndex),
              timestamp,
            };
          }

          if (parsedName === "UserClaimed") {
            return {
              type: "Claim",
              user: parsed.args?.user ?? parsed.args?.[0] ?? "",
              planId: null,
              stakeIndex: Number(
                parsed.args?.stakeIndex ?? parsed.args?.[1] ?? 0
              ),
              planName: "",
              amount: ethers.formatEther(
                parsed.args?.amount ?? parsed.args?.[2] ?? 0
              ),
              txHash: log.transactionHash || "",
              blockNumber,
              logIndex: toNumber(log.logIndex),
              timestamp,
            };
          }

          if (parsedName === "UserWithdrawn") {
            return {
              type: "Withdraw",
              user: parsed.args?.user ?? parsed.args?.[0] ?? "",
              planId: Number(parsed.args?.planId ?? parsed.args?.[1] ?? 0),
              stakeIndex: null,
              planName: "",
              amount: ethers.formatEther(
                parsed.args?.principalReleased ?? parsed.args?.[2] ?? 0
              ),
              txHash: log.transactionHash || "",
              blockNumber,
              logIndex: toNumber(log.logIndex),
              timestamp,
            };
          }

          if (parsedName === "EmergencyWithdrawn") {
            return {
              type: "Emergency",
              user: parsed.args?.user ?? parsed.args?.[0] ?? "",
              planId: Number(parsed.args?.planId ?? parsed.args?.[1] ?? 0),
              stakeIndex: null,
              planName: "",
              amount: ethers.formatEther(
                parsed.args?.amount ?? parsed.args?.[2] ?? 0
              ),
              txHash: log.transactionHash || "",
              blockNumber,
              logIndex: toNumber(log.logIndex),
              timestamp,
            };
          }

          return null;
        } catch {
          return null;
        }
      };

      try {
        const latestBlock = await readProvider.getBlockNumber();

        const chunkSize = Math.min(
          Math.max(Number(EVENTS_CHUNK_SIZE) || 5000, 1000),
          5000
        );

        const lookbackBlocks = Math.min(
          Math.max(Number(EVENTS_LOOKBACK_BLOCKS) || 180000, chunkSize),
          500000
        );

        const startBlock = Math.max(0, latestBlock - lookbackBlocks);
        const apiBase = getApiBase();
        const apiKey = import.meta.env.VITE_BSCSCAN_API_KEY || "";
        const userTopic = filterAddress
          ? ethers.zeroPadValue(filterAddress, 32).toLowerCase()
          : null;

        const allEvents = [];

        for (const meta of eventMeta) {
          const eventFragment = iface.getEvent(meta.name);
          const topic0 = eventFragment.topicHash;

          for (
            let fromBlock = startBlock;
            fromBlock <= latestBlock;
            fromBlock += chunkSize + 1
          ) {
            const toBlock = Math.min(fromBlock + chunkSize, latestBlock);

            try {
              const params = new URLSearchParams({
                module: "logs",
                action: "getLogs",
                fromBlock: String(fromBlock),
                toBlock: String(toBlock),
                address: CONTRACT_ADDRESS,
                topic0,
              });

              if (userTopic) {
                params.set("topic0_1_opr", "and");
                params.set("topic1", userTopic);
              }

              if (apiKey) {
                params.set("apikey", apiKey);
              }

              const res = await fetch(`${apiBase}?${params.toString()}`);
              const data = await res.json();

              const logs =
                Array.isArray(data?.result) ? data.result : [];

              for (const log of logs) {
                const parsedEvent = await parseEventFromLog(log, meta.name);
                if (parsedEvent) {
                  allEvents.push(parsedEvent);
                }
              }
            } catch (apiErr) {
              console.error(
                `BscScan logs fetch failed for ${meta.name} ${fromBlock}-${toBlock}:`,
                apiErr
              );
            }

            if (fromBlock + chunkSize < latestBlock) {
              await sleep(180);
            }
          }

          await sleep(250);
        }

        if (allEvents.length > 0) {
          allEvents.sort((a, b) => {
            if (b.blockNumber !== a.blockNumber) {
              return b.blockNumber - a.blockNumber;
            }
            return b.logIndex - a.logIndex;
          });

          return allEvents;
        }

        // ─── Fallback: on-chain queryFilter ─────────────────────────────
        const blockCache = new Map();

        const getBlockTimestamp = async (blockNumber) => {
          if (blockCache.has(blockNumber)) {
            return blockCache.get(blockNumber);
          }

          try {
            const block = await readProvider.getBlock(blockNumber);
            const ts = block?.timestamp ? Number(block.timestamp) : 0;
            blockCache.set(blockNumber, ts);
            return ts;
          } catch {
            return 0;
          }
        };

        const collectLogs = async (filter) => {
          const logs = [];

          for (
            let fromBlock = startBlock;
            fromBlock <= latestBlock;
            fromBlock += chunkSize + 1
          ) {
            const toBlock = Math.min(fromBlock + chunkSize, latestBlock);

            try {
              const part = await stakingReader.queryFilter(
                filter,
                fromBlock,
                toBlock
              );
              logs.push(...part);
            } catch (chunkErr) {
              console.error(
                `queryFilter failed for blocks ${fromBlock}-${toBlock}:`,
                chunkErr
              );
            }

            if (fromBlock + chunkSize < latestBlock) {
              await sleep(180);
            }
          }

          return logs;
        };

        const stakedLogs = await collectLogs(
          stakingReader.filters.UserStaked(filterAddress)
        );
        await sleep(250);

        const claimedLogs = await collectLogs(
          stakingReader.filters.UserClaimed(filterAddress)
        );
        await sleep(250);

        const withdrawnLogs = await collectLogs(
          stakingReader.filters.UserWithdrawn(filterAddress)
        );
        await sleep(250);

        const emergencyLogs = await collectLogs(
          stakingReader.filters.EmergencyWithdrawn(filterAddress)
        );

        const fallbackEvents = [];

        for (const log of stakedLogs) {
          fallbackEvents.push({
            type: "Stake",
            user: log.args?.user ?? log.args?.[0] ?? "",
            planId: Number(log.args?.planId ?? log.args?.[1] ?? 0),
            stakeIndex: null,
            planName: log.args?.planName ?? log.args?.[2] ?? "",
            amount: ethers.formatEther(
              log.args?.amount ?? log.args?.[3] ?? 0
            ),
            txHash:
              log.transactionHash ||
              log.hash ||
              log.log?.transactionHash ||
              "",
            blockNumber: Number(log.blockNumber || 0),
            logIndex: Number(log.logIndex ?? log.index ?? 0),
            timestamp: await getBlockTimestamp(Number(log.blockNumber || 0)),
          });
        }

        for (const log of claimedLogs) {
          fallbackEvents.push({
            type: "Claim",
            user: log.args?.user ?? log.args?.[0] ?? "",
            planId: null,
            stakeIndex: Number(log.args?.stakeIndex ?? log.args?.[1] ?? 0),
            planName: "",
            amount: ethers.formatEther(
              log.args?.amount ?? log.args?.[2] ?? 0
            ),
            txHash:
              log.transactionHash ||
              log.hash ||
              log.log?.transactionHash ||
              "",
            blockNumber: Number(log.blockNumber || 0),
            logIndex: Number(log.logIndex ?? log.index ?? 0),
            timestamp: await getBlockTimestamp(Number(log.blockNumber || 0)),
          });
        }

        for (const log of withdrawnLogs) {
          fallbackEvents.push({
            type: "Withdraw",
            user: log.args?.user ?? log.args?.[0] ?? "",
            planId: Number(log.args?.planId ?? log.args?.[1] ?? 0),
            stakeIndex: null,
            planName: "",
            amount: ethers.formatEther(
              log.args?.principalReleased ?? log.args?.[2] ?? 0
            ),
            txHash:
              log.transactionHash ||
              log.hash ||
              log.log?.transactionHash ||
              "",
            blockNumber: Number(log.blockNumber || 0),
            logIndex: Number(log.logIndex ?? log.index ?? 0),
            timestamp: await getBlockTimestamp(Number(log.blockNumber || 0)),
          });
        }

        for (const log of emergencyLogs) {
          fallbackEvents.push({
            type: "Emergency",
            user: log.args?.user ?? log.args?.[0] ?? "",
            planId: Number(log.args?.planId ?? log.args?.[1] ?? 0),
            stakeIndex: null,
            planName: "",
            amount: ethers.formatEther(
              log.args?.amount ?? log.args?.[2] ?? 0
            ),
            txHash:
              log.transactionHash ||
              log.hash ||
              log.log?.transactionHash ||
              "",
            blockNumber: Number(log.blockNumber || 0),
            logIndex: Number(log.logIndex ?? log.index ?? 0),
            timestamp: await getBlockTimestamp(Number(log.blockNumber || 0)),
          });
        }

        fallbackEvents.sort((a, b) => {
          if (b.blockNumber !== a.blockNumber) {
            return b.blockNumber - a.blockNumber;
          }
          return b.logIndex - a.logIndex;
        });

        return fallbackEvents;
      } catch (err) {
        console.error("fetchContractEvents error:", err);
        return [];
      }
    },
    [stakingReader, readProvider]
  );

  // ─── WRITE FUNCTIONS ───────────────────────────────

  const approveTokens = useCallback(
    async (amount) => {
      if (!tokenContract) throw new Error("Wallet not connected");
      const amountWei = ethers.parseEther(amount.toString());
      const tx = await tokenContract.approve(CONTRACT_ADDRESS, amountWei, {
        gasLimit: 100000n,
      });
      return tx;
    },
    [tokenContract]
  );

  const stakeTokens = useCallback(
    async (planId, amount) => {
      if (!stakingContract) throw new Error("Wallet not connected");
      const amountWei = ethers.parseEther(amount.toString());
      const tx = await stakingContract.stake(planId, amountWei, {
        gasLimit: 500000n,
      });
      return tx;
    },
    [stakingContract]
  );

  const claimTokens = useCallback(
    async (index) => {
      if (!stakingContract) throw new Error("Wallet not connected");
      const tx = await stakingContract.claim(index, {
        gasLimit: 300000n,
      });
      await tx.wait();
      return tx;
    },
    [stakingContract]
  );

  const withdrawTokens = useCallback(
    async (index) => {
      if (!stakingContract) throw new Error("Wallet not connected");
      const tx = await stakingContract.withdraw(index, {
        gasLimit: 300000n,
      });
      await tx.wait();
      return tx;
    },
    [stakingContract]
  );

  const emergencyWithdrawTokens = useCallback(
    async (index) => {
      if (!stakingContract) throw new Error("Wallet not connected");
      const tx = await stakingContract.emergencyWithdraw(index, {
        gasLimit: 400000n,
      });
      await tx.wait();
      return tx;
    },
    [stakingContract]
  );

  return {
    // Read functions
    fetchPlans,
    fetchUserStakes,
    fetchClaimable,
    fetchStats,
    fetchTVLValue,
    fetchTokenPrice,
    fetchTotalDistributed,
    fetchTotalWithdrawn,
    fetchUserStakeCount,
    fetchTotalStakedInPlan,
    fetchProjectedRelease,
    fetchPlanPaused,
    fetchPlanEmergency,
    fetchEmergencyMode,
    fetchPlanClaimPaused,
    fetchPlanEmergencyWithdrawPaused,
    fetchHasStakedBefore,
    fetchUSDtoINR,
    fetchOwner,
    fetchPairAddress,
    fetchPriceFeedAddress,
    fetchPaused,
    fetchTWAPPrice,
    fetchCrypPayToken,
    transferOwnership,
    fetchContractEvents,

    // Write functions
    approveTokens,
    stakeTokens,
    claimTokens,
    withdrawTokens,
    emergencyWithdrawTokens,
  };
}