import { Link } from "react-router-dom";
import WalletButton from "./WalletButton";
import { useWallet } from "../hooks/useWallet";
import { ADMIN_WALLET } from "../contract/config";
import { useState, useEffect } from "react";

export default function Navbar({ provider }) {

  const { account } = useWallet();

  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (account) {
      if (account.toLowerCase() === ADMIN_WALLET.toLowerCase()) {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
      }
    }
  }, [account]);

  return (
    <nav className="
      flex justify-between items-center
      px-6 py-4
      bg-black/40 backdrop-blur-md
      border-b border-gray-700 shadow-lg
    ">

      {/* Logo — sirf text */}
      <Link to="/">
        <span className="text-xl font-bold text-yellow-400 tracking-wide">
          ⚡ CrypPayStake
        </span>
      </Link>

      {/* Navigation (hidden but structure same) */}
      <div className="flex gap-8 text-gray-300 font-medium">

        {/* Role Based Navigation */}
        {false && (
          isAdmin ? (
            <a
              href="/admin"
              className="transition hover:text-yellow-400"
            >
              Admin Panel
            </a>
          ) : (
            <a
              href="/dashboard"
              className="transition hover:text-yellow-400"
            >
              User Panel
            </a>
          )
        )}

        {/* Existing Links (unchanged but hidden) */}

        {false && !isAdmin && (
          <Link
            to="/"
            className="transition hover:text-yellow-400"
          >
            User Panel
          </Link>
        )}

        {false && isAdmin && (
          <Link
            to="/admin"
            className="transition hover:text-yellow-400"
          >
            Admin Panel
          </Link>
        )}

      </div>

      {/* Wallet — RainbowKit + CRP Balance */}
      <WalletButton provider={provider} />

    </nav>
  );
}