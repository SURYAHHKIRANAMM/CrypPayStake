import { useAccount, useDisconnect, useWalletClient } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { useState, useEffect, useMemo, useCallback } from "react";
import { ethers } from "ethers";
import { RPC_URL } from "../contract/config";

export function useWallet() {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { openConnectModal } = useConnectModal();
  const { data: walletClient } = useWalletClient();

  const [signer, setSigner] = useState(null);

  // ✅ Static read-only provider for contract reads (always available)
  const provider = useMemo(() => {
    return new ethers.JsonRpcProvider(RPC_URL);
  }, []);

  // ✅ FIX: Create signer properly using BrowserProvider.getSigner()
  // This is the correct ethers v6 pattern — never construct JsonRpcSigner directly
  useEffect(() => {
    let cancelled = false;

    async function buildSigner() {
      if (!walletClient || !isConnected) {
        setSigner(null);
        return;
      }

      try {
        const { account, chain, transport } = walletClient;

        const network = {
          chainId: chain.id,
          name: chain.name,
          ensAddress: undefined,
        };

        // ✅ Create BrowserProvider from wallet transport
        const ethersProvider = new ethers.BrowserProvider(transport, network);

        // ✅ Use getSigner() — the proper ethers v6 way
        const ethSigner = await ethersProvider.getSigner(account.address);

        if (!cancelled) {
          setSigner(ethSigner);
        }
      } catch (err) {
        console.error("Signer creation error:", err);
        if (!cancelled) {
          setSigner(null);
        }
      }
    }

    buildSigner();

    return () => {
      cancelled = true;
    };
  }, [walletClient, isConnected]);

  // ✅ Connect wallet — opens RainbowKit modal
  const connectWallet = useCallback(() => {
    if (openConnectModal) {
      openConnectModal();
    }
  }, [openConnectModal]);

  // ✅ Disconnect wallet — clears signer immediately
  const disconnectWallet = useCallback(() => {
    setSigner(null);
    disconnect();
  }, [disconnect]);

  return {
    account: isConnected ? address || null : null,
    provider,
    signer,
    connectWallet,
    disconnectWallet,
  };
}