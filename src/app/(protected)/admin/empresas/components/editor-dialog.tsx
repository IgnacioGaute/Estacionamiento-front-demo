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
  CondicionIva,
  DatosEmpresa,
  EmpresaConDetalle,
  PlayaResumen,
  UsuarioDeEmpresa,
} from "@/types/tenancy.type";
import {
  CONDICIONES_IVA,
  PROVINCIAS,
  cuitValido,
  formatoCuit,
  soloNumeros,
} from "@/components/plataforma/datos-empresa";

const SELECT = "h-10 w-full rounded-md border border-input bg-background px-3 text-sm disabled:opacity-50";

// Lo que se manda: sin espacios de más, vacío es «sin cargar» (null) y el CUIT con los números solos.
function datosLimpios(d: Record<keyof DatosEmpresa, string>): DatosEmpresa {
  const texto = (v: string) => v.trim() || null;
  return {
    razonSocial: texto(d.razonSocial),
    cuit: soloNumeros(d.cuit) || null,
    condicionIva: (d.condicionIva || null) as CondicionIva | null,
    contactoNombre: texto(d.contactoNombre),
    contactoEmail: texto(d.contactoEmail),
    contactoTelefono: texto(d.contactoTelefono),
    ciudad: texto(d.ciudad),
    provincia: texto(d.provincia),
  };
}
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
  const [capacidad, setCapacidad] = useState(
    editor.tipo === "playa" && editor.playa?.capacidad ? String(editor.playa.capacidad) : "",
  );
  const base = editor.tipo === "empresa" ? editor.empresa : undefined;
  const [datos, setDatos] = useState<Record<keyof DatosEmpresa, string>>({
    razonSocial: base?.razonSocial ?? "",
    cuit: formatoCuit(base?.cuit),
    condicionIva: base?.condicionIva ?? "",
    contactoNombre: base?.contactoNombre ?? "",
    contactoEmail: base?.contactoEmail ?? "",
    contactoTelefono: base?.contactoTelefono ?? "",
    ciudad: base?.ciudad ?? "",
    provincia: base?.provincia ?? "",
  });
  const dato = (campo: keyof DatosEmpresa) => (valor: string) => setDatos((d) => ({ ...d, [campo]: valor }));
  // El aviso del CUIT espera a que termine de escribirlo: marcarlo en rojo con el primer número asusta.
  const [cuitTocado, setCuitTocado] = useState(false);
  const cuitMal = !!datos.cuit.trim() && !cuitValido(soloNumeros(datos.cuit));
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
  // La prueba gratis es una opción del alta: se puede destildar y darla después desde la ficha.
  const [conPrueba, setConPrueba] = useState(true);
  const [diasPrueba, setDiasPrueba] = useState(7);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const titulo =
    editor.tipo === "accesos"
      ? "Asignar playas"
      : `${(editor.tipo === "empresa" && editor.empresa) || (editor.tipo === "playa" && editor.playa) || usuario ? "Editar" : "Crear"} ${editor.tipo}`;
  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (pending) return;
    if (editor.tipo === "empresa" && cuitMal) {
      setCuitTocado(true);
      setError("Revisá el CUIT: los 11 números no coinciden con el dígito verificador.");
      return;
    }
    setPending(true);
    setError("");
    try {
      let r: { error?: string };
      const lugares = capacidad.trim() ? Number(capacidad) : null;
      if (editor.tipo === "empresa")
        r = editor.empresa
          ? await updateEmpresaAction(editor.empresa.id, {
              nombre: nombre.trim(),
              ...datosLimpios(datos),
            })
          : await createEmpresaAction(
              nombre.trim(),
              conPrueba ? diasPrueba : undefined,
              // En el alta solo viaja lo cargado.
              Object.fromEntries(Object.entries(datosLimpios(datos)).filter(([, v]) => v !== null)),
            );
      else if (editor.tipo === "playa")
        r = editor.playa
          ? await updatePlayaAction(editor.playa.id, {
              nombre: nombre.trim(),
              direccion: direccion.trim(),
              capacidad: lugares,
            })
          : await createPlayaAction(editor.empresa.id, {
              nombre: nombre.trim(),
              direccion: direccion.trim(),
              capacidad: lugares,
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
  // CUIT, condición frente al IVA, contacto y lugar: lo que hace falta para cobrarle y escribirle.
  const camposDatos = (
    <div className="space-y-4">
      {campo("razonSocial", "Razón social", datos.razonSocial, dato("razonSocial"), "text", false)}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="cuit">CUIT</Label>
          <Input
            id="cuit"
            inputMode="numeric"
            placeholder="30-71234567-1"
            value={datos.cuit}
            onChange={(e) => dato("cuit")(e.target.value)}
            onBlur={() => setCuitTocado(true)}
            aria-invalid={cuitTocado && cuitMal}
            aria-describedby={cuitTocado && cuitMal ? "cuit-error" : undefined}
            maxLength={13}
            autoComplete="off"
            disabled={pending}
          />
          {cuitTocado && cuitMal && (
            <p id="cuit-error" className="text-xs text-destructive">
              No coincide el dígito verificador: revisá los 11 números.
            </p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="condicionIva">Condición frente al IVA</Label>
          <select
            id="condicionIva"
            className={SELECT}
            value={datos.condicionIva}
            onChange={(e) => dato("condicionIva")(e.target.value)}
            disabled={pending}
          >
            <option value="">Sin cargar</option>
            {Object.entries(CONDICIONES_IVA).map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>
      {campo("contactoNombre", "Persona de contacto", datos.contactoNombre, dato("contactoNombre"), "text", false)}
      <div className="grid gap-4 sm:grid-cols-2">
        {campo("contactoEmail", "Email", datos.contactoEmail, dato("contactoEmail"), "email", false)}
        {campo("contactoTelefono", "WhatsApp", datos.contactoTelefono, dato("contactoTelefono"), "tel", false)}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {campo("ciudad", "Ciudad", datos.ciudad, dato("ciudad"), "text", false)}
        <div className="space-y-1.5">
          <Label htmlFor="provincia">Provincia</Label>
          <select
            id="provincia"
            className={SELECT}
            value={datos.provincia}
            onChange={(e) => dato("provincia")(e.target.value)}
            disabled={pending}
          >
            <option value="">Sin cargar</option>
            {/* Una provincia escrita a mano antes de la lista se conserva. */}
            {datos.provincia && !PROVINCIAS.includes(datos.provincia) && (
              <option value={datos.provincia}>{datos.provincia}</option>
            )}
            {PROVINCIAS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
      </div>
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
          {editor.tipo === "empresa" && !editor.empresa && (
            <div className="space-y-2 rounded-lg border border-border p-3">
              <label className="flex cursor-pointer items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={conPrueba}
                  disabled={pending}
                  onChange={(e) => setConPrueba(e.target.checked)}
                  className="size-4 accent-yellow-400"
                />
                <span className="font-medium">Darle prueba gratis</span>
                <select
                  aria-label="Días de prueba"
                  className="ml-auto h-9 rounded-md border border-input bg-background px-2 text-sm disabled:opacity-50"
                  value={diasPrueba}
                  disabled={pending || !conPrueba}
                  onChange={(e) => setDiasPrueba(Number(e.target.value))}
                >
                  {[3, 5, 7, 10, 14, 21, 30].map((n) => (
                    <option key={n} value={n}>
                      {n} días
                    </option>
                  ))}
                </select>
              </label>
              <p className="text-xs text-muted-foreground">
                {conPrueba
                  ? "Arranca hoy. No hace falta plan: lo elegís en la solapa Plan antes de que termine."
                  : "Queda sin plan ni vencimiento. La prueba se la podés dar después desde la solapa Plan."}
              </p>
            </div>
          )}
          {editor.tipo === "empresa" &&
            (editor.empresa ? (
              <fieldset className="space-y-4 border-t border-border pt-4">
                <legend className="float-left mb-3 w-full text-sm font-semibold">
                  Para cobrarle y contactarla
                </legend>
                {camposDatos}
              </fieldset>
            ) : (
              // En el alta va plegado: lo único necesario es el nombre.
              <details className="group rounded-lg border border-border p-3">
                <summary className="cursor-pointer text-sm font-medium">
                  CUIT y contacto (opcional)
                </summary>
                <div className="pt-4">{camposDatos}</div>
              </details>
            ))}
          {editor.tipo === "playa" &&
            campo(
              "direccion",
              "Dirección (opcional)",
              direccion,
              setDireccion,
              "text",
              false,
            )}
          {editor.tipo === "playa" && (
            <div className="space-y-1.5">
              <Label htmlFor="capacidad">Capacidad (opcional)</Label>
              <Input
                id="capacidad"
                type="number"
                inputMode="numeric"
                min={1}
                max={100000}
                step={1}
                placeholder="Ej.: 40"
                value={capacidad}
                onChange={(e) => setCapacidad(e.target.value)}
                aria-describedby="capacidad-ayuda"
                disabled={pending}
              />
              <p id="capacidad-ayuda" className="text-xs text-muted-foreground">
                Cuántos vehículos entran a la vez. Con esto la ficha muestra la ocupación.
              </p>
            </div>
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
