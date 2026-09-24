"use server";

import {
  updatePlaya,
  saveUsuarioEmpresa,
  deleteUsuarioEmpresa,
  DatosUsuarioEmpresa,
  asignarPlayas,
  createEmpresa,
  createPlaya,
  deleteEmpresa,
  deletePlaya,
  getEmpresas,
  updateEmpresa,
  getPlataformaMetrics,
  getResumenEliminacion,
  getEmpresa,
  getActividadEmpresa,
  getMetricsDetalle,
} from "@/services/tenancy.service";

const mensaje = (error: unknown, porDefecto: string) =>
  error instanceof Error ? error.message : porDefecto;

export async function getEmpresasAction() {
  try {
    return { empresas: await getEmpresas() };
  } catch (error) {
    return { error: mensaje(error, "No se pudieron cargar las empresas.") };
  }
}

export async function createEmpresaAction(nombre: string) {
  try {
    return { empresa: await createEmpresa(nombre) };
  } catch (error) {
    return { error: mensaje(error, "No se pudo crear la empresa.") };
  }
}

export async function updateEmpresaAction(
  id: string,
  cambios: { nombre?: string; estado?: string },
) {
  try {
    return { empresa: await updateEmpresa(id, cambios) };
  } catch (error) {
    return { error: mensaje(error, "No se pudo actualizar la empresa.") };
  }
}

export async function deleteEmpresaAction(id: string) {
  try {
    await deleteEmpresa(id);
    return { ok: true };
  } catch (error) {
    return { error: mensaje(error, "No se pudo eliminar la empresa.") };
  }
}

export async function createPlayaAction(
  empresaId: string,
  datos: { nombre: string; direccion?: string },
) {
  try {
    return { playa: await createPlaya(empresaId, datos) };
  } catch (error) {
    return { error: mensaje(error, "No se pudo crear la playa.") };
  }
}

export async function deletePlayaAction(id: string) {
  try {
    await deletePlaya(id);
    return { ok: true };
  } catch (error) {
    return { error: mensaje(error, "No se pudo eliminar la playa.") };
  }
}

export async function asignarPlayasAction(
  usuarioId: string,
  playaIds: string[],
) {
  try {
    await asignarPlayas(usuarioId, playaIds);
    return { ok: true };
  } catch (error) {
    return { error: mensaje(error, "No se pudieron asignar las playas.") };
  }
}

export async function updatePlayaAction(
  id: string,
  datos: { nombre: string; direccion?: string },
) {
  try {
    await updatePlaya(id, datos);
    return { ok: true };
  } catch (error) {
    return { error: mensaje(error, "No se pudo actualizar la playa.") };
  }
}
export async function saveUsuarioEmpresaAction(
  empresaId: string,
  datos: DatosUsuarioEmpresa,
  id?: string,
) {
  try {
    await saveUsuarioEmpresa(empresaId, datos, id);
    return { ok: true };
  } catch (error) {
    return { error: mensaje(error, "No se pudo guardar el usuario.") };
  }
}
export async function deleteUsuarioEmpresaAction(
  empresaId: string,
  id: string,
) {
  try {
    await deleteUsuarioEmpresa(empresaId, id);
    return { ok: true };
  } catch (error) {
    return { error: mensaje(error, "No se pudo dar de baja el usuario.") };
  }
}

export async function getPlataformaMetricsAction(dias = 30) {
  try {
    return { metrics: await getPlataformaMetrics(dias) };
  } catch (error) {
    return { error: mensaje(error, "No se pudieron cargar las métricas.") };
  }
}

export async function getResumenEliminacionAction(
  tipo: "empresa" | "playa",
  id: string,
) {
  try {
    return { resumen: await getResumenEliminacion(tipo, id) };
  } catch (error) {
    return {
      error: mensaje(error, "No se pudo consultar el estado del borrado."),
    };
  }
}

export async function getEmpresaAction(id: string) {
  try {
    return { empresa: await getEmpresa(id) };
  } catch (error) {
    return { error: mensaje(error, "No se pudo cargar la empresa.") };
  }
}

export async function getActividadEmpresaAction(id: string) {
  try {
    return { actividad: await getActividadEmpresa(id) };
  } catch (error) {
    return { error: mensaje(error, "No se pudo cargar la actividad.") };
  }
}

export async function getMetricsDetalleAction(dias = 30, empresaId?: string) {
  try {
    return { detalle: await getMetricsDetalle(dias, empresaId) };
  } catch (error) {
    return { error: mensaje(error, "No se pudieron cargar las métricas.") };
  }
}
