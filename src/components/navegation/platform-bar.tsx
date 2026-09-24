"use client";

// El centro de la barra superior cuando entra el super admin. Ese espacio quedaba vacío: el
// selector de playa no se dibuja para una cuenta sin empresa, así que entre el logo y el avatar
// no había nada. Acá va dónde estoy parado, un buscador de toda la plataforma y su estado.

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search } from "lucide-react";
import { EmpresaConDetalle } from "@/types/tenancy.type";
import { getEmpresasAction } from "@/actions/tenancy/tenancy.action";

type Resultado = {
  tipo: "Empresa" | "Playa" | "Usuario";
  nombre: string;
  contexto: string;
  href: string;
};

const TITULOS: Record<string, string> = {
  empresas: "Empresas",
  metricas: "Métricas",
};

export function PlatformBar() {
  const pathname = usePathname();
  const [empresas, setEmpresas] = useState<EmpresaConDetalle[]>([]);
  const [texto, setTexto] = useState("");
  const [abierto, setAbierto] = useState(false);
  const caja = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void getEmpresasAction().then((r) => setEmpresas(r.empresas ?? []));
  }, []);

  // Ctrl/Cmd + K enfoca el buscador, como en el resto de los paneles de administración.
  useEffect(() => {
    const atajo = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        input.current?.focus();
      }
    };
    const afuera = (e: MouseEvent) => {
      if (caja.current && !caja.current.contains(e.target as Node))
        setAbierto(false);
    };
    window.addEventListener("keydown", atajo);
    document.addEventListener("mousedown", afuera);
    return () => {
      window.removeEventListener("keydown", atajo);
      document.removeEventListener("mousedown", afuera);
    };
  }, []);

  const seccion = pathname.split("/")[2] ?? "";
  const empresaActual = useMemo(() => {
    const id = pathname.split("/")[3];
    return id ? empresas.find((e) => e.id === id) : undefined;
  }, [pathname, empresas]);

  const busqueda = texto.trim().toLowerCase();
  const resultados: Resultado[] = useMemo(() => {
    if (busqueda.length < 2) return [];
    const salida: Resultado[] = [];
    for (const empresa of empresas) {
      if (empresa.nombre.toLowerCase().includes(busqueda))
        salida.push({
          tipo: "Empresa",
          nombre: empresa.nombre,
          contexto: `${empresa.playas.length} playas · ${empresa.usuarios.length} usuarios`,
          href: `/admin/empresas/${empresa.id}`,
        });
      for (const playa of empresa.playas)
        if (playa.nombre.toLowerCase().includes(busqueda))
          salida.push({
            tipo: "Playa",
            nombre: playa.nombre,
            contexto: empresa.nombre,
            href: `/admin/empresas/${empresa.id}`,
          });
      for (const usuario of empresa.usuarios)
        if (
          `${usuario.firstName} ${usuario.lastName} ${usuario.email} ${usuario.username}`
            .toLowerCase()
            .includes(busqueda)
        )
          salida.push({
            tipo: "Usuario",
            nombre: `${usuario.firstName} ${usuario.lastName}`,
            contexto: `${usuario.role === "ADMIN" ? "Admin" : "Operador"} · ${empresa.nombre}`,
            href: `/admin/empresas/${empresa.id}`,
          });
    }
    return salida.slice(0, 8);
  }, [busqueda, empresas]);

  const activas = empresas.filter((e) => e.estado === "ACTIVA").length;
  const suspendidas = empresas.length - activas;
  const sinPlaya = empresas.reduce(
    (n, e) =>
      n + e.usuarios.filter((u) => u.role === "USER" && !u.playaIds.length).length,
    0,
  );

  return (
    <div className="flex min-w-0 flex-1 items-center gap-3">
      <nav
        aria-label="Ubicación"
        className="hidden shrink-0 items-center gap-1.5 text-sm text-muted-foreground lg:flex"
      >
        <Link href="/admin/empresas" className="hover:text-foreground">
          Plataforma
        </Link>
        {TITULOS[seccion] && (
          <>
            <span className="text-muted-foreground/50">/</span>
            <Link
              href={`/admin/${seccion}`}
              className={
                empresaActual ? "hover:text-foreground" : "font-semibold text-foreground"
              }
            >
              {TITULOS[seccion]}
            </Link>
          </>
        )}
        {empresaActual && (
          <>
            <span className="text-muted-foreground/50">/</span>
            <span className="max-w-[220px] truncate font-semibold text-foreground">
              {empresaActual.nombre}
            </span>
          </>
        )}
      </nav>

      <div ref={caja} className="relative min-w-0 flex-1 md:max-w-md">
        <label className="flex h-10 items-center gap-2 rounded-xl border border-border/70 bg-gm-surface-2 px-3">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <span className="sr-only">Buscar en la plataforma</span>
          <input
            ref={input}
            type="text"
            value={texto}
            placeholder="Buscar empresa, playa o usuario"
            onChange={(e) => {
              setTexto(e.target.value);
              setAbierto(true);
            }}
            onFocus={() => setAbierto(true)}
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <kbd className="hidden shrink-0 rounded border border-border/70 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground lg:block">
            Ctrl K
          </kbd>
        </label>
        {abierto && busqueda.length >= 2 && (
          <div className="absolute left-0 right-0 top-12 z-50 overflow-hidden rounded-xl border border-border bg-gm-surface shadow-xl">
            {!resultados.length && (
              <p className="p-4 text-sm text-muted-foreground">
                Nada coincide con «{texto}».
              </p>
            )}
            {resultados.map((r) => (
              <Link
                key={`${r.tipo}-${r.nombre}-${r.href}`}
                href={r.href}
                onClick={() => {
                  setAbierto(false);
                  setTexto("");
                }}
                className="flex items-center gap-3 border-b border-border/60 p-3 last:border-b-0 hover:bg-gm-surface-2"
              >
                <span
                  className={`shrink-0 rounded px-2 py-0.5 text-[10px] font-bold tracking-wide ${
                    r.tipo === "Empresa"
                      ? "bg-gm-yellow/15 text-gm-yellow"
                      : r.tipo === "Playa"
                        ? "bg-emerald-500/15 text-emerald-400"
                        : "bg-indigo-400/15 text-indigo-300"
                  }`}
                >
                  {r.tipo.toUpperCase()}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm">
                  {r.nombre}
                </span>
                <span className="hidden shrink-0 text-xs text-muted-foreground sm:block">
                  {r.contexto}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>

      <Link
        href="/admin/empresas"
        className="hidden shrink-0 items-center gap-2 rounded-xl border border-border/70 px-3 py-2 text-xs text-muted-foreground hover:text-foreground xl:flex"
      >
        <span className="size-1.5 rounded-full bg-emerald-400" aria-hidden />
        {activas} activas
        {suspendidas > 0 && (
          <span className="text-gm-orange">· {suspendidas} suspendidas</span>
        )}
        {sinPlaya > 0 && (
          <span className="text-gm-orange">· {sinPlaya} sin playa</span>
        )}
      </Link>
    </div>
  );
}
