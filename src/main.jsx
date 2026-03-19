import React from "react";
import ReactDOM from "react-dom/client";

import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";

import App from "./App";
import { wagmiConfig } from "./contract/config";

import "@rainbow-me/rainbowkit/styles.css";
import "./index.css";

window.global = window;
window.process = window.process || { env: {} };

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root")).render(
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
);