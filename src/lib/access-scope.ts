export const ACCESS_SELECTION_ROUTE = '/seleccionar-acceso';
export const PLATFORM_HOME = '/admin/empresas';
export const PLATFORM_SELECTION = 'platform';

export function selectedAccess(value: string | undefined, userId: string): string {
  const prefix = `${userId}:`;
  if (!value?.startsWith(prefix)) return '';
  const selected = value.slice(prefix.length);
  return selected === PLATFORM_SELECTION || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(selected)
    ? selected : '';
}
