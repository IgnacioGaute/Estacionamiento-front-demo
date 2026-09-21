"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Building2, MapPin, Plus, Search, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  EmpresaConDetalle,
  PlayaResumen,
  UsuarioDeEmpresa,
} from "@/types/tenancy.type";
import {
  asignarPlayasAction,
  createEmpresaAction,
  createPlayaAction,
  deleteEmpresaAction,
  deletePlayaAction,
  getEmpresasAction,
  updateEmpresaAction,
  updatePlayaAction,
  saveUsuarioEmpresaAction,
  deleteUsuarioEmpresaAction,
} from "@/actions/tenancy/tenancy.action";

type Editor =
  | { tipo: "empresa"; empresa?: EmpresaConDetalle }
  | { tipo: "playa"; empresa: EmpresaConDetalle; playa?: PlayaResumen }
  | { tipo: "usuario"; empresa: EmpresaConDetalle; usuario?: UsuarioDeEmpresa }
  | { tipo: "accesos"; empresa: EmpresaConDetalle; usuario: UsuarioDeEmpresa };
type Borrado = {
  nombre: string;
  detalle: string;
  ejecutar: () => Promise<{ error?: string }>;
};

export function EmpresasPanel() {
  const [empresas, setEmpresas] = useState<EmpresaConDetalle[]>([]);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [editor, setEditor] = useState<Editor | null>(null);
  const [borrado, setBorrado] = useState<Borrado | null>(null);
  const [borrando, setBorrando] = useState(false);
  async function refrescar() {
    setCargando(true);
    const r = await getEmpresasAction();
    if (r.empresas) {
      setEmpresas(r.empresas);
      setError("");
    } else setError(r.error ?? "No se pudieron cargar las empresas.");
    setCargando(false);
  }
  useEffect(() => {
    void refrescar();
  }, []);
  const visibles = empresas.filter((e) =>
    [
      e.nombre,
      ...e.playas.map((p) => p.nombre),
      ...e.usuarios.map(
        (u) => `${u.firstName} ${u.lastName} ${u.email} ${u.username}`,
      ),
    ]
      .join(" ")
      .toLowerCase()
      .includes(busqueda.toLowerCase().trim()),
  );
  async function eliminar() {
    if (!borrado || borrando) return;
    setBorrando(true);
    try {
      const r = await borrado.ejecutar();
      if (r.error) toast.error(r.error);
      else {
        toast.success("Cambio guardado.");
        setBorrado(null);
        await refrescar();
      }
    } finally {
      setBorrando(false);
    }
  }
  return (
    <div className="space-y-6">
      <div data-tour="empresas-resumen" className="grid gap-3 sm:grid-cols-3">
        {[
          ["Empresas", empresas.length, Building2],
          ["Playas", empresas.reduce((n, e) => n + e.playas.length, 0), MapPin],
          [
            "Usuarios",
            empresas.reduce((n, e) => n + e.usuarios.length, 0),
            Users,
          ],
        ].map(([titulo, valor, Icono]) => {
          const Icon = Icono as typeof Building2;
          return (
            <div
              key={String(titulo)}
              className="flex items-center gap-3 rounded-xl border border-border bg-gm-surface-2 p-4"
            >
              <Icon className="size-5 text-gm-yellow" />
              <div>
                <div className="text-2xl font-semibold">{String(valor)}</div>
                <div className="text-sm text-muted-foreground">
                  {String(titulo)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <div data-tour="empresas-buscar" className="relative flex-1">
          <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
          <Input
            aria-label="Buscar empresa, playa o usuario"
            className="h-10 pl-9"
            placeholder="Buscar empresa, playa o usuario"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
        <Button data-tour="empresas-crear" onClick={() => setEditor({ tipo: "empresa" })}>
          <Plus className="mr-2 size-4" />
          Crear empresa
        </Button>
      </div>
      {error && (
        <div
          role="alert"
          className="rounded-lg border border-destructive p-4 text-sm"
        >
          {error}
          <Button variant="outline" className="ml-3" onClick={refrescar}>
            Reintentar
          </Button>
        </div>
      )}
      {cargando && (
        <p role="status" className="text-sm text-muted-foreground">
          Actualizando empresas…
        </p>
      )}
      {!cargando && !error && !visibles.length && (
        <p className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
          {empresas.length
            ? "No hay resultados para esa búsqueda."
            : "Creá tu primera empresa. Después agregá sus playas y usuarios."}
        </p>
      )}
      {visibles.map((empresa, i) => (
        <section
          key={empresa.id}
          data-tour={i === 0 ? "empresas-ficha" : undefined}
          className="overflow-hidden rounded-xl border border-border"
        >
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-gm-surface-2 p-4">
            <div className="min-w-0">
              <h2 className="break-words text-lg font-semibold">
                {empresa.nombre}
              </h2>
              <p className="text-sm text-muted-foreground">
                {empresa.playas.length} playas · {empresa.usuarios.length}{" "}
                usuarios
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditor({ tipo: "empresa", empresa })}
              >
                Editar empresa
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive"
                onClick={() =>
                  setBorrado({
                    nombre: empresa.nombre,
                    detalle:
                      "Solo se puede eliminar una empresa sin playas ni usuarios, incluidos los usuarios dados de baja.",
                    ejecutar: () => deleteEmpresaAction(empresa.id),
                  })
                }
              >
                Eliminar
              </Button>
            </div>
          </header>
          <div className="grid gap-6 p-4 lg:grid-cols-2">
            <div data-tour={i === 0 ? "empresas-playas" : undefined} className="min-w-0 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="flex items-center gap-2 font-semibold">
                  <MapPin className="size-4" />
                  Playas
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditor({ tipo: "playa", empresa })}
                >
                  Agregar playa
                </Button>
              </div>
              {!empresa.playas.length && (
                <p className="text-sm text-muted-foreground">
                  Todavía no hay playas en esta empresa.
                </p>
              )}
              {empresa.playas.map((playa) => (
                <div
                  key={playa.id}
                  className="rounded-lg border border-border p-3"
                >
                  <div className="break-words font-medium">{playa.nombre}</div>
                  <div className="break-words text-sm text-muted-foreground">
                    {playa.direccion || "Sin dirección cargada"}
                  </div>
                  <div className="mt-2 flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setEditor({ tipo: "playa", empresa, playa })
                      }
                    >
                      Editar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={() =>
                        setBorrado({
                          nombre: playa.nombre,
                          detalle:
                            "Solo se puede eliminar si no tiene registros asociados. Se quitarán las asignaciones de usuarios.",
                          ejecutar: () => deletePlayaAction(playa.id),
                        })
                      }
                    >
                      Eliminar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <div className="min-w-0 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="flex items-center gap-2 font-semibold">
                  <Users className="size-4" />
                  Usuarios
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditor({ tipo: "usuario", empresa })}
                >
                  Agregar usuario
                </Button>
              </div>
              {!empresa.usuarios.length && (
                <p className="text-sm text-muted-foreground">
                  Agregá al administrador y a los operadores de esta empresa.
                </p>
              )}
              {empresa.usuarios.map((usuario) => (
                <div
                  key={usuario.id}
                  className="rounded-lg border border-border p-3"
                >
                  <div className="break-words font-medium">
                    {usuario.firstName} {usuario.lastName}
                  </div>
                  <p className="break-all text-sm text-muted-foreground">
                    {usuario.email}
                  </p>
                  <p className="mt-1 text-sm">
                    {usuario.role === "ADMIN"
                      ? "Administrador de empresa"
                      : "Operador"}{" "}
                    · @{usuario.username}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Playas asignadas:{" "}
                    {empresa.playas
                      .filter((p) => usuario.playaIds.includes(p.id))
                      .map((p) => p.nombre)
                      .join(", ") || "Ninguna"}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setEditor({ tipo: "usuario", empresa, usuario })
                      }
                    >
                      Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setEditor({ tipo: "accesos", empresa, usuario })
                      }
                    >
                      Asignar playas
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={() =>
                        setBorrado({
                          nombre: `${usuario.firstName} ${usuario.lastName}`,
                          detalle:
                            "Se dará de baja la cuenta y se quitarán sus playas asignadas. Su historial de operaciones se conserva.",
                          ejecutar: () =>
                            deleteUsuarioEmpresaAction(empresa.id, usuario.id),
                        })
                      }
                    >
                      Dar de baja
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      ))}
      {editor && (
        <EditorDialog
          editor={editor}
          cerrar={() => setEditor(null)}
          guardado={() => {
            setEditor(null);
            void refrescar();
          }}
        />
      )}
      <Dialog
        open={!!borrado}
        onOpenChange={(open) => {
          if (!open && !borrando) setBorrado(null);
        }}
      >
        <DialogContent className="w-[calc(100vw-2rem)] max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar baja</DialogTitle>
            <DialogDescription>
              {borrado?.nombre}. {borrado?.detalle}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              disabled={borrando}
              onClick={() => setBorrado(null)}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={borrando}
              onClick={eliminar}
            >
              {borrando ? "Guardando…" : "Confirmar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EditorDialog({
  editor,
  cerrar,
  guardado,
}: {
  editor: Editor;
  cerrar: () => void;
  guardado: () => void;
}) {
  const usuario = editor.tipo === "usuario" ? editor.usuario : undefined;
  const [nombre, setNombre] = useState(
    editor.tipo === "empresa"
      ? (editor.empresa?.nombre ?? "")
      : editor.tipo === "playa"
        ? (editor.playa?.nombre ?? "")
        : "",
  );
  const [direccion, setDireccion] = useState(
    editor.tipo === "playa" ? (editor.playa?.direccion ?? "") : "",
  );
  const [firstName, setFirstName] = useState(usuario?.firstName ?? "");
  const [lastName, setLastName] = useState(usuario?.lastName ?? "");
  const [email, setEmail] = useState(usuario?.email ?? "");
  const [username, setUsername] = useState(usuario?.username ?? "");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"USER" | "ADMIN">(
    usuario?.role === "ADMIN" ? "ADMIN" : "USER",
  );
  const [playaIds, setPlayaIds] = useState(
    editor.tipo === "accesos" ? editor.usuario.playaIds : [],
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const titulo =
    editor.tipo === "accesos"
      ? "Asignar playas"
      : `${(editor.tipo === "empresa" && editor.empresa) || (editor.tipo === "playa" && editor.playa) || usuario ? "Editar" : "Crear"} ${editor.tipo}`;
  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (pending) return;
    setPending(true);
    setError("");
    try {
      let r: { error?: string };
      if (editor.tipo === "empresa")
        r = editor.empresa
          ? await updateEmpresaAction(editor.empresa.id, {
              nombre: nombre.trim(),
            })
          : await createEmpresaAction(nombre.trim());
      else if (editor.tipo === "playa")
        r = editor.playa
          ? await updatePlayaAction(editor.playa.id, {
              nombre: nombre.trim(),
              direccion: direccion.trim(),
            })
          : await createPlayaAction(editor.empresa.id, {
              nombre: nombre.trim(),
              direccion: direccion.trim(),
            });
      else if (editor.tipo === "accesos")
        r = await asignarPlayasAction(editor.usuario.id, playaIds);
      else
        r = await saveUsuarioEmpresaAction(
          editor.empresa.id,
          {
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            email: email.trim(),
            username: username.trim(),
            role,
            ...(password ? { password } : {}),
          },
          usuario?.id,
        );
      if (r.error) setError(r.error);
      else {
        toast.success("Cambios guardados.");
        guardado();
      }
    } catch {
      setError("No se pudo guardar. Intentá nuevamente.");
    } finally {
      setPending(false);
    }
  }
  const campo = (
    id: string,
    label: string,
    value: string,
    cambiar: (v: string) => void,
    type = "text",
    required = true,
  ) => (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        value={value}
        onChange={(e) => cambiar(e.target.value)}
        type={type}
        required={required}
        maxLength={type === "password" ? 72 : 255}
        minLength={type === "password" ? 8 : 1}
        autoComplete={type === "password" ? "new-password" : "off"}
        disabled={pending}
      />
    </div>
  );
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !pending) cerrar();
      }}
    >
      <DialogContent className="max-h-[90dvh] w-[calc(100vw-2rem)] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          <DialogDescription>
            {editor.tipo === "empresa"
              ? "Una empresa reúne sus playas y sus usuarios."
              : `Empresa: ${editor.empresa.nombre}`}
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={guardar}>
          {(editor.tipo === "empresa" || editor.tipo === "playa") &&
            campo("nombre", "Nombre", nombre, setNombre)}
          {editor.tipo === "playa" &&
            campo(
              "direccion",
              "Dirección (opcional)",
              direccion,
              setDireccion,
              "text",
              false,
            )}
          {editor.tipo === "usuario" && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                {campo("firstName", "Nombre", firstName, setFirstName)}
                {campo("lastName", "Apellido", lastName, setLastName)}
              </div>
              {campo("email", "Email", email, setEmail, "email")}
              {campo(
                "username",
                "Nombre de usuario para ingresar",
                username,
                setUsername,
              )}
              {campo(
                "password",
                usuario
                  ? "Nueva contraseña (opcional)"
                  : "Contraseña (mínimo 8 caracteres)",
                password,
                setPassword,
                "password",
                !usuario,
              )}
              <div className="space-y-1.5">
                <Label htmlFor="role">Función en la empresa</Label>
                <select
                  id="role"
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={role}
                  onChange={(e) => setRole(e.target.value as "USER" | "ADMIN")}
                  disabled={pending}
                >
                  <option value="USER">Operador</option>
                  <option value="ADMIN">Administrador de empresa</option>
                </select>
              </div>
              <p className="text-xs text-muted-foreground">
                Después de crear el usuario, elegí sus playas en «Asignar
                playas».
              </p>
            </>
          )}
          {editor.tipo === "accesos" && (
            <div className="space-y-3">
              <p className="text-sm">
                {editor.usuario.role === "USER"
                  ? `Elegí la playa donde va a trabajar ${editor.usuario.firstName}. Entrará directamente, sin tener que elegir.`
                  : `Elegí las playas para ${editor.usuario.firstName}.`}
              </p>
              {!editor.empresa.playas.length && (
                <p className="text-sm text-muted-foreground">
                  Primero agregá una playa a esta empresa.
                </p>
              )}
              {editor.empresa.playas.map((p) => (
                <label
                  key={p.id}
                  className="flex cursor-pointer items-center gap-3 rounded-lg border border-border p-3"
                >
                  <input
                    type={editor.usuario.role === "USER" ? "radio" : "checkbox"}
                    name="playa-asignada"
                    checked={playaIds.includes(p.id)}
                    disabled={pending}
                    onChange={(e) =>
                      setPlayaIds((ids) =>
                        e.target.checked
                          ? [...ids, p.id]
                          : ids.filter((id) => id !== p.id),
                      )
                    }
                    className="size-4 accent-yellow-400"
                  />
                  <span>{p.nombre}</span>
                </label>
              ))}
            </div>
          )}
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={cerrar}
              disabled={pending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Guardando…" : "Guardar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
