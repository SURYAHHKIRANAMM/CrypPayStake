import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [
    react(),
    {
      name: "fix-rainbowkit-mobile",
      apply: "build",
      enforce: "post",
      renderChunk(code, chunk) {
        const moduleIds = chunk?.moduleIds || [];

        const isWalletChunk = moduleIds.some((id) =>
          id.includes("@rainbow-me") ||
          id.includes("wagmi") ||
          id.includes("viem") ||
          id.includes("walletconnect")
        );

        if (!isWalletChunk) return null;
        if (!code.includes(".toLowerCase()")) return null;

        const patchedCode = code.replace(
          /(?<!\?\.)\b([A-Za-z_$][\w$]*)\.toLowerCase\(\)/g,
          '(($1)?.toLowerCase?.() ?? "")'
        );

        if (patchedCode === code) return null;

        return {
          code: patchedCode,
          map: null,
        };
      },
    },
  ],

  define: {
    global: "globalThis",
    "process.env": {},
    process: {
      env: {},
    },
  },
});