/*
  Mobile Wallet Detection Polyfill
  - Fixes RainbowKit crash on mobile browsers
  - Must run BEFORE any RainbowKit imports
*/
if (typeof window !== "undefined") {
  // Fix: Some mobile wallets inject incomplete ethereum provider
  if (window.ethereum) {
    // Ensure provider has name property for RainbowKit detection
    if (typeof window.ethereum.name === "undefined") {
      window.ethereum.name = "";
    }
    // Ensure providerInfo exists
    if (!window.ethereum.providerInfo) {
      window.ethereum.providerInfo = { name: "" };
    }
    // Ensure isMetaMask is defined
    if (typeof window.ethereum.isMetaMask === "undefined") {
      window.ethereum.isMetaMask = false;
    }
  }

  // Fix: Ensure navigator.userAgent is always a string
  try {
    if (!navigator.userAgent) {
      Object.defineProperty(navigator, "userAgent", {
        value: "Mozilla/5.0",
        configurable: true,
        writable: true,
      });
    }
  } catch (e) {
    // Some browsers block userAgent modification, ignore
  }

  // Fix: Ensure navigator.brave detection doesn't crash
  if (typeof navigator.brave === "undefined") {
    navigator.brave = undefined;
  }
}

import React from "react";
import ReactDOM from "react-dom/client";

import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";

import App from "./App";
import { wagmiConfig } from "./contract/config";

import "@rainbow-me/rainbowkit/styles.css";
import "./index.css";

const queryClient = new QueryClient();

/* Error Boundary for mobile crash recovery */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("App Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "#0f172a",
            color: "#facc15",
            padding: "20px",
            textAlign: "center",
            fontFamily: "sans-serif",
          }}
        >
          <h1 style={{ fontSize: "24px", marginBottom: "16px" }}>
            CrypPayStake
          </h1>
          <p style={{ color: "#94a3b8", marginBottom: "20px" }}>
            Please open this DApp in a Web3 wallet browser (MetaMask, Trust
            Wallet) for the best experience.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: "#facc15",
              color: "#000",
              padding: "12px 24px",
              borderRadius: "8px",
              border: "none",
              fontSize: "16px",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            Reload App
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          <RainbowKitProvider
            theme={darkTheme({
              accentColor: "#facc15",
              accentColorForeground: "black",
              borderRadius: "medium",
            })}
          >
            <App />
          </RainbowKitProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </ErrorBoundary>
  </React.StrictMode>
);