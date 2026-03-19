import { useAccount, useDisconnect, useWalletClient } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { useMemo, useCallback } from "react";
import { ethers } from "ethers";
import { RPC_URL } from "../contract/config";

export function useWallet() {
  const { address } = useAccount();
  const { disconnect } = useDisconnect();
  const { openConnectModal } = useConnectModal();
  const { data: walletClient } = useWalletClient();

  const provider = useMemo(() => {
    return new ethers.JsonRpcProvider(RPC_URL);
  }, []);

  const signer = useMemo(() => {
    if (!walletClient) return null;

    const { account, chain, transport } = walletClient;

    const network = {
      chainId: chain.id,
      name: chain.name,
    };

    const ethersProvider = new ethers.BrowserProvider(transport, network);
    return new ethers.JsonRpcSigner(ethersProvider, account.address);
  }, [walletClient]);

  const connectWallet = useCallback(() => {
    if (openConnectModal) {
      openConnectModal();
    }
  }, [openConnectModal]);

  return {
    account: address || null,
    provider,
    signer,
    connectWallet,
    disconnectWallet: disconnect,
  };
}