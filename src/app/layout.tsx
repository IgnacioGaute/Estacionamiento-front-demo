import './globals.css';
import { Oswald, Archivo, JetBrains_Mono } from 'next/font/google';
import { cn } from '@/lib/utils';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster as SonnerToaster } from '@/components/ui/sonner';
import { Toaster } from '@/components/ui/toaster';
import { Metadata, Viewport } from 'next';
import { NavigationLoader } from '@/components/navigation-loader';

const archivo = Archivo({
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-sans',
});

const oswald = Oswald({
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '600', '700'],
  variable: '--font-display',
});

const mono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '600'],
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: 'Estacionamiento',
  description: 'Sistema operativo de la cochera',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: '/icon-512.png',
    apple: '/apple-touch-icon.png',
  },
  // Habilita que Safari/iOS abra el sitio en modo standalone (sin barra de navegador) cuando se
  // agrega a la pantalla de inicio — iOS no respeta `manifest.display`, necesita estos meta tags.
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Estacionamiento',
  },
};

// Es una herramienta operativa de uso interno (no un sitio de contenido), así que se bloquea el
// pinch-zoom manual a propósito: con zoom activo, los elementos con position:fixed (los diálogos)
// se desalinean del resto de la página al desplazar el viewport visual.
//
// `interactiveWidget: 'resizes-content'` es lo que evita el otro salto: sin esto, al abrir el
// teclado el navegador solo reacomoda el "visual viewport" (lo que se ve en pantalla) pero deja
// el "layout viewport" intacto — y position:fixed se ancla al layout viewport, así que los
// diálogos quedan calculados contra un alto que ya no es el real y aparecen desplazados/flotando
// mientras el teclado está abierto. Con "resizes-content" el layout viewport se achica de verdad
// junto con el teclado, así que el diálogo se recalcula centrado contra el alto visible real.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  interactiveWidget: 'resizes-content',
  themeColor: '#201204',
  // Sin esto, en modo standalone (agregada a inicio) iOS deja la página encajada dentro del área
  // segura y pinta el resto de la pantalla (notch, barra de estado, franja inferior) con el fondo
  // del sistema en vez del fondo de la app — el "cover" le permite a la página extenderse debajo
  // de esas zonas para que el fondo oscuro llegue hasta el borde real de la pantalla.
  viewportFit: 'cover',
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="es"
      suppressHydrationWarning
      className={cn(archivo.variable, oswald.variable, mono.variable)}
    >
      <body
        className={cn(
          'min-h-[100dvh] bg-background text-foreground antialiased mx-auto font-sans'
        )}
        style={{
          paddingTop: 'env(safe-area-inset-top)',
          paddingBottom: 'env(safe-area-inset-bottom)',
          paddingLeft: 'env(safe-area-inset-left)',
          paddingRight: 'env(safe-area-inset-right)',
        }}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          forcedTheme="dark"
          disableTransitionOnChange
        >
          <NavigationLoader />
          {children}
        </ThemeProvider>
        <SonnerToaster />
        <Toaster />
      </body>
    </html>
  );
}
