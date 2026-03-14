import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { useState, useEffect } from "react";

import Navbar from "./components/Navbar";
import UserPanel from "./pages/UserPanel";
import AdminPanel from "./pages/AdminPanel";
import Loading from "./components/Loading";

import { useWallet } from "./hooks/useWallet";
import { ADMIN_WALLET } from "./contract/config";

export default function App() {

  const { account, provider, signer, connectWallet } = useWallet();

  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    setTimeout(() => {
      setLoading(false);
    }, 1500);
  }, []);

  // Admin wallet detection
  useEffect(() => {
    if (account) {
      if (account.toLowerCase() === ADMIN_WALLET.toLowerCase()) {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
      }
    }
  }, [account]);

  if (loading) {
    return <Loading />;
  }

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-900 text-white">

        <Navbar provider={provider} />

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

          {/* Wallet Role Based Dashboard (Disabled to avoid duplicate rendering) */}

          {false && !account && (
            <UserPanel
              account={account}
              signer={signer}
              provider={provider}
              connectWallet={connectWallet}
            />
          )}

          {false && account && !isAdmin && (
            <UserPanel
              account={account}
              signer={signer}
              provider={provider}
              connectWallet={connectWallet}
            />
          )}

          {false && account && isAdmin && (
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