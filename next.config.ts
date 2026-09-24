import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: '/sw.js', headers: [{ key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' }, { key: 'Service-Worker-Allowed', value: '/' }] }]
  },
  /* ✅ Redirección principal */
  async redirects() {
    return [
      {
        source: "/",
        destination: "/auth/login",
        permanent: true,
      },
    ]
  },

  /* ✅ Ignorar ESLint y TypeScript en build */
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },

  /* ✅ Config avanzada compatible con Next.js 15 */
  experimental: {
    // Esto evita que Next intente prerenderizar rutas con headers() o cookies()
    dynamicIO: false,
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },

  /* ✅ Build tolerante */
  outputFileTracing: false,
  trailingSlash: false,

  /* ⚙️ Desactiva symlinks (para evitar EPERM en Windows) */
  // ❗️Comentá esto si usás Docker o Vercel
  // output: "standalone",
}

export default nextConfig
