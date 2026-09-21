"use client";

import { TicketRegistration } from "@/types/ticket-registration.type";
import { AnimatedScrollList } from "@/components/animated-scroll-list";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Ticket } from "@/types/ticket.type";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Barcode, Car, ChevronRight, Timer, Search } from "lucide-react";
import {
  formatElapsed,
  isOverdue,
  isBarcodeOrigin,
  isTicketActive,
  latestRegistrationForTicket,
  minutesSinceEntry,
} from "@/utils/ticket-registration.utils";

type Row =
  | { kind: "BARCODE"; ticket: Ticket; registration: TicketRegistration }
  | { kind: "PLATE"; registration: TicketRegistration };

export function ActiveTicketsList({
  ticketCatalog,
  registrations,
  now,
  onSelect,
  onSelectPlate,
}: {
  ticketCatalog: Ticket[];
  registrations: TicketRegistration[];
  now: number;
  onSelect: (target: { id: string; codeBar: string; vehicleType: string; existing: TicketRegistration }) => void;
  onSelectPlate: (registrationId: string) => void;
}) {
  const entryKey = (r: TicketRegistration) => `${r.entryDay ?? ""} ${r.entryTime ?? ""}`;
  const [query, setQuery] = useState("");
  const normalize = (value: string) => value.toUpperCase().replace(/[^A-Z0-9]/g, "");

  // Los tickets por código de barras se descubren a través del catálogo (como antes); los
  // tickets por patente nunca tienen `ticket` poblado, así que se toman directo de los
  // registros activos que no matchean ningún ticket del catálogo — antes quedaban afuera de
  // esta lista por completo.
  const barcodeRows: Row[] = ticketCatalog
    .filter((t) => isTicketActive(t, registrations))
    .map((t) => ({ kind: "BARCODE", ticket: t, registration: latestRegistrationForTicket(t, registrations)! }));

  const plateRows: Row[] = registrations
    .filter((r) => !r.departureTime && !r.departureDay && !isBarcodeOrigin(r))
    .map((r) => ({ kind: "PLATE", registration: r }));

  const rows = [...barcodeRows, ...plateRows].sort((a, b) =>
    entryKey(a.registration).localeCompare(entryKey(b.registration)),
  );
  const search = normalize(query);
  const filteredRows = rows.filter(row => !search || [
    row.kind === "BARCODE" ? row.ticket.codeBar : "",
    row.registration.licensePlateOriginal ?? "",
    row.registration.noPlate ? row.registration.lastNameCustomer ?? "" : "",
  ].some(value => normalize(value).includes(search)));

  return (
    <div className="mb-4 [@media(max-height:850px)]:mb-2">
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2.5">
          <h3 className="gm-display text-[13px] font-bold tracking-[0.05em] text-foreground">
            Vehículos activos
          </h3>
          <span className="gm-mono text-[11px] font-bold px-2 py-0.5 rounded-full border border-gm-yellow/40 bg-gm-yellow/15 text-gm-yellow">
            {rows.length}
          </span>
        </div>
        <div className="flex items-center gap-1.5 gm-mono text-[10px] text-muted-foreground">
          <span
            className="h-1.5 w-1.5 rounded-full bg-[hsl(120_35%_55%)]"
            style={{ animation: "gm-blink 1.4s steps(2, jump-none) infinite" }}
          />
          en vivo
        </div>
      </div>

      {rows.length > 0 && <div className="relative mb-2.5">
        <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 z-10 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input type="search" aria-label="Buscar vehículo activo por patente o ticket" placeholder="Patente o ticket…" value={query} onChange={event => setQuery(event.target.value)} className="h-9 rounded-lg pl-9 pr-3 text-sm" />
      </div>}
      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-gm-surface-2/40 p-4 text-center text-[12px] text-muted-foreground">
          No hay vehículos activos.
        </div>
      ) : filteredRows.length === 0 ? (
        <p role="status" className="py-4 text-center text-xs text-muted-foreground">No hay vehículos que coincidan.</p>
      ) : (
        <AnimatedScrollList key={search} label="Vehículos activos: desplazá para ver más">
          {filteredRows.map((row) => {
            const { registration } = row;
            const elapsed = minutesSinceEntry(registration, now);
            const overdue = isOverdue(registration, now);
            const label =
              row.kind === "BARCODE"
                ? row.ticket.codeBar
                : registration.noPlate
                ? registration.lastNameCustomer ?? "Sin patente"
                : registration.licensePlateOriginal ?? "—";
            const vehicleType = row.kind === "BARCODE" ? row.ticket.vehicleType : registration.vehicleType;

            return (
              <button
                key={row.kind === "BARCODE" ? row.ticket.id : registration.id}
                type="button"
                onClick={() =>
                  row.kind === "BARCODE"
                    ? onSelect({
                        id: registration.id,
                        codeBar: row.ticket.codeBar,
                        vehicleType: row.ticket.vehicleType,
                        existing: registration,
                      })
                    : onSelectPlate(registration.id)
                }
                className="group relative flex w-full items-center gap-2.5 rounded-xl border border-border bg-gm-surface-2/70 py-2.5 pl-3 pr-2.5 text-left transition-colors hover:bg-gm-surface-2 overflow-hidden"
              >
                <span
                  className={cn(
                    "absolute inset-y-0 left-0 w-[3px]",
                    overdue ? "bg-destructive" : "bg-[hsl(120_35%_55%)]",
                  )}
                />
                <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-gm-surface-3 text-muted-foreground">
                  {row.kind === "BARCODE" ? <Barcode className="size-3.5" /> : <Car className="size-3.5" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className="gm-mono gm-tnum truncate text-[14px] font-bold text-foreground">{label}</span>
                    <Badge variant={overdue ? "red" : "green"} className="shrink-0 text-[9px] py-[1px] px-1.5">
                      {overdue ? "Vencido" : "En horario"}
                    </Badge>
                  </span>
                  <span className="flex items-center gap-1.5 mt-0.5 text-[10.5px] text-muted-foreground">
                    <Timer className="size-2.5 shrink-0" />
                    <span className="gm-mono gm-tnum">{elapsed !== null ? `hace ${formatElapsed(elapsed)}` : "—"}</span>
                    {vehicleType && (
                      <>
                        <span>·</span>
                        <span>{vehicleType === "AUTO" ? "Auto" : "Camioneta"}</span>
                      </>
                    )}
                    {row.kind === "PLATE" && registration.casilleroNumber && (
                      <>
                        <span>·</span>
                        <span>Cas. {registration.casilleroNumber}</span>
                      </>
                    )}
                    {registration.entryTime && (
                      <>
                        <span>·</span>
                        <span className="gm-mono gm-tnum">{registration.entryTime.slice(0, 5)}</span>
                      </>
                    )}
                  </span>
                  {registration.expectedBracketLabel && !overdue && (
                    <span className="block mt-0.5 text-[10px] text-muted-foreground truncate">
                      Avisó: <span className="text-foreground">{registration.expectedBracketLabel}</span>
                    </span>
                  )}
                </span>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </button>
            );
          })}
        </AnimatedScrollList>
      )}
    </div>
  );
}
