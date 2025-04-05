import { defineConfig } from "vite";
import libAssetsPlugin from "@laynezh/vite-plugin-lib-assets";

// Library build
export default defineConfig({
  plugins: [
    libAssetsPlugin({
      include: ["**/*.swf"],
      outputPath: "assets",
    }),
  ],
  assetsInclude: ["**/*.swf"],
  build: {
    lib: {
      entry: "src/pet-render.ts",
      formats: ["es", "cjs", "umd"],
      name: "PetRenderer",

      fileName: (format) => {
        if (format === "es") {
          return "pet-render.js";
        }
        if (format === "cjs") {
          return "pet-render.cjs";
        }
        if (format === "umd") {
          return "pet-render.umd.js";
        }
        return `pet-render.${format}.js`;
      },
    },
    rollupOptions: {
      //   external: /^lit/,
      // output: {
      //   globals: {
      //     lit: 'lit',
      //   },
      // },
    },
  },
});
