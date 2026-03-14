import { useState, useEffect } from "react";
import { ethers } from "ethers";
import toast from "react-hot-toast";
import { useContract } from "../hooks/useContract";
import { CONTRACT_ADDRESS, ABI } from "../contract/config";

export default function AdminDashboard({ account, signer, provider }) {

  const {
    fetchPlans,
    fetchStats,
    fetchTVLValue,
    fetchTokenPrice,
    fetchTotalDistributed,
    fetchTotalWithdrawn,
    fetchTotalStakedInPlan,
    fetchPlanPaused,
    fetchPlanEmergency,
  } = useContract(signer, provider);

  // ─── State ───────────────────────────────────────────
  const [plans, setPlans] = useState([]);
  const [stats, setStats] = useState({
    totalStaked: "0",
    totalStakers: "0",
    maxTVL: "0",
  });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("plans");

  // Analytics State
  const [tokenPrice, setTokenPrice] = useState("0");
  const [tvlUSD, setTvlUSD] = useState("0");
  const [totalDistributed, setTotalDistributed] = useState("0");
  const [totalWithdrawn, setTotalWithdrawn] = useState("0");
  const [planStakedAmounts, setPlanStakedAmounts] = useState({});
  const [planPausedStatus, setPlanPausedStatus] = useState({});
  const [planEmergencyStatus, setPlanEmergencyStatus] = useState({});

  // Create Plan Form
  const [planForm, setPlanForm] = useState({
    name: "",
    lockPeriod: "",
    releasePercent: "",
    claimInterval: "",
    minTokenAmount: "",
  });

  // Settings Form
  const [maxTVL, setMaxTVL] = useState("");
  const [minAmount, setMinAmount] = useState("");
  const [minAmountPlanId, setMinAmountPlanId] = useState("");
  const [pairAddress, setPairAddress] = useState("");
  const [priceFeed, setPriceFeed] = useState("");
  const [stuckToken, setStuckToken] = useState("");
  const [stuckAmount, setStuckAmount] = useState("");
  const [emergencyMode, setEmergencyMode] = useState(false);

  // ─── Contract Writer ──────────────────────────────────
  function getContract() {
    if (!signer) throw new Error("Wallet not connected");
    return new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
  }

  function getReader() {
    if (!provider) throw new Error("Provider not available");
    return new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);
  }

  // ─── Load Data ────────────────────────────────────────
  async function loadData() {
    try {
      const [p, s, price, tvl, distributed, withdrawn] = await Promise.all([
        fetchPlans(),
        fetchStats(),
        fetchTokenPrice(),
        fetchTVLValue(),
        fetchTotalDistributed(),
        fetchTotalWithdrawn(),
      ]);
      setPlans(p);
      setStats(s);
      setTokenPrice(price);
      setTvlUSD(tvl);
      setTotalDistributed(distributed);
      setTotalWithdrawn(withdrawn);

      const reader = getReader();
      const em = await reader.emergencyMode();
      setEmergencyMode(em);

      const stakedAmounts = {};
      const pausedStatuses = {};
      const emergencyStatuses = {};
      for (let i = 0; i < p.length; i++) {
        stakedAmounts[i] = await fetchTotalStakedInPlan(i);
        pausedStatuses[i] = await fetchPlanPaused(i);
        emergencyStatuses[i] = await fetchPlanEmergency(i);
      }
      setPlanStakedAmounts(stakedAmounts);
      setPlanPausedStatus(pausedStatuses);
      setPlanEmergencyStatus(emergencyStatuses);
    } catch (err) {
      console.error("Load failed:", err);
    }
  }

  useEffect(() => {
    if (provider) loadData();
  }, [provider]);

  useEffect(() => {
    if (!provider) return;
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [provider]);

  // ─── Helpers ─────────────────────────────────────────
  async function runTx(fn, successMsg) {
    setLoading(true);
    try {
      await fn();
      toast.success(successMsg);
      await loadData();
    } catch (err) {
      toast.error(err?.reason || err?.message || "Transaction failed");
    } finally {
      setLoading(false);
    }
  }

  function formatAmount(val) {
    try {
      return Number(ethers.formatEther(val)).toLocaleString();
    } catch {
      return "0";
    }
  }

  // ─── Admin Functions ──────────────────────────────────

  async function handleCreatePlan() {
    const { name, lockPeriod, releasePercent, claimInterval, minTokenAmount } = planForm;
    if (!name || !lockPeriod || !releasePercent || !claimInterval || !minTokenAmount) {
      toast.error("Sab fields fill karo!");
      return;
    }
    await runTx(async () => {
      const c = getContract();
      const tx = await c.createPlan(
        name,
        Number(lockPeriod),
        Number(releasePercent),
        Number(claimInterval),
        ethers.parseEther(minTokenAmount)
      );
      await tx.wait();
    }, "Plan created! ✅");
    setPlanForm({ name: "", lockPeriod: "", releasePercent: "", claimInterval: "", minTokenAmount: "" });
  }

  async function handleDisablePlan(planId) {
    await runTx(async () => {
      const c = getContract();
      const tx = await c.disablePlan(planId);
      await tx.wait();
    }, `Plan ${planId} disabled! ✅`);
  }

  async function handleTogglePause(planId) {
    await runTx(async () => {
      const c = getContract();
      const tx = await c.togglePlanPause(planId);
      await tx.wait();
    }, `Plan ${planId} pause toggled! ✅`);
  }

  async function handleTogglePlanEmergency(planId) {
    await runTx(async () => {
      const c = getContract();
      const tx = await c.togglePlanEmergency(planId);
      await tx.wait();
    }, `Plan ${planId} emergency toggled! ✅`);
  }

  async function handleSetMaxTVL() {
    if (!maxTVL) return toast.error("MaxTVL enter karo!");
    await runTx(async () => {
      const c = getContract();
      const tx = await c.setMaxTVL(ethers.parseEther(maxTVL));
      await tx.wait();
    }, "MaxTVL updated! ✅");
    setMaxTVL("");
  }

  async function handleSetMinAmount() {
    if (!minAmountPlanId || !minAmount) return toast.error("Plan ID aur amount enter karo!");
    await runTx(async () => {
      const c = getContract();
      const tx = await c.setMinTokenAmount(
        Number(minAmountPlanId),
        ethers.parseEther(minAmount)
      );
      await tx.wait();
    }, "Min amount updated! ✅");
    setMinAmount("");
    setMinAmountPlanId("");
  }

  async function handleSetPairAddress() {
    if (!pairAddress) return toast.error("Pair address enter karo!");
    await runTx(async () => {
      const c = getContract();
      const tx = await c.setPairAddress(pairAddress);
      await tx.wait();
    }, "Pair address updated! ✅");
    setPairAddress("");
  }

  async function handleSetPriceFeed() {
    if (!priceFeed) return toast.error("Price feed address enter karo!");
    await runTx(async () => {
      const c = getContract();
      const tx = await c.setPriceFeed(priceFeed);
      await tx.wait();
    }, "Price feed updated! ✅");
    setPriceFeed("");
  }

  async function handleSetEmergencyMode(status) {
    await runTx(async () => {
      const c = getContract();
      const tx = await c.setEmergencyMode(status);
      await tx.wait();
    }, `Emergency mode ${status ? "ON" : "OFF"}! ✅`);
  }

  async function handleWithdrawStuck() {
    if (!stuckToken || !stuckAmount) return toast.error("Token address aur amount enter karo!");
    await runTx(async () => {
      const c = getContract();
      const tx = await c.withdrawStuckTokens(
        stuckToken,
        ethers.parseEther(stuckAmount)
      );
      await tx.wait();
    }, "Tokens withdrawn! ✅");
    setStuckToken("");
    setStuckAmount("");
  }

  // ─── UI Components ────────────────────────────────────

  function InputField({ label, value, onChange, placeholder, type = "text" }) {
    return (
      <div className="flex flex-col gap-1">
        <label className="text-gray-400 text-xs">{label}</label>
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-yellow-500"
        />
      </div>
    );
  }

  function AdminButton({ onClick, label, color = "yellow", disabled = false }) {
    const colors = {
      yellow: "bg-yellow-500 hover:bg-yellow-400 text-black",
      red: "bg-red-600 hover:bg-red-500 text-white",
      green: "bg-green-600 hover:bg-green-500 text-white",
      blue: "bg-blue-600 hover:bg-blue-500 text-white",
      orange: "bg-orange-600 hover:bg-orange-500 text-white",
    };
    return (
      <button
        onClick={onClick}
        disabled={loading || disabled}
        className={`${colors[color]} px-4 py-2 rounded font-semibold text-sm transition disabled:opacity-50`}
      >
        {loading ? "Processing..." : label}
      </button>
    );
  }

  // ─── RENDER ───────────────────────────────────────────
  return (
    <div className="max-w-6xl mx-auto">

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-yellow-400">📊 Dashboard</h1>
        <p className="text-gray-400 text-sm mt-1">
          {account?.slice(0,6)}...{account?.slice(-4)}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <p className="text-gray-400 text-xs">Total Staked</p>
          <p className="text-yellow-400 text-xl font-bold mt-1">
            {Number(stats.totalStaked).toLocaleString()} CRP
          </p>
        </div>
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <p className="text-gray-400 text-xs">Total Stakers</p>
          <p className="text-green-400 text-xl font-bold mt-1">
            {stats.totalStakers}
          </p>
        </div>
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <p className="text-gray-400 text-xs">Max TVL Cap</p>
          <p className="text-blue-400 text-xl font-bold mt-1">
            {Number(stats.maxTVL) === 0 ? "No Cap" : `${Number(stats.maxTVL).toLocaleString()} CRP`}
          </p>
        </div>
      </div>

      {/* Extended Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-gray-800 rounded-xl p-4 border border-yellow-500/20">
          <p className="text-gray-400 text-xs">CRP Token Price</p>
          <p className="text-yellow-400 text-lg font-bold mt-1">
            ${Number(tokenPrice) > 0 ? Number(tokenPrice).toFixed(6) : "N/A"}
          </p>
        </div>
        <div className="bg-gray-800 rounded-xl p-4 border border-yellow-500/20">
          <p className="text-gray-400 text-xs">TVL (USD)</p>
          <p className="text-yellow-400 text-lg font-bold mt-1">
            ${Number(tvlUSD) > 0 ? Number(tvlUSD).toLocaleString() : "N/A"}
          </p>
        </div>
        <div className="bg-gray-800 rounded-xl p-4 border border-yellow-500/20">
          <p className="text-gray-400 text-xs">Total Distributed</p>
          <p className="text-green-400 text-lg font-bold mt-1">
            {Number(totalDistributed).toLocaleString()} CRP
          </p>
        </div>
        <div className="bg-gray-800 rounded-xl p-4 border border-yellow-500/20">
          <p className="text-gray-400 text-xs">Total Withdrawn</p>
          <p className="text-orange-400 text-lg font-bold mt-1">
            {Number(totalWithdrawn).toLocaleString()} CRP
          </p>
        </div>
      </div>

      {/* Emergency Mode Banner */}
      {emergencyMode && (
        <div className="bg-red-900/50 border border-red-500 rounded-xl p-4 mb-6 flex justify-between items-center">
          <span className="text-red-400 font-semibold">⚠️ Emergency Mode is ACTIVE</span>
          <AdminButton
            onClick={() => handleSetEmergencyMode(false)}
            label="Deactivate Emergency"
            color="green"
          />
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-700 pb-2">
        {["plans", "create", "analytics", "settings", "emergency"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-t text-sm font-semibold capitalize transition ${
              activeTab === tab
                ? "bg-yellow-500 text-black"
                : "text-gray-400 hover:text-yellow-400"
            }`}
          >
            {tab === "plans" && "📋 Plans"}
            {tab === "create" && "➕ Create Plan"}
            {tab === "analytics" && "📊 Analytics"}
            {tab === "settings" && "⚙️ Settings"}
            {tab === "emergency" && "🚨 Emergency"}
          </button>
        ))}
      </div>

      {/* ── TAB: PLANS ── */}
      {activeTab === "plans" && (
        <div className="space-y-4">
          {plans.length === 0 ? (
            <p className="text-gray-400 text-center py-10">Koi plan nahi mila</p>
          ) : (
            plans.map((plan, index) => (
              <div key={index} className="bg-gray-800 border border-gray-700 rounded-xl p-5">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <span className="text-yellow-400 font-bold text-lg">
                      Plan #{index} — {plan.name}
                    </span>
                    <div className="flex gap-2 mt-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${plan.active ? "bg-green-900 text-green-400" : "bg-red-900 text-red-400"}`}>
                        {plan.active ? "Active" : "Disabled"}
                      </span>
                      {planPausedStatus[index] && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-orange-900 text-orange-400">
                          Paused ⏸️
                        </span>
                      )}
                      {planEmergencyStatus[index] && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-red-900 text-red-400">
                          Emergency 🚨
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <AdminButton
                      onClick={() => handleTogglePause(index)}
                      label={planPausedStatus[index] ? "Resume" : "Pause"}
                      color="orange"
                    />
                    <AdminButton
                      onClick={() => handleTogglePlanEmergency(index)}
                      label="Emergency"
                      color="red"
                    />
                    {plan.active && (
                      <AdminButton
                        onClick={() => handleDisablePlan(index)}
                        label="Disable"
                        color="red"
                      />
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-5 gap-3 text-sm">
                  <div>
                    <p className="text-gray-400 text-xs">Lock Period</p>
                    <p className="text-white">{(Number(plan.lockPeriod) / 2592000).toFixed(0)} months</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs">Release %</p>
                    <p className="text-white">{plan.releasePercent.toString()}% / interval</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs">Claim Interval</p>
                    <p className="text-white">{(Number(plan.claimInterval) / 86400).toFixed(0)} days</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs">Min Stake</p>
                    <p className="text-white">{formatAmount(plan.minTokenAmount)} CRP</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs">Total Staked</p>
                    <p className="text-yellow-400 font-bold">{Number(planStakedAmounts[index] || 0).toLocaleString()} CRP</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── TAB: CREATE PLAN ── */}
      {activeTab === "create" && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 max-w-xl">
          <h2 className="text-white font-bold text-lg mb-5">➕ New Staking Plan</h2>
          <div className="space-y-4">
            <InputField label="Plan Name" value={planForm.name} onChange={(v) => setPlanForm({ ...planForm, name: v })} placeholder="e.g. CrypPay Stake 12M" />
            <InputField label="Lock Period (seconds)" value={planForm.lockPeriod} onChange={(v) => setPlanForm({ ...planForm, lockPeriod: v })} placeholder="e.g. 31104000 (12 months)" type="number" />
            <InputField label="Release Percent per Interval" value={planForm.releasePercent} onChange={(v) => setPlanForm({ ...planForm, releasePercent: v })} placeholder="e.g. 8 (for 12 intervals)" type="number" />
            <InputField label="Claim Interval (seconds)" value={planForm.claimInterval} onChange={(v) => setPlanForm({ ...planForm, claimInterval: v })} placeholder="e.g. 2592000 (30 days)" type="number" />
            <InputField label="Min Token Amount (CRP)" value={planForm.minTokenAmount} onChange={(v) => setPlanForm({ ...planForm, minTokenAmount: v })} placeholder="e.g. 15000" type="number" />
            <AdminButton onClick={handleCreatePlan} label="Create Plan" color="yellow" />
          </div>
        </div>
      )}

      {/* ── TAB: ANALYTICS ── */}
      {activeTab === "analytics" && (
        <div className="space-y-6">

          {/* Price & TVL */}
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
            <h2 className="text-white font-bold text-lg mb-5">💰 Price & TVL</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <p className="text-gray-400 text-xs">CRP Token Price</p>
                <p className="text-yellow-400 font-bold text-lg">
                  ${Number(tokenPrice) > 0 ? Number(tokenPrice).toFixed(6) : "N/A"}
                </p>
              </div>
              <div>
                <p className="text-gray-400 text-xs">TVL (USD)</p>
                <p className="text-yellow-400 font-bold text-lg">
                  ${Number(tvlUSD) > 0 ? Number(tvlUSD).toLocaleString() : "N/A"}
                </p>
              </div>
              <div>
                <p className="text-gray-400 text-xs">Max TVL Cap</p>
                <p className="text-blue-400 font-bold text-lg">
                  {Number(stats.maxTVL) === 0 ? "No Cap" : `${Number(stats.maxTVL).toLocaleString()} CRP`}
                </p>
              </div>
            </div>
          </div>

          {/* Per-Plan Stats */}
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
            <h2 className="text-white font-bold text-lg mb-5">📋 Per-Plan Breakdown</h2>
            {plans.length === 0 ? (
              <p className="text-gray-400 text-center py-6">Koi plan nahi mila</p>
            ) : (
              <div className="bg-gray-900 border border-gray-700 rounded-xl overflow-hidden">
                <div className="grid grid-cols-6 gap-2 px-5 py-3 bg-gray-900 text-gray-400 text-xs font-semibold border-b border-gray-700">
                  <span>#</span>
                  <span>Plan Name</span>
                  <span>Total Staked</span>
                  <span>Status</span>
                  <span>Paused</span>
                  <span>Emergency</span>
                </div>
                {plans.map((plan, index) => (
                  <div key={index} className="grid grid-cols-6 gap-2 px-5 py-3 text-sm border-b border-gray-700/50 items-center">
                    <span className="text-gray-500 text-xs">{index}</span>
                    <span className="text-yellow-400 font-semibold text-xs truncate">{plan.name}</span>
                    <span className="text-white font-bold text-xs">{Number(planStakedAmounts[index] || 0).toLocaleString()} CRP</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold inline-block w-fit ${plan.active ? "bg-green-900 text-green-400" : "bg-red-900 text-red-400"}`}>
                      {plan.active ? "Active" : "Disabled"}
                    </span>
                    <span className={`text-xs font-semibold ${planPausedStatus[index] ? "text-orange-400" : "text-gray-500"}`}>
                      {planPausedStatus[index] ? "Yes ⏸️" : "No"}
                    </span>
                    <span className={`text-xs font-semibold ${planEmergencyStatus[index] ? "text-red-400" : "text-gray-500"}`}>
                      {planEmergencyStatus[index] ? "Yes 🚨" : "No"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Protocol Health */}
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
            <h2 className="text-white font-bold text-lg mb-5">🛡️ Protocol Health</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <p className="text-gray-400 text-xs">Emergency Mode</p>
                <p className={`font-bold text-lg ${emergencyMode ? "text-red-400" : "text-green-400"}`}>
                  {emergencyMode ? "🔴 ACTIVE" : "🟢 INACTIVE"}
                </p>
              </div>
              <div>
                <p className="text-gray-400 text-xs">Active Plans</p>
                <p className="text-green-400 font-bold text-lg">
                  {plans.filter(p => p.active).length} / {plans.length}
                </p>
              </div>
              <div>
                <p className="text-gray-400 text-xs">Paused Plans</p>
                <p className="text-orange-400 font-bold text-lg">
                  {Object.values(planPausedStatus).filter(v => v).length}
                </p>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ── TAB: SETTINGS ── */}
      {activeTab === "settings" && (
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
            <h3 className="text-white font-semibold mb-4">📊 Set Max TVL</h3>
            <div className="space-y-3">
              <InputField label="Max TVL (CRP) — 0 = No Cap" value={maxTVL} onChange={setMaxTVL} placeholder="e.g. 1000000" type="number" />
              <AdminButton onClick={handleSetMaxTVL} label="Update MaxTVL" color="blue" />
            </div>
          </div>
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
            <h3 className="text-white font-semibold mb-4">💰 Set Min Token Amount</h3>
            <div className="space-y-3">
              <InputField label="Plan ID" value={minAmountPlanId} onChange={setMinAmountPlanId} placeholder="e.g. 0" type="number" />
              <InputField label="New Min Amount (CRP)" value={minAmount} onChange={setMinAmount} placeholder="e.g. 10000" type="number" />
              <AdminButton onClick={handleSetMinAmount} label="Update Min Amount" color="blue" />
            </div>
          </div>
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
            <h3 className="text-white font-semibold mb-4">🔄 Set Pair Address (TWAP)</h3>
            <div className="space-y-3">
              <InputField label="PancakeSwap Pair Address" value={pairAddress} onChange={setPairAddress} placeholder="0x..." />
              <AdminButton onClick={handleSetPairAddress} label="Update Pair" color="blue" />
            </div>
          </div>
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
            <h3 className="text-white font-semibold mb-4">📡 Set Price Feed (Chainlink)</h3>
            <div className="space-y-3">
              <InputField label="Chainlink Feed Address" value={priceFeed} onChange={setPriceFeed} placeholder="0x..." />
              <AdminButton onClick={handleSetPriceFeed} label="Update Feed" color="blue" />
            </div>
          </div>
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 col-span-2">
            <h3 className="text-white font-semibold mb-4">🔧 Withdraw Stuck Tokens</h3>
            <div className="grid grid-cols-2 gap-3">
              <InputField label="Token Address" value={stuckToken} onChange={setStuckToken} placeholder="0x..." />
              <InputField label="Amount" value={stuckAmount} onChange={setStuckAmount} placeholder="e.g. 100" type="number" />
            </div>
            <div className="mt-3">
              <AdminButton onClick={handleWithdrawStuck} label="Withdraw Tokens" color="orange" />
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: EMERGENCY ── */}
      {activeTab === "emergency" && (
        <div className="max-w-xl space-y-6">
          <div className="bg-gray-800 border border-red-700 rounded-xl p-6">
            <h3 className="text-red-400 font-bold text-lg mb-2">🚨 Global Emergency Mode</h3>
            <p className="text-gray-400 text-sm mb-4">
              Yeh enable karne se saare users emergency withdraw kar sakte hain.
            </p>
            <div className="flex gap-3">
              <AdminButton onClick={() => handleSetEmergencyMode(true)} label="Enable Emergency" color="red" disabled={emergencyMode} />
              <AdminButton onClick={() => handleSetEmergencyMode(false)} label="Disable Emergency" color="green" disabled={!emergencyMode} />
            </div>
            <div className="mt-3">
              <span className={`text-sm font-semibold ${emergencyMode ? "text-red-400" : "text-green-400"}`}>
                Current Status: {emergencyMode ? "🔴 ACTIVE" : "🟢 INACTIVE"}
              </span>
            </div>
          </div>
          <div className="bg-gray-800 border border-orange-700 rounded-xl p-6">
            <h3 className="text-orange-400 font-bold text-lg mb-2">⚠️ Per-Plan Emergency</h3>
            <p className="text-gray-400 text-sm mb-4">
              Specific plan ke liye emergency toggle karo.
            </p>
            <div className="space-y-3">
              {plans.map((plan, index) => (
                <div key={index} className="flex justify-between items-center bg-gray-700 rounded-lg px-4 py-3">
                  <div>
                    <span className="text-white text-sm">Plan #{index} — {plan.name}</span>
                    <div className="flex gap-2 mt-1">
                      {planPausedStatus[index] && (
                        <span className="text-xs text-orange-400">⏸️ Paused</span>
                      )}
                      {planEmergencyStatus[index] && (
                        <span className="text-xs text-red-400">🚨 Emergency</span>
                      )}
                    </div>
                  </div>
                  <AdminButton onClick={() => handleTogglePlanEmergency(index)} label="Toggle Emergency" color="orange" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}