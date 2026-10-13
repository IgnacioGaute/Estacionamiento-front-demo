import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // Un identificador por compilación (el commit en Railway; si no, la hora de compilar). Queda
  // incrustado en el navegador y en el servidor: /api/version y la página lo comparan para darse
  // cuenta de que la pestaña quedó de un despliegue anterior (ver src/lib/version-app.ts).
  env: {
    NEXT_PUBLIC_VERSION_APP: process.env.RAILWAY_GIT_COMMIT_SHA || process.env.RAILWAY_DEPLOYMENT_ID || String(Date.now()),
  },
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
