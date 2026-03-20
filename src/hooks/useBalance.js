import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { TOKEN_ADDRESS, TOKEN_ABI, RPC_URL } from "../contract/config";

export function useBalance(account, provider) {
  const [balance, setBalance] = useState("0");

  useEffect(() => {
    let ignore = false;

    async function run() {
      if (!account) {
        if (!ignore) setBalance("0");
        return;
      }

      const readProvider = provider || new ethers.JsonRpcProvider(RPC_URL);

      try {
        const token = new ethers.Contract(TOKEN_ADDRESS, TOKEN_ABI, readProvider);

        const [rawBalance, decimals] = await Promise.all([
          token.balanceOf(account),
          token.decimals(),
        ]);

        if (!ignore) {
          setBalance(ethers.formatUnits(rawBalance, decimals));
        }
      } catch (err) {
        console.error("Balance load error:", err);
        if (!ignore) setBalance("0");
      }
    }

    run();

    return () => {
      ignore = true;
    };
  }, [account, provider]);

  return balance;
}