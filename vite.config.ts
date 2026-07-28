import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: true,
    port: 8084,
    strictPort: false,
    hmr: {
      overlay: true,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      devOptions: { enabled: false },
      // La registrazione avviene solo da src/lib/pwa/registerSW.ts (guardata
      // per dev/iframe/preview/?sw=off): il plugin non deve iniettarne una sua.
      injectRegister: null,
      includeAssets: ["livellapp-icon.svg", "favicon.ico", "apple-touch-icon.png", "offline.html", "push-sw.js"],

      manifest: {
        name: "LIVEL APP - Piattaforma Fitness",
        short_name: "LIVEL",
        description: "La piattaforma enterprise per Personal Trainer e Atleti",
        theme_color: "#E73235",
        background_color: "#0a0a0a",
        display: "standalone",
        orientation: "portrait",
        // Single PWA install per origin. start_url:"/" + scope:"/" cover every shell
        // (Atleta /app, PT /pt/app, public site). Role-based redirects are performed
        // client-side by the React router after auth hydration — so the manifest does
        // NOT need a PT-specific variant and cannot interfere with the web dashboards.
        start_url: "/",
        scope: "/",
        categories: ["fitness", "health", "sports"],
        icons: [
          {
            src: "/livellapp-icon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any",
          },
          {
            src: "/pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
        shortcuts: [
          {
            name: "Allenamenti",
            short_name: "Workout",
            description: "Apri i tuoi esercizi e schede",
            url: "/app/esercizi",
            icons: [{ src: "/pwa-192x192.png", sizes: "192x192" }],
          },
          {
            name: "Programma",
            short_name: "Programma",
            description: "Il tuo calendario settimanale",
            url: "/app/programma",
            icons: [{ src: "/pwa-192x192.png", sizes: "192x192" }],
          },
          {
            name: "Scopri",
            short_name: "Scopri",
            description: "Trova PT, eventi e professionisti",
            url: "/app/discover",
            icons: [{ src: "/pwa-192x192.png", sizes: "192x192" }],
          },
          {
            name: "Profilo",
            short_name: "Profilo",
            description: "Il tuo profilo atleta",
            url: "/app/profile",
            icons: [{ src: "/pwa-192x192.png", sizes: "192x192" }],
          },
          {
            name: "PT — Atleti",
            short_name: "Atleti",
            url: "/pt/app/athletes",
            icons: [{ src: "/pwa-192x192.png", sizes: "192x192" }],
          },
          {
            name: "PT — Calendario",
            short_name: "Calendario PT",
            url: "/pt/app/calendar",
            icons: [{ src: "/pwa-192x192.png", sizes: "192x192" }],
          },
        ],
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024, // 8 MiB (main bundle > 3 MiB)
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        navigateFallbackDenylist: [/^\/~oauth/, /^\/api/, /^\/functions\//],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*supabase.*$/,
            handler: "NetworkFirst",
            options: {
              cacheName: "api-cache",
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24, // 24 hours
              },
            },
          },
          {
            urlPattern: /\.(png|jpg|jpeg|svg|gif|webp)$/,
            handler: "CacheFirst",
            options: {
              cacheName: "image-cache",
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
            },
          },
        ],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
