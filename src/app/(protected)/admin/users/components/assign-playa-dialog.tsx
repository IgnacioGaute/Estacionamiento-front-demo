"use client";
import { useState } from "react";
import { User } from "@/types/user.type";
import { operatorPlayaAction } from "@/actions/tenancy/context.action";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
export function AssignPlayaDialog({ user }: { user: User }) {
  const [open, setOpen] = useState(false),
    [loading, setLoading] = useState(false);
  const [playas, setPlayas] = useState<{ id: string; nombre: string }[]>([]);
  const [selected, setSelected] = useState(""),
    [error, setError] = useState("");
  async function abrir() {
    setOpen(true);
    setLoading(true);
    setError("");
    setSelected("");
    setPlayas([]);
    const result = await operatorPlayaAction(user.id);
    if (result.error) setError(result.error);
    else {
      setPlayas(result.playas || []);
      setSelected(result.playaId || "");
    }
    setLoading(false);
  }
  async function guardar() {
    setLoading(true);
    setError("");
    const result = await operatorPlayaAction(user.id, selected);
    setLoading(false);
    if (result.error) setError(result.error);
    else {
      toast.success(
        "Playa asignada. El operador entra directamente a esa playa.",
      );
      setOpen(false);
    }
  }
  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={abrir}>
        Asignar playa
      </Button>
      <Dialog
        open={open}
        onOpenChange={(v) => {
          if (!loading) setOpen(v);
        }}
      >
        <DialogContent className="w-[calc(100vw-2rem)] max-w-md">
          <DialogHeader>
            <DialogTitle>Playa de {user.firstName}</DialogTitle>
            <DialogDescription>
              Elegí dónde va a trabajar. El operador no tendrá que elegir una
              playa al ingresar.
            </DialogDescription>
          </DialogHeader>
          {loading && <p role="status">Cargando…</p>}
          <label className="space-y-2">
            <span className="text-sm font-medium">Playa asignada</span>
            <select
              aria-label="Playa asignada"
              className="h-11 w-full rounded-md border border-border bg-background px-3"
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              disabled={loading}
            >
              <option value="" disabled>
                Elegí una playa
              </option>
              {playas.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </label>
          {!loading && !playas.length && !error && (
            <p>La empresa todavía no tiene playas creadas.</p>
          )}
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <Button onClick={guardar} disabled={loading || !selected}>
            Guardar asignación
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
