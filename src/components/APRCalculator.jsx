import { useState } from "react";

export default function APRCalculator() {

  const [amount, setAmount] = useState("");
  const [releasePercent, setReleasePercent] = useState("");
  const [months, setMonths] = useState("");
  const [result, setResult] = useState(null);

  const calculate = () => {

    const amt = parseFloat(amount);
    const percent = parseFloat(releasePercent);
    const mo = parseFloat(months);

    if (!amt || !percent || !mo || amt <= 0 || percent <= 0 || mo <= 0) {
      return;
    }

    const intervals = mo;
    const perInterval = (amt * percent) / 100;
    const totalRelease = perInterval * intervals;
    const apr = (percent * 12).toFixed(2);

    setResult({
      perMonth: perInterval.toFixed(2),
      total: totalRelease.toFixed(2),
      apr,
    });
  };

  const reset = () => {
    setAmount("");
    setReleasePercent("");
    setMonths("");
    setResult(null);
  };

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 max-w-md">

      <h3 className="text-yellow-400 font-bold text-lg mb-1">
        🧮 Staking Calculator
      </h3>
      <p className="text-gray-400 text-sm mb-5">
        Apna staking return calculate karo
      </p>

      {/* Amount */}
      <div className="mb-3">
        <label className="text-gray-400 text-xs mb-1 block">
          Stake Amount (CRP)
        </label>
        <input
          type="number"
          placeholder="e.g. 50000"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-yellow-500"
        />
      </div>

      {/* Release Percent */}
      <div className="mb-3">
        <label className="text-gray-400 text-xs mb-1 block">
          Monthly Release % (e.g. 4%)
        </label>
        <input
          type="number"
          placeholder="e.g. 4"
          value={releasePercent}
          onChange={(e) => setReleasePercent(e.target.value)}
          className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-yellow-500"
        />
      </div>

      {/* Months */}
      <div className="mb-5">
        <label className="text-gray-400 text-xs mb-1 block">
          Lock Period (Months)
        </label>
        <input
          type="number"
          placeholder="e.g. 25"
          value={months}
          onChange={(e) => setMonths(e.target.value)}
          className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-yellow-500"
        />
      </div>

      {/* Buttons */}
      <div className="flex gap-3 mb-5">
        <button
          onClick={calculate}
          className="flex-1 bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-2 rounded transition"
        >
          Calculate
        </button>
        <button
          onClick={reset}
          className="px-4 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition"
        >
          Reset
        </button>
      </div>

      {/* Result */}
      {result && (
        <div className="bg-gray-900 border border-yellow-500/30 rounded-xl p-4 space-y-3">

          <div className="flex justify-between items-center">
            <span className="text-gray-400 text-sm">Monthly Release</span>
            <span className="text-yellow-400 font-bold">
              {Number(result.perMonth).toLocaleString()} CRP
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-gray-400 text-sm">Total Principal Back</span>
            <span className="text-green-400 font-bold">
              {Number(result.total).toLocaleString()} CRP
            </span>
          </div>

          <div className="flex justify-between items-center border-t border-gray-700 pt-3">
            <span className="text-gray-400 text-sm">Effective APR</span>
            <span className="text-blue-400 font-bold text-lg">
              {result.apr}%
            </span>
          </div>

          <p className="text-gray-500 text-xs text-center pt-1">
            * Principal-only return — koi extra reward nahi
          </p>

        </div>
      )}

    </div>
  );
}