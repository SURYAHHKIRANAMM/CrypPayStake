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
      return ethers.formatUnits(tvl, 8);
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
    // Write functions
    approveTokens,
    stakeTokens,
    claimTokens,
    withdrawTokens,
    emergencyWithdrawTokens,
  };
}