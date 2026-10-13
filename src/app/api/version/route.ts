import { NextResponse } from 'next/server';
import { VERSION_APP } from '@/lib/version-app';

// La versión desplegada ahora. Pública (no dice nada más que un identificador de compilación) y
// nunca cacheada: la consulta la página al volver a primer plano para saber si quedó vieja.
export const dynamic = 'force-dynamic';

export function GET() {
  return NextResponse.json({ version: VERSION_APP }, { headers: { 'Cache-Control': 'no-store' } });
}
