import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { useState, useEffect, useMemo } from "react";

import Navbar from "./components/Navbar";
import UserPanel from "./pages/UserPanel";
import AdminPanel from "./pages/AdminPanel";
import Loading from "./components/Loading";

import { useWallet } from "./hooks/useWallet";
import { ADMIN_WALLET, VIEWER_WALLETS } from "./contract/config";

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

  // ✅ Full admin — can read + write (create plans, toggles, etc.)
  const isFullAdmin = useMemo(() => {
    if (!account) return false;
    const addr = account.toLowerCase();
    const admin = ADMIN_WALLET?.toLowerCase?.() || "";
    return admin && addr === admin;
  }, [account]);

  // ✅ Viewer admin — read-only (can see admin dashboard but cannot execute writes)
  const isViewer = useMemo(() => {
    if (!account) return false;
    const addr = account.toLowerCase();
    return VIEWER_WALLETS.includes(addr);
  }, [account]);

  // ✅ Combined check — either full admin or viewer gets admin panel access
  const isAdmin = isFullAdmin || isViewer;

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
                    isViewer={isViewer}
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
                    isViewer={isViewer}
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
              isViewer={isViewer}
            />
          )}
        </div>

        <Toaster position="top-right" />
      </div>
    </BrowserRouter>
  );
}