import { useEffect, useState } from "react";
import { ethers } from "ethers";
import toast from "react-hot-toast";
import { useContract } from "../hooks/useContract";
import { useBalance } from "../hooks/useBalance";
import APRCalculator from "./APRCalculator";

export default function Stake({ account, signer, provider, connectWallet }) {

  const { fetchPlans, stakeTokens, approveTokens } = useContract(signer, provider);
  const balance = useBalance(account, provider);

  const [plans, setPlans] = useState([]);
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingPlanId, setLoadingPlanId] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [showCalculator, setShowCalculator] = useState(false);

  useEffect(() => {
    if (!provider) return;
    const loadPlans = async () => {
      try {
        const data = await fetchPlans();
        setPlans(data);
      } catch (err) {
        console.error("Plan load error:", err);
      }
    };
    loadPlans();
  }, [provider]);

  const handleStake = async (planId, minTokenAmount) => {

    if (!account) {
      connectWallet();
      return;
    }

    if (!amount || Number(amount) <= 0) {
      toast.error("Valid amount enter karo!");
      return;
    }

    const minAmt = Number(ethers.formatUnits(minTokenAmount, 18));
    if (Number(amount) < minAmt) {
      toast.error(`Minimum ${minAmt.toLocaleString()} CRP required!`);
      return;
    }

    if (Number(amount) > Number(balance)) {
      toast.error("Insufficient balance!");
      return;
    }

    try {

      setLoading(true);
      setLoadingPlanId(planId);

      toast.loading("Step 1/2: Approving tokens...");
      const approveTx = await approveTokens(amount);
      await approveTx.wait();
      toast.dismiss();
      toast.success("Approved! ✅");

      toast.loading("Step 2/2: Staking tokens...");
      const tx = await stakeTokens(planId, amount);
      await tx.wait();
      toast.dismiss();

      toast.success(
        <a
          href={"https://testnet.bscscan.com/tx/" + tx.hash}
          target="_blank"
          rel="noopener noreferrer"
          className="underline text-blue-400"
        >
          ✅ View Transaction
        </a>
      );

      setAmount("");
      setSelectedPlan(null);

    } catch (err) {
      toast.dismiss();
      console.error(err);
      toast.error(err?.reason || "Transaction failed ❌");
    } finally {
      setLoading(false);
      setLoadingPlanId(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4">

      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-yellow-400 mb-2">
          💰 CrypPay Stake
        </h1>
        <p className="text-gray-400 text-sm">
          Select plan → enter amount → stake CRP tokens securely
        </p>
      </div>

      <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 mb-10 max-w-md mx-auto">

        {account && (
          <div className="flex justify-between items-center mb-3">
            <span className="text-gray-400 text-sm">Wallet Balance</span>
            <span className="text-yellow-400 font-semibold text-sm">
              {Number(balance).toLocaleString()} tCRP
            </span>
          </div>
        )}

        <label className="text-gray-400 text-xs block mb-1">
          Amount to Stake (CRP)
        </label>

        <div className="flex gap-2">
          <input
            type="number"
            placeholder="Enter amount"
            className="flex-1 bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-yellow-500"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />

          {account && (
            <button
              onClick={() => setAmount(Number(balance).toFixed(0))}
              className="bg-gray-600 hover:bg-gray-500 text-gray-300 text-xs px-3 py-2 rounded transition"
            >
              MAX
            </button>
          )}
        </div>

        <button
          onClick={() => setShowCalculator(!showCalculator)}
          className="mt-3 text-xs text-yellow-400 hover:underline"
        >
          🧮 {showCalculator ? "Hide" : "Show"} Calculator
        </button>

        {showCalculator && (
          <div className="mt-4">
            <APRCalculator />
          </div>
        )}

      </div>

      <div className="flex flex-wrap justify-center gap-6">

        {plans.map((plan, i) => {

          if (!plan.active) return null;

          const lockSeconds = Number(plan.lockPeriod);
          const lockDisplay = lockSeconds >= 2592000 ? `${(lockSeconds / 2592000).toFixed(0)} Months`
            : lockSeconds >= 86400 ? `${(lockSeconds / 86400).toFixed(0)} Days`
            : lockSeconds >= 3600 ? `${(lockSeconds / 3600).toFixed(0)} Hours`
            : lockSeconds >= 60 ? `${(lockSeconds / 60).toFixed(0)} Minutes`
            : `${lockSeconds} Seconds`;
          const intervalSeconds = Number(plan.claimInterval);
          const intervalDisplay = intervalSeconds >= 86400 ? `${(intervalSeconds / 86400).toFixed(0)} Days`
            : intervalSeconds >= 3600 ? `${(intervalSeconds / 3600).toFixed(0)} Hours`
            : intervalSeconds >= 60 ? `${(intervalSeconds / 60).toFixed(0)} Minutes`
            : `${intervalSeconds} Seconds`;
          const releasePercent = Number(plan.releasePercent);
          const minAmt = Number(ethers.formatUnits(plan.minTokenAmount, 18));
          const isSelected = selectedPlan === i;

          const userAmount = Number(amount) || 0;
          const monthlyReturn = userAmount > 0 ? (userAmount * releasePercent / 100) : 0;
          const totalIntervals = lockSeconds > 0 && intervalSeconds > 0 ? Math.floor(lockSeconds / intervalSeconds) : 0;
          const totalReturn = userAmount > 0 ? (monthlyReturn * totalIntervals) : 0;

          return (

            <div
              key={i}
              onClick={() => setSelectedPlan(i)}
              className={`bg-gray-800 border rounded-xl p-6 cursor-pointer transition w-full sm:w-80 ${
                isSelected
                  ? "border-yellow-500 shadow-lg shadow-yellow-500/10"
                  : "border-gray-700 hover:border-yellow-500/40"
              }`}
            >

              <div className="flex justify-between items-start mb-4">
                <h3 className="text-yellow-400 font-bold text-base leading-tight">
                  {plan.name}
                </h3>

                <span className="text-xs bg-green-900 text-green-400 px-2 py-0.5 rounded-full ml-2 shrink-0">
                  Active
                </span>
              </div>

              <div className="space-y-2 text-sm mb-5">

                <div className="flex justify-between">
                  <span className="text-gray-400">Lock Period</span>
                  <span className="text-white font-semibold">
                    {lockDisplay}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-400">Monthly Release</span>
                  <span className="text-green-400 font-semibold">
                    {releasePercent}% / Month
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-400">Claim Every</span>
                  <span className="text-white">{intervalDisplay}</span>
                </div>

                <div className="flex justify-between border-t border-gray-700 pt-2 mt-2">
                  <span className="text-gray-400">Min Stake</span>
                  <span className="text-yellow-400 font-semibold">
                    {minAmt.toLocaleString()} CRP
                  </span>
                </div>

              </div>

              {/* Expected Returns Preview */}
              {userAmount > 0 && (
                <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 mb-4">
                  <p className="text-gray-400 text-xs mb-2 font-semibold">
                    📊 Expected Returns
                  </p>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Staking Amount</span>
                      <span className="text-white font-semibold">
                        {userAmount.toLocaleString()} CRP
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Monthly Return</span>
                      <span className="text-green-400 font-semibold">
                        {monthlyReturn.toLocaleString()} CRP
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-gray-700 pt-1 mt-1">
                      <span className="text-gray-400">Total Return ({lockDisplay})</span>
                      <span className="text-yellow-400 font-bold">
                        {totalReturn.toLocaleString()} CRP
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {account && (
                <button
                  disabled={loading || !amount || Number(amount) <= 0}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStake(i, plan.minTokenAmount);
                  }}
                  className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 disabled:opacity-50 text-black font-bold py-2.5 rounded-full transition shadow-lg shadow-yellow-500/20"
                >
                  {loadingPlanId === i && loading
                    ? "Processing..."
                    : "🚀 Start Stake Now"}
                </button>
              )}

            </div>

          );

        })}

      </div>

      {plans.filter(p => p.active).length === 0 && (
        <div className="text-center py-20 text-gray-400">
          <p className="text-4xl mb-3">📭</p>
          <p>Koi active plan nahi mila</p>
        </div>
      )}

    </div>
  );
}