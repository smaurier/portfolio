const path = require("path");

/** @type {import('next').NextConfig} */
const nextConfig = {
  // 31/08 : ancre explicite Turbopack sur la racine du projet. Sans ca
  // Turbopack remonte l'arbre jusqu'a trouver un lockfile et attrape
  // celui parasite dans C:\Users\sylva (Sylvain a un vieux package.json
  // au home), d'ou le warning "ignored pnpm-lock.yaml".
  turbopack: {
    root: path.resolve(__dirname),
  },
};

// Bundle analyzer (30/08 audit perf). Active seulement quand ANALYZE=true
// dans l'env : ANALYZE=true pnpm run build → ouvre le report HTML dans le
// navigateur avec la taille de chaque module par bundle.
const withBundleAnalyzer = require("@next/bundle-analyzer")({
  enabled: process.env.ANALYZE === "true",
});

module.exports = withBundleAnalyzer(nextConfig);
