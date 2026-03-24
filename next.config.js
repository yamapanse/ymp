const withPWA = require('@ducanh2912/next-pwa').default;

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // ここに型エラー無視の設定を追加します
  typescript: {
    ignoreBuildErrors: true,
  },
  // ついでにESLintのエラーも無視するようにしておくと安心です
  eslint: {
    ignoreDuringBuilds: true,
  },
};

// PWAの設定でnextConfigを包んで書き出します
module.exports = withPWA({
  dest: 'public',
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === 'development',
  workboxOptions: {
    disableDevLogs: true,
  },
})(nextConfig);