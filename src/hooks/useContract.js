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

  // ✅ Approve Tokens — alag function
  async function approveTokens(amount) {
    if (!tokenContract) throw new Error("Wallet not connected");
    const amountWei = ethers.parseEther(amount.toString());
    const tx = await tokenContract.approve(CONTRACT_ADDRESS, amountWei);
    return tx;
  }

  // ✅ Stake Tokens — sirf stake, approve nahi
  async function stakeTokens(planId, amount) {
    if (!stakingContract) throw new Error("Wallet not connected");
    const amountWei = ethers.parseEther(amount.toString());
    const tx = await stakingContract.stake(planId, amountWei);
    return tx;
  }

  // Claim
  async function claimTokens(index) {
    if (!stakingContract) throw new Error("Wallet not connected");
    const tx = await stakingContract.claim(index);
    await tx.wait();
    return tx;
  }

  // Withdraw
  async function withdrawTokens(index) {
    if (!stakingContract) throw new Error("Wallet not connected");
    const tx = await stakingContract.withdraw(index);
    await tx.wait();
    return tx;
  }

  // Emergency Withdraw
  async function emergencyWithdrawTokens(index) {
    if (!stakingContract) throw new Error("Wallet not connected");
    const tx = await stakingContract.emergencyWithdraw(index);
    await tx.wait();
    return tx;
  }

  return {
    fetchPlans,
    fetchUserStakes,
    fetchClaimable,
    fetchStats,
    approveTokens,
    stakeTokens,
    claimTokens,
    withdrawTokens,
    emergencyWithdrawTokens,
  };
}