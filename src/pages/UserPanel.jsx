import { useState, useEffect } from "react";
import Home from "../components/Home";
import Stake from "../components/Stake";
import Dashboard from "../components/UserDashboard";
import { useContract } from "../hooks/useContract";

export default function UserPanel({ account, signer, provider, connectWallet }) {
  const { fetchUserStakeCount } = useContract(signer, provider);
  const [activeTab, setActiveTab] = useState("home");
  const [hasStakes, setHasStakes] = useState(false);

  // Check if user has stakes
  useEffect(() => {
    let ignore = false;

    async function checkStakes() {
      if (!account || !provider) {
        if (!ignore) {
          setHasStakes(false);
          setActiveTab("home");
        }
        return;
      }

      try {
        const count = await fetchUserStakeCount(account);

        if (ignore) return;

        if (Number(count) > 0) {
          setHasStakes(true);
          setActiveTab("stake");
        } else {
          setHasStakes(false);
          setActiveTab("home");
        }
      } catch {
        if (!ignore) {
          setHasStakes(false);
          setActiveTab("home");
        }
      }
    }

    checkStakes();

    return () => {
      ignore = true;
    };
  }, [account, provider, fetchUserStakeCount]);

  // Tab logic:
  // No wallet → Home + Stake
  // Wallet + no stakes → Home + Stake
  // Wallet + has stakes → Stake + Dashboard
  const tabs = !account
    ? [
        { id: "home", label: "🏠 Home" },
        { id: "stake", label: "💰 Stake" },
      ]
    : hasStakes
    ? [
        { id: "stake", label: "💰 Stake" },
        { id: "dashboard", label: "📊 Dashboard" },
      ]
    : [
        { id: "home", label: "🏠 Home" },
        { id: "stake", label: "💰 Stake" },
      ];

  return (
    <div className="max-w-6xl mx-auto">
      {/* Tabs */}
      <div className="flex gap-2 mb-8 border-b border-gray-700 pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-5 py-2 rounded-t text-sm font-semibold transition ${
              activeTab === tab.id
                ? "bg-yellow-500 text-black"
                : "text-gray-400 hover:text-yellow-400"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "home" && (
        <Home
          provider={provider}
          account={account}
          connectWallet={connectWallet}
        />
      )}

      {activeTab === "stake" && (
        <Stake
          account={account}
          signer={signer}
          provider={provider}
          connectWallet={connectWallet}
        />
      )}

      {activeTab === "dashboard" && account && hasStakes && (
        <Dashboard account={account} signer={signer} provider={provider} />
      )}
    </div>
  );
}