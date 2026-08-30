/** @type {import('next').NextConfig} */
const nextConfig = {};

// Bundle analyzer (30/08 audit perf). Active seulement quand ANALYZE=true
// dans l'env : ANALYZE=true npm run build → ouvre le report HTML dans le
// navigateur avec la taille de chaque module par bundle.
const withBundleAnalyzer = require("@next/bundle-analyzer")({
  enabled: process.env.ANALYZE === "true",
});

module.exports = withBundleAnalyzer(nextConfig);
