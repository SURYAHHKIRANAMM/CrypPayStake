import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { TOKEN_ADDRESS, TOKEN_ABI } from "../contract/config";

export function useBalance(account, provider) {

  const [balance, setBalance] = useState("0");

  const loadBalance = useCallback(async () => {

    if (!account || !provider) return;

    try {

      const token = new ethers.Contract(
        TOKEN_ADDRESS,
        TOKEN_ABI,
        provider
      );

      const bal = await token.balanceOf(account);

      setBalance(ethers.formatUnits(bal, 18));

    } catch (err) {
      console.error("Balance fetch failed:", err);
    }

  }, [account, provider]);

  useEffect(() => {
    loadBalance();
  }, [loadBalance]);

  return balance;
}