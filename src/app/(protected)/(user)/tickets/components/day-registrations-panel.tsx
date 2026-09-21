"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { CompactPagination } from "@/components/compact-pagination";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmActionDialog } from "@/components/confirm-action-dialog";
import { cn } from "@/lib/utils";
import { TicketRegistrationForDay } from "@/types/ticket-registration-for-day.type";
import { retireOverdueRegistrationsAction } from "@/actions/tickets/retire-overdue-registrations.action";

export function DayRegistrationsPanel({
  active,
  overdue,
  isOverdue,
  onSelect,
}: {
  active: TicketRegistrationForDay[];
  overdue: TicketRegistrationForDay[];
  isOverdue: (r: TicketRegistrationForDay) => boolean;
  onSelect: (id: string) => void;
}) {
  const router = useRouter();
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const query = search.trim().toLocaleLowerCase();
  const filtered = active.filter(r => !query || [r.vehiclePlateCustomer, r.lastNameCustomer].some(value => value?.toLocaleLowerCase().includes(query)));
  const currentPage = Math.min(page, Math.max(0, Math.ceil(filtered.length / 5) - 1));

  return (
    <div>
      <p className="mb-2.5 text-[10px] text-muted-foreground">
        Abonos por estadía larga planificada.
      </p>

      {active.length === 0 ? (
        <div className="rounded-md border border-dashed border-border bg-gm-surface-2/40 p-4 text-center text-[12px] text-muted-foreground">
          No hay abonos por día/semana/mes activos.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {overdue.length > 0 && (
            <div className="flex items-center justify-between gap-2 rounded-[8px] border border-destructive/30 bg-destructive/5 px-2.5 py-1.5">
              <span className="text-[11px] text-muted-foreground">
                {overdue.length} vencido{overdue.length === 1 ? "" : "s"}
              </span>
              <ConfirmActionDialog
                trigger={
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 gap-1 px-2 text-[11px] text-destructive hover:bg-destructive/15 hover:text-destructive"
                  >
                    <Trash2 className="size-3" />
                    Eliminar vencidos
                  </Button>
                }
                title="¿Eliminar los abonos vencidos?"
                description={`Se van a sacar ${overdue.length} abono${overdue.length === 1 ? "" : "s"} vencido${overdue.length === 1 ? "" : "s"} de esta lista.`}
                tone="warning"
                actionLabel="Eliminar vencidos"
                actionVariant="destructive"
                onConfirm={async () => {
                  const result = await retireOverdueRegistrationsAction(overdue.map((r) => r.id));
                  if ("error" in result && result.error) {
                    toast.error(result.error);
                  } else {
                    toast.success("Abonos vencidos eliminados de la lista");
                    router.refresh();
                  }
                }}
              >
                No se borra el registro ni afecta lo cobrado — solo deja de aparecer acá, como si
                se hubiera registrado la salida.
              </ConfirmActionDialog>
            </div>
          )}

          <Input aria-label="Buscar abono por patente o apellido" placeholder="Buscar patente o apellido" value={search} onChange={event => { setSearch(event.target.value); setPage(0); }} />
          <div className="flex flex-col gap-1.5">
            {filtered.slice(currentPage * 5, (currentPage + 1) * 5).map((r) => {
              const isLate = isOverdue(r);
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => onSelect(r.id)}
                  className={cn(
                    "flex min-h-10 items-center justify-between gap-2 rounded-[8px] border px-2.5 py-1.5 text-left transition-colors",
                    isLate
                      ? "border-destructive/40 bg-destructive/10 hover:bg-destructive/15"
                      : "border-gm-yellow/40 bg-gm-yellow/10 hover:bg-gm-yellow/20",
                  )}
                >
                  <span className="flex items-center gap-1.5 min-w-0">
                    <span className="gm-mono text-[11.5px] font-bold text-foreground truncate">
                      {r.vehiclePlateCustomer || "Sin patente"}
                    </span>
                    {isLate && (
                      <Badge variant="red" className="shrink-0 px-1.5 py-0 text-[9px]">
                        Vencido
                      </Badge>
                    )}
                  </span>
                  <span className="max-w-[45%] truncate text-[10.5px] text-muted-foreground">
                    {r.lastNameCustomer || "—"}
                  </span>
                </button>
              );
            })}
          </div>
          {filtered.length === 0 && <p className="py-3 text-center text-xs text-muted-foreground">No hay abonos que coincidan con la búsqueda.</p>}
          <CompactPagination page={currentPage} total={filtered.length} pageSize={5} onChange={setPage} />
        </div>
      )}
    </div>
  );
}
