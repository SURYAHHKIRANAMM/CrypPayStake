import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { useState, useEffect, useMemo } from "react";

import Navbar from "./components/Navbar";
import UserPanel from "./pages/UserPanel";
import AdminPanel from "./pages/AdminPanel";
import Loading from "./components/Loading";

import { useWallet } from "./hooks/useWallet";
import { ADMIN_WALLET, VIEWER_WALLET } from "./contract/config";

const SHOW_LEGACY_PANELS = import.meta.env.VITE_SHOW_LEGACY_PANELS === "true";

export default function App() {
  const { account, provider, signer, connectWallet } = useWallet();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  const isAdmin = useMemo(() => {
    if (!account) return false;

    const addr = account.toLowerCase();
    const admin = ADMIN_WALLET?.toLowerCase?.() || "";
    const viewer = VIEWER_WALLET?.toLowerCase?.() || "";

    return (admin && addr === admin) || (viewer && addr === viewer);
  }, [account]);

  if (loading) {
    return <Loading />;
  }

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-900 text-white">
        <Navbar provider={provider} account={account} />

        <div className="p-6">
          <Routes>
            <Route
              path="/"
              element={
                !account ? (
                  <UserPanel
                    account={account}
                    signer={signer}
                    provider={provider}
                    connectWallet={connectWallet}
                  />
                ) : isAdmin ? (
                  <AdminPanel
                    account={account}
                    signer={signer}
                    provider={provider}
                  />
                ) : (
                  <UserPanel
                    account={account}
                    signer={signer}
                    provider={provider}
                    connectWallet={connectWallet}
                  />
                )
              }
            />

            <Route
              path="/admin"
              element={
                isAdmin ? (
                  <AdminPanel
                    account={account}
                    signer={signer}
                    provider={provider}
                  />
                ) : (
                  <UserPanel
                    account={account}
                    signer={signer}
                    provider={provider}
                    connectWallet={connectWallet}
                  />
                )
              }
            />
          </Routes>

          {SHOW_LEGACY_PANELS && !account && (
            <UserPanel
              account={account}
              signer={signer}
              provider={provider}
              connectWallet={connectWallet}
            />
          )}

          {SHOW_LEGACY_PANELS && account && !isAdmin && (
            <UserPanel
              account={account}
              signer={signer}
              provider={provider}
              connectWallet={connectWallet}
            />
          )}

          {SHOW_LEGACY_PANELS && account && isAdmin && (
            <AdminPanel
              account={account}
              signer={signer}
              provider={provider}
            />
          )}
        </div>

        <Toaster position="top-right" />
      </div>
    </BrowserRouter>
  );
}