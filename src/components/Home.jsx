import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { CONTRACT_ADDRESS, ABI } from "../contract/config";
import { motion } from "framer-motion";
import hero from "../assets/hero.png";

export default function Home({ provider }) {

  const [tvl, setTvl] = useState("0");
  const [stakers, setStakers] = useState("0");
  const [maxTVL, setMaxTVL] = useState("0");
  const [plans, setPlans] = useState([]);

  useEffect(() => {
    const loadStats = async () => {
      if (!provider) return;
      try {
        const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);
        const [total, users, max, allPlans] = await Promise.all([
          contract.totalStaked(),
          contract.totalUniqueStakers(),
          contract.maxTVL(),
          contract.getAllPlans(),
        ]);
        setTvl(ethers.formatUnits(total, 18));
        setStakers(users.toString());
        setMaxTVL(ethers.formatUnits(max, 18));
        setPlans(allPlans);
      } catch (err) {
        console.error("Stats load error:", err);
      }
    };
    loadStats();
  }, [provider]);

  return (
    <div className="max-w-5xl mx-auto text-center">

      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <img src={hero} className="mx-auto w-52 mb-6" alt="CrypPayStake" />
        <h1 className="text-4xl font-bold text-yellow-400 mb-3">
          ⚡ CrypPayStake
        </h1>
        <p className="text-gray-400 mb-10 text-lg">
          Secure principal-only staking on BNB Smart Chain
        </p>
      </motion.div>

      {/* Stats */}
      <div className="grid md:grid-cols-3 gap-6 mb-12">

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="bg-gray-800 border border-gray-700 p-6 rounded-xl shadow"
        >
          <p className="text-gray-400 text-sm mb-1">Total Staked</p>
          <h2 className="text-2xl font-bold text-green-400">
            {Number(tvl).toLocaleString()} CRP
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="bg-gray-800 border border-gray-700 p-6 rounded-xl shadow"
        >
          <p className="text-gray-400 text-sm mb-1">Total Stakers</p>
          <h2 className="text-2xl font-bold text-yellow-400">
            {stakers}
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="bg-gray-800 border border-gray-700 p-6 rounded-xl shadow"
        >
          <p className="text-gray-400 text-sm mb-1">Max TVL Cap</p>
          <h2 className="text-2xl font-bold text-blue-400">
            {Number(maxTVL) === 0
              ? "No Cap"
              : `${Number(maxTVL).toLocaleString()} CRP`}
          </h2>
        </motion.div>

      </div>

      {/* Active Plans */}
      {plans.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold text-white mb-6">
            📋 Active Staking Plans
          </h2>
          <div className="grid md:grid-cols-2 gap-5">
            {plans.map((plan, i) => (
              plan.active && (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: i * 0.1 }}
                  className="bg-gray-800 border border-gray-700 hover:border-yellow-500/40 rounded-xl p-5 text-left transition"
                >
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-yellow-400 font-bold">{plan.name}</h3>
                    <span className="text-xs bg-green-900 text-green-400 px-2 py-0.5 rounded-full">
                      Active
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-gray-400 text-xs">Lock Period</p>
                      <p className="text-white font-semibold">
                        {(Number(plan.lockPeriod) / 2592000).toFixed(0)} Months
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-xs">Monthly Release</p>
                      <p className="text-white font-semibold">
                        {plan.releasePercent.toString()}% / Month
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-xs">Claim Interval</p>
                      <p className="text-white font-semibold">
                        {(Number(plan.claimInterval) / 86400).toFixed(0)} Days
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-xs">Min Stake</p>
                      <p className="text-white font-semibold">
                        {Number(ethers.formatUnits(plan.minTokenAmount, 18)).toLocaleString()} CRP
                      </p>
                    </div>
                  </div>
                </motion.div>
              )
            ))}
          </div>
        </div>
      )}

    </div>
  );
}