import { ethers } from "ethers";
import {
  CONTRACT_ADDRESS,
  ABI,
  TOKEN_ADDRESS,
  TOKEN_ABI
} from "../contract/config";

export function useContract(signer, provider) {

  const stakingReader = provider
    ? new ethers.Contract(CONTRACT_ADDRESS, ABI, provider)
    : null;

  const stakingContract = signer
    ? new ethers.Contract(CONTRACT_ADDRESS, ABI, signer)
    : null;

  const tokenContract = signer
    ? new ethers.Contract(TOKEN_ADDRESS, TOKEN_ABI, signer)
    : null;

  // ─── READ FUNCTIONS ────────────────────────────────

  // Fetch All Plans
  async function fetchPlans() {
    if (!stakingReader) return [];
    return await stakingReader.getAllPlans();
  }

  // Fetch User Stakes
  async function fetchUserStakes(userAddress) {
    if (!stakingReader) return [];
    return await stakingReader.getUserAllStakes(userAddress);
  }

  // Fetch Claimable Amount
  async function fetchClaimable(userAddress, index) {
    if (!stakingReader) return "0";
    const amount = await stakingReader.claimable(userAddress, index);
    return ethers.formatEther(amount);
  }

  // Platform Stats
  async function fetchStats() {
    if (!stakingReader) return { totalStaked: "0", totalStakers: "0", maxTVL: "0" };

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
  }

  // TVL Value in USD
  async function fetchTVLValue() {
    if (!stakingReader) return "0";
    try {
      const tvl = await stakingReader.getTVLValue();
      return ethers.formatUnits(tvl, 18);
    } catch {
      return "0";
    }
  }

  // Token Price (Chainlink/TWAP)
  async function fetchTokenPrice() {
    if (!stakingReader) return "0";
    try {
      const price = await stakingReader.getSafeTokenPrice();
      return ethers.formatUnits(price, 8);
    } catch {
      return "0";
    }
  }

  // Total Released/Distributed
  async function fetchTotalDistributed() {
    if (!stakingReader) return "0";
    try {
      const total = await stakingReader.totalReleasedDistributed();
      return ethers.formatEther(total);
    } catch {
      return "0";
    }
  }

  // Total Global Withdrawn
  async function fetchTotalWithdrawn() {
    if (!stakingReader) return "0";
    try {
      const total = await stakingReader.totalGlobalWithdrawn();
      return ethers.formatEther(total);
    } catch {
      return "0";
    }
  }

  // User Stake Count
  async function fetchUserStakeCount(userAddress) {
    if (!stakingReader) return "0";
    try {
      const count = await stakingReader.userStakeCount(userAddress);
      return count.toString();
    } catch {
      return "0";
    }
  }

  // Total Staked in Specific Plan
  async function fetchTotalStakedInPlan(planId) {
    if (!stakingReader) return "0";
    try {
      const total = await stakingReader.totalStakedInPlan(planId);
      return ethers.formatEther(total);
    } catch {
      return "0";
    }
  }

  // Projected Total Release for a plan + amount
  async function fetchProjectedRelease(planId, amount) {
    if (!stakingReader) return "0";
    try {
      const projected = await stakingReader.projectedTotalRelease(planId, ethers.parseEther(amount.toString()));
      return ethers.formatEther(projected);
    } catch {
      return "0";
    }
  }

  // Plan Paused Status
  async function fetchPlanPaused(planId) {
    if (!stakingReader) return false;
    try {
      return await stakingReader.planPaused(planId);
    } catch {
      return false;
    }
  }

  // Plan Emergency Status
  async function fetchPlanEmergency(planId) {
    if (!stakingReader) return false;
    try {
      return await stakingReader.planEmergency(planId);
    } catch {
      return false;
    }
  }

  // Emergency Mode Status
  async function fetchEmergencyMode() {
    if (!stakingReader) return false;
    try {
      return await stakingReader.emergencyMode();
    } catch {
      return false;
    }
  }

  // Has User Staked Before
  async function fetchHasStakedBefore(userAddress) {
    if (!stakingReader) return false;
    try {
      return await stakingReader.hasStakedBefore(userAddress);
    } catch {
      return false;
    }
  }

  // Fetch Live USD to INR Rate
  async function fetchUSDtoINR() {
    try {
      const response = await fetch("https://api.exchangerate-api.com/v4/latest/USD");
      const data = await response.json();
      return data.rates?.INR || 83.5;
    } catch {
      return 83.5;
    }
  }

  // Get Contract Owner
  async function fetchOwner() {
    if (!stakingReader) return "";
    try {
      return await stakingReader.owner();
    } catch {
      return "";
    }
  }

  // Get Pair Address
  async function fetchPairAddress() {
    if (!stakingReader) return "";
    try {
      return await stakingReader.pairAddress();
    } catch {
      return "";
    }
  }

  // Get Price Feed Address
  async function fetchPriceFeedAddress() {
    if (!stakingReader) return "";
    try {
      return await stakingReader.priceFeed();
    } catch {
      return "";
    }
  }

  // Get Protocol Paused Status
  async function fetchPaused() {
    if (!stakingReader) return false;
    try {
      return await stakingReader.paused();
    } catch {
      return false;
    }
  }

  // Get TWAP Price
  async function fetchTWAPPrice() {
    if (!stakingReader) return "0";
    try {
      const price = await stakingReader.getTWAPPrice();
      return ethers.formatUnits(price, 8);
    } catch {
      return "0";
    }
  }

  // Get CrypPay Token Address
  async function fetchCrypPayToken() {
    if (!stakingReader) return "";
    try {
      return await stakingReader.crypPayToken();
    } catch {
      return "";
    }
  }

  // Transfer Ownership
  async function transferOwnership(newOwner) {
    if (!stakingContract) throw new Error("Wallet not connected");
    const tx = await stakingContract.transferOwnership(newOwner, {
      gasLimit: 100000n
    });
    await tx.wait();
    return tx;
  }

  // Fetch Contract Events via BSCScan API
  async function fetchContractEvents() {
    try {
      const apiUrl = `https://api-testnet.bscscan.com/api?module=logs&action=getLogs&address=${CONTRACT_ADDRESS}&fromBlock=0&toBlock=latest&apikey=YourApiKeyToken`;

      const response = await fetch(apiUrl);
      const data = await response.json();

      if (data.status !== "1" || !data.result) return [];

      const eventABI = [
        "event UserStaked(address indexed user, uint256 indexed planId, string planName, uint256 amount, uint256 unlockTime)",
        "event UserClaimed(address indexed user, uint256 indexed stakeIndex, uint256 amount, uint256 totalClaimed, uint256 remaining)",
        "event UserWithdrawn(address indexed user, uint256 indexed planId, uint256 principalReleased, uint256 totalClaimed, uint256 unlockTime)",
        "event EmergencyWithdrawn(address indexed user, uint256 indexed planId, uint256 amount, uint256 penalty)"
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
  }

  // ─── WRITE FUNCTIONS ───────────────────────────────

  // ✅ Approve Tokens — alag function
  async function approveTokens(amount) {
    if (!tokenContract) throw new Error("Wallet not connected");
    const amountWei = ethers.parseEther(amount.toString());
    const tx = await tokenContract.approve(CONTRACT_ADDRESS, amountWei, {
      gasLimit: 100000n
    });
    return tx;
  }

  // ✅ Stake Tokens — sirf stake, approve nahi
  async function stakeTokens(planId, amount) {
    if (!stakingContract) throw new Error("Wallet not connected");
    const amountWei = ethers.parseEther(amount.toString());
    const tx = await stakingContract.stake(planId, amountWei, {
      gasLimit: 500000n
    });
    return tx;
  }

  // Claim
  async function claimTokens(index) {
    if (!stakingContract) throw new Error("Wallet not connected");
    const tx = await stakingContract.claim(index, {
      gasLimit: 300000n
    });
    await tx.wait();
    return tx;
  }

  // Withdraw
  async function withdrawTokens(index) {
    if (!stakingContract) throw new Error("Wallet not connected");
    const tx = await stakingContract.withdraw(index, {
      gasLimit: 300000n
    });
    await tx.wait();
    return tx;
  }

  // Emergency Withdraw
  async function emergencyWithdrawTokens(index) {
    if (!stakingContract) throw new Error("Wallet not connected");
    const tx = await stakingContract.emergencyWithdraw(index, {
      gasLimit: 400000n
    });
    await tx.wait();
    return tx;
  }

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