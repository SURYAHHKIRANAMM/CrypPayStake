import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { bsc } from "wagmi/chains";
import { http } from "wagmi";

import ABI_JSON from "./CrypPayStakeABI.json";
import deployed from "./deployedAddresses.json";

/*
-----------------------------------
Network
-----------------------------------
*/
export const CHAIN_ID = 56;

export const RPC_URL =
  import.meta.env.VITE_BSC_MAINNET_RPC_URL ||
  "https://bsc-dataseed.binance.org/";

export const BSCSCAN_BASE_URL = "https://bscscan.com";

/*
-----------------------------------
Event Fetch Tuning (Mainnet Safe)
-----------------------------------
*/
export const EVENTS_LOOKBACK_BLOCKS = Number(
  import.meta.env.VITE_EVENTS_LOOKBACK_BLOCKS || 120000
);

export const EVENTS_CHUNK_SIZE = Number(
  import.meta.env.VITE_EVENTS_CHUNK_SIZE || 3000
);

/*
-----------------------------------
Public App Config
-----------------------------------
*/
export const WALLETCONNECT_PROJECT_ID =
  import.meta.env.VITE_WALLETCONNECT_PROJECT_ID ||
  "68a09f0e480bd91db9a891404d462ce1";

/*
-----------------------------------
Admin Wallets
-----------------------------------
*/
export const ADMIN_WALLET =
  import.meta.env.VITE_ADMIN_WALLET ||
  deployed.Owner ||
  "0x4fd0dbfC59B4D1257aA1fA3EC0981C6Bee1be572";

/*
-----------------------------------
Viewer Wallets
-----------------------------------
*/
export const VIEWER_WALLET =
  import.meta.env.VITE_VIEWER_WALLET ||
  "0xec23685c637C28dD17dC07E600575A1141E250c0";

export const VIEWER_WALLET_2 =
  import.meta.env.VITE_VIEWER_WALLET_2 ||
  "0x32385Efba0e1C2c589a90603cF3a9d4B28fD12E4";

export const VIEWER_WALLETS = [
  VIEWER_WALLET,
  VIEWER_WALLET_2,
]
  .filter(Boolean)
  .map((addr) => addr.toLowerCase());

/*
-----------------------------------
Optional UI Flags
-----------------------------------
*/
export const SHOW_ROLE_LINKS =
  (import.meta.env.VITE_SHOW_ROLE_LINKS || "false") === "true";

export const SHOW_LEGACY_PANELS =
  (import.meta.env.VITE_SHOW_LEGACY_PANELS || "false") === "true";

/*
-----------------------------------
Wagmi + RainbowKit Config
-----------------------------------
*/
export const wagmiConfig = getDefaultConfig({
  appName: "CrypPayStake",
  projectId: WALLETCONNECT_PROJECT_ID,
  chains: [bsc],
  transports: {
    [bsc.id]: http(RPC_URL),
  },
  ssr: false,
});

/*
-----------------------------------
Contract Addresses (Auto Synced)
-----------------------------------
*/
export const CONTRACT_ADDRESS = deployed.CrypPayStakeProxy;
export const TOKEN_ADDRESS = deployed.CrypPayToken;
export const PRICE_FEED_ADDRESS = deployed.PriceFeed;
export const OWNER_ADDRESS = deployed.Owner;

/*
-----------------------------------
Staking Contract ABI (Auto Synced)
-----------------------------------
*/
export const ABI = ABI_JSON;

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

/*
-----------------------------------
Pair ABI
-----------------------------------
*/
export const PAIR_ABI = [
  "function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)",
  "function token0() view returns (address)",
  "function token1() view returns (address)",
];

/*
-----------------------------------
Oracle ABI
-----------------------------------
*/
export const ORACLE_ABI = [
  "function latestRoundData() view returns (uint80, int256, uint256, uint256, uint80)",
  "function decimals() view returns (uint8)",
];

/*
-----------------------------------
ERC20 Metadata ABI
-----------------------------------
*/
export const ERC20_METADATA_ABI = [
  "function decimals() view returns (uint8)",
];