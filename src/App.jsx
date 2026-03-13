import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { useState, useEffect } from "react";

import Navbar from "./components/Navbar";
import UserPanel from "./pages/UserPanel";
import AdminPanel from "./pages/AdminPanel";
import Loading from "./components/Loading";

import { useWallet } from "./hooks/useWallet";

export default function App() {

  const { account, provider, signer, connectWallet } = useWallet();

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      setLoading(false);
    }, 1500);
  }, []);

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
                <UserPanel
                  account={account}
                  signer={signer}
                  provider={provider}
                  connectWallet={connectWallet}
                />
              }
            />

            <Route
              path="/admin"
              element={
                <AdminPanel
                  account={account}
                  signer={signer}
                  provider={provider}
                />
              }
            />

          </Routes>
        </div>

        <Toaster position="top-right" />

      </div>
    </BrowserRouter>
  );
}