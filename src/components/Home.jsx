import { motion } from "framer-motion";
import hero from "../assets/hero.png";

export default function Home({ connectWallet, account }) {

  const CONTRACT_ADDRESS = "0x413F528863459F95eF87E1d59646A62D7290526c";
  const TOKEN_ADDRESS = "0x497fd858c8849aaCD308BB668e5fc82E9Ae110a6";

  return (
    <div className="max-w-5xl mx-auto text-center">

      {/* Hero Banner */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.7 }}
        className="relative rounded-2xl overflow-hidden shadow-2xl mb-16"
      >
        <img
          src={hero}
          className="w-full object-cover rounded-2xl"
          alt="CrypPayStake Banner"
        />
      </motion.div>

      {/* How it Works */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="mb-16"
      >
        <h2 className="text-2xl font-bold text-white mb-8">
          ⚙️ How it Works
        </h2>
        <div className="grid md:grid-cols-3 gap-5">

          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
            <div className="w-10 h-10 bg-yellow-500 text-black font-bold text-lg rounded-full flex items-center justify-center mx-auto mb-4">
              1
            </div>
            <h3 className="text-white font-bold mb-2">Connect Wallet</h3>
            <p className="text-gray-400 text-sm">
              Connect Any Crypto Wallet to get started with staking
            </p>
          </div>

          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
            <div className="w-10 h-10 bg-yellow-500 text-black font-bold text-lg rounded-full flex items-center justify-center mx-auto mb-4">
              2
            </div>
            <h3 className="text-white font-bold mb-2">Stake CrypPay (CRP) Coin</h3>
            <p className="text-gray-400 text-sm">
              Choose a staking plan, enter your amount and confirm the transaction
            </p>
          </div>

          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
            <div className="w-10 h-10 bg-yellow-500 text-black font-bold text-lg rounded-full flex items-center justify-center mx-auto mb-4">
              3
            </div>
            <h3 className="text-white font-bold mb-2">Claim Monthly</h3>
            <p className="text-gray-400 text-sm">
              Claim your principal installment every 30 days directly to your wallet
            </p>
          </div>

        </div>
      </motion.div>

      {/* Crypto Coin Information */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="mb-16"
      >
        <h2 className="text-2xl font-bold text-white mb-8">
          🪙 Crypto Coin Information
        </h2>
        <div className="grid md:grid-cols-3 gap-5">

          <div className="bg-gray-800 border border-yellow-500/30 rounded-xl p-5">
            <p className="text-gray-400 text-xs mb-1">Coin Name</p>
            <p className="text-yellow-400 font-bold text-lg">CrypPay</p>
            <p className="text-gray-500 text-xs mt-1">Symbol: CRP</p>
          </div>

          <div className="bg-gray-800 border border-yellow-500/30 rounded-xl p-5">
            <p className="text-gray-400 text-xs mb-1">Blockchain</p>
            <p className="text-yellow-400 font-bold text-lg">BNB Smart Chain</p>
            <p className="text-gray-500 text-xs mt-1">Chain ID: 56</p>
          </div>

          <div className="bg-gray-800 border border-yellow-500/30 rounded-xl p-5">
            <p className="text-gray-400 text-xs mb-1">Total Supply</p>
            <p className="text-yellow-400 font-bold text-lg">1,000,000,000</p>
            <p className="text-gray-500 text-xs mt-1">1 Billion CRP</p>
          </div>

        </div>

        {/* Contract Address Details */}
        <div className="grid md:grid-cols-2 gap-5 mt-5">

          <div className="bg-gray-800 border border-yellow-500/30 rounded-xl p-5 text-left">
            <p className="text-gray-400 text-xs mb-1">CRP Token Contract</p>
            <a
              href={`https://bscscan.com/token/${TOKEN_ADDRESS}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-yellow-400 font-mono text-xs break-all hover:underline"
            >
              {TOKEN_ADDRESS}
            </a>
            <p className="text-gray-500 text-xs mt-2">
              🔗 Click to view on BscScan
            </p>
          </div>

          <div className="bg-gray-800 border border-yellow-500/30 rounded-xl p-5 text-left">
            <p className="text-gray-400 text-xs mb-1">Staking Contract</p>
            <a
              href={`https://bscscan.com/address/${CONTRACT_ADDRESS}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-yellow-400 font-mono text-xs break-all hover:underline"
            >
              {CONTRACT_ADDRESS}
            </a>
            <p className="text-gray-500 text-xs mt-2">
              🔗 Click to view on BscScan
            </p>
          </div>

        </div>
      </motion.div>

      {/* Features */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="grid md:grid-cols-3 gap-6 mb-16"
      >

        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
          <p className="text-3xl mb-3">🔒</p>
          <h3 className="text-yellow-400 font-bold mb-2">Principal Return</h3>
          <p className="text-gray-400 text-sm">
            Your staked principal is returned in monthly installments over the lock period
          </p>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
          <p className="text-3xl mb-3">📅</p>
          <h3 className="text-yellow-400 font-bold mb-2">Monthly Release</h3>
          <p className="text-gray-400 text-sm">
            Receive a fixed percentage of your principal every month
          </p>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
          <p className="text-3xl mb-3">⛓️</p>
          <h3 className="text-yellow-400 font-bold mb-2">BNB Smart Chain</h3>
          <p className="text-gray-400 text-sm">
            Fast, secure and low-cost transactions powered by BSC
          </p>
        </div>

      </motion.div>

    </div>
  );
}