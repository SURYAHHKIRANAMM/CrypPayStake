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
    claimTokens,
    withdrawTokens,
    emergencyWithdrawTokens,
  } = useContract(signer, provider);

  const balance = useBalance(account, provider);

  const [stakes, setStakes] = useState([]);
  const [plans, setPlans] = useState([]);
  const [claimables, setClaimables] = useState([]);
  const [stats, setStats] = useState({ totalStaked: "0", totalStakers: "0", maxTVL: "0" });
  const [loading, setLoading] = useState(false);
  const [loadingIndex, setLoadingIndex] = useState(null);
  const [activeSection, setActiveSection] = useState("active");
  const [tokenPrice, setTokenPrice] = useState("0");
  const [tvlUSD, setTvlUSD] = useState("0");
  const [totalDistributed, setTotalDistributed] = useState("0");
  const [userStakeCount, setUserStakeCount] = useState("0");

  // Load all data
  const loadData = useCallback(async () => {
    if (!account) return;
    try {
      const [stakeData, planData, statData, price, tvl, distributed, stakeCount] = await Promise.all([
        fetchUserStakes(account),
        fetchPlans(),
        fetchStats(),
        fetchTokenPrice(),
        fetchTVLValue(),
        fetchTotalDistributed(),
        fetchUserStakeCount(account),
      ]);
      setStakes(stakeData);
      setPlans(planData);
      setStats(statData);
      setTokenPrice(price);
      setTvlUSD(tvl);
      setTotalDistributed(distributed);
      setUserStakeCount(stakeCount);

      const rewards = await Promise.all(
        stakeData.map((_, i) => fetchClaimable(account, i))
      );
      setClaimables(rewards);
    } catch (err) {
      console.error("Dashboard load error:", err);
    }
  }, [account]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Auto refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  // BSCScan TX link helper
  function txToast(hash) {
    toast.dismiss();
    toast.success(
      <a href={"https://testnet.bscscan.com/tx/" + hash} target="_blank" rel="noopener noreferrer"
        className="underline text-blue-400">
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
      await tx.wait();
      txToast(tx.hash);
      await loadData();
    } catch (err) {
      toast.dismiss();
      console.error(err);
      toast.error(err?.reason || errorMsg);
    } finally {
      setLoading(false);
      setLoadingIndex(null);
    }
  }

  const handleClaim = (index) =>
    runTx(() => claimTokens(index), index, "Claiming...", "Claim failed ❌");

  const handleWithdraw = (index) =>
    runTx(() => withdrawTokens(index), index, "Withdrawing...", "Withdraw failed ❌");

  const handleEmergency = (index) => {
    if (!window.confirm("Are you sure you want to emergency withdraw? Penalty may apply!")) return;
    runTx(() => emergencyWithdrawTokens(index), index, "Emergency Withdrawing...", "Emergency withdraw failed ❌");
  };

  // Format helpers
  const fmt = (val) => Number(ethers.formatUnits(val || 0, 18)).toLocaleString();
  const fmtDate = (ts) => new Date(Number(ts) * 1000).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric"
  });
  const isUnlocked = (stake) => Date.now() / 1000 >= Number(stake.unlockTime);

  // Portfolio calculations
  const totalUserStaked = stakes.reduce((sum, s) => sum + Number(ethers.formatUnits(s.amount || 0, 18)), 0);
  const totalUserClaimed = stakes.reduce((sum, s) => sum + Number(ethers.formatUnits(s.claimed || 0, 18)), 0);
  const totalUserRemaining = totalUserStaked - totalUserClaimed;
  const totalClaimableNow = claimables.reduce((sum, c) => sum + Number(c || 0), 0);
  const activeStakes = stakes.filter(s => !s.withdrawn);
  const closedStakes = stakes.filter(s => s.withdrawn);

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
          <p className="text-white font-bold text-lg">
            {userStakeCount}
          </p>
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
          <span className="text-gray-400">Active Stakes: <span className="text-white font-bold">{activeStakes.length}</span></span>
          <span className="text-gray-400">Closed: <span className="text-white font-bold">{closedStakes.length}</span></span>
          <span className="text-gray-400">Remaining: <span className="text-blue-400 font-bold">{totalUserRemaining.toLocaleString()} CRP</span></span>
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
          Active Stakes ({activeStakes.length})
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
          {activeStakes.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <p className="text-5xl mb-4">📭</p>
              <p className="text-lg">No active stakes found</p>
              <p className="text-sm mt-2">Go to the Stake tab and create your first stake</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              {stakes.map((stake, i) => {

                if (stake.withdrawn) return null;

                const planId = Number(stake.planId);
                const plan = plans[planId];
                const planName = plan ? plan.name : `Plan #${planId}`;
                const releasePercent = plan ? Number(plan.releasePercent) : 0;
                const stakedAmt = Number(ethers.formatUnits(stake.amount || 0, 18));
                const claimedAmt = Number(ethers.formatUnits(stake.claimed || 0, 18));
                const remainingAmt = stakedAmt - claimedAmt;
                const monthlyReturn = stakedAmt * releasePercent / 100;
                const progressPercent = stakedAmt > 0 ? (claimedAmt / stakedAmt) * 100 : 0;

                return (
                  <div key={i} className="bg-gray-800 border border-gray-700 rounded-xl p-6">

                    {/* Stake Header */}
                    <div className="flex justify-between items-center mb-4">
                      <div>
                        <h3 className="text-yellow-400 font-bold text-sm">{planName}</h3>
                        <p className="text-gray-500 text-xs mt-0.5">Stake #{i + 1}</p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                        isUnlocked(stake)
                          ? "bg-green-900 text-green-400"
                          : "bg-blue-900 text-blue-400"
                      }`}>
                        {isUnlocked(stake) ? "Unlocked ✅" : "Locked 🔒"}
                      </span>
                    </div>

                    {/* Stake Details */}
                    <div className="space-y-2 text-sm mb-4">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Staked Amount</span>
                        <span className="text-white font-semibold">{stakedAmt.toLocaleString()} CRP</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Monthly Return</span>
                        <span className="text-green-400 font-semibold">{monthlyReturn.toLocaleString()} CRP</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Already Claimed</span>
                        <span className="text-green-400">{claimedAmt.toLocaleString()} CRP</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Remaining</span>
                        <span className="text-blue-400">{remainingAmt.toLocaleString()} CRP</span>
                      </div>
                      <div className="flex justify-between border-t border-gray-700 pt-2 mt-2">
                        <span className="text-gray-400">Claimable Now</span>
                        <span className="text-yellow-400 font-bold">
                          {Number(claimables[i] || 0).toLocaleString()} CRP
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Start Date</span>
                        <span className="text-gray-300">{fmtDate(stake.startTime)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Unlock Date</span>
                        <span className="text-gray-300">{fmtDate(stake.unlockTime)}</span>
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
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 flex-wrap">
                      <button
                        disabled={loading || Number(claimables[i] || 0) <= 0}
                        onClick={() => handleClaim(i)}
                        className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 disabled:opacity-50 px-3 py-2.5 rounded-full text-white font-bold text-sm transition"
                      >
                        {loadingIndex === i && loading ? "..." : "Claim"}
                      </button>

                      <button
                        disabled={loading || !isUnlocked(stake)}
                        onClick={() => handleWithdraw(i)}
                        className="flex-1 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 disabled:opacity-50 px-3 py-2.5 rounded-full text-black font-bold text-sm transition"
                      >
                        {loadingIndex === i && loading ? "..." : "Withdraw"}
                      </button>

                      <button
                        disabled={loading}
                        onClick={() => handleEmergency(i)}
                        className="bg-red-600 hover:bg-red-500 disabled:opacity-50 px-3 py-2.5 rounded-full text-white font-bold text-sm transition"
                        title="Emergency Withdraw"
                      >
                        🚨
                      </button>
                    </div>

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
              <p className="text-sm mt-2">Your stake, claim and withdraw records will appear here</p>
            </div>
          ) : (
            <>
              {/* History Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-gray-800 border border-gray-700 rounded-xl p-3 text-center">
                  <p className="text-gray-400 text-xs mb-1">Total Stakes</p>
                  <p className="text-white font-bold">{stakes.length}</p>
                </div>
                <div className="bg-gray-800 border border-green-500/20 rounded-xl p-3 text-center">
                  <p className="text-gray-400 text-xs mb-1">Total Staked</p>
                  <p className="text-yellow-400 font-bold">{totalUserStaked.toLocaleString()} CRP</p>
                </div>
                <div className="bg-gray-800 border border-green-500/20 rounded-xl p-3 text-center">
                  <p className="text-gray-400 text-xs mb-1">Total Claimed</p>
                  <p className="text-green-400 font-bold">{totalUserClaimed.toLocaleString()} CRP</p>
                </div>
                <div className="bg-gray-800 border border-blue-500/20 rounded-xl p-3 text-center">
                  <p className="text-gray-400 text-xs mb-1">Remaining</p>
                  <p className="text-blue-400 font-bold">{totalUserRemaining.toLocaleString()} CRP</p>
                </div>
              </div>

              {/* History Table */}
              <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">

                {/* Table Header */}
                <div className="grid grid-cols-8 gap-2 px-5 py-3 bg-gray-900 text-gray-400 text-xs font-semibold border-b border-gray-700">
                  <span>#</span>
                  <span>Plan</span>
                  <span>Staked</span>
                  <span>Claimed</span>
                  <span>Start</span>
                  <span>Unlock</span>
                  <span>Status</span>
                  <span className="text-right">BscScan</span>
                </div>

                {/* Table Rows */}
                {stakes.map((stake, i) => {

                  const planId = Number(stake.planId);
                  const plan = plans[planId];
                  const planName = plan ? plan.name : `Plan #${planId}`;
                  const stakedAmt = Number(ethers.formatUnits(stake.amount || 0, 18));
                  const claimedAmt = Number(ethers.formatUnits(stake.claimed || 0, 18));
                  const isWithdrawn = stake.withdrawn;
                  const unlocked = isUnlocked(stake);
                  const progressPercent = stakedAmt > 0 ? (claimedAmt / stakedAmt) * 100 : 0;

                  return (
                    <div
                      key={i}
                      className={`grid grid-cols-8 gap-2 px-5 py-4 text-sm border-b border-gray-700/50 items-center ${
                        isWithdrawn ? "opacity-50" : ""
                      }`}
                    >
                      <span className="text-gray-500 text-xs">{i + 1}</span>

                      <span className="text-yellow-400 font-semibold text-xs truncate" title={planName}>
                        {planName}
                      </span>

                      <span className="text-white font-semibold text-xs">
                        {stakedAmt.toLocaleString()}
                      </span>

                      <div>
                        <span className="text-green-400 text-xs block">
                          {claimedAmt.toLocaleString()}
                        </span>
                        <span className="text-gray-500 text-xs">
                          {progressPercent.toFixed(1)}%
                        </span>
                      </div>

                      <span className="text-gray-300 text-xs">
                        {fmtDate(stake.startTime)}
                      </span>

                      <span className="text-gray-300 text-xs">
                        {fmtDate(stake.unlockTime)}
                      </span>

                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold inline-block w-fit ${
                        isWithdrawn
                          ? "bg-gray-700 text-gray-400"
                          : unlocked
                          ? "bg-green-900 text-green-400"
                          : "bg-blue-900 text-blue-400"
                      }`}>
                        {isWithdrawn ? "Closed" : unlocked ? "Unlocked" : "Locked"}
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

                {/* Table Footer Summary */}
                <div className="grid grid-cols-8 gap-2 px-5 py-3 bg-gray-900 text-xs font-bold border-t border-gray-700">
                  <span className="text-gray-400">Total</span>
                  <span className="text-gray-400">{stakes.length} stakes</span>
                  <span className="text-white">{totalUserStaked.toLocaleString()}</span>
                  <span className="text-green-400">{totalUserClaimed.toLocaleString()}</span>
                  <span></span>
                  <span></span>
                  <span className="text-yellow-400">{activeStakes.length} active</span>
                  <span></span>
                </div>

              </div>
            </>
          )}
        </>
      )}

    </div>
  );
}