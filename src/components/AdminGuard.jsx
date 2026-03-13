import { ADMIN_WALLET } from "../config/admin";

export default function AdminGuard({ account, children }) {

  // Wallet not connected
  if (!account) {
    return (
      <div className="flex flex-col items-center justify-center mt-20 gap-4">
        <div className="text-yellow-400 text-xl font-semibold">
          🔒 Connect Wallet First
        </div>
        <p className="text-gray-400 text-sm">
          Admin panel access ke liye wallet connect karo
        </p>
      </div>
    );
  }

  // Wallet connected but not admin
  if (account.toLowerCase() !== ADMIN_WALLET.toLowerCase()) {
    return (
      <div className="flex flex-col items-center justify-center mt-20 gap-4">
        <div className="text-red-500 text-xl font-semibold">
          ❌ Access Denied
        </div>
        <p className="text-gray-400 text-sm">
          Yeh page sirf admin wallet se accessible hai
        </p>
        <span className="text-gray-500 text-xs font-mono bg-gray-800 px-3 py-1 rounded">
          {account.slice(0,6)}...{account.slice(-4)}
        </span>
      </div>
    );
  }

  // Admin confirmed
  return children;
}