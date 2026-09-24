"use client";

// El alta y la edición de empresas, playas, usuarios y accesos. Se separó del panel cuando este
// pasó a mostrar métricas: son dos cosas distintas y el archivo ya no entraba en una pantalla.

import { useState, useTransition } from "react";
import { toast } from "sonner";
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
  updateEmpresaAction,
  updatePlayaAction,
  saveUsuarioEmpresaAction,
} from "@/actions/tenancy/tenancy.action";

export type Editor =
  | { tipo: "empresa"; empresa?: EmpresaConDetalle }
  | { tipo: "playa"; empresa: EmpresaConDetalle; playa?: PlayaResumen }
  | { tipo: "usuario"; empresa: EmpresaConDetalle; usuario?: UsuarioDeEmpresa }
  | { tipo: "accesos"; empresa: EmpresaConDetalle; usuario: UsuarioDeEmpresa };

export function EditorDialog({
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
