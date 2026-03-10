/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ['pdf-parse', 'pdfjs-dist'],
  experimental: {
    devtoolSegmentExplorer: false,
  },
  images: {
    domains: ['maas-log-prod.cn-wlcb.ufileos.com'],
  },
}

module.exports = nextConfig
