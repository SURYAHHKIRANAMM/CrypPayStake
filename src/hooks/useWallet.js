import { useAccount, useDisconnect, useWalletClient } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { useMemo } from "react";
import { ethers } from "ethers";
import { RPC_URL } from "../contract/config";

export function useWallet() {

  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { openConnectModal } = useConnectModal();
  const { data: walletClient } = useWalletClient();

  // Public Provider — bina wallet ke bhi plans load honge
  const provider = useMemo(() => {
    return new ethers.JsonRpcProvider(RPC_URL);
  }, []);

  // Signer — walletClient se banao — RainbowKit ke saath reliable
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

  return {
    account: address || null,
    provider,
    signer,
    connectWallet: openConnectModal,
    disconnectWallet: disconnect,
  };
}