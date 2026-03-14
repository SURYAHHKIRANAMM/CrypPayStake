import { Link } from "react-router-dom";
import WalletButton from "./WalletButton";

export default function Navbar({ provider }) {

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

      {/* Navigation */}
      <div className="flex gap-8 text-gray-300 font-medium">
        <Link to="/" className="transition hover:text-yellow-400">
          User Panel
        </Link>
        <Link to="/admin" className="transition hover:text-yellow-400">
          Admin Panel
        </Link>
      </div>

      {/* Wallet — RainbowKit + CRP Balance */}
      <WalletButton provider={provider} />

    </nav>
  );
}