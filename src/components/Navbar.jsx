import { Link } from "react-router-dom";
import WalletButton from "./WalletButton";
import logo from "../assets/logo.png";

export default function Navbar({ provider }) {

  return (
    <nav className="
      flex justify-between items-center
      px-6 py-4
      bg-black/40 backdrop-blur-md
      border-b border-gray-700 shadow-lg
    ">

      {/* Logo */}
      <div className="flex items-center gap-2">
        <img src={logo} alt="CrypPayStake" className="h-10 w-10" />
        <span className="text-xl font-bold text-yellow-400 tracking-wide">
          ⚡ CrypPayStake
        </span>
      </div>

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