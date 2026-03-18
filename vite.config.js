import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [
    react(),
    {
      name: "fix-rainbowkit-mobile",
      enforce: "post",
      renderChunk(code) {
        if (code.includes("toLowerCase")) {
          return code.replace(
            /(\w+)\.toLowerCase\(\)/g,
            '(($1)?.toLowerCase?.()??"")'
          );
        }
        return code;
      },
    },
  ],
});