import { Link } from "react-router-dom";
import { useMemo } from "react";
import WalletButton from "./WalletButton";
import { ADMIN_WALLET, VIEWER_WALLET } from "../contract/config";

const SHOW_ROLE_LINKS = import.meta.env.VITE_SHOW_ROLE_LINKS === "true";

export default function Navbar({ provider, account }) {
  const isAdmin = useMemo(() => {
    if (!account) return false;

    const addr = account.toLowerCase();
    const admin = ADMIN_WALLET?.toLowerCase?.() || "";
    const viewer = VIEWER_WALLET?.toLowerCase?.() || "";

    return (admin && addr === admin) || (viewer && addr === viewer);
  }, [account]);

  return (
    <nav
      className="
      flex justify-between items-center
      px-6 py-4
      bg-black/40 backdrop-blur-md
      border-b border-gray-700 shadow-lg
    "
    >
      <Link to="/">
        <span className="text-xl font-bold text-yellow-400 tracking-wide">
          ⚡ CrypPayStake
        </span>
      </Link>

      <div className="flex gap-8 text-gray-300 font-medium">
        {SHOW_ROLE_LINKS &&
          (isAdmin ? (
            <Link to="/admin" className="transition hover:text-yellow-400">
              Admin Panel
            </Link>
          ) : (
            <Link to="/" className="transition hover:text-yellow-400">
              User Panel
            </Link>
          ))}
      </div>

      <WalletButton provider={provider} />
    </nav>
  );
}