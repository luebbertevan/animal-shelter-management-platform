import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig({
	plugins: [
		react(),
		VitePWA({
			registerType: "autoUpdate",
			includeAssets: [
				"favicon.ico",
				"vite.svg",
				"icon-192.png",
				"icon-512.png",
			],
			// Manifest is read from public/manifest.json automatically
		}),
	],
});
