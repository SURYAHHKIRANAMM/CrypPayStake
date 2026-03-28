import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import toast from "react-hot-toast";
import { useContract } from "../hooks/useContract";
import { CONTRACT_ADDRESS, ABI, ADMIN_WALLET, VIEWER_WALLET, BSCSCAN_BASE_URL } from "../contract/config";

export default function AdminDashboard({ account, signer, provider, isViewer: isViewerProp }) {
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
fetchPlanClaimPaused,
fetchPlanEmergencyWithdrawPaused,
fetchContractEvents,
fetchUserStakes,
fetchClaimable,
fetchOwner,
fetchPairAddress,
fetchPriceFeedAddress,
fetchPaused,
fetchTWAPPrice,
fetchCrypPayToken,
transferOwnership,
fetchUSDtoINR,
fetchEmergencyMode,
} = useContract(signer, provider);

// ─── State ───────────────────────────────────────────
const [plans, setPlans] = useState([]);
const [stats, setStats] = useState({
totalStaked: "0",
totalStakers: "0",
maxTVL: "0",
tokenPrice: "0",
tvlUsd: "0",
totalDistributed: "0",
totalWithdrawn: "0",
});

const [loadingAction, setLoadingAction] = useState("");
const [planClaimPausedStatus, setPlanClaimPausedStatus] = useState({});
const [planEmergencyWithdrawPausedStatus, setPlanEmergencyWithdrawPausedStatus] = useState({});
const [activeTab, setActiveTab] = useState("plans");

// Analytics State
const [tokenPrice, setTokenPrice] = useState("0");
const [tvlUSD, setTvlUSD] = useState("0");
const [totalDistributed, setTotalDistributed] = useState("0");
const [totalWithdrawn, setTotalWithdrawn] = useState("0");
const [planStakedAmounts, setPlanStakedAmounts] = useState({});
const [planPausedStatus, setPlanPausedStatus] = useState({});
const [planEmergencyStatus, setPlanEmergencyStatus] = useState({});
const [txEvents, setTxEvents] = useState([]);
const [eventsLoading, setEventsLoading] = useState(false);
const [contractOwner, setContractOwner] = useState("");
const [currentPairAddress, setCurrentPairAddress] = useState("");
const [currentPriceFeed, setCurrentPriceFeed] = useState("");
const [protocolPaused, setProtocolPaused] = useState(false);
const [twapPrice, setTwapPrice] = useState("0");
const [tokenAddress, setTokenAddress] = useState("");
const [newOwnerAddress, setNewOwnerAddress] = useState("");
const [searchWallet, setSearchWallet] = useState("");
const [searchedStakes, setSearchedStakes] = useState([]);
const [searchedClaimables, setSearchedClaimables] = useState([]);
const [searchLoading, setSearchLoading] = useState(false);
const [searchedAddress, setSearchedAddress] = useState("");
const [allUsersData, setAllUsersData] = useState([]);
const [usersLoading, setUsersLoading] = useState(false);
const [usdToInr, setUsdToInr] = useState(83.5);

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

// Check if current user is full admin or viewer (using prop from App.jsx)
const adminWallet = ADMIN_WALLET?.toLowerCase?.() || "";
const currentAccount = account?.toLowerCase?.() || "";

const isViewer = !!isViewerProp;
const isFullAdmin = !isViewer && currentAccount === adminWallet;

// ─── Contract Writer ──────────────────────────────────
const getContract = useCallback(() => {
if (!signer) throw new Error("Wallet not connected");
return new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
}, [signer]);

// ─── Load Data ────────────────────────────────────────
const loadData = useCallback(async () => {
if (!provider) {
setPlans([]);
setStats({
totalStaked: "0",
totalStakers: "0",
maxTVL: "0",
});
setTokenPrice("0");
setTvlUSD("0");
setTotalDistributed("0");
setTotalWithdrawn("0");
setPlanStakedAmounts({});
setPlanPausedStatus({});
setPlanEmergencyStatus({});
setContractOwner("");
setCurrentPairAddress("");
setCurrentPriceFeed("");
setProtocolPaused(false);
setTwapPrice("0");
setTokenAddress("");
setEmergencyMode(false);
return;
}

try {  
  const [  
    p,  
    s,  
    price,  
    tvl,  
    distributed,  
    withdrawn,  
    owner,  
    pair,  
    feed,  
    isPaused,  
    twap,  
    crpToken,  
    inrRate,  
    emergencyStatus,  
  ] = await Promise.all([  
    fetchPlans(),  
    fetchStats(),  
    fetchTokenPrice(),  
    fetchTVLValue(),  
    fetchTotalDistributed(),  
    fetchTotalWithdrawn(),  
    fetchOwner(),  
    fetchPairAddress(),  
    fetchPriceFeedAddress(),  
    fetchPaused(),  
    fetchTWAPPrice(),  
    fetchCrypPayToken(),  
    fetchUSDtoINR(),  
    fetchEmergencyMode(),  
  ]);  

  setPlans(p);  
  setStats(s);  
  setTokenPrice(price);  
  setTvlUSD(tvl);  
  setTotalDistributed(distributed);  
  setTotalWithdrawn(withdrawn);  
  setContractOwner(owner);  
  setCurrentPairAddress(pair);  
  setCurrentPriceFeed(feed);  
  setProtocolPaused(isPaused);  
  setTwapPrice(twap);  
  setTokenAddress(crpToken);  
  setUsdToInr(inrRate);  
  setEmergencyMode(emergencyStatus);  

  const stakedAmounts = {};  
  const pausedStatuses = {};  
  const emergencyStatuses = {};  
  const claimPausedStatuses = {};  
  const emergencyWithdrawPausedStatuses = {};  


  for (let i = 0; i < p.length; i++) {  
    stakedAmounts[i] = await fetchTotalStakedInPlan(i);  
    pausedStatuses[i] = await fetchPlanPaused(i);  
    emergencyStatuses[i] = await fetchPlanEmergency(i);  
    claimPausedStatuses[i] = await fetchPlanClaimPaused(i);  
    emergencyWithdrawPausedStatuses[i] = await fetchPlanEmergencyWithdrawPaused(i);  
  }  

  setPlanStakedAmounts(stakedAmounts);  
  setPlanPausedStatus(pausedStatuses);  
  setPlanEmergencyStatus(emergencyStatuses);  
  setPlanClaimPausedStatus(claimPausedStatuses);  
  setPlanEmergencyWithdrawPausedStatus(emergencyWithdrawPausedStatuses);  

} catch (err) {  
  console.error("Load failed:", err);  
}

}, [
provider,
fetchPlans,
fetchStats,
fetchTVLValue,
fetchTokenPrice,
fetchTotalDistributed,
fetchTotalWithdrawn,
fetchTotalStakedInPlan,
fetchPlanPaused,
fetchPlanEmergency,
fetchPlanClaimPaused,
fetchPlanEmergencyWithdrawPaused,
fetchOwner,
fetchPairAddress,
fetchPriceFeedAddress,
fetchPaused,
fetchTWAPPrice,
fetchCrypPayToken,
fetchUSDtoINR,
fetchEmergencyMode,
]);

useEffect(() => {
loadData();
}, [loadData]);

useEffect(() => {
if (!provider) return;

const interval = setInterval(() => {  
  loadData();  
}, 30000);  

return () => clearInterval(interval);

}, [provider, loadData]);

// ✅ Auto-load events on component mount — enables Today's Overview, Users, and History
useEffect(() => {
  if (txEvents.length === 0 && !eventsLoading && provider) {
    (async () => {
      setEventsLoading(true);
      try {
        const events = await fetchContractEvents();
        setTxEvents(events || []);
      } catch (err) {
        console.error("Auto-load events error:", err);
      } finally {
        setEventsLoading(false);
      }
    })();
  }
}, [provider]); // eslint-disable-line react-hooks/exhaustive-deps

// ─── Helpers ─────────────────────────────────────────
async function runTx(fn, successMsg, actionKey = "") {
setLoadingAction(actionKey);
try {
await fn();
toast.success(successMsg);
await loadData();
} catch (err) {
toast.error(err?.reason || err?.shortMessage || err?.message || "Transaction failed");
} finally {
setLoadingAction("");
}
}

function formatAmount(val) {
try {
return Number(ethers.formatEther(val)).toLocaleString();
} catch {
return "0";
}
}

// INR Value helper
const crpToINR = (amount) => {
const usdPrice = Number(tokenPrice);
if (usdPrice <= 0) return "N/A";
return (amount * usdPrice * usdToInr).toLocaleString("en-IN", {
maximumFractionDigits: 2,
});
};

// ─── Admin Functions ──────────────────────────────────

async function handleCreatePlan() {
const {
name,
lockPeriod,
releasePercent,
claimInterval,
minTokenAmount,
} = planForm;

if (
!name ||
!lockPeriod ||
!releasePercent ||
!claimInterval ||
!minTokenAmount
) {
toast.error("Please fill all fields!");
return;
}

await runTx(
async () => {
const c = getContract();
const tx = await c.createPlan(
name,
Number(lockPeriod),
Number(releasePercent),
Number(claimInterval),
ethers.parseEther(minTokenAmount)
);
await tx.wait();
},
"Plan created! ✅",
"create-plan"
);

setPlanForm({
name: "",
lockPeriod: "",
releasePercent: "",
claimInterval: "",
minTokenAmount: "",
});
}

async function handleDisablePlan(planId) {
await runTx(
async () => {
const c = getContract();
const tx = await c.disablePlan(planId);
await tx.wait();
},
`Plan ${planId} disabled! ✅`,
`plan-${planId}-disable`
);
}

async function handleEnablePlan(planId) {
await runTx(
async () => {
const c = getContract();
const tx = await c.enablePlan(planId);
await tx.wait();
},
`Plan ${planId} enabled! ✅`,
`plan-${planId}-enable`
);
}

async function handleTogglePause(planId) {
await runTx(
async () => {
const c = getContract();
const tx = await c.togglePlanPause(planId);
await tx.wait();
},
`Plan ${planId} pause toggled! ✅`,
`plan-${planId}-pause`
);
}

async function handleTogglePlanEmergency(planId) {
await runTx(
async () => {
const c = getContract();
const tx = await c.togglePlanEmergency(planId);
await tx.wait();
},
`Plan ${planId} emergency toggled! ✅`,
`plan-${planId}-emergency`
);
}

async function handleTogglePlanClaimPause(planId) {
await runTx(
async () => {
const c = getContract();
const tx = await c.togglePlanClaimPause(planId);
await tx.wait();
},
`Plan ${planId} claim pause toggled! ✅`,
`plan-${planId}-claim-pause`
);
}

async function handleTogglePlanEmergencyWithdrawPause(planId) {
await runTx(
async () => {
const c = getContract();
const tx = await c.togglePlanEmergencyWithdrawPause(planId);
await tx.wait();
},
`Plan ${planId} emergency withdraw pause toggled! ✅`,
`plan-${planId}-ew-pause`
);
}

async function handleSetMaxTVL() {
if (!maxTVL) {
toast.error("Please enter MaxTVL!");
return;
}

await runTx(
async () => {
const c = getContract();
const tx = await c.setMaxTVL(ethers.parseEther(maxTVL));
await tx.wait();
},
"MaxTVL updated! ✅",
"set-max-tvl"
);

setMaxTVL("");
}

async function handleSetMinAmount() {
if (!minAmountPlanId || !minAmount) {
toast.error("Please enter Plan ID and amount!");
return;
}

await runTx(
async () => {
const c = getContract();
const tx = await c.setMinTokenAmount(
Number(minAmountPlanId),
ethers.parseEther(minAmount)
);
await tx.wait();
},
"Min amount updated! ✅",
`plan-${minAmountPlanId}-min-amount`
);

setMinAmount("");
setMinAmountPlanId("");
}

async function handleSetPairAddress() {
if (!pairAddress) {
toast.error("Please enter pair address!");
return;
}

await runTx(
async () => {
const c = getContract();
const tx = await c.setPairAddress(pairAddress);
await tx.wait();
},
"Pair address updated! ✅",
"set-pair-address"
);

setPairAddress("");
}

async function handleSetPriceFeed() {
if (!priceFeed) {
toast.error("Please enter price feed address!");
return;
}

await runTx(
async () => {
const c = getContract();
const tx = await c.setPriceFeed(priceFeed);
await tx.wait();
},
"Price feed updated! ✅",
"set-price-feed"
);

setPriceFeed("");
}

async function handleSetEmergencyMode(status) {
await runTx(
async () => {
const c = getContract();
const tx = await c.setEmergencyMode(status);
await tx.wait();
},
`Emergency mode ${status ? "ON" : "OFF"}! ✅`,
status ? "emergency-mode-on" : "emergency-mode-off"
);
}

async function handleWithdrawStuck() {
if (!stuckToken || !stuckAmount) {
toast.error("Please enter token address and amount!");
return;
}

await runTx(
async () => {
const c = getContract();
const tx = await c.withdrawStuckTokens(
stuckToken,
ethers.parseEther(stuckAmount)
);
await tx.wait();
},
"Tokens withdrawn! ✅",
"withdraw-stuck"
);

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

function AdminButton({
onClick,
label,
color = "yellow",
disabled = false,
isLoading = false,
}) {
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
disabled={isLoading || disabled}
className={`${colors[color]} px-4 py-2 rounded font-semibold text-sm transition disabled:opacity-50`}
>
{isLoading ? "Processing..." : label}
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
{account?.slice(0, 6)}...{account?.slice(-4)}
</p>
<p className="text-gray-500 text-xs mt-1">
Role: {isFullAdmin ? "Full Admin" : isViewer ? "Viewer" : "User"}
</p>
</div>

{/* Stats */}  
  <div className="grid grid-cols-3 gap-4 mb-4">  
    <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">  
      <p className="text-gray-400 text-xs">Total Staked</p>  
      <p className="text-yellow-400 text-xl font-bold mt-1">  
        {Number(stats.totalStaked).toLocaleString()} CrypPay (CRP)  
      </p>  
      <p className="text-gray-500 text-xs">  
        ≈ ₹{crpToINR(Number(stats.totalStaked))}  
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
        {Number(stats.maxTVL) === 0  
          ? "No Cap"  
          : `${Number(stats.maxTVL).toLocaleString()} CrypPay (CRP)`}  
      </p>  
    </div>  
  </div>  

  {/* Extended Stats Row */}  
  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">  
    <div className="bg-gray-800 rounded-xl p-4 border border-yellow-500/20">  
      <p className="text-gray-400 text-xs">CrypPay (CRP) Coin Price</p>  
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
        {Number(totalDistributed).toLocaleString()} CrypPay (CRP)  
      </p>  
    </div>  
    <div className="bg-gray-800 rounded-xl p-4 border border-yellow-500/20">  
      <p className="text-gray-400 text-xs">Total Withdrawn</p>  
      <p className="text-orange-400 text-lg font-bold mt-1">  
        {Number(totalWithdrawn).toLocaleString()} CrypPay (CRP)  
      </p>  
    </div>  
  </div>  

  {/* Today's Overview */}  
  <div className="bg-gray-800 border border-yellow-500/30 rounded-xl p-5 mb-8">  
    <h2 className="text-yellow-400 font-bold text-lg mb-4">  
      📅 Today's Overview  
    </h2>  
    {(() => {  
      const todayStart = Math.floor(new Date().setHours(0, 0, 0, 0) / 1000);  
      const todayEvts = txEvents.filter((e) => e.timestamp >= todayStart);  
      const todayStakes = todayEvts.filter((e) => e.type === "Stake");  
      const todayClaims = todayEvts.filter((e) => e.type === "Claim");  
      const todayWithdraws = todayEvts.filter(  
        (e) => e.type === "Withdraw" || e.type === "Emergency"  
      );  
      const todayStakedCRP = todayStakes.reduce((s, e) => s + Number(e.amount), 0);  
      const todayClaimedCRP = todayClaims.reduce((s, e) => s + Number(e.amount), 0);  
      const todayWithdrawnCRP = todayWithdraws.reduce((s, e) => s + Number(e.amount), 0);  

      return (  
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">  
          <div className="text-center">  
            <p className="text-gray-400 text-xs mb-1">Stakes Today</p>  
            <p className="text-green-400 font-bold text-lg">  
              {todayStakes.length}  
            </p>  
            <p className="text-gray-500 text-xs">  
              {todayStakedCRP.toLocaleString()} CrypPay (CRP)  
            </p>  
          </div>  
          <div className="text-center">  
            <p className="text-gray-400 text-xs mb-1">Claims Today</p>  
            <p className="text-yellow-400 font-bold text-lg">  
              {todayClaims.length}  
            </p>  
            <p className="text-gray-500 text-xs">  
              {todayClaimedCRP.toLocaleString()} CrypPay (CRP)  
            </p>  
          </div>  
          <div className="text-center">  
            <p className="text-gray-400 text-xs mb-1">Withdrawals Today</p>  
            <p className="text-orange-400 font-bold text-lg">  
              {todayWithdraws.length}  
            </p>  
            <p className="text-gray-500 text-xs">  
              {todayWithdrawnCRP.toLocaleString()} CrypPay (CRP)  
            </p>  
          </div>  
          <div className="text-center">  
            <p className="text-gray-400 text-xs mb-1">Total CrypPay (CRP) Moved</p>  
            <p className="text-white font-bold text-lg">  
              {(todayStakedCRP + todayClaimedCRP + todayWithdrawnCRP).toLocaleString()}  
            </p>  
            <p className="text-gray-500 text-xs">CrypPay (CRP)</p>  
          </div>  
        </div>  
      );  
    })()}  
    {txEvents.length === 0 && (  
      <p className="text-gray-500 text-xs text-center mt-3">  
        Load events from History tab to see today's data  
      </p>  
    )}  
  </div>  

  {/* Emergency Mode Banner */}  
  {emergencyMode && (  
    <div className="bg-red-900/50 border border-red-500 rounded-xl p-4 mb-6 flex justify-between items-center">  
      <span className="text-red-400 font-semibold">  
        ⚠️ Emergency Mode is ACTIVE  
      </span>  

      {isFullAdmin ? (  
        <AdminButton  
          onClick={() => handleSetEmergencyMode(false)}  
          label="Deactivate Emergency"  
          color="green"  
        />  
      ) : (  
        <span className="text-gray-300 text-sm">Viewer mode</span>  
      )}  
    </div>  
  )}  

  {/* Tabs */}  
  <div className="flex gap-2 mb-6 border-b border-gray-700 pb-2">  
    {(isFullAdmin  
      ? ["plans", "create", "analytics", "history", "users", "settings", "emergency"]  
      : ["plans", "analytics", "history", "users"]  
    ).map((tab) => (  
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
        {tab === "history" && "📜 History"}  
        {tab === "users" && "👤 Users"}  
        {tab === "settings" && "⚙️ Settings"}  
        {tab === "emergency" && "🚨 Emergency"}  
      </button>  
    ))}  
  </div>  

  {/* ── TAB: PLANS ── */}

{activeTab === "plans" && (

  <div className="space-y-4">  
    {plans.length === 0 ? (  
      <p className="text-gray-400 text-center py-10">No plans found</p>  
    ) : (  
      plans.map((plan, index) => (  
        <div  
          key={index}  
          className="bg-gray-800 border border-gray-700 rounded-xl p-5"  
        >  
          <div className="flex justify-between items-start mb-3 gap-4">  
            <div>  
              <span className="text-yellow-400 font-bold text-lg">  
                Plan #{index} — {plan.name}  
              </span>  <div className="flex gap-2 mt-1 flex-wrap">  
            <span  
              className={`text-xs px-2 py-0.5 rounded-full ${  
                plan.active  
                  ? "bg-green-900 text-green-400"  
                  : "bg-red-900 text-red-400"  
              }`}  
            >  
              {plan.active ? "Active" : "Disabled"}  
            </span>  

            {planPausedStatus[index] && (  
              <span className="text-xs px-2 py-0.5 rounded-full bg-orange-900 text-orange-400">  
                Paused ⏸️  
              </span>  
            )}  

            {planClaimPausedStatus[index] && (  
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-900 text-blue-400">  
                Claim Paused 🧾  
              </span>  
            )}  

            {planEmergencyStatus[index] && (  
              <span className="text-xs px-2 py-0.5 rounded-full bg-red-900 text-red-400">  
                Emergency 🚨  
              </span>  
            )}  

            {planEmergencyWithdrawPausedStatus[index] && (  
              <span className="text-xs px-2 py-0.5 rounded-full bg-sky-900 text-sky-400">  
                E-Withdraw Paused ⛔  
              </span>  
            )}  
          </div>  
        </div>  

        {isFullAdmin && (  
          <div className="flex gap-2 flex-wrap justify-end">  
            <AdminButton  
              onClick={() => handleTogglePause(index)}  
              label={planPausedStatus[index] ? "Resume" : "Pause"}  
              color="orange"  
              isLoading={loadingAction === `plan-${index}-pause`}  
            />  

            <AdminButton  
              onClick={() => handleTogglePlanClaimPause(index)}  
              label={planClaimPausedStatus[index] ? "Claim On" : "Claim Off"}  
              color="blue"  
              isLoading={loadingAction === `plan-${index}-claim-pause`}  
            />  

            <AdminButton  
              onClick={() => handleTogglePlanEmergency(index)}  
              label="Emergency"  
              color="red"  
              isLoading={loadingAction === `plan-${index}-emergency`}  
            />  

            <AdminButton  
              onClick={() => handleTogglePlanEmergencyWithdrawPause(index)}  
              label={  
                planEmergencyWithdrawPausedStatus[index]  
                  ? "E-Withdraw On"  
                  : "E-Withdraw Off"  
              }  
              color="blue"  
              isLoading={loadingAction === `plan-${index}-ew-pause`}  
            />  

            {plan.active ? (  
              <AdminButton  
                onClick={() => handleDisablePlan(index)}  
                label="Disable"  
                color="red"  
                isLoading={loadingAction === `plan-${index}-disable`}  
              />  
            ) : (  
              <AdminButton  
                onClick={() => handleEnablePlan(index)}  
                label="Enable"  
                color="green"  
                isLoading={loadingAction === `plan-${index}-enable`}  
              />  
            )}  
          </div>  
        )}  
      </div>  

      <div className="grid grid-cols-5 gap-3 text-sm">  
        <div>  
          <p className="text-gray-400 text-xs">Lock Period</p>  
          <p className="text-white">  
            {Number(plan.lockPeriod) >= 2592000  
              ? `${(Number(plan.lockPeriod) / 2592000).toFixed(0)} Months`  
              : Number(plan.lockPeriod) >= 86400  
              ? `${(Number(plan.lockPeriod) / 86400).toFixed(0)} Days`  
              : Number(plan.lockPeriod) >= 3600  
              ? `${(Number(plan.lockPeriod) / 3600).toFixed(0)} Hours`  
              : Number(plan.lockPeriod) >= 60  
              ? `${(Number(plan.lockPeriod) / 60).toFixed(0)} Min`  
              : `${Number(plan.lockPeriod)} Sec`}  
          </p>  
        </div>  

        <div>  
          <p className="text-gray-400 text-xs">Release %</p>  
          <p className="text-white">  
            {plan.releasePercent.toString()}% / interval  
          </p>  
        </div>  

        <div>  
          <p className="text-gray-400 text-xs">Claim Interval</p>  
          <p className="text-white">  
            {Number(plan.claimInterval) >= 86400  
              ? `${(Number(plan.claimInterval) / 86400).toFixed(0)} Days`  
              : Number(plan.claimInterval) >= 3600  
              ? `${(Number(plan.claimInterval) / 3600).toFixed(0)} Hours`  
              : Number(plan.claimInterval) >= 60  
              ? `${(Number(plan.claimInterval) / 60).toFixed(0)} Min`  
              : `${Number(plan.claimInterval)} Sec`}  
          </p>  
        </div>  

        <div>  
          <p className="text-gray-400 text-xs">Min Stake</p>  
          <p className="text-white">  
            {formatAmount(plan.minTokenAmount)} CrypPay (CRP)  
          </p>  
          <p className="text-gray-500 text-xs">  
            ≈ ₹{crpToINR(Number(ethers.formatEther(plan.minTokenAmount)))}  
          </p>  
        </div>  

        <div>  
          <p className="text-gray-400 text-xs">Total Staked</p>  
          <p className="text-yellow-400 font-bold">  
            {Number(planStakedAmounts[index] || 0).toLocaleString()} CrypPay (CRP)  
          </p>  
          <p className="text-gray-500 text-xs">  
            ≈ ₹{crpToINR(Number(planStakedAmounts[index] || 0))}  
          </p>  
        </div>  
      </div>  
    </div>  
  ))  
)}

  </div>  
)}  {/* ── TAB: CREATE PLAN ── */}  
  {activeTab === "create" && (  
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 max-w-xl">  
      <h2 className="text-white font-bold text-lg mb-5">➕ New Staking Plan</h2>  
      <div className="space-y-4">  
        <InputField  
          label="Plan Name"  
          value={planForm.name}  
          onChange={(v) => setPlanForm({ ...planForm, name: v })}  
          placeholder="e.g. CrypPay Stake 12M"  
        />  
        <InputField  
          label="Lock Period (seconds)"  
          value={planForm.lockPeriod}  
          onChange={(v) => setPlanForm({ ...planForm, lockPeriod: v })}  
          placeholder="e.g. 31104000 (12 months)"  
          type="number"  
        />  
        <InputField  
          label="Release Percent per Interval"  
          value={planForm.releasePercent}  
          onChange={(v) => setPlanForm({ ...planForm, releasePercent: v })}  
          placeholder="e.g. 8 (for 12 intervals)"  
          type="number"  
        />  
        <InputField  
          label="Claim Interval (seconds)"  
          value={planForm.claimInterval}  
          onChange={(v) => setPlanForm({ ...planForm, claimInterval: v })}  
          placeholder="e.g. 2592000 (30 days)"  
          type="number"  
        />  
        <InputField  
          label="Min CrypPay (CRP) Amount"  
          value={planForm.minTokenAmount}  
          onChange={(v) => setPlanForm({ ...planForm, minTokenAmount: v })}  
          placeholder="e.g. 15000"  
          type="number"  
        />  
        <AdminButton onClick={handleCreatePlan} label="Create Plan" color="yellow" />  
      </div>  
    </div>  
  )}  

  {/* ── TAB: ANALYTICS ── */}  
  {activeTab === "analytics" && (  
    <div className="space-y-6">  
      {/* Per-Plan Stats */}  
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">  
        <h2 className="text-white font-bold text-lg mb-5">📋 Per-Plan Breakdown</h2>  
        {plans.length === 0 ? (  
          <p className="text-gray-400 text-center py-6">No plans found</p>  
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
              <div  
                key={index}  
                className="grid grid-cols-6 gap-2 px-5 py-3 text-sm border-b border-gray-700/50 items-center"  
              >  
                <span className="text-gray-500 text-xs">{index}</span>  
                <span className="text-yellow-400 font-semibold text-xs truncate">  
                  {plan.name}  
                </span>  
                <span className="text-white font-bold text-xs">  
                  {Number(planStakedAmounts[index] || 0).toLocaleString()} CrypPay (CRP)  
                </span>  
                <span  
                  className={`text-xs px-2 py-0.5 rounded-full font-semibold inline-block w-fit ${  
                    plan.active  
                      ? "bg-green-900 text-green-400"  
                      : "bg-red-900 text-red-400"  
                  }`}  
                >  
                  {plan.active ? "Active" : "Disabled"}  
                </span>  
                <span  
                  className={`text-xs font-semibold ${  
                    planPausedStatus[index] ? "text-orange-400" : "text-gray-500"  
                  }`}  
                >  
                  {planPausedStatus[index] ? "Yes ⏸️" : "No"}  
                </span>  
                <span  
                  className={`text-xs font-semibold ${  
                    planEmergencyStatus[index] ? "text-red-400" : "text-gray-500"  
                  }`}  
                >  
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
            <p  
              className={`font-bold text-lg ${  
                emergencyMode ? "text-red-400" : "text-green-400"  
              }`}  
            >  
              {emergencyMode ? "🔴 ACTIVE" : "🟢 INACTIVE"}  
            </p>  
          </div>  
          <div>  
            <p className="text-gray-400 text-xs">Active Plans</p>  
            <p className="text-green-400 font-bold text-lg">  
              {plans.filter((p) => p.active).length} / {plans.length}  
            </p>  
          </div>  
          <div>  
            <p className="text-gray-400 text-xs">Paused Plans</p>  
            <p className="text-orange-400 font-bold text-lg">  
              {Object.values(planPausedStatus).filter((v) => v).length}  
            </p>  
          </div>  
        </div>  
      </div>  

      {/* Token & Price Details */}  
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">  
        <h2 className="text-white font-bold text-lg mb-5">💰 Token & Price Details</h2>  
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">  
          <div>  
            <p className="text-gray-400 text-xs">TWAP Price</p>  
            <p className="text-yellow-400 font-bold text-lg">  
              ${Number(twapPrice) > 0 ? Number(twapPrice).toFixed(6) : "N/A"}  
            </p>  
          </div>  
          <div>  
            <p className="text-gray-400 text-xs">CrypPay (CRP) Contract Address</p>  
            <a  
              href={`${BSCSCAN_BASE_URL}/address/${tokenAddress}`}  
              target="_blank"  
              rel="noopener noreferrer"  
              className="text-blue-400 text-xs hover:underline break-all"  
            >  
              {tokenAddress  
                ? `${tokenAddress.slice(0, 10)}...${tokenAddress.slice(-8)}`  
                : "N/A"}  
            </a>  
          </div>  
          <div>  
            <p className="text-gray-400 text-xs">Protocol Paused</p>  
            <p  
              className={`font-bold text-lg ${  
                protocolPaused ? "text-red-400" : "text-green-400"  
              }`}  
            >  
              {protocolPaused ? "🔴 YES" : "🟢 NO"}  
            </p>  
          </div>  
        </div>  
      </div>  
    </div>  
  )}  

  {/* ── TAB: HISTORY ── */}  
  {activeTab === "history" && (  
    <div className="space-y-6">  
      <div className="flex justify-between items-center">  
        <h2 className="text-white font-bold text-lg">📜 Transaction History</h2>  
        <button  
          onClick={async () => {  
            setEventsLoading(true);  
            try {  
              const events = await fetchContractEvents();  
              setTxEvents(events || []);  
            } catch (err) {  
              console.error(err);  
              toast.error("Events load failed");  
            } finally {  
              setEventsLoading(false);  
            }  
          }}  
          className="text-sm bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded transition"  
        >  
          {eventsLoading ? "⏳ Loading..." : "🔄 Reload Events"}  
        </button>  
      </div>  

      {/* Auto-load handled by useEffect */}  
      {eventsLoading && txEvents.length === 0 && (  
        <div className="text-center py-16 text-gray-400">  
          <p className="text-5xl mb-4">⏳</p>  
          <p className="text-lg">Loading events...</p>  
        </div>  
      )}  

      {txEvents.length === 0 && !eventsLoading ? (  
        <div className="text-center py-16 text-gray-400">  
          <p className="text-5xl mb-4">📜</p>  
          <p className="text-lg">No transaction records found</p>  
          <p className="text-sm mt-2">  
            Click Reload Events or try again later  
          </p>  
        </div>  
      ) : (  
        <>  
          {/* Summary */}  
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">  
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 text-center">  
              <p className="text-gray-400 text-xs mb-1">Total Transactions</p>  
              <p className="text-white font-bold text-lg">{txEvents.length}</p>  
            </div>  
            <div className="bg-gray-800 border border-green-500/20 rounded-xl p-4 text-center">  
              <p className="text-gray-400 text-xs mb-1">Stakes</p>  
              <p className="text-green-400 font-bold text-lg">  
                {txEvents.filter((e) => e.type === "Stake").length}  
              </p>  
            </div>  
            <div className="bg-gray-800 border border-yellow-500/20 rounded-xl p-4 text-center">  
              <p className="text-gray-400 text-xs mb-1">Claims</p>  
              <p className="text-yellow-400 font-bold text-lg">  
                {txEvents.filter((e) => e.type === "Claim").length}  
              </p>  
            </div>  
            <div className="bg-gray-800 border border-orange-500/20 rounded-xl p-4 text-center">  
              <p className="text-gray-400 text-xs mb-1">Withdrawals</p>  
              <p className="text-orange-400 font-bold text-lg">  
                {txEvents.filter(  
                  (e) => e.type === "Withdraw" || e.type === "Emergency"  
                ).length}  
              </p>  
            </div>  
          </div>  

          {/* Today's Transactions — Detailed */}  
          {(() => {  
            const todayStart = Math.floor(new Date().setHours(0, 0, 0, 0) / 1000);  
            const todayEvents = txEvents.filter((e) => e.timestamp >= todayStart);  
            const todayStakedCRP = todayEvents  
              .filter((e) => e.type === "Stake")  
              .reduce((s, e) => s + Number(e.amount), 0);  
            const todayClaimedCRP = todayEvents  
              .filter((e) => e.type === "Claim")  
              .reduce((s, e) => s + Number(e.amount), 0);  
            const todayWithdrawnCRP = todayEvents  
              .filter((e) => e.type === "Withdraw" || e.type === "Emergency")  
              .reduce((s, e) => s + Number(e.amount), 0);  
            const todayWallets = [...new Set(todayEvents.map((e) => e.user))].length;  

            return (  
              <div className="bg-gray-800 border border-yellow-500/30 rounded-xl p-5">  
                <h3 className="text-yellow-400 font-bold mb-4">  
                  📅 Today's Activity ({todayEvents.length} transactions)  
                </h3>  

                {/* Today Summary */}  
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">  
                  <div className="bg-gray-900 rounded-lg p-3 text-center">  
                    <p className="text-gray-400 text-xs">Transactions</p>  
                    <p className="text-white font-bold">{todayEvents.length}</p>  
                  </div>  
                  <div className="bg-gray-900 rounded-lg p-3 text-center">  
                    <p className="text-gray-400 text-xs">Staked</p>  
                    <p className="text-green-400 font-bold">  
                      {todayStakedCRP.toLocaleString()} CrypPay (CRP)  
                    </p>  
                  </div>  
                  <div className="bg-gray-900 rounded-lg p-3 text-center">  
                    <p className="text-gray-400 text-xs">Claimed</p>  
                    <p className="text-yellow-400 font-bold">  
                      {todayClaimedCRP.toLocaleString()} CrypPay (CRP)  
                    </p>  
                  </div>  
                  <div className="bg-gray-900 rounded-lg p-3 text-center">  
                    <p className="text-gray-400 text-xs">Withdrawn</p>  
                    <p className="text-orange-400 font-bold">  
                      {todayWithdrawnCRP.toLocaleString()} CrypPay (CRP)  
                    </p>  
                  </div>  
                  <div className="bg-gray-900 rounded-lg p-3 text-center">  
                    <p className="text-gray-400 text-xs">Wallets</p>  
                    <p className="text-blue-400 font-bold">{todayWallets}</p>  
                  </div>  
                </div>  

                {todayEvents.length === 0 ? (  
                  <p className="text-gray-400 text-sm">No transactions today</p>  
                ) : (  
                  <div className="bg-gray-900 border border-gray-700 rounded-xl overflow-hidden">  
                    <div className="grid grid-cols-7 gap-2 px-4 py-2 bg-gray-900 text-gray-400 text-xs font-semibold border-b border-gray-700">  
                      <span>Type</span>  
                      <span>Wallet</span>  
                      <span>Amount</span>  
                      <span>Plan</span>  
                      <span>Time</span>  
                      <span>Block</span>  
                      <span className="text-right">Tx Hash</span>  
                    </div>  
                    {todayEvents.map((evt, idx) => (  
                      <div  
                        key={idx}  
                        className="grid grid-cols-7 gap-2 px-4 py-2 text-xs border-b border-gray-700/50 items-center"  
                      >  
                        <span  
                          className={`px-2 py-0.5 rounded-full font-semibold inline-block w-fit ${  
                            evt.type === "Stake"  
                              ? "bg-green-900 text-green-400"  
                              : evt.type === "Claim"  
                              ? "bg-yellow-900 text-yellow-400"  
                              : evt.type === "Withdraw"  
                              ? "bg-orange-900 text-orange-400"  
                              : "bg-red-900 text-red-400"  
                          }`}  
                        >  
                          {evt.type}  
                        </span>  
                        <a  
                          href={`${BSCSCAN_BASE_URL}/address/${evt.user}`}  
                          target="_blank"  
                          rel="noopener noreferrer"  
                          className="text-blue-400 hover:underline truncate"  
                        >  
                          {evt.user?.slice(0, 6)}...{evt.user?.slice(-4)}  
                        </a>  
                        <span className="text-white font-semibold">  
                          {Number(evt.amount).toLocaleString()} CRP  
                        </span>  
                        <span className="text-gray-400 truncate">  
                          {evt.planName || "—"}  
                        </span>  
                        <span className="text-gray-300">  
                          {evt.timestamp  
                            ? new Date(evt.timestamp * 1000).toLocaleTimeString("en-IN", {  
                                hour: "2-digit",  
                                minute: "2-digit",  
                              })  
                            : "—"}  
                        </span>  
                        <span className="text-gray-500">{evt.blockNumber}</span>
                        {(() => {
                          const txH = typeof evt.txHash === "string" ? evt.txHash.trim() : "";
                          const valid = /^0x([A-Fa-f0-9]{64})$/.test(txH);
                          return valid ? (
                            <a  
                              href={`${BSCSCAN_BASE_URL}/tx/${txH}`}  
                              target="_blank"  
                              rel="noopener noreferrer"  
                              className="text-blue-400 hover:underline text-right truncate"
                              title={txH}
                            >  
                              {txH.slice(0, 6)}...{txH.slice(-4)}
                            </a>
                          ) : (
                            <span className="text-gray-500 text-right">—</span>
                          );
                        })()}
                      </div>  
                    ))}  
                  </div>  
                )}  
              </div>  
            );  
          })()}  

          {/* All Transactions Table */}  
          <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">  
            <div
              className="grid gap-2 px-5 py-3 bg-gray-900 text-gray-400 text-xs font-semibold border-b border-gray-700"
              style={{ gridTemplateColumns: "65px 90px 1fr 90px 85px 100px 70px" }}
            >
              <span>Type</span>  
              <span>Wallet</span>  
              <span>Amount</span>  
              <span>Date</span>  
              <span>Block</span>  
              <span>Tx Hash</span>
              <span className="text-right">Link</span>  
            </div>  

            {txEvents.map((evt, idx) => {
              const txHash = typeof evt.txHash === "string" ? evt.txHash.trim() : "";
              const validTxHash = /^0x([A-Fa-f0-9]{64})$/.test(txHash);

              return (
              <div  
                key={idx}  
                className="grid gap-2 px-5 py-3 text-sm border-b border-gray-700/50 items-center"
                style={{ gridTemplateColumns: "65px 90px 1fr 90px 85px 100px 70px" }}
              >  
                <span  
                  className={`text-xs px-2 py-0.5 rounded-full font-semibold inline-block w-fit ${  
                    evt.type === "Stake"  
                      ? "bg-green-900 text-green-400"  
                      : evt.type === "Claim"  
                      ? "bg-yellow-900 text-yellow-400"  
                      : evt.type === "Withdraw"  
                      ? "bg-orange-900 text-orange-400"  
                      : "bg-red-900 text-red-400"  
                  }`}  
                >  
                  {evt.type}  
                </span>  

                <a  
                  href={`${BSCSCAN_BASE_URL}/address/${evt.user}`}  
                  target="_blank"  
                  rel="noopener noreferrer"  
                  className="text-xs text-blue-400 hover:underline truncate"  
                >  
                  {evt.user?.slice(0, 6)}...{evt.user?.slice(-4)}  
                </a>  

                <span className="text-white font-semibold text-xs">  
                  {Number(evt.amount).toLocaleString()} CRP  
                </span>  

                <span className="text-gray-300 text-xs">  
                  {evt.timestamp  
                    ? new Date(evt.timestamp * 1000).toLocaleDateString("en-IN", {  
                        day: "2-digit",  
                        month: "short",  
                        year: "numeric",  
                      })  
                    : "—"}  
                </span>  

                <span className="text-gray-500 text-xs">{evt.blockNumber}</span>

                {/* Tx Hash Number */}
                <span className="text-gray-400 text-xs truncate font-mono" title={txHash || "—"}>
                  {validTxHash ? `${txHash.slice(0, 6)}...${txHash.slice(-4)}` : "—"}
                </span>

                {/* BscScan Link */}
                {validTxHash ? (
                  <a  
                    href={`${BSCSCAN_BASE_URL}/tx/${txHash}`}  
                    target="_blank"  
                    rel="noopener noreferrer"  
                    className="text-xs text-blue-400 hover:underline text-right"  
                  >  
                    View 🔗
                  </a>
                ) : (
                  <span className="text-xs text-gray-500 text-right">—</span>
                )}
              </div>
              );
            })}  

            <div
              className="grid gap-2 px-5 py-3 bg-gray-900 text-xs font-bold border-t border-gray-700"
              style={{ gridTemplateColumns: "65px 90px 1fr 90px 85px 100px 70px" }}
            >
              <span className="text-gray-400">Total</span>  
              <span className="text-gray-400">  
                {[...new Set(txEvents.map((e) => e.user))].length} wallets  
              </span>  
              <span className="text-white">  
                {txEvents.reduce((s, e) => s + Number(e.amount), 0).toLocaleString()} CRP  
              </span>  
              <span></span>  
              <span></span>
              <span></span>
              <span className="text-gray-400 text-right">  
                {txEvents.length} txns  
              </span>  
            </div>  
          </div>  
        </>  
      )}  
    </div>  
  )}  

  {/* ── TAB: USERS ── */}  
  {activeTab === "users" && (  
    <div className="space-y-6">  
      {/* Search Bar */}  
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">  
        <h2 className="text-white font-bold text-lg mb-4">👤 User Lookup</h2>  
        <div className="flex gap-3 mb-4">  
          <input  
            type="text"  
            value={searchWallet}  
            onChange={(e) => setSearchWallet(e.target.value)}  
            placeholder="Enter wallet address (0x...)"  
            className="flex-1 bg-gray-900 border border-gray-600 rounded px-4 py-2 text-white text-sm focus:outline-none focus:border-yellow-500"  
          />  
          <button  
            onClick={async () => {  
              if (!searchWallet || !searchWallet.startsWith("0x")) {  
                toast.error("Please enter a valid wallet address!");  
                return;  
              }  
              setSearchLoading(true);  
              try {  
                const stks = await fetchUserStakes(searchWallet);  
                setSearchedStakes(stks);  
                setSearchedAddress(searchWallet);  

                const cls = [];  
                for (let i = 0; i < stks.length; i++) {  
                  const c = await fetchClaimable(searchWallet, i);  
                  cls.push(c);  
                }  
                setSearchedClaimables(cls);  
              } catch (err) {  
                console.error(err);  
                toast.error("Failed to fetch user data");  
              } finally {  
                setSearchLoading(false);  
              }  
            }}  
            disabled={searchLoading}  
            className="bg-yellow-500 hover:bg-yellow-400 text-black px-6 py-2 rounded font-semibold text-sm transition disabled:opacity-50"  
          >  
            {searchLoading ? "Searching..." : "🔍 Search"}  
          </button>  
        </div>  

        {/* Load All Users Button */}  
        <button  
          onClick={async () => {  
            setUsersLoading(true);  
            try {  
              // ✅ FIX: Auto-load events if not available
              let currentEvents = txEvents;
              if (currentEvents.length === 0) {
                try {
                  const loadedEvents = await fetchContractEvents();
                  currentEvents = loadedEvents || [];
                  setTxEvents(currentEvents);
                } catch (evtErr) {
                  console.error("Events load for users:", evtErr);
                }
              }

              let wallets = [...new Set(currentEvents.map((e) => e.user).filter(Boolean))];

              if (wallets.length === 0) {  
                toast.error("No user events found. Try again later.");
                setUsersLoading(false);  
                return;  
              }  

              const usersData = [];  
              for (const wallet of wallets) {  
                try {  
                  const stks = await fetchUserStakes(wallet);  
                  const totalStaked = stks.reduce(  
                    (s, st) => s + Number(ethers.formatUnits(st.amount || 0, 18)),  
                    0  
                  );  
                  const totalClaimed = stks.reduce(  
                    (s, st) => s + Number(ethers.formatUnits(st.claimed || 0, 18)),  
                    0  
                  );  
                  const activeCount = stks.filter((s) => !s.withdrawn).length;  
                  const withdrawnCount = stks.filter((s) => s.withdrawn).length;  

                  usersData.push({  
                    wallet,  
                    stakes: stks,  
                    totalStaked,  
                    totalClaimed,  
                    stakeCount: stks.length,  
                    activeCount,  
                    withdrawnCount,  
                  });  
                } catch {  
                  continue;  
                }  
              }  

              setAllUsersData(usersData);  
            } catch (err) {  
              console.error(err);  
              toast.error("Failed to load users");  
            } finally {  
              setUsersLoading(false);  
            }  
          }}  
          disabled={usersLoading}  
          className="w-full bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded font-semibold text-sm transition disabled:opacity-50"  
        >  
          {usersLoading ? "Loading Users..." : "📋 Load All Users (from Events)"}  
        </button>  
      </div>  

      {/* All Users List */}  
      {allUsersData.length > 0 && (  
        <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">  
          <div className="px-5 py-3 bg-gray-900 border-b border-gray-700">  
            <h3 className="text-white font-bold">  
              All Stakers ({allUsersData.length} users)  
            </h3>  
          </div>  

          <div className="grid grid-cols-7 gap-2 px-5 py-2 bg-gray-900 text-gray-400 text-xs font-semibold border-b border-gray-700">  
            <span>#</span>  
            <span>Wallet</span>  
            <span>Total Staked</span>  
            <span>Total Claimed</span>  
            <span>Stakes</span>  
            <span>Active</span>  
            <span className="text-right">INR Value</span>  
          </div>  

          {allUsersData.map((user, idx) => (  
            <div  
              key={idx}  
              className="grid grid-cols-7 gap-2 px-5 py-3 text-sm border-b border-gray-700/50 items-center cursor-pointer hover:bg-gray-700/30 transition"  
              onClick={() => {  
                setSearchWallet(user.wallet);  
                setSearchedAddress(user.wallet);  
                setSearchedStakes(user.stakes);  
                setSearchedClaimables([]);  
              }}  
            >  
              <span className="text-gray-500 text-xs">{idx + 1}</span>  
              <a  
                href={`${BSCSCAN_BASE_URL}/address/${user.wallet}`}  
                target="_blank"  
                rel="noopener noreferrer"  
                className="text-blue-400 text-xs hover:underline truncate"  
              >  
                {user.wallet.slice(0, 6)}...{user.wallet.slice(-4)}  
              </a>  
              <span className="text-yellow-400 font-semibold text-xs">  
                {user.totalStaked.toLocaleString()} CrypPay (CRP)  
              </span>  
              <span className="text-green-400 text-xs">  
                {user.totalClaimed.toLocaleString()} CrypPay (CRP)  
              </span>  
              <span className="text-white text-xs">{user.stakeCount}</span>  
              <span className="text-blue-400 text-xs">  
                {user.activeCount} active  
              </span>  
              <span className="text-gray-400 text-xs text-right">  
                ₹{crpToINR(user.totalStaked)}  
              </span>  
            </div>  
          ))}  

          <div className="grid grid-cols-7 gap-2 px-5 py-3 bg-gray-900 text-xs font-bold border-t border-gray-700">  
            <span className="text-gray-400">Total</span>  
            <span className="text-gray-400">{allUsersData.length} users</span>  
            <span className="text-yellow-400">  
              {allUsersData.reduce((s, u) => s + u.totalStaked, 0).toLocaleString()} CrypPay (CRP)  
            </span>  
            <span className="text-green-400">  
              {allUsersData.reduce((s, u) => s + u.totalClaimed, 0).toLocaleString()} CrypPay (CRP)  
            </span>  
            <span className="text-white">  
              {allUsersData.reduce((s, u) => s + u.stakeCount, 0)}  
            </span>  
            <span className="text-blue-400">  
              {allUsersData.reduce((s, u) => s + u.activeCount, 0)} active  
            </span>  
            <span className="text-gray-400 text-right">  
              ₹{crpToINR(allUsersData.reduce((s, u) => s + u.totalStaked, 0))}  
            </span>  
          </div>  
        </div>  
      )}  

      {/* Individual User Detail */}  
      {searchedAddress && (  
        <>  
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">  
            <div className="flex justify-between items-center mb-4">  
              <div>  
                <h3 className="text-white font-bold">  
                  Wallet:{" "}  
                  <a  
                    href={`${BSCSCAN_BASE_URL}/address/${searchedAddress}`}  
                    target="_blank"  
                    rel="noopener noreferrer"  
                    className="text-blue-400 hover:underline"  
                  >  
                    {searchedAddress.slice(0, 10)}...{searchedAddress.slice(-8)}  
                  </a>  
                </h3>  
                <p className="text-gray-400 text-xs mt-1">  
                  Total Stakes: {searchedStakes.length}  
                </p>  
              </div>  
            </div>  

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">  
              <div className="bg-gray-900 rounded-lg p-3 text-center">  
                <p className="text-gray-400 text-xs">Total Staked</p>  
                <p className="text-yellow-400 font-bold">  
                  {searchedStakes  
                    .reduce(  
                      (s, st) => s + Number(ethers.formatUnits(st.amount || 0, 18)),  
                      0  
                    )  
                    .toLocaleString()}{" "}  
                  CrypPay (CRP)  
                </p>  
                <p className="text-gray-500 text-xs">  
                  ≈ ₹  
                  {crpToINR(  
                    searchedStakes.reduce(  
                      (s, st) => s + Number(ethers.formatUnits(st.amount || 0, 18)),  
                      0  
                    )  
                  )}  
                </p>  
              </div>  
              <div className="bg-gray-900 rounded-lg p-3 text-center">  
                <p className="text-gray-400 text-xs">Total Claimed</p>  
                <p className="text-green-400 font-bold">  
                  {searchedStakes  
                    .reduce(  
                      (s, st) => s + Number(ethers.formatUnits(st.claimed || 0, 18)),  
                      0  
                    )  
                    .toLocaleString()}{" "}  
                  CrypPay (CRP)  
                </p>  
                <p className="text-gray-500 text-xs">  
                  ≈ ₹  
                  {crpToINR(  
                    searchedStakes.reduce(  
                      (s, st) => s + Number(ethers.formatUnits(st.claimed || 0, 18)),  
                      0  
                    )  
                  )}  
                </p>  
              </div>  
              <div className="bg-gray-900 rounded-lg p-3 text-center">  
                <p className="text-gray-400 text-xs">Claimable Now</p>  
                <p className="text-yellow-400 font-bold">  
                  {searchedClaimables  
                    .reduce((s, c) => s + Number(c || 0), 0)  
                    .toLocaleString()}{" "}  
                  CrypPay (CRP)  
                </p>  
              </div>  
              <div className="bg-gray-900 rounded-lg p-3 text-center">  
                <p className="text-gray-400 text-xs">Active Stakes</p>  
                <p className="text-white font-bold">  
                  {searchedStakes.filter((s) => !s.withdrawn).length}  
                </p>  
              </div>  
            </div>  
          </div>  

          {searchedStakes.length > 0 && (  
            <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">  
              <div className="grid grid-cols-9 gap-2 px-5 py-3 bg-gray-900 text-gray-400 text-xs font-semibold border-b border-gray-700">  
                <span>#</span>  
                <span>Plan</span>  
                <span>Staked</span>  
                <span>Claimed</span>  
                <span>Claimable</span>  
                <span>Start</span>  
                <span>Unlock</span>  
                <span>Status</span>  
                <span className="text-right">INR Value</span>  
              </div>  

              {searchedStakes.map((stake, i) => {  
                const planId = Number(stake.planId);  
                const plan = plans[planId];  
                const planName = plan ? plan.name : `Plan #${planId}`;  
                const stakedAmt = Number(ethers.formatUnits(stake.amount || 0, 18));  
                const claimedAmt = Number(ethers.formatUnits(stake.claimed || 0, 18));  
                const claimableAmt = Number(searchedClaimables[i] || 0);  
                const isWithdrawn = stake.withdrawn;  
                const unlocked = Date.now() / 1000 >= Number(stake.unlockTime);  
                const progressPercent = stakedAmt > 0 ? (claimedAmt / stakedAmt) * 100 : 0;  
                const fmtD = (ts) =>  
                  new Date(Number(ts) * 1000).toLocaleDateString("en-IN", {  
                    day: "2-digit",  
                    month: "short",  
                    year: "numeric",  
                  });  

                return (  
                  <div  
                    key={i}  
                    className={`grid grid-cols-9 gap-2 px-5 py-3 text-sm border-b border-gray-700/50 items-center ${  
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
                    <span className="text-yellow-400 text-xs font-semibold">  
                      {claimableAmt.toLocaleString()}  
                    </span>  
                    <span className="text-gray-300 text-xs">  
                      {fmtD(stake.startTime)}  
                    </span>  
                    <span className="text-gray-300 text-xs">  
                      {fmtD(stake.unlockTime)}  
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
                    <span className="text-gray-400 text-xs text-right">  
                      ₹{crpToINR(stakedAmt)}  
                    </span>  
                  </div>  
                );  
              })}  

              <div className="grid grid-cols-9 gap-2 px-5 py-3 bg-gray-900 text-xs font-bold border-t border-gray-700">  
                <span className="text-gray-400">Total</span>  
                <span className="text-gray-400">{searchedStakes.length} stakes</span>  
                <span className="text-white">  
                  {searchedStakes  
                    .reduce(  
                      (s, st) => s + Number(ethers.formatUnits(st.amount || 0, 18)),  
                      0  
                    )  
                    .toLocaleString()}  
                </span>  
                <span className="text-green-400">  
                  {searchedStakes  
                    .reduce(  
                      (s, st) => s + Number(ethers.formatUnits(st.claimed || 0, 18)),  
                      0  
                    )  
                    .toLocaleString()}  
                </span>  
                <span className="text-yellow-400">  
                  {searchedClaimables  
                    .reduce((s, c) => s + Number(c || 0), 0)  
                    .toLocaleString()}  
                </span>  
                <span></span>  
                <span></span>  
                <span></span>  
                <span className="text-gray-400 text-right">  
                  ₹  
                  {crpToINR(  
                    searchedStakes.reduce(  
                      (s, st) => s + Number(ethers.formatUnits(st.amount || 0, 18)),  
                      0  
                    )  
                  )}  
                </span>  
              </div>  
            </div>  
          )}  
        </>  
      )}  
    </div>  
  )}  

  {/* ── TAB: SETTINGS ── */}  
  {activeTab === "settings" && (  
    <div className="grid grid-cols-2 gap-6">  
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">  
        <h3 className="text-white font-semibold mb-4">📊 Set Max TVL</h3>  
        <div className="space-y-3">  
          <InputField  
            label="Max TVL CrypPay (CRP) — 0 = No Cap"  
            value={maxTVL}  
            onChange={setMaxTVL}  
            placeholder="e.g. 1000000"  
            type="number"  
          />  
          <AdminButton onClick={handleSetMaxTVL} label="Update MaxTVL" color="blue" />  
        </div>  
      </div>  

      <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">  
        <h3 className="text-white font-semibold mb-4">💰 Set Min Token Amount</h3>  
        <div className="space-y-3">  
          <InputField  
            label="Plan ID"  
            value={minAmountPlanId}  
            onChange={setMinAmountPlanId}  
            placeholder="e.g. 0"  
            type="number"  
          />  
          <InputField  
            label="New Min CrypPay (CRP) Amount"  
            value={minAmount}  
            onChange={setMinAmount}  
            placeholder="e.g. 10000"  
            type="number"  
          />  
          <AdminButton onClick={handleSetMinAmount} label="Update Min Amount" color="blue" />  
        </div>  
      </div>  

      <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">  
        <h3 className="text-white font-semibold mb-4">🔄 Set Pair Address (TWAP)</h3>  
        <div className="space-y-3">  
          <InputField  
            label="PancakeSwap Pair Address"  
            value={pairAddress}  
            onChange={setPairAddress}  
            placeholder="0x..."  
          />  
          <AdminButton onClick={handleSetPairAddress} label="Update Pair" color="blue" />  
        </div>  
      </div>  

      <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">  
        <h3 className="text-white font-semibold mb-4">📡 Set Price Feed (Chainlink)</h3>  
        <div className="space-y-3">  
          <InputField  
            label="Chainlink Feed Address"  
            value={priceFeed}  
            onChange={setPriceFeed}  
            placeholder="0x..."  
          />  
          <AdminButton onClick={handleSetPriceFeed} label="Update Feed" color="blue" />  
        </div>  
      </div>  

      <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 col-span-2">  
        <h3 className="text-white font-semibold mb-4">🔧 Withdraw Stuck Tokens</h3>  
        <div className="grid grid-cols-2 gap-3">  
          <InputField  
            label="Token Address"  
            value={stuckToken}  
            onChange={setStuckToken}  
            placeholder="0x..."  
          />  
          <InputField  
            label="Amount"  
            value={stuckAmount}  
            onChange={setStuckAmount}  
            placeholder="e.g. 100"  
            type="number"  
          />  
        </div>  
        <div className="mt-3">  
          <AdminButton onClick={handleWithdrawStuck} label="Withdraw Tokens" color="orange" />  
        </div>  
      </div>  

      {/* Current Addresses */}  
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 col-span-2">  
        <h3 className="text-white font-semibold mb-4">📋 Current Configuration</h3>  
        <div className="grid grid-cols-3 gap-4 text-sm">  
          <div>  
            <p className="text-gray-400 text-xs mb-1">Contract Owner</p>  
            <a  
              href={`${BSCSCAN_BASE_URL}/address/${contractOwner}`}  
              target="_blank"  
              rel="noopener noreferrer"  
              className="text-blue-400 text-xs hover:underline break-all"  
            >  
              {contractOwner  
                ? `${contractOwner.slice(0, 10)}...${contractOwner.slice(-8)}`  
                : "Loading..."}  
            </a>  
          </div>  
          <div>  
            <p className="text-gray-400 text-xs mb-1">Pair Address (TWAP)</p>  
            <a  
              href={`${BSCSCAN_BASE_URL}/address/${currentPairAddress}`}  
              target="_blank"  
              rel="noopener noreferrer"  
              className="text-blue-400 text-xs hover:underline break-all"  
            >  
              {currentPairAddress  
                ? `${currentPairAddress.slice(0, 10)}...${currentPairAddress.slice(-8)}`  
                : "Not Set"}  
            </a>  
          </div>  
          <div>  
            <p className="text-gray-400 text-xs mb-1">Price Feed (Chainlink)</p>  
            <a  
              href={`${BSCSCAN_BASE_URL}/address/${currentPriceFeed}`}  
              target="_blank"  
              rel="noopener noreferrer"  
              className="text-blue-400 text-xs hover:underline break-all"  
            >  
              {currentPriceFeed  
                ? `${currentPriceFeed.slice(0, 10)}...${currentPriceFeed.slice(-8)}`  
                : "Not Set"}  
            </a>  
          </div>  
        </div>  
      </div>  

      {/* Transfer Ownership */}  
      <div className="bg-gray-800 border border-red-700 rounded-xl p-5 col-span-2">  
        <h3 className="text-red-400 font-semibold mb-2">⚠️ Transfer Ownership</h3>  
        <p className="text-gray-400 text-xs mb-4">  
          Warning: This will transfer full admin control to the new address.  
          This action cannot be undone.  
        </p>  
        <div className="flex gap-3">  
          <div className="flex-1">  
            <InputField  
              label="New Owner Address"  
              value={newOwnerAddress}  
              onChange={setNewOwnerAddress}  
              placeholder="0x..."  
            />  
          </div>  
          <div className="flex items-end">  
            <AdminButton  
              onClick={async () => {  
                if (!newOwnerAddress) {  
                  toast.error("Please enter new owner address!");  
                  return;  
                }  
                if (!window.confirm("Are you sure? This will permanently transfer ownership!")) {  
                  return;  
                }  
                await runTx(async () => {  
                  await transferOwnership(newOwnerAddress);  
                }, "Ownership transferred! ✅");  
                setNewOwnerAddress("");  
              }}  
              label="Transfer Ownership"  
              color="red"  
            />  
          </div>  
        </div>  
      </div>  
    </div>  
  )}  

  {/* ── TAB: EMERGENCY ── */}  
  {activeTab === "emergency" && (  
    <div className="max-w-xl space-y-6">  
      <div className="bg-gray-800 border border-red-700 rounded-xl p-6">  
        <h3 className="text-red-400 font-bold text-lg mb-2">  
          🚨 Global Emergency Mode  
        </h3>  
        <p className="text-gray-400 text-sm mb-4">  
          Enabling this will allow all users to emergency withdraw.  
        </p>  
        <div className="flex gap-3">  
          <AdminButton  
            onClick={() => handleSetEmergencyMode(true)}  
            label="Enable Emergency"  
            color="red"  
            disabled={emergencyMode}  
          />  
          <AdminButton  
            onClick={() => handleSetEmergencyMode(false)}  
            label="Disable Emergency"  
            color="green"  
            disabled={!emergencyMode}  
          />  
        </div>  
        <div className="mt-3">  
          <span  
            className={`text-sm font-semibold ${  
              emergencyMode ? "text-red-400" : "text-green-400"  
            }`}  
          >  
            Current Status: {emergencyMode ? "🔴 ACTIVE" : "🟢 INACTIVE"}  
          </span>  
        </div>  
      </div>  

      <div className="bg-gray-800 border border-orange-700 rounded-xl p-6">  
        <h3 className="text-orange-400 font-bold text-lg mb-2">  
          ⚠️ Per-Plan Emergency  
        </h3>  
        <p className="text-gray-400 text-sm mb-4">  
          Toggle emergency mode for a specific plan.  
        </p>  
        <div className="space-y-3">  
          {plans.map((plan, index) => (  
            <div  
              key={index}  
              className="flex justify-between items-center bg-gray-700 rounded-lg px-4 py-3"  
            >  
              <div>  
                <span className="text-white text-sm">  
                  Plan #{index} — {plan.name}  
                </span>  
                <div className="flex gap-2 mt-1">  
                  {planPausedStatus[index] && (  
                    <span className="text-xs text-orange-400">⏸️ Paused</span>  
                  )}  
                  {planEmergencyStatus[index] && (  
                    <span className="text-xs text-red-400">🚨 Emergency</span>  
                  )}  
                </div>  
              </div>  
              <AdminButton  
                onClick={() => handleTogglePlanEmergency(index)}  
                label="Toggle Emergency"  
                color="orange"  
              />  
            </div>  
          ))}  
        </div>  
      </div>  
    </div>  
  )}  
</div>

);
}