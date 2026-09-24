import { tenantFetch as fetch } from '@/lib/tenant-fetch';
import { getAuthHeaders } from "@/lib/auth";
import {
  EmpresaConDetalle,
  ActividadEmpresa,
  MetricsDetalle,
  PlataformaMetrics,
  PlayaResumen,
  ResumenEliminacion,
} from "@/types/tenancy.type";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

// El backend devuelve { code, message } en los rechazos de negocio (empresa con playas, playa
// en uso, playa de otra empresa) para que la pantalla pueda mostrar el motivo real.
async function leerError(
  response: Response,
  porDefecto: string,
): Promise<string> {
  try {
    const data = await response.json();
    return Array.isArray(data?.message)
      ? data.message.join(". ")
      : (data?.message ?? porDefecto);
  } catch {
    return porDefecto;
  }
}

export async function getEmpresas(): Promise<EmpresaConDetalle[]> {
  const response = await fetch(`${BASE_URL}/tenancy/empresas`, {
    headers: await getAuthHeaders(),
    cache: "no-store",
  });
  if (!response.ok)
    throw new Error(
      await leerError(response, "No se pudieron cargar las empresas."),
    );
  return response.json();
}

export async function createEmpresa(
  nombre: string,
): Promise<EmpresaConDetalle> {
  const response = await fetch(`${BASE_URL}/tenancy/empresas`, {
    method: "POST",
    headers: {
      ...(await getAuthHeaders()),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ nombre }),
  });
  if (!response.ok)
    throw new Error(await leerError(response, "No se pudo crear la empresa."));
  return response.json();
}

export async function updateEmpresa(
  id: string,
  cambios: { nombre?: string; estado?: string },
): Promise<EmpresaConDetalle> {
  const response = await fetch(`${BASE_URL}/tenancy/empresas/${id}`, {
    method: "PATCH",
    headers: {
      ...(await getAuthHeaders()),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(cambios),
  });
  if (!response.ok)
    throw new Error(
      await leerError(response, "No se pudo actualizar la empresa."),
    );
  return response.json();
}

export async function deleteEmpresa(id: string): Promise<void> {
  const response = await fetch(`${BASE_URL}/tenancy/empresas/${id}`, {
    method: "DELETE",
    headers: await getAuthHeaders(),
  });
  if (!response.ok)
    throw new Error(
      await leerError(response, "No se pudo eliminar la empresa."),
    );
}

export async function createPlaya(
  empresaId: string,
  datos: { nombre: string; direccion?: string },
): Promise<PlayaResumen> {
  const response = await fetch(
    `${BASE_URL}/tenancy/empresas/${empresaId}/playas`,
    {
      method: "POST",
      headers: {
        ...(await getAuthHeaders()),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(datos),
    },
  );
  if (!response.ok)
    throw new Error(await leerError(response, "No se pudo crear la playa."));
  return response.json();
}

export async function deletePlaya(id: string): Promise<void> {
  const response = await fetch(`${BASE_URL}/tenancy/playas/${id}`, {
    method: "DELETE",
    headers: await getAuthHeaders(),
  });
  if (!response.ok)
    throw new Error(await leerError(response, "No se pudo eliminar la playa."));
}

export async function asignarPlayas(
  usuarioId: string,
  playaIds: string[],
): Promise<void> {
  const response = await fetch(
    `${BASE_URL}/tenancy/usuarios/${usuarioId}/playas`,
    {
      method: "PATCH",
      headers: {
        ...(await getAuthHeaders()),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ playaIds }),
    },
  );
  if (!response.ok)
    throw new Error(
      await leerError(response, "No se pudieron asignar las playas."),
    );
}

export type DatosUsuarioEmpresa = {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  role: "ADMIN" | "USER";
  password?: string;
};

async function modificar(path: string, method: string, body?: unknown) {
  const response = await fetch(`${BASE_URL}/tenancy/${path}`, {
    method,
    headers: await getAuthHeaders(),
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok)
    throw new Error(await leerError(response, "No se pudo guardar el cambio."));
  return response.json();
}
export const updatePlaya = (
  id: string,
  datos: { nombre: string; direccion?: string },
) => modificar(`playas/${id}`, "PATCH", datos);
export const saveUsuarioEmpresa = (
  empresaId: string,
  datos: DatosUsuarioEmpresa,
  id?: string,
) =>
  modificar(
    `empresas/${empresaId}/usuarios${id ? "/" + id : ""}`,
    id ? "PATCH" : "POST",
    datos,
  );
export const deleteUsuarioEmpresa = (empresaId: string, id: string) =>
  modificar(`empresas/${empresaId}/usuarios/${id}`, "DELETE");

export async function getPlataformaMetrics(
  dias = 30,
): Promise<PlataformaMetrics> {
  const response = await fetch(`${BASE_URL}/tenancy/metrics?dias=${dias}`, {
    headers: await getAuthHeaders(),
    cache: "no-store",
  });
  if (!response.ok)
    throw new Error(
      await leerError(response, "No se pudieron cargar las métricas."),
    );
  return response.json();
}

// El panel consulta los bloqueos antes de ofrecer el borrado: el backend los vuelve a validar
// al borrar, así que esto es para explicar, nunca para autorizar.
export async function getResumenEliminacion(
  tipo: "empresa" | "playa",
  id: string,
): Promise<ResumenEliminacion> {
  const ruta = tipo === "empresa" ? "empresas" : "playas";
  const response = await fetch(
    `${BASE_URL}/tenancy/${ruta}/${encodeURIComponent(id)}/eliminacion`,
    { headers: await getAuthHeaders(), cache: "no-store" },
  );
  if (!response.ok)
    throw new Error(
      await leerError(response, "No se pudo consultar el estado del borrado."),
    );
  return response.json();
}

export async function getEmpresa(id: string): Promise<EmpresaConDetalle> {
  const response = await fetch(
    `${BASE_URL}/tenancy/empresas/${encodeURIComponent(id)}`,
    { headers: await getAuthHeaders(), cache: "no-store" },
  );
  if (!response.ok)
    throw new Error(
      await leerError(response, "No se pudo cargar la empresa."),
    );
  return response.json();
}

export async function getActividadEmpresa(
  id: string,
): Promise<ActividadEmpresa[]> {
  const response = await fetch(
    `${BASE_URL}/tenancy/empresas/${encodeURIComponent(id)}/actividad`,
    { headers: await getAuthHeaders(), cache: "no-store" },
  );
  if (!response.ok)
    throw new Error(
      await leerError(response, "No se pudo cargar la actividad."),
    );
  return response.json();
}

export async function getMetricsDetalle(
  dias: number,
  empresaId?: string,
): Promise<MetricsDetalle> {
  const query = new URLSearchParams({ dias: String(dias) });
  if (empresaId) query.set("empresaId", empresaId);
  const response = await fetch(
    `${BASE_URL}/tenancy/metrics/detalle?${query.toString()}`,
    { headers: await getAuthHeaders(), cache: "no-store" },
  );
  if (!response.ok)
    throw new Error(
      await leerError(response, "No se pudieron cargar las métricas."),
    );
  return response.json();
}
