import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useBalance } from "../hooks/useBalance";
import { useAccount } from "wagmi";

export default function WalletButton({ provider }) {

  const { address } = useAccount();
  const balance = useBalance(address, provider);

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