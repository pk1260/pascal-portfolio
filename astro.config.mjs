// @ts-check
import { defineConfig } from "astro/config";
import { env } from "node:process";
import tailwindcss from "@tailwindcss/vite";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import icon from "astro-icon";

// https://astro.build/config
export default defineConfig({
  site: env.SITE_URL ?? "https://pascal-kuiper.nl",
  vite: {
    plugins: [tailwindcss()],
  },

  integrations: [mdx(), sitemap(), icon()],
});
