import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { TOKEN_ADDRESS, TOKEN_ABI } from "../contract/config";

export function useBalance(account, provider) {
  const [balance, setBalance] = useState("0");

  useEffect(() => {
    let ignore = false;

    async function run() {
      if (!account || !provider) {
        if (!ignore) setBalance("0");
        return;
      }

      try {
        const token = new ethers.Contract(TOKEN_ADDRESS, TOKEN_ABI, provider);

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