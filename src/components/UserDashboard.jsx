import { useEffect, useState, useCallback } from "react";
import { ethers } from "ethers";
import toast from "react-hot-toast";
import { useContract } from "../hooks/useContract";

export default function UserDashboard({ account, signer, provider }) {

  const {
    fetchUserStakes,
    fetchClaimable,
    claimTokens,
    withdrawTokens,
    emergencyWithdrawTokens,
  } = useContract(signer, provider);

  const [stakes, setStakes] = useState([]);
  const [claimables, setClaimables] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingIndex, setLoadingIndex] = useState(null);

  // Load user stakes + claimable amounts
  const loadStakes = useCallback(async () => {
    if (!account) return;
    try {
      const data = await fetchUserStakes(account);
      setStakes(data);
      const rewards = await Promise.all(
        data.map((_, i) => fetchClaimable(account, i))
      );
      setClaimables(rewards);
    } catch (err) {
      console.error("Stake load error:", err);
    }
  }, [account]);

  // First load
  useEffect(() => {
    loadStakes();
  }, [loadStakes]);

  // Auto refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(loadStakes, 30000);
    return () => clearInterval(interval);
  }, [loadStakes]);

  // BSCScan TX link helper
  function txToast(hash) {
    const url = "https://testnet.bscscan.com/tx/" + hash;
    toast.success(
      <a href={url} target="_blank" rel="noopener noreferrer"
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
      const tx = await fn();
      toast.loading(loadingMsg);
      await tx.wait();
      txToast(tx.hash);
      await loadStakes();
    } catch (err) {
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

  const handleEmergency = (index) =>
    runTx(() => emergencyWithdrawTokens(index), index, "Emergency Withdrawing...", "Emergency withdraw failed ❌");

  // Format helpers
  const fmt = (val) => Number(ethers.formatUnits(val || 0, 18)).toLocaleString();
  const fmtDate = (ts) => new Date(Number(ts) * 1000).toLocaleDateString();
  const isUnlocked = (stake) => Date.now() / 1000 >= Number(stake.unlockTime);

  if (!account) {
    return (
      <div className="text-center mt-20 text-yellow-400 text-lg">
        🔒 Wallet connect karo apne stakes dekhne ke liye
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-yellow-400">📊 My Stakes</h1>
        <button
          onClick={loadStakes}
          className="text-sm bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded transition"
        >
          🔄 Refresh
        </button>
      </div>

      {/* No Stakes */}
      {stakes.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-5xl mb-4">📭</p>
          <p className="text-lg">Koi active stake nahi mila</p>
          <p className="text-sm mt-2">Stake karo aur yahan apne stakes dekhein</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {stakes.map((stake, i) => (
            <div
              key={i}
              className={`bg-gray-800 border rounded-xl p-6 ${
                stake.withdrawn
                  ? "border-gray-600 opacity-60"
                  : "border-gray-700"
              }`}
            >

              {/* Stake Header */}
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-yellow-400 font-bold text-lg">
                  Stake #{i}
                </h3>
                <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                  stake.withdrawn
                    ? "bg-gray-700 text-gray-400"
                    : isUnlocked(stake)
                    ? "bg-green-900 text-green-400"
                    : "bg-blue-900 text-blue-400"
                }`}>
                  {stake.withdrawn ? "Closed" : isUnlocked(stake) ? "Unlocked ✅" : "Locked 🔒"}
                </span>
              </div>

              {/* Stake Details */}
              <div className="space-y-2 text-sm mb-4">
                <div className="flex justify-between">
                  <span className="text-gray-400">Staked Amount</span>
                  <span className="text-white font-semibold">{fmt(stake.amount)} CRP</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Already Claimed</span>
                  <span className="text-green-400">{fmt(stake.claimed)} CRP</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Remaining</span>
                  <span className="text-blue-400">
                    {fmt(BigInt(stake.amount || 0) - BigInt(stake.claimed || 0))} CRP
                  </span>
                </div>
                <div className="flex justify-between border-t border-gray-700 pt-2 mt-2">
                  <span className="text-gray-400">Claimable Now</span>
                  <span className="text-yellow-400 font-bold">
                    {Number(claimables[i] || 0).toLocaleString()} CRP
                  </span>
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
                  <span>
                    {stake.amount > 0
                      ? ((Number(stake.claimed) / Number(stake.amount)) * 100).toFixed(1)
                      : 0}%
                  </span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-yellow-500 h-2 rounded-full transition-all"
                    style={{
                      width: stake.amount > 0
                        ? `${(Number(stake.claimed) / Number(stake.amount)) * 100}%`
                        : "0%"
                    }}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              {!stake.withdrawn && (
                <div className="flex gap-2 flex-wrap">
                  <button
                    disabled={loading || Number(claimables[i] || 0) <= 0}
                    onClick={() => handleClaim(i)}
                    className="flex-1 bg-green-600 hover:bg-green-500 disabled:opacity-50 px-3 py-2 rounded text-white font-bold text-sm transition"
                  >
                    {loadingIndex === i && loading ? "..." : "Claim"}
                  </button>

                  <button
                    disabled={loading || !isUnlocked(stake)}
                    onClick={() => handleWithdraw(i)}
                    className="flex-1 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 px-3 py-2 rounded text-black font-bold text-sm transition"
                  >
                    {loadingIndex === i && loading ? "..." : "Withdraw"}
                  </button>

                  <button
                    disabled={loading}
                    onClick={() => handleEmergency(i)}
                    className="bg-red-600 hover:bg-red-500 disabled:opacity-50 px-3 py-2 rounded text-white font-bold text-sm transition"
                  >
                    🚨
                  </button>
                </div>
              )}

              {stake.withdrawn && (
                <p className="text-center text-gray-500 text-sm">
                  ✅ Stake closed
                </p>
              )}

            </div>
          ))}
        </div>
      )}
    </div>
  );
}