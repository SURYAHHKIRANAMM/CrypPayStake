import { useEffect, useState, useCallback } from "react";
import { ethers } from "ethers";
import toast from "react-hot-toast";
import { useContract } from "../hooks/useContract";
import { useBalance } from "../hooks/useBalance";

export default function UserDashboard({ account, signer, provider }) {
  const {
    fetchUserStakes,
    fetchClaimable,
    fetchPlans,
    fetchStats,
    fetchTVLValue,
    fetchTokenPrice,
    fetchTotalDistributed,
    fetchUserStakeCount,
    fetchEmergencyMode,
    claimTokens,
    withdrawTokens,
    emergencyWithdrawTokens,
  } = useContract(signer, provider);

  const balance = useBalance(account, provider);

  const [stakes, setStakes] = useState([]);
  const [plans, setPlans] = useState([]);
  const [claimables, setClaimables] = useState([]);
  const [stats, setStats] = useState({
    totalStaked: "0",
    totalStakers: "0",
    maxTVL: "0",
  });
  const [loading, setLoading] = useState(false);
  const [loadingIndex, setLoadingIndex] = useState(null);
  const [activeSection, setActiveSection] = useState("active");
  const [tokenPrice, setTokenPrice] = useState("0");
  const [tvlUSD, setTvlUSD] = useState("0");
  const [totalDistributed, setTotalDistributed] = useState("0");
  const [userStakeCount, setUserStakeCount] = useState("0");
  const [emergencyMode, setEmergencyMode] = useState(false);

  const fmtDate = useCallback((ts) => {
    return new Date(Number(ts) * 1000).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }, []);

  const isUnlocked = useCallback((stake) => {
    return Date.now() / 1000 >= Number(stake.unlockTime);
  }, []);

  // Load all data
  const loadData = useCallback(async () => {
    if (!account) {
      setStakes([]);
      setPlans([]);
      setClaimables([]);
      setStats({ totalStaked: "0", totalStakers: "0", maxTVL: "0" });
      setTokenPrice("0");
      setTvlUSD("0");
      setTotalDistributed("0");
      setUserStakeCount("0");
      setEmergencyMode(false);
      return;
    }

    try {
      const [
        stakeData,
        planData,
        statData,
        price,
        tvl,
        distributed,
        stakeCount,
        isEmergency,
      ] = await Promise.all([
        fetchUserStakes(account),
        fetchPlans(),
        fetchStats(),
        fetchTokenPrice(),
        fetchTVLValue(),
        fetchTotalDistributed(),
        fetchUserStakeCount(account),
        fetchEmergencyMode(),
      ]);

      setStakes(stakeData);
      setPlans(planData);
      setStats(statData);
      setTokenPrice(price);
      setTvlUSD(tvl);
      setTotalDistributed(distributed);
      setUserStakeCount(stakeCount);
      setEmergencyMode(isEmergency);

      const rewards = await Promise.all(
        stakeData.map((_, i) => fetchClaimable(account, i))
      );
      setClaimables(rewards);
    } catch (err) {
      console.error("Dashboard load error:", err);
    }
  }, [
    account,
    fetchUserStakes,
    fetchClaimable,
    fetchPlans,
    fetchStats,
    fetchTVLValue,
    fetchTokenPrice,
    fetchTotalDistributed,
    fetchUserStakeCount,
    fetchEmergencyMode,
  ]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Auto refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      loadData();
    }, 30000);

    return () => clearInterval(interval);
  }, [loadData]);

  // BSCScan TX link helper
  function txToast(hash) {
    toast.dismiss();
    toast.success(
      <a
        href={"https://testnet.bscscan.com/tx/" + hash}
        target="_blank"
        rel="noopener noreferrer"
        className="underline text-blue-400"
      >
        ✅ View Transaction
      </a>
    );
  }

  // Generic transaction runner
  async function runTx(fn, index, loadingMsg, errorMsg) {
    try {
      setLoading(true);
      setLoadingIndex(index);
      toast.loading(loadingMsg);

      const tx = await fn();

      if (tx?.wait) {
        await tx.wait();
      }

      txToast(tx.hash);
      await loadData();
    } catch (err) {
      toast.dismiss();
      console.error(err);
      toast.error(err?.reason || err?.shortMessage || errorMsg);
    } finally {
      setLoading(false);
      setLoadingIndex(null);
    }
  }

  const handleClaim = (index) =>
    runTx(() => claimTokens(index), index, "Claiming...", "Claim failed ❌");

  const handleWithdraw = (index) =>
    runTx(
      () => withdrawTokens(index),
      index,
      "Withdrawing...",
      "Withdraw failed ❌"
    );

  const handleEmergency = (index) => {
    if (
      !window.confirm(
        "Are you sure you want to emergency withdraw? Penalty may apply!"
      )
    ) {
      return;
    }

    runTx(
      () => emergencyWithdrawTokens(index),
      index,
      "Emergency Withdrawing...",
      "Emergency withdraw failed ❌"
    );
  };

  // Portfolio calculations
  const totalUserStaked = stakes.reduce(
    (sum, s) => sum + Number(ethers.formatUnits(s.amount || 0, 18)),
    0
  );

  const totalUserClaimed = stakes.reduce(
    (sum, s) => sum + Number(ethers.formatUnits(s.claimed || 0, 18)),
    0
  );

  const totalUserRemaining = totalUserStaked - totalUserClaimed;

  const totalClaimableNow = claimables.reduce(
    (sum, c) => sum + Number(c || 0),
    0
  );

  const trueActive = stakes.filter((s) => {
    if (s.withdrawn) return false;

    const staked = Number(ethers.formatUnits(s.amount || 0, 18));
    const claimed = Number(ethers.formatUnits(s.claimed || 0, 18));

    return staked > 0 && claimed < staked;
  });

  const completedStakes = stakes.filter((s) => {
    if (s.withdrawn) return true;

    const staked = Number(ethers.formatUnits(s.amount || 0, 18));
    const claimed = Number(ethers.formatUnits(s.claimed || 0, 18));

    return staked > 0 && claimed >= staked;
  });

  if (!account) {
    return (
      <div className="text-center mt-20 text-yellow-400 text-lg">
        🔒 Please connect your wallet to view Dashboard
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-yellow-400">📊 Dashboard</h1>
        <button
          onClick={loadData}
          className="text-sm bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded transition"
        >
          🔄 Refresh
        </button>
      </div>

      {/* ─── PORTFOLIO SUMMARY ─── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 text-center">
          <p className="text-gray-400 text-xs mb-1">Wallet Balance</p>
          <p className="text-yellow-400 font-bold text-lg">
            {Number(balance).toLocaleString()}
          </p>
          <p className="text-gray-500 text-xs">tCRP</p>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 text-center">
          <p className="text-gray-400 text-xs mb-1">Total Staked</p>
          <p className="text-white font-bold text-lg">
            {totalUserStaked.toLocaleString()}
          </p>
          <p className="text-gray-500 text-xs">CRP</p>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 text-center">
          <p className="text-gray-400 text-xs mb-1">Total Claimed</p>
          <p className="text-green-400 font-bold text-lg">
            {totalUserClaimed.toLocaleString()}
          </p>
          <p className="text-gray-500 text-xs">CRP</p>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 text-center">
          <p className="text-gray-400 text-xs mb-1">Claimable Now</p>
          <p className="text-yellow-400 font-bold text-lg">
            {totalClaimableNow.toLocaleString()}
          </p>
          <p className="text-gray-500 text-xs">CRP</p>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 text-center">
          <p className="text-gray-400 text-xs mb-1">Your Stakes</p>
          <p className="text-white font-bold text-lg">{userStakeCount}</p>
          <p className="text-gray-500 text-xs">Total</p>
        </div>
      </div>

      {/* ─── PLATFORM STATS ─── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-gray-800 border border-yellow-500/20 rounded-xl p-4 text-center">
          <p className="text-gray-400 text-xs mb-1">Platform Total Staked</p>
          <p className="text-yellow-400 font-bold">
            {Number(stats.totalStaked).toLocaleString()} CRP
          </p>
        </div>

        <div className="bg-gray-800 border border-yellow-500/20 rounded-xl p-4 text-center">
          <p className="text-gray-400 text-xs mb-1">CRP Token Price</p>
          <p className="text-yellow-400 font-bold">
            ${Number(tokenPrice) > 0 ? Number(tokenPrice).toFixed(6) : "N/A"}
          </p>
        </div>

        <div className="bg-gray-800 border border-yellow-500/20 rounded-xl p-4 text-center">
          <p className="text-gray-400 text-xs mb-1">TVL (USD)</p>
          <p className="text-yellow-400 font-bold">
            ${Number(tvlUSD) > 0 ? Number(tvlUSD).toLocaleString() : "N/A"}
          </p>
        </div>

        <div className="bg-gray-800 border border-yellow-500/20 rounded-xl p-4 text-center">
          <p className="text-gray-400 text-xs mb-1">Total Distributed</p>
          <p className="text-green-400 font-bold">
            {Number(totalDistributed).toLocaleString()} CRP
          </p>
        </div>
      </div>

      {/* ─── OVERVIEW BAR ─── */}
      <div className="flex items-center justify-between bg-gray-800 border border-gray-700 rounded-xl p-4 mb-8">
        <div className="flex gap-6 text-sm">
          <span className="text-gray-400">
            Active:{" "}
            <span className="text-white font-bold">{trueActive.length}</span>
          </span>
          <span className="text-gray-400">
            Claimed/Withdraw:{" "}
            <span className="text-yellow-400 font-bold">
              {completedStakes.length}
            </span>
          </span>
          <span className="text-gray-400">
            Remaining:{" "}
            <span className="text-blue-400 font-bold">
              {totalUserRemaining.toLocaleString()} CRP
            </span>
          </span>
        </div>
      </div>

      {/* ─── SECTION TABS ─── */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={() => setActiveSection("active")}
          className={`px-4 py-2 rounded-full text-sm font-semibold transition ${
            activeSection === "active"
              ? "bg-yellow-500 text-black"
              : "bg-gray-800 text-gray-400 hover:text-yellow-400"
          }`}
        >
          Active Stakes ({trueActive.length})
        </button>
        <button
          onClick={() => setActiveSection("completed")}
          className={`px-4 py-2 rounded-full text-sm font-semibold transition ${
            activeSection === "completed"
              ? "bg-yellow-500 text-black"
              : "bg-gray-800 text-gray-400 hover:text-yellow-400"
          }`}
        >
          Claimed / Withdraw ({completedStakes.length})
        </button>
        <button
          onClick={() => setActiveSection("history")}
          className={`px-4 py-2 rounded-full text-sm font-semibold transition ${
            activeSection === "history"
              ? "bg-yellow-500 text-black"
              : "bg-gray-800 text-gray-400 hover:text-yellow-400"
          }`}
        >
          History ({stakes.length})
        </button>
      </div>

      {/* ─── ACTIVE STAKES ─── */}
      {activeSection === "active" && (
        <>
          {trueActive.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <p className="text-5xl mb-4">📭</p>
              <p className="text-lg">No active stakes found</p>
              <p className="text-sm mt-2">
                Go to Stake tab to create your first stake
              </p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              {stakes.map((stake, i) => {
                if (stake.withdrawn) return null;

                const stakedAmtCheck = Number(
                  ethers.formatUnits(stake.amount || 0, 18)
                );
                const claimedAmtCheck = Number(
                  ethers.formatUnits(stake.claimed || 0, 18)
                );

                if (stakedAmtCheck > 0 && claimedAmtCheck >= stakedAmtCheck) {
                  return null;
                }

                const planId = Number(stake.planId);
                const plan = plans[planId];
                const planName = plan ? plan.name : `Plan #${planId}`;
                const releasePercent = plan ? Number(plan.releasePercent) : 0;
                const stakedAmt = Number(
                  ethers.formatUnits(stake.amount || 0, 18)
                );
                const claimedAmt = Number(
                  ethers.formatUnits(stake.claimed || 0, 18)
                );
                const remainingAmt = stakedAmt - claimedAmt;
                const monthlyReturn = (stakedAmt * releasePercent) / 100;
                const progressPercent =
                  stakedAmt > 0 ? (claimedAmt / stakedAmt) * 100 : 0;

                return (
                  <div
                    key={i}
                    className="bg-gray-800 border border-gray-700 rounded-xl p-6"
                  >
                    {/* Stake Header */}
                    <div className="flex justify-between items-center mb-4">
                      <div>
                        <h3 className="text-yellow-400 font-bold text-sm">
                          {planName}
                        </h3>
                        <p className="text-gray-500 text-xs mt-0.5">
                          Stake #{i + 1}
                        </p>
                      </div>
                      <span
                        className={`text-xs px-2 py-1 rounded-full font-semibold ${
                          progressPercent >= 100
                            ? "bg-yellow-900 text-yellow-400"
                            : isUnlocked(stake)
                            ? "bg-green-900 text-green-400"
                            : "bg-blue-900 text-blue-400"
                        }`}
                      >
                        {progressPercent >= 100
                          ? "Claimed ✅"
                          : isUnlocked(stake)
                          ? "Unlocked 🔓"
                          : "Locked 🔒"}
                      </span>
                    </div>

                    {/* Stake Details */}
                    <div className="space-y-2 text-sm mb-4">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Staked Amount</span>
                        <span className="text-white font-semibold">
                          {stakedAmt.toLocaleString()} CRP
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Monthly Return</span>
                        <span className="text-green-400 font-semibold">
                          {monthlyReturn.toLocaleString()} CRP
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Already Claimed</span>
                        <span className="text-green-400">
                          {claimedAmt.toLocaleString()} CRP
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Remaining</span>
                        <span className="text-blue-400">
                          {remainingAmt.toLocaleString()} CRP
                        </span>
                      </div>
                      <div className="flex justify-between border-t border-gray-700 pt-2 mt-2">
                        <span className="text-gray-400">Claimable Now</span>
                        <span className="text-yellow-400 font-bold">
                          {Number(claimables[i] || 0).toLocaleString()} CRP
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Start Date</span>
                        <span className="text-gray-300">
                          {fmtDate(stake.startTime)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Unlock Date</span>
                        <span className="text-gray-300">
                          {fmtDate(stake.unlockTime)}
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-4">
                      <div className="flex justify-between text-xs text-gray-400 mb-1">
                        <span>Progress</span>
                        <span>{progressPercent.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-yellow-500 to-orange-500 h-2 rounded-full transition-all"
                          style={{ width: `${Math.min(progressPercent, 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 flex-wrap">
                      {!emergencyMode && (
                        <button
                          disabled={loading || Number(claimables[i] || 0) <= 0}
                          onClick={() => handleClaim(i)}
                          className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 disabled:opacity-50 px-3 py-2.5 rounded-full text-white font-bold text-sm transition"
                        >
                          {loadingIndex === i && loading ? "..." : "Claim"}
                        </button>
                      )}

                      {emergencyMode && (
                        <>
                          <button
                            disabled={loading}
                            onClick={() => handleWithdraw(i)}
                            className="flex-1 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 disabled:opacity-50 px-3 py-2.5 rounded-full text-black font-bold text-sm transition"
                          >
                            {loadingIndex === i && loading
                              ? "..."
                              : "Withdraw"}
                          </button>

                          <button
                            disabled={loading}
                            onClick={() => handleEmergency(i)}
                            className="bg-red-600 hover:bg-red-500 disabled:opacity-50 px-3 py-2.5 rounded-full text-white font-bold text-sm transition"
                            title="Emergency Withdraw"
                          >
                            🚨
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ─── CLAIMED / WITHDRAW ─── */}
      {activeSection === "completed" && (
        <>
          {completedStakes.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <p className="text-5xl mb-4">✅</p>
              <p className="text-lg">No completed stakes yet</p>
              <p className="text-sm mt-2">
                Fully claimed or withdrawn stakes will appear here
              </p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              {stakes.map((stake, i) => {
                if (stake.withdrawn) {
                  // Show withdrawn stakes
                } else {
                  const staked = Number(
                    ethers.formatUnits(stake.amount || 0, 18)
                  );
                  const claimed = Number(
                    ethers.formatUnits(stake.claimed || 0, 18)
                  );
                  if (staked <= 0 || claimed < staked) return null;
                }

                const planId = Number(stake.planId);
                const plan = plans[planId];
                const planName = plan ? plan.name : `Plan #${planId}`;
                const releasePercent = plan ? Number(plan.releasePercent) : 0;
                const stakedAmt = Number(
                  ethers.formatUnits(stake.amount || 0, 18)
                );
                const claimedAmt = Number(
                  ethers.formatUnits(stake.claimed || 0, 18)
                );
                const remainingAmt = stakedAmt - claimedAmt;
                const monthlyReturn = (stakedAmt * releasePercent) / 100;
                const progressPercent =
                  stakedAmt > 0 ? (claimedAmt / stakedAmt) * 100 : 0;
                const isWithdrawn = stake.withdrawn;

                return (
                  <div
                    key={i}
                    className={`bg-gray-800 border ${
                      isWithdrawn
                        ? "border-gray-600"
                        : "border-yellow-500/30"
                    } rounded-xl p-6 ${isWithdrawn ? "opacity-60" : ""}`}
                  >
                    <div className="flex justify-between items-center mb-4">
                      <div>
                        <h3 className="text-yellow-400 font-bold text-sm">
                          {planName}
                        </h3>
                        <p className="text-gray-500 text-xs mt-0.5">
                          Stake #{i + 1}
                        </p>
                      </div>
                      <span
                        className={`text-xs px-2 py-1 rounded-full font-semibold ${
                          isWithdrawn
                            ? "bg-gray-700 text-gray-400"
                            : "bg-yellow-900 text-yellow-400"
                        }`}
                      >
                        {isWithdrawn ? "Withdrawn ✅" : "Claimed ✅"}
                      </span>
                    </div>

                    <div className="space-y-2 text-sm mb-4">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Staked Amount</span>
                        <span className="text-white font-semibold">
                          {stakedAmt.toLocaleString()} CRP
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Monthly Return</span>
                        <span className="text-green-400 font-semibold">
                          {monthlyReturn.toLocaleString()} CRP
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Already Claimed</span>
                        <span className="text-green-400">
                          {claimedAmt.toLocaleString()} CRP
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Remaining</span>
                        <span className="text-blue-400">
                          {remainingAmt.toLocaleString()} CRP
                        </span>
                      </div>
                      <div className="flex justify-between border-t border-gray-700 pt-2 mt-2">
                        <span className="text-gray-400">Start Date</span>
                        <span className="text-gray-300">
                          {fmtDate(stake.startTime)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Unlock Date</span>
                        <span className="text-gray-300">
                          {fmtDate(stake.unlockTime)}
                        </span>
                      </div>
                      {Number(stake.lastClaimTime) > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-400">Last Claim</span>
                          <span className="text-gray-300">
                            {fmtDate(stake.lastClaimTime)}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="mb-4">
                      <div className="flex justify-between text-xs text-gray-400 mb-1">
                        <span>Progress</span>
                        <span>{progressPercent.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            isWithdrawn
                              ? "bg-gray-500"
                              : "bg-gradient-to-r from-yellow-500 to-green-500"
                          }`}
                          style={{ width: `${Math.min(progressPercent, 100)}%` }}
                        />
                      </div>
                    </div>

                    {!isWithdrawn && isUnlocked(stake) && (
                      <button
                        disabled={loading}
                        onClick={() => handleWithdraw(i)}
                        className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 disabled:opacity-50 px-3 py-2.5 rounded-full text-black font-bold text-sm transition"
                      >
                        {loadingIndex === i && loading ? "..." : "Withdraw"}
                      </button>
                    )}

                    {!isWithdrawn && !isUnlocked(stake) && (
                      <p className="text-gray-500 text-xs text-center">
                        Waiting for unlock date to withdraw
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ─── HISTORY ─── */}
      {activeSection === "history" && (
        <>
          {stakes.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <p className="text-5xl mb-4">📋</p>
              <p className="text-lg">No transaction records found</p>
              <p className="text-sm mt-2">
                Your stake, claim and withdraw records will appear here
              </p>
            </div>
          ) : (
            <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
              <div className="grid grid-cols-9 gap-2 px-5 py-3 bg-gray-900 text-gray-400 text-xs font-semibold border-b border-gray-700">
                <span>Sr.No</span>
                <span>Plan</span>
                <span>Staked</span>
                <span>Claimed</span>
                <span>Start</span>
                <span>Last Claim</span>
                <span>Unlock</span>
                <span>Status</span>
                <span className="text-right">BscScan</span>
              </div>

              {stakes.map((stake, i) => {
                const planId = Number(stake.planId);
                const plan = plans[planId];
                const planName = plan ? plan.name : `Plan #${planId}`;
                const stakedAmt = Number(
                  ethers.formatUnits(stake.amount || 0, 18)
                );
                const claimedAmt = Number(
                  ethers.formatUnits(stake.claimed || 0, 18)
                );
                const isWithdrawn = stake.withdrawn;
                const unlocked = isUnlocked(stake);
                const progressPercent =
                  stakedAmt > 0 ? (claimedAmt / stakedAmt) * 100 : 0;

                return (
                  <div
                    key={i}
                    className={`grid grid-cols-9 gap-2 px-5 py-4 text-sm border-b border-gray-700/50 items-center ${
                      isWithdrawn ? "opacity-50" : ""
                    }`}
                  >
                    <span className="text-gray-500 text-xs">{i + 1}</span>
                    <span
                      className="text-yellow-400 font-semibold text-xs truncate"
                      title={planName}
                    >
                      {planName}
                    </span>
                    <span className="text-white font-semibold text-xs">
                      {stakedAmt.toLocaleString()} CRP
                    </span>
                    <div>
                      <span className="text-green-400 text-xs block">
                        {claimedAmt.toLocaleString()} CRP
                      </span>
                      <span className="text-gray-500 text-xs">
                        {progressPercent.toFixed(1)}%
                      </span>
                    </div>
                    <span className="text-gray-300 text-xs">
                      {fmtDate(stake.startTime)}
                    </span>
                    <span className="text-gray-300 text-xs">
                      {Number(stake.lastClaimTime) > 0
                        ? fmtDate(stake.lastClaimTime)
                        : "—"}
                    </span>
                    <span className="text-gray-300 text-xs">
                      {fmtDate(stake.unlockTime)}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-semibold inline-block w-fit ${
                        isWithdrawn
                          ? "bg-gray-700 text-gray-400"
                          : progressPercent >= 100
                          ? "bg-yellow-900 text-yellow-400"
                          : unlocked
                          ? "bg-green-900 text-green-400"
                          : "bg-blue-900 text-blue-400"
                      }`}
                    >
                      {isWithdrawn
                        ? "Withdrawn"
                        : progressPercent >= 100
                        ? "Claimed"
                        : unlocked
                        ? "Unlocked"
                        : "Locked"}
                    </span>
                    <a
                      href={`https://testnet.bscscan.com/address/${account}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-400 hover:underline text-right"
                    >
                      View 🔗
                    </a>
                  </div>
                );
              })}

              <div className="grid grid-cols-9 gap-2 px-5 py-3 bg-gray-900 text-xs font-bold border-t border-gray-700">
                <span className="text-gray-400">Total</span>
                <span className="text-gray-400">{stakes.length} stakes</span>
                <span className="text-white">
                  {totalUserStaked.toLocaleString()}
                </span>
                <span className="text-green-400">
                  {totalUserClaimed.toLocaleString()}
                </span>
                <span></span>
                <span></span>
                <span></span>
                <span className="text-yellow-400">
                  {trueActive.length} active
                </span>
                <span></span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}