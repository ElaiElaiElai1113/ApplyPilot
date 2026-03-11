/** @type {import('next').NextConfig} */
const securityHeaders = [
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  },
  {
    key: 'Cross-Origin-Opener-Policy',
    value: 'same-origin',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
]

function buildContentSecurityPolicy() {
  const directives = [
    "default-src 'self'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.z.ai https://open.bigmodel.cn",
    "worker-src 'self' blob:",
    "form-action 'self'",
  ]

  if (process.env.NODE_ENV === 'production') {
    directives.push('upgrade-insecure-requests')
  }

  return directives.join('; ')
}

const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ['pdf-parse', 'pdfjs-dist'],
  images: {
    domains: ['maas-log-prod.cn-wlcb.ufileos.com'],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          ...securityHeaders,
          {
            key: 'Content-Security-Policy',
            value: buildContentSecurityPolicy(),
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig
