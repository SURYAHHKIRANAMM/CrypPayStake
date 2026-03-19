import { useCallback, useMemo } from "react";
import { ethers } from "ethers";
import {
  CONTRACT_ADDRESS,
  ABI,
  TOKEN_ADDRESS,
  TOKEN_ABI,
} from "../contract/config";

export function useContract(signer, provider) {
  const stakingReader = useMemo(() => {
    return provider ? new ethers.Contract(CONTRACT_ADDRESS, ABI, provider) : null;
  }, [provider]);

  const stakingContract = useMemo(() => {
    return signer ? new ethers.Contract(CONTRACT_ADDRESS, ABI, signer) : null;
  }, [signer]);

  const tokenContract = useMemo(() => {
    return signer ? new ethers.Contract(TOKEN_ADDRESS, TOKEN_ABI, signer) : null;
  }, [signer]);

  // ─── READ FUNCTIONS ────────────────────────────────

  const fetchPlans = useCallback(async () => {
    if (!stakingReader) return [];
    return await stakingReader.getAllPlans();
  }, [stakingReader]);

  const fetchUserStakes = useCallback(
    async (userAddress) => {
      if (!stakingReader) return [];
      return await stakingReader.getUserAllStakes(userAddress);
    },
    [stakingReader]
  );

  const fetchClaimable = useCallback(
    async (userAddress, index) => {
      if (!stakingReader) return "0";
      const amount = await stakingReader.claimable(userAddress, index);
      return ethers.formatEther(amount);
    },
    [stakingReader]
  );

  const fetchStats = useCallback(async () => {
    if (!stakingReader) {
      return { totalStaked: "0", totalStakers: "0", maxTVL: "0" };
    }

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
  }, [stakingReader]);

  const fetchTVLValue = useCallback(async () => {
    if (!stakingReader) return "0";
    try {
      const tvl = await stakingReader.getTVLValue();
      return ethers.formatUnits(tvl, 18);
    } catch {
      return "0";
    }
  }, [stakingReader]);

  const fetchTokenPrice = useCallback(async () => {
    if (!stakingReader) return "0";
    try {
      const price = await stakingReader.getSafeTokenPrice();
      return ethers.formatUnits(price, 8);
    } catch {
      return "0";
    }
  }, [stakingReader]);

  const fetchTotalDistributed = useCallback(async () => {
    if (!stakingReader) return "0";
    try {
      const total = await stakingReader.totalReleasedDistributed();
      return ethers.formatEther(total);
    } catch {
      return "0";
    }
  }, [stakingReader]);

  const fetchTotalWithdrawn = useCallback(async () => {
    if (!stakingReader) return "0";
    try {
      const total = await stakingReader.totalGlobalWithdrawn();
      return ethers.formatEther(total);
    } catch {
      return "0";
    }
  }, [stakingReader]);

  const fetchUserStakeCount = useCallback(
    async (userAddress) => {
      if (!stakingReader) return "0";
      try {
        const count = await stakingReader.userStakeCount(userAddress);
        return count.toString();
      } catch {
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
      } catch {
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
      } catch {
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
      } catch {
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
      } catch {
        return false;
      }
    },
    [stakingReader]
  );

  const fetchEmergencyMode = useCallback(async () => {
    if (!stakingReader) return false;
    try {
      return await stakingReader.emergencyMode();
    } catch {
      return false;
    }
  }, [stakingReader]);

  const fetchHasStakedBefore = useCallback(
    async (userAddress) => {
      if (!stakingReader) return false;
      try {
        return await stakingReader.hasStakedBefore(userAddress);
      } catch {
        return false;
      }
    },
    [stakingReader]
  );

  const fetchUSDtoINR = useCallback(async () => {
    try {
      const response = await fetch("https://api.exchangerate-api.com/v4/latest/USD");
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
    } catch {
      return "";
    }
  }, [stakingReader]);

  const fetchPairAddress = useCallback(async () => {
    if (!stakingReader) return "";
    try {
      return await stakingReader.pairAddress();
    } catch {
      return "";
    }
  }, [stakingReader]);

  const fetchPriceFeedAddress = useCallback(async () => {
    if (!stakingReader) return "";
    try {
      return await stakingReader.priceFeed();
    } catch {
      return "";
    }
  }, [stakingReader]);

  const fetchPaused = useCallback(async () => {
    if (!stakingReader) return false;
    try {
      return await stakingReader.paused();
    } catch {
      return false;
    }
  }, [stakingReader]);

  const fetchTWAPPrice = useCallback(async () => {
    if (!stakingReader) return "0";
    try {
      const price = await stakingReader.getTWAPPrice();
      return ethers.formatUnits(price, 8);
    } catch {
      return "0";
    }
  }, [stakingReader]);

  const fetchCrypPayToken = useCallback(async () => {
    if (!stakingReader) return "";
    try {
      return await stakingReader.crypPayToken();
    } catch {
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

  const fetchContractEvents = useCallback(async () => {
    try {
      const apiUrl = `https://api-testnet.bscscan.com/api?module=logs&action=getLogs&address=${CONTRACT_ADDRESS}&fromBlock=0&toBlock=latest&apikey=YourApiKeyToken`;

      const response = await fetch(apiUrl);
      const data = await response.json();

      if (data.status !== "1" || !data.result) return [];

      const eventABI = [
        "event UserStaked(address indexed user, uint256 indexed planId, string planName, uint256 amount, uint256 unlockTime)",
        "event UserClaimed(address indexed user, uint256 indexed stakeIndex, uint256 amount, uint256 totalClaimed, uint256 remaining)",
        "event UserWithdrawn(address indexed user, uint256 indexed planId, uint256 principalReleased, uint256 totalClaimed, uint256 unlockTime)",
        "event EmergencyWithdrawn(address indexed user, uint256 indexed planId, uint256 amount, uint256 penalty)",
      ];

      const iface = new ethers.Interface(eventABI);
      const allEvents = [];

      for (const log of data.result) {
        try {
          const parsed = iface.parseLog({ topics: log.topics, data: log.data });
          if (!parsed) continue;

          let type = "";
          let amount = "0";
          let user = "";

          if (parsed.name === "UserStaked") {
            type = "Stake";
            user = parsed.args[0];
            amount = ethers.formatEther(parsed.args[3]);
          } else if (parsed.name === "UserClaimed") {
            type = "Claim";
            user = parsed.args[0];
            amount = ethers.formatEther(parsed.args[2]);
          } else if (parsed.name === "UserWithdrawn") {
            type = "Withdraw";
            user = parsed.args[0];
            amount = ethers.formatEther(parsed.args[2]);
          } else if (parsed.name === "EmergencyWithdrawn") {
            type = "Emergency";
            user = parsed.args[0];
            amount = ethers.formatEther(parsed.args[2]);
          } else {
            continue;
          }

          allEvents.push({
            type,
            user,
            amount,
            txHash: log.transactionHash,
            blockNumber: parseInt(log.blockNumber, 16),
            planName: parsed.name === "UserStaked" ? parsed.args[2] : "",
            timestamp: parseInt(log.timeStamp, 16),
          });
        } catch {
          continue;
        }
      }

      allEvents.sort((a, b) => b.blockNumber - a.blockNumber);
      return allEvents;
    } catch (err) {
      console.error("Event fetch error:", err);
      return [];
    }
  }, []);

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