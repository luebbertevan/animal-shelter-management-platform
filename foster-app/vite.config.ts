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
			workbox: {
				globPatterns: ["**/*.{js,css,html,ico,png,svg}"],
				runtimeCaching: [
					{
						// Navigation requests (HTML pages) - CacheFirst for iOS Safari offline support
						// iOS Safari tries to fetch HTML before service worker can intercept
						// CacheFirst ensures HTML is served from precache/cache immediately
						urlPattern: ({ request }) =>
							request.mode === "navigate",
						handler: "CacheFirst",
						options: {
							cacheName: "pages",
							expiration: {
								maxEntries: 10,
								maxAgeSeconds: 60 * 60 * 24, // 24 hours
							},
						},
					},
					{
						// Cache static assets (JS, CSS, images) and fall back to cache while updating in background
						urlPattern: ({ request }) =>
							[
								"style",
								"script",
								"worker",
								"font",
								"image",
							].includes(request.destination),
						handler: "StaleWhileRevalidate",
						options: {
							cacheName: "static-resources",
							expiration: {
								maxEntries: 60,
								maxAgeSeconds: 60 * 60 * 24, // 24 hours
							},
						},
					},
					{
						// Supabase REST API calls
						// NetworkFirst: Try network first, fall back to cache if offline
						// Only cache successful responses (200, 204) - never cache errors
						urlPattern:
							/^https:\/\/[a-z0-9-]+\.supabase\.co\/rest\/v1\/.*$/i,
						handler: "NetworkFirst",
						options: {
							cacheName: "supabase-data",
							networkTimeoutSeconds: 10,
							expiration: {
								maxEntries: 50,
								maxAgeSeconds: 60 * 5, // 5 minutes
							},
							cacheableResponse: {
								// Only cache successful responses - never cache errors (4xx, 5xx)
								statuses: [200, 204],
							},
						},
					},
				],
			},
		}),
	],
});
