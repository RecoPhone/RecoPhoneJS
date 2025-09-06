/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  images: {
    unoptimized: true,
    domains: ['www.utopya.be', 'utopya.be'],
    remotePatterns: [
      { protocol: 'https', hostname: 'www.utopya.be' },
      { protocol: 'https', hostname: 'utopya.be' },
      { protocol: 'https', hostname: '**.utopya.be' },
    ],
  },
  // ← c’est cette ligne qui *doit* être prise en compte
  eslint: { ignoreDuringBuilds: true },

  // si besoin d’ignorer aussi TS (optionnel, mais utile si tu veux build costaud)
  // typescript: { ignoreBuildErrors: true },
};

console.log('[next.config] ESLint ignoreDuringBuilds =', nextConfig.eslint?.ignoreDuringBuilds);
module.exports = nextConfig;
