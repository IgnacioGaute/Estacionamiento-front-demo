'use client';

import { useState } from 'react';
import dayjs from 'dayjs';
import { History, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getPlateHistoryAction } from '@/actions/tickets/get-plate-history.action';
import { TicketRegistration } from '@/types/ticket-registration.type';
import { formatElapsed } from '@/utils/ticket-registration.utils';

interface PlateHistoryDialogProps {
  licensePlateNormalized: string;
  licensePlateOriginal: string;
}

function minutesBetween(entryDay: string, entryTime: string, departureDay: string, departureTime: string) {
  const entry = dayjs(`${entryDay} ${entryTime}`, 'YYYY-MM-DD HH:mm:ss');
  const departure = dayjs(`${departureDay} ${departureTime}`, 'YYYY-MM-DD HH:mm:ss');
  if (!entry.isValid() || !departure.isValid()) return null;
  return Math.max(0, departure.diff(entry, 'minute'));
}

export function PlateHistoryDialog({ licensePlateNormalized, licensePlateOriginal }: PlateHistoryDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [visits, setVisits] = useState<TicketRegistration[] | null>(null);

  const handleOpenChange = async (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen && visits === null) {
      setLoading(true);
      const data = await getPlateHistoryAction(licensePlateNormalized);
      setVisits(data);
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-1.5 text-[12.5px]"
        onClick={() => handleOpenChange(true)}
      >
        <History className="size-3.5" />
        Ver historial
      </Button>

      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Historial de {licensePlateOriginal}</DialogTitle>
          <DialogDescription>Todas las visitas registradas para esta patente.</DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground text-[13px]">
            <Loader2 className="size-4 animate-spin" />
            Cargando historial...
          </div>
        )}

        {!loading && visits && visits.length === 0 && (
          <p className="py-8 text-center text-[13px] text-muted-foreground">
            No hay visitas registradas para esta patente.
          </p>
        )}

        {!loading && visits && visits.length > 0 && (
          <div className="max-h-[60vh] overflow-y-auto rounded-md border border-border">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Entrada</TableHead>
                  <TableHead>Salida</TableHead>
                  <TableHead>Duración</TableHead>
                  <TableHead>Franja</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visits.map((visit) => {
                  const minutes =
                    visit.departureDay && visit.departureTime
                      ? minutesBetween(visit.entryDay, visit.entryTime, visit.departureDay, visit.departureTime)
                      : null;
                  return (
                    <TableRow key={visit.id}>
                      <TableCell className="whitespace-nowrap text-[12.5px]">
                        {dayjs(visit.entryDay).format('DD/MM/YYYY')} {visit.entryTime?.slice(0, 5)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-[12.5px]">
                        {visit.departureDay
                          ? `${dayjs(visit.departureDay).format('DD/MM/YYYY')} ${visit.departureTime?.slice(0, 5)}`
                          : '—'}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-[12.5px]">
                        {minutes !== null ? formatElapsed(minutes) : '—'}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-[12.5px] text-muted-foreground">
                        {visit.priceBracketLabel ?? '—'}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right text-[12.5px] font-medium">
                        ${visit.price?.toLocaleString('es-AR') ?? '0'}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
