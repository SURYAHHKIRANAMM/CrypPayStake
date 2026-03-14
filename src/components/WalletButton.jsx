import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useBalance } from "../hooks/useBalance";
import { useAccount } from "wagmi";
import { ADMIN_WALLET } from "../contract/config";
import { useState, useEffect } from "react";

export default function WalletButton({ provider }) {

  const { address } = useAccount();
  const balance = useBalance(address, provider);

  const [isAdmin, setIsAdmin] = useState(false);

  const connectWallet = async () => {
    const accounts = await window.ethereum.request({
      method: "eth_requestAccounts",
    });

    const user = accounts[0];

    if (user.toLowerCase() === ADMIN_WALLET.toLowerCase()) {
      setIsAdmin(true);
    } else {
      setIsAdmin(false);
    }
  };

  // RainbowKit connect hone par admin check
  useEffect(() => {
    if (address) {
      if (address.toLowerCase() === ADMIN_WALLET.toLowerCase()) {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
      }
    }
  }, [address]);

  return (
    <div className="flex items-center gap-3">

      {/* CRP Balance — sirf connected hone par */}
      {address && (
        <span className="text-blue-400 text-sm bg-gray-800 px-3 py-1 rounded-full border border-gray-700">
          {Number(balance).toFixed(2)} tCRP
        </span>
      )}

      {/* RainbowKit Button — sab wallets */}
      <ConnectButton
        accountStatus="address"
        chainStatus="icon"
        showBalance={false}
      />

    </div>
  );
}