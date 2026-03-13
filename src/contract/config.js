import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { bscTestnet } from "wagmi/chains";
import { http } from "wagmi";

/*
-----------------------------------
Wagmi + RainbowKit Config
-----------------------------------
*/
export const wagmiConfig = getDefaultConfig({
  appName: "CrypPayStake",
  projectId: "68a09f0e480bd91db9a891404d462ce1",
  chains: [bscTestnet],
  transports: {
    [bscTestnet.id]: http("https://data-seed-prebsc-1-s1.binance.org:8545"),
  },
});

/*
-----------------------------------
Network
-----------------------------------
*/
export const CHAIN_ID = 97;
export const RPC_URL = "https://data-seed-prebsc-1-s1.binance.org:8545";

/*
-----------------------------------
Contract Addresses
-----------------------------------
*/
export const CONTRACT_ADDRESS = "0x413F528863459F95eF87E1d59646A62D7290526c";
export const TOKEN_ADDRESS = "0x497fd858c8849aaCD308BB668e5fc82E9Ae110a6";

/*
-----------------------------------
Staking Contract ABI
-----------------------------------
*/
export const ABI = [
  "function getAllPlans() view returns (tuple(string name,uint256 lockPeriod,uint256 releasePercent,uint256 claimInterval,uint256 minTokenAmount,bool active)[])",
  "function getUserAllStakes(address user) view returns (tuple(uint256 planId,uint256 amount,uint256 claimed,uint256 startTime,uint256 lastClaimTime,uint256 unlockTime,bool withdrawn)[])",
  "function claimable(address user,uint256 index) view returns (uint256)",
  "function stake(uint256 planId,uint256 amount)",
  "function claim(uint256 index)",
  "function withdraw(uint256 index)",
  "function emergencyWithdraw(uint256 index)",
  "function totalStaked() view returns (uint256)",
  "function totalUniqueStakers() view returns (uint256)",
  "function userStakeCount(address) view returns (uint256)",
  "function emergencyMode() view returns (bool)",
  "function maxTVL() view returns (uint256)",
];

/*
-----------------------------------
Token ABI (ERC20)
-----------------------------------
*/
export const TOKEN_ABI = [
  "function approve(address spender,uint256 amount) returns (bool)",
  "function allowance(address owner,address spender) view returns (uint256)",
  "function balanceOf(address account) view returns (uint256)",
  "function decimals() view returns (uint8)",
];