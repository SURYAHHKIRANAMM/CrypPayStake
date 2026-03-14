import { useState } from "react";
import Home from "../components/Home";
import Stake from "../components/Stake";
import Dashboard from "../components/UserDashboard";

export default function UserPanel({ account, signer, provider, connectWallet }) {

  const [activeTab, setActiveTab] = useState("home");

  const tabs = [
    { id: "home",      label: "🏠 Home" },
    { id: "stake",     label: "💰 Stake" },
    ...(account ? [{ id: "dashboard", label: "📊 Dashboard" }] : []),
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

      {activeTab === "dashboard" && account && (
        <Dashboard
          account={account}
          signer={signer}
          provider={provider}
        />
      )}

    </div>
  );
}