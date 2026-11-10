import type { User } from '@/types/user.type';

export class AuthBackendError extends Error {
  constructor(readonly details: Record<string, string | number | null>) {
    super('El servicio de acceso no está disponible.');
    this.name = 'AuthBackendError';
  }
}

export async function readAuthResponse(response: Response, operation: 'login' | 'session'): Promise<User | null> {
  // Un rechazo de credenciales o una cuenta revocada sigue cerrando el acceso.
  if ([400, 401, 403, 404].includes(response.status)) return null;
  const details = {
    operation,
    status: response.status,
    contentType: response.headers.get('content-type'),
    server: response.headers.get('server'),
    requestId: response.headers.get('x-railway-request-id'),
    retryAfter: response.headers.get('retry-after'),
  };
  // El proxy puede responder texto o HTML. No registrar el cuerpo: podría contener datos privados.
  if (!response.ok) throw new AuthBackendError(details);
  let data: User;
  try {
    data = await response.json();
  } catch {
    throw new AuthBackendError(details);
  }
  if (!data || typeof data.id !== 'string' || !data.id) throw new AuthBackendError(details);
  return data;
}
