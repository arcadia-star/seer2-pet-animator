import { defineConfig } from "vite";
import libAssetsPlugin from '@laynezh/vite-plugin-lib-assets'


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
      formats: ["es", "umd"],
      name: "PetRenderer",

      fileName: (format) => {
        if (format === "es") {
          return "pet-render.js";
        }
        return "pet-render.cjs";
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
