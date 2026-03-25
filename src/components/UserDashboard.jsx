import { useEffect, useState, useCallback, useRef } from "react";
import { ethers } from "ethers";
import toast from "react-hot-toast";
import { useContract } from "../hooks/useContract";
import { useBalance } from "../hooks/useBalance";
import { BSCSCAN_BASE_URL } from "../contract/config";

export default function UserDashboard({ account, signer, provider }) {
  const {
    fetchUserStakes,
    fetchClaimable,
    fetchPlans,
    fetchStats,
    fetchTokenPrice,
    fetchTotalDistributed,
    fetchUserStakeCount,
    fetchEmergencyMode,
    fetchPlanEmergency,
    fetchHasStakedBefore,
    fetchContractEvents,
    claimTokens,
    emergencyWithdrawTokens,
  } = useContract(signer, provider);

  const balance = useBalance(account, provider);

  const [stakes, setStakes] = useState([]);
  const [plans, setPlans] = useState([]);
  const [claimables, setClaimables] = useState([]);
  const [historyEvents, setHistoryEvents] = useState([]);
  const [, setStats] = useState({
    totalStaked: "0",
    totalStakers: "0",
    maxTVL: "0",
  });
  const [, setLoading] = useState(false);
  const [loadingIndex, setLoadingIndex] = useState(null);
  const [activeSection, setActiveSection] = useState("active");
  const [tokenPrice, setTokenPrice] = useState("0");
  const [, setTotalDistributed] = useState("0");
  const [userStakeCount, setUserStakeCount] = useState("0");
  const [emergencyMode, setEmergencyMode] = useState(false);
  const [planEmergencyStatusMap, setPlanEmergencyStatusMap] = useState({});
  const [, setHasStakedBefore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [dataReady, setDataReady] = useState(false);

  const mountedRef = useRef(true);
  const loadIdRef = useRef(0);

  const fnRef = useRef({});
  fnRef.current = {
    fetchUserStakes,
    fetchClaimable,
    fetchPlans,
    fetchStats,
    fetchTokenPrice,
    fetchTotalDistributed,
    fetchUserStakeCount,
    fetchEmergencyMode,
    fetchPlanEmergency,
    fetchHasStakedBefore,
    fetchContractEvents,
  };

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fmtDate = useCallback((ts) => {
    if (!ts || Number(ts) <= 0) return "—";

    return new Date(Number(ts) * 1000).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }, []);

  const isUnlocked = useCallback((stake) => {
    return Date.now() / 1000 >= Number(stake.unlockTime);
  }, []);

  const formatDuration = useCallback((seconds) => {
    const sec = Number(seconds);
    if (sec <= 0) return "—";

    const days = Math.floor(sec / 86400);
    const hours = Math.floor((sec % 86400) / 3600);
    const minutes = Math.floor((sec % 3600) / 60);

    if (days >= 365) {
      const years = Math.floor(days / 365);
      const remainDays = days % 365;
      return remainDays > 0
        ? `${years} Year${years > 1 ? "s" : ""} ${remainDays} Day${remainDays > 1 ? "s" : ""}`
        : `${years} Year${years > 1 ? "s" : ""}`;
    }

    if (days >= 30) {
      const months = Math.floor(days / 30);
      const remainDays = days % 30;
      return remainDays > 0
        ? `${months} Month${months > 1 ? "s" : ""} ${remainDays} Day${remainDays > 1 ? "s" : ""}`
        : `${months} Month${months > 1 ? "s" : ""}`;
    }

    if (days > 0) {
      return hours > 0
        ? `${days} Day${days > 1 ? "s" : ""} ${hours}h`
        : `${days} Day${days > 1 ? "s" : ""}`;
    }

    if (hours > 0) {
      return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
    }

    return `${minutes}m`;
  }, []);

  const doLoad = useCallback(async (targetAccount) => {
    if (!targetAccount || !mountedRef.current) return;

    const thisLoadId = ++loadIdRef.current;
    const fn = fnRef.current;

    try {
      const results = await Promise.allSettled([
        fn.fetchUserStakes(targetAccount),
        fn.fetchPlans(),
        fn.fetchStats(),
        fn.fetchTokenPrice(),
        fn.fetchTotalDistributed(),
        fn.fetchUserStakeCount(targetAccount),
        fn.fetchEmergencyMode(),
        fn.fetchHasStakedBefore(targetAccount),
      ]);

      if (loadIdRef.current !== thisLoadId || !mountedRef.current) return;

      const stakeData =
        results[0].status === "fulfilled" && Array.isArray(results[0].value)
          ? results[0].value
          : [];

      const planData =
        results[1].status === "fulfilled" && Array.isArray(results[1].value)
          ? results[1].value
          : [];

      const statData =
        results[2].status === "fulfilled"
          ? results[2].value
          : { totalStaked: "0", totalStakers: "0", maxTVL: "0" };

      const price =
        results[3].status === "fulfilled" ? results[3].value : "0";

      const distributed =
        results[4].status === "fulfilled" ? results[4].value : "0";

      const stakeCount =
        results[5].status === "fulfilled" ? results[5].value : "0";

      const isEmergency =
        results[6].status === "fulfilled" ? results[6].value : false;

      const stakedBefore =
        results[7].status === "fulfilled" ? results[7].value : false;

      setStakes(stakeData);
      setPlans(planData);
      setStats(statData);
      setTokenPrice(price || "0");
      setTotalDistributed(distributed || "0");
      setUserStakeCount(stakeCount || "0");
      setEmergencyMode(!!isEmergency);
      setHasStakedBefore(!!stakedBefore);
      setDataReady(true);

      const rewards = await Promise.all(
        stakeData.map((_, i) => fn.fetchClaimable(targetAccount, i))
      );

      if (loadIdRef.current === thisLoadId && mountedRef.current) {
        setClaimables(rewards || []);
      }

      const emergencyStatuses = {};
      await Promise.all(
        planData.map(async (_, i) => {
          try {
            emergencyStatuses[i] = await fn.fetchPlanEmergency(i);
          } catch {
            emergencyStatuses[i] = false;
          }
        })
      );

      if (loadIdRef.current === thisLoadId && mountedRef.current) {
        setPlanEmergencyStatusMap(emergencyStatuses);
      }

      try {
        let rawEvents = await fn.fetchContractEvents(targetAccount);

        if (loadIdRef.current !== thisLoadId || !mountedRef.current) return;

        // ✅ FIX: Check if any event has real txHash
        const hasRealTxHash = Array.isArray(rawEvents) && rawEvents.length > 0 &&
          rawEvents.some(e => e?.txHash || e?.transactionHash || e?.hash);

        // ✅ If user-filtered query returned no txHash, fetch ALL events and filter client-side
        if (!hasRealTxHash) {
          try {
            const allRawEvents = await fn.fetchContractEvents(null);
            if (loadIdRef.current !== thisLoadId || !mountedRef.current) return;

            if (Array.isArray(allRawEvents) && allRawEvents.length > 0) {
              const userFiltered = allRawEvents.filter(
                (e) => e?.user && e.user.toLowerCase() === targetAccount.toLowerCase()
              );
              if (userFiltered.length > 0) {
                rawEvents = userFiltered;
              }
            }
          } catch (allEventsErr) {
            console.error("All events fallback error:", allEventsErr);
          }
        }

        const normalizedEvents = (Array.isArray(rawEvents) ? rawEvents : [])
          .map((event, index) => {
            const resolvedPlanId =
              event?.planId !== null &&
              event?.planId !== undefined &&
              event?.planId !== ""
                ? Number(event.planId)
                : null;

            const resolvedPlanName =
              event?.planName ||
              (resolvedPlanId !== null && planData?.[resolvedPlanId]?.name) ||
              (resolvedPlanId !== null ? `Plan #${resolvedPlanId}` : "-");

            return {
              type: event?.type || "Stake",
              user: event?.user || targetAccount,
              planId: resolvedPlanId,
              stakeIndex:
                event?.stakeIndex !== null &&
                event?.stakeIndex !== undefined &&
                event?.stakeIndex !== ""
                  ? Number(event.stakeIndex)
                  : null,
              planName: resolvedPlanName,
              amount: event?.amount ?? "0",
              txHash:
                event?.txHash ||
                event?.transactionHash ||
                event?.hash ||
                "",
              blockNumber: Number(event?.blockNumber || 0),
              logIndex: Number(event?.logIndex || index),
              timestamp: Number(event?.timestamp || 0),
            };
          })
          .filter((event) => {
            const sameUser =
              !event.user ||
              event.user.toLowerCase() === targetAccount.toLowerCase();

            return (
              sameUser &&
              event.type &&
              (event.txHash || event.blockNumber > 0 || event.timestamp > 0)
            );
          })
          .sort((a, b) => {
            if (b.blockNumber !== a.blockNumber) {
              return b.blockNumber - a.blockNumber;
            }
            return b.logIndex - a.logIndex;
          });

        if (normalizedEvents.length > 0) {
          setHistoryEvents(normalizedEvents);
        } else if (stakeData.length > 0) {
          const fallbackHistory = stakeData.map((stake, i) => {
            const planId = Number(stake.planId);
            const plan = planData?.[planId];

            return {
              type: "Stake",
              user: targetAccount,
              planId,
              stakeIndex: i,
              planName: plan ? plan.name : `Plan #${planId}`,
              amount: ethers.formatUnits(stake.amount || 0, 18),
              txHash: "",
              blockNumber: 0,
              logIndex: i,
              timestamp: Number(stake.startTime || 0),
            };
          });

          setHistoryEvents(fallbackHistory);
        } else {
          setHistoryEvents([]);
        }
      } catch (historyErr) {
        console.error("History load error:", historyErr);

        if (stakeData.length > 0) {
          const fallbackHistory = stakeData.map((stake, i) => {
            const planId = Number(stake.planId);
            const plan = planData?.[planId];

            return {
              type: "Stake",
              user: targetAccount,
              planId,
              stakeIndex: i,
              planName: plan ? plan.name : `Plan #${planId}`,
              amount: ethers.formatUnits(stake.amount || 0, 18),
              txHash: "",
              blockNumber: 0,
              logIndex: i,
              timestamp: Number(stake.startTime || 0),
            };
          });

          if (loadIdRef.current === thisLoadId && mountedRef.current) {
            setHistoryEvents(fallbackHistory);
          }
        } else if (loadIdRef.current === thisLoadId && mountedRef.current) {
          setHistoryEvents([]);
        }
      }
    } catch (err) {
      console.error("Dashboard load error:", err);

      if (loadIdRef.current === thisLoadId && mountedRef.current) {
        setDataReady(true);
      }
    }
  }, []);

  useEffect(() => {
    if (!account) {
      setStakes([]);
      setPlans([]);
      setClaimables([]);
      setHistoryEvents([]);
      setTokenPrice("0");
      setUserStakeCount("0");
      setEmergencyMode(false);
      setPlanEmergencyStatusMap({});
      setDataReady(false);
      return;
    }

    setDataReady(false);
    doLoad(account);
  }, [account, doLoad]);

  const providerReadyRef = useRef(false);

  useEffect(() => {
    if (provider && account && !providerReadyRef.current) {
      providerReadyRef.current = true;

      const timer = setTimeout(() => {
        doLoad(account);
      }, 800);

      return () => clearTimeout(timer);
    }

    if (!provider) {
      providerReadyRef.current = false;
    }
  }, [provider, account, doLoad]);

  useEffect(() => {
    const handleStakeSuccess = () => {
      if (account) doLoad(account);
    };

    window.addEventListener("stake-success", handleStakeSuccess);

    return () => {
      window.removeEventListener("stake-success", handleStakeSuccess);
    };
  }, [account, doLoad]);

  useEffect(() => {
    if (!account) return;

    const interval = setInterval(() => {
      doLoad(account);
    }, 30000);

    return () => clearInterval(interval);
  }, [account, doLoad]);

  function txToast(hash) {
    toast.dismiss();
    toast.success(
      <a
        href={`${BSCSCAN_BASE_URL}/tx/${hash}`}
        target="_blank"
        rel="noopener noreferrer"
        className="underline text-blue-400"
      >
        ✅ View Transaction
      </a>
    );
  }

  async function runTx(fn, index, loadingMsg, errorMsg) {
    try {
      setLoading(true);
      setLoadingIndex(index);
      toast.loading(loadingMsg);

      const tx = await fn();

      if (tx?.wait) {
        await tx.wait();
      }

      if (tx?.hash) {
        txToast(tx.hash);
      } else {
        toast.dismiss();
        toast.success("✅ Transaction successful");
      }

      if (account) doLoad(account);
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

  const handleEmergency = (index) => {
    if (
      !window.confirm(
        "Are you sure you want to emergency withdraw? Claimed amount will be adjusted from remaining balance."
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

  const handleRefresh = useCallback(async () => {
    if (!account) return;

    setRefreshing(true);
    try {
      await doLoad(account);
    } finally {
      if (mountedRef.current) {
        setRefreshing(false);
      }
    }
  }, [account, doLoad]);

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

  const historyTypeCounts = historyEvents.reduce((acc, e) => {
    acc[e.type] = (acc[e.type] || 0) + 1;
    return acc;
  }, {});

  if (!account) {
    return (
      <div className="text-center mt-20 text-yellow-400 text-lg">
        🔒 Please connect your wallet to view Dashboard
      </div>
    );
  }

  if (!dataReady) {
    return (
      <div className="text-center mt-20 text-yellow-400 text-lg">
        ⏳ Loading Dashboard...
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-yellow-400">📊 Dashboard</h1>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="text-sm bg-gray-700 hover:bg-gray-600 disabled:opacity-50 px-4 py-2 rounded transition"
        >
          {refreshing ? "⏳ Loading..." : "🔄 Refresh"}
        </button>
      </div>

      {/* PORTFOLIO SUMMARY */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 text-center">
          <p className="text-gray-400 text-xs mb-1">Wallet Balance</p>
          <p className="text-yellow-400 font-bold text-lg">
            {Number(balance).toLocaleString()}
          </p>
          <p className="text-gray-500 text-xs">CrypPay (CRP)</p>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 text-center">
          <p className="text-gray-400 text-xs mb-1">Total Staked</p>
          <p className="text-white font-bold text-lg">
            {totalUserStaked.toLocaleString()}
          </p>
          <p className="text-gray-500 text-xs">CrypPay (CRP)</p>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 text-center">
          <p className="text-gray-400 text-xs mb-1">Total Claimed</p>
          <p className="text-green-400 font-bold text-lg">
            {totalUserClaimed.toLocaleString()}
          </p>
          <p className="text-gray-500 text-xs">CrypPay (CRP)</p>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 text-center">
          <p className="text-gray-400 text-xs mb-1">Claimable Now</p>
          <p className="text-yellow-400 font-bold text-lg">
            {totalClaimableNow.toLocaleString()}
          </p>
          <p className="text-gray-500 text-xs">CrypPay (CRP)</p>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 text-center">
          <p className="text-gray-400 text-xs mb-1">Your Stakes</p>
          <p className="text-white font-bold text-lg">{userStakeCount}</p>
          <p className="text-gray-500 text-xs">Total</p>
        </div>
      </div>

      {/* CrypPay Price */}
      <div className="mb-8">
        <div className="bg-gray-800 border border-yellow-500/20 rounded-xl p-4 text-center">
          <p className="text-gray-400 text-xs mb-1">CrypPay (CRP) Price</p>
          <p className="text-yellow-400 font-bold">
            ${Number(tokenPrice) > 0 ? Number(tokenPrice).toFixed(6) : "N/A"}
          </p>
        </div>
      </div>

      {/* PER-STAKE CLAIMABLE BREAKDOWN */}
      {trueActive.length > 0 && (
        <div className="bg-gray-800 border border-yellow-500/20 rounded-xl p-5 mb-8">
          <h3 className="text-yellow-400 font-bold text-sm mb-3">
            💰 Per-Stake Claimable Breakdown
          </h3>

          <div className="space-y-2">
            {stakes.map((stake, i) => {
              if (stake.withdrawn) return null;

              const stakedAmt = Number(
                ethers.formatUnits(stake.amount || 0, 18)
              );
              const claimedAmt = Number(
                ethers.formatUnits(stake.claimed || 0, 18)
              );

              if (stakedAmt > 0 && claimedAmt >= stakedAmt) return null;

              const planId = Number(stake.planId);
              const plan = plans[planId];
              const planName = plan ? plan.name : `Plan #${planId}`;
              const claimableAmt = Number(claimables[i] || 0);

              return (
                <div
                  key={i}
                  className="flex items-center justify-between bg-gray-900/50 rounded-lg px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500">#{i + 1}</span>
                    <span className="text-yellow-400 font-semibold text-sm">
                      {planName}
                    </span>
                    <span className="text-gray-500 text-xs">
                      ({stakedAmt.toLocaleString()} CRP staked)
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`font-bold text-sm ${
                        claimableAmt > 0 ? "text-green-400" : "text-gray-500"
                      }`}
                    >
                      {claimableAmt.toLocaleString()} CRP
                    </span>

                    {claimableAmt > 0 ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-900/50 text-green-400 border border-green-500/30">
                        Ready
                      </span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-800 text-gray-500 border border-gray-600">
                        Pending
                      </span>
                    )}
                  </div>
                </div>
              );
            })}

            <div className="flex items-center justify-between border-t border-gray-700 pt-3 mt-2">
              <span className="text-gray-400 text-sm font-semibold">
                Total Claimable Now
              </span>
              <span className="text-yellow-400 font-bold text-sm">
                {totalClaimableNow.toLocaleString()} CRP
              </span>
            </div>
          </div>
        </div>
      )}

      {/* OVERVIEW BAR */}
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

      {/* SECTION TABS */}
      <div className="flex gap-3 mb-6 flex-wrap">
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
          onClick={() => setActiveSection("plans")}
          className={`px-4 py-2 rounded-full text-sm font-semibold transition ${
            activeSection === "plans"
              ? "bg-yellow-500 text-black"
              : "bg-gray-800 text-gray-400 hover:text-yellow-400"
          }`}
        >
          Plans ({plans.length})
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
          History ({historyEvents.length})
        </button>
      </div>

      {/* ACTIVE STAKES */}
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
                const canEmergencyWithdraw =
                  emergencyMode ||
                  planEmergencyStatusMap?.[stake.planId] === true;

                return (
                  <div
                    key={i}
                    className="bg-gray-800 border border-gray-700 rounded-xl p-6"
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

                    <div className="flex gap-2 flex-wrap">
                      {!canEmergencyWithdraw && (
                        <button
                          disabled={
                            loadingIndex === i ||
                            Number(claimables[i] || 0) <= 0
                          }
                          onClick={() => handleClaim(i)}
                          className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 disabled:opacity-50 px-3 py-2.5 rounded-full text-white font-bold text-sm transition"
                        >
                          {loadingIndex === i ? "..." : "Claim"}
                        </button>
                      )}

                      {canEmergencyWithdraw && remainingAmt > 0 && (
                        <button
                          disabled={loadingIndex === i}
                          onClick={() => handleEmergency(i)}
                          className="flex-1 bg-red-600 hover:bg-red-500 disabled:opacity-50 px-3 py-2.5 rounded-full text-white font-bold text-sm transition"
                          title="Emergency Withdraw"
                        >
                          {loadingIndex === i ? "..." : "Emergency Withdraw"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* CLAIMED / WITHDRAW */}
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
                  // withdrawn allowed
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

                    <p className="text-gray-500 text-xs text-center">
                      {isWithdrawn
                        ? "Stake closed"
                        : "Fully claimed — no further action required"}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* PLANS */}
      {activeSection === "plans" && (
        <>
          {plans.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <p className="text-5xl mb-4">📋</p>
              <p className="text-lg">No staking plans available</p>
              <p className="text-sm mt-2">
                Plans will appear here once created by the admin
              </p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              {plans.map((plan, i) => {
                const lockPeriod = Number(plan.lockPeriod || 0);
                const claimInterval = Number(plan.claimInterval || 0);
                const releasePercent = Number(plan.releasePercent || 0);
                const minTokenAmount = Number(
                  ethers.formatUnits(plan.minTokenAmount || 0, 18)
                );
                const totalIntervals =
                  claimInterval > 0 ? Math.floor(lockPeriod / claimInterval) : 0;
                const isActive = plan.active;
                const userStakesInPlan = stakes.filter(
                  (s) => Number(s.planId) === i && !s.withdrawn
                ).length;
                const userTotalInPlan = stakes
                  .filter((s) => Number(s.planId) === i)
                  .reduce(
                    (sum, s) =>
                      sum + Number(ethers.formatUnits(s.amount || 0, 18)),
                    0
                  );

                return (
                  <div
                    key={i}
                    className={`bg-gray-800 border rounded-xl p-6 ${
                      isActive
                        ? "border-yellow-500/30"
                        : "border-gray-600 opacity-60"
                    }`}
                  >
                    <div className="flex justify-between items-center mb-4">
                      <div>
                        <h3 className="text-yellow-400 font-bold text-base">
                          {plan.name || `Plan #${i}`}
                        </h3>
                        <p className="text-gray-500 text-xs mt-0.5">
                          Plan ID: {i}
                        </p>
                      </div>

                      <span
                        className={`text-xs px-2 py-1 rounded-full font-semibold ${
                          isActive
                            ? "bg-green-900/60 text-green-400 border border-green-500/30"
                            : "bg-red-900/60 text-red-400 border border-red-500/30"
                        }`}
                      >
                        {isActive ? "Active ✅" : "Inactive ❌"}
                      </span>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Lock Period</span>
                        <span className="text-white font-semibold">
                          {formatDuration(lockPeriod)}
                        </span>
                      </div>

                      <div className="flex justify-between">
                        <span className="text-gray-400">
                          Release Per Interval
                        </span>
                        <span className="text-green-400 font-semibold">
                          {releasePercent}%
                        </span>
                      </div>

                      <div className="flex justify-between">
                        <span className="text-gray-400">Claim Interval</span>
                        <span className="text-white">
                          {formatDuration(claimInterval)}
                        </span>
                      </div>

                      <div className="flex justify-between">
                        <span className="text-gray-400">Total Intervals</span>
                        <span className="text-white">{totalIntervals}</span>
                      </div>

                      <div className="flex justify-between">
                        <span className="text-gray-400">Total Return</span>
                        <span className="text-green-400 font-semibold">
                          {releasePercent * totalIntervals}%
                        </span>
                      </div>

                      <div className="flex justify-between">
                        <span className="text-gray-400">
                          Minimum Stake Amount
                        </span>
                        <span className="text-yellow-400 font-semibold">
                          {minTokenAmount.toLocaleString()} CRP
                        </span>
                      </div>

                      <div className="border-t border-gray-700 pt-2 mt-2">
                        <div className="flex justify-between">
                          <span className="text-gray-400">
                            Your Active Stakes
                          </span>
                          <span className="text-white font-semibold">
                            {userStakesInPlan}
                          </span>
                        </div>

                        <div className="flex justify-between mt-1">
                          <span className="text-gray-400">
                            Your Total Staked
                          </span>
                          <span className="text-yellow-400 font-semibold">
                            {userTotalInPlan.toLocaleString()} CRP
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* HISTORY */}
      {activeSection === "history" && (
        <>
          {historyEvents.length > 0 && (
            <div className="flex gap-3 mb-4 flex-wrap">
              <span className="text-xs px-3 py-1.5 rounded-full bg-gray-800 text-gray-300 border border-gray-700 font-semibold">
                All: {historyEvents.length}
              </span>

              {historyTypeCounts["Stake"] > 0 && (
                <span className="text-xs px-3 py-1.5 rounded-full bg-blue-900/50 text-blue-400 border border-blue-500/30 font-semibold">
                  Stake: {historyTypeCounts["Stake"]}
                </span>
              )}

              {historyTypeCounts["Claim"] > 0 && (
                <span className="text-xs px-3 py-1.5 rounded-full bg-green-900/50 text-green-400 border border-green-500/30 font-semibold">
                  Claim: {historyTypeCounts["Claim"]}
                </span>
              )}

              {historyTypeCounts["Withdraw"] > 0 && (
                <span className="text-xs px-3 py-1.5 rounded-full bg-yellow-900/50 text-yellow-400 border border-yellow-500/30 font-semibold">
                  Withdraw: {historyTypeCounts["Withdraw"]}
                </span>
              )}

              {historyTypeCounts["Emergency"] > 0 && (
                <span className="text-xs px-3 py-1.5 rounded-full bg-red-900/50 text-red-400 border border-red-500/30 font-semibold">
                  Emergency: {historyTypeCounts["Emergency"]}
                </span>
              )}
            </div>
          )}

          {historyEvents.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <p className="text-5xl mb-4">📋</p>
              <p className="text-lg">No transaction records found</p>
              <p className="text-sm mt-2">
                Your stake, claim and withdraw records will appear here
              </p>
            </div>
          ) : (
            <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
              <div
                className="grid gap-2 px-5 py-3 bg-gray-900 text-gray-400 text-xs font-semibold border-b border-gray-700"
                style={{ gridTemplateColumns: "40px 70px 1fr 100px 90px 90px" }}
              >
                <span>Sr.No</span>
                <span>Type</span>
                <span>Plan</span>
                <span>Amount</span>
                <span>Date</span>
                <span className="text-right">BscScan</span>
              </div>

              {historyEvents.map((event, i) => {
                const txHash =
                  typeof event.txHash === "string" ? event.txHash.trim() : "";

                const validTxHash =
                  /^0x([A-Fa-f0-9]{64})$/.test(txHash);

                return (
                  <div
                    key={`${txHash || "local"}-${event.blockNumber || 0}-${i}`}
                    className="grid gap-2 px-5 py-4 text-sm border-b border-gray-700/50 items-center"
                    style={{
                      gridTemplateColumns: "40px 70px 1fr 100px 90px 90px",
                    }}
                  >
                    <span className="text-gray-500 text-xs">{i + 1}</span>

                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-semibold inline-block w-fit ${
                        event.type === "Stake"
                          ? "bg-blue-900 text-blue-400"
                          : event.type === "Claim"
                          ? "bg-green-900 text-green-400"
                          : event.type === "Withdraw"
                          ? "bg-yellow-900 text-yellow-400"
                          : "bg-red-900 text-red-400"
                      }`}
                    >
                      {event.type}
                    </span>

                    <span
                      className="text-yellow-400 font-semibold text-xs truncate"
                      title={event.planName || "-"}
                    >
                      {event.planName || "-"}
                    </span>

                    <span className="text-white font-semibold text-xs">
                      {Number(event.amount || 0).toLocaleString()} CRP
                    </span>

                    <span className="text-gray-300 text-xs">
                      {fmtDate(event.timestamp)}
                    </span>

                    {validTxHash ? (
                      <a
                        href={`${BSCSCAN_BASE_URL}/tx/${txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-400 hover:underline text-right inline-block min-w-[60px] whitespace-nowrap"
                        title={txHash}
                      >
                        Tx 🔗
                      </a>
                    ) : Number(event.blockNumber) > 0 ? (
                      <a
                        href={`${BSCSCAN_BASE_URL}/block/${event.blockNumber}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-gray-300 hover:underline text-right inline-block min-w-[60px] whitespace-nowrap"
                      >
                        Block 🔗
                      </a>
                    ) : (
                      <a
                        href={`${BSCSCAN_BASE_URL}/address/${account}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-gray-400 hover:underline text-right inline-block min-w-[60px] whitespace-nowrap"
                      >
                        Address 🔗
                      </a>
                    )}
                  </div>
                );
              })}

              <div
                className="grid gap-2 px-5 py-3 bg-gray-900 text-xs font-bold border-t border-gray-700"
                style={{ gridTemplateColumns: "40px 70px 1fr 100px 90px 90px" }}
              >
                <span className="text-gray-400">Total</span>
                <span className="text-gray-400">
                  {historyEvents.length} events
                </span>
                <span></span>
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}