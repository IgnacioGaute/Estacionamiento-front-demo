'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Customer, CustomerType } from '@/types/cutomer.type';
import { CalendarPlus } from 'lucide-react';
import GenerateReceiptsButton from '../receipts/all-receipts-button';
import { ExportCustomersExcel } from './export-customers-excel';
import { ExportGarageNumberExcel } from './export-garage-number-excel';
import { findAllPendingReceipts } from '@/services/customers.service';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Receipt } from '@/types/receipt.type';
import { ExportReceiptsExcel } from './export-receipt-excel';

export function CustomerActionsBar({
  customers,
  type,
  receipts,
}: {
  customers: Customer[];
  type: CustomerType;
  receipts: Receipt[];
}) {
  const [openDialog, setOpenDialog] = useState(false);

  const today = new Date();
  const nextMonth = today.getMonth() === 11 ? 0 : today.getMonth() + 1;
  const nextMonthYear =
    today.getMonth() === 11 ? today.getFullYear() + 1 : today.getFullYear();

  const [selectedMonth, setSelectedMonth] = useState<number>(nextMonth);
  const [selectedYear, setSelectedYear] = useState<number>(nextMonthYear);
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [alreadyGenerated, setAlreadyGenerated] = useState(false);

  const minYear = 2025;
  const minMonth = 5;

  const activeCustomers = customers.filter((c) => c.deletedAt === null);

  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
  ];

  const getDaysInMonth = (month: number, year: number) =>
    new Date(year, month + 1, 0).getDate();

  useEffect(() => {
    const checkReceipts = async () => {
      const data = await findAllPendingReceipts(type);
      if (Array.isArray(data)) {
        const exists = data.some((receipt: any) => {
          const date = new Date(receipt.dateNow + 'T00:00:00');
          return (
            date.getFullYear() === selectedYear &&
            date.getMonth() === selectedMonth
          );
        });
        setAlreadyGenerated(exists);
      } else {
        setAlreadyGenerated(false);
      }
    };
    checkReceipts();
  }, [selectedMonth, selectedYear, selectedDay, type]);

  const selectContentProps = {
    side: 'bottom' as const,
    align: 'start' as const,
    position: 'popper' as const,
    sideOffset: 8,
    avoidCollisions: false,
    className: 'max-h-[260px] overflow-y-auto z-[9999]',
  };

  return (
    <>
      <div className="flex items-center gap-3">
        {/* Generar recibos — acción principal */}
        <Button
          data-tour="customer-generate-receipts"
          size="sm"
          className="h-8 gap-1.5 rounded-md text-[12px] font-semibold"
          onClick={() => setOpenDialog(true)}
        >
          <CalendarPlus className="size-3.5" />
          Generar recibos
        </Button>

        {/* Separador visual */}
        <div className="hidden sm:block h-5 w-px bg-border" />

        {/* Exportaciones Excel */}
        <div data-tour="customer-excel" className="flex items-center gap-1">
          <span className="hidden sm:inline text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground mr-1">
            Excel
          </span>
          <ExportCustomersExcel receipts={receipts} type={type} />
          <ExportGarageNumberExcel customers={activeCustomers} />
          <ExportReceiptsExcel receipts={receipts} type={type} />
        </div>
      </div>

      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <span className="grid size-9 place-items-center rounded-md border border-gm-yellow/40 bg-gm-yellow/15 text-gm-yellow">
                <CalendarPlus className="size-4" />
              </span>
              <div>
                <DialogTitle>Generar recibos</DialogTitle>
                <DialogDescription className="mt-0.5">
                  Se crearán recibos para todos los clientes activos del período seleccionado.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground mb-1 block">
                  Día
                </label>
                <Select
                  value={selectedDay.toString()}
                  onValueChange={(v) => setSelectedDay(parseInt(v))}
                >
                  <SelectTrigger className="h-8 text-[12.5px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent {...selectContentProps}>
                    {Array.from({
                      length: getDaysInMonth(selectedMonth, selectedYear),
                    }).map((_, i) => (
                      <SelectItem key={i + 1} value={(i + 1).toString()}>
                        {i + 1}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground mb-1 block">
                  Mes
                </label>
                <Select
                  value={selectedMonth.toString()}
                  onValueChange={(v) => setSelectedMonth(parseInt(v))}
                >
                  <SelectTrigger className="h-8 text-[12.5px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent {...selectContentProps}>
                    {months.map((month, index) => {
                      if (selectedYear === minYear && index < minMonth)
                        return null;
                      return (
                        <SelectItem key={index} value={index.toString()}>
                          {month}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground mb-1 block">
                  Año
                </label>
                <Select
                  value={selectedYear.toString()}
                  onValueChange={(v) => setSelectedYear(parseInt(v))}
                >
                  <SelectTrigger className="h-8 text-[12.5px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent {...selectContentProps}>
                    {Array.from({ length: 5 }).map((_, i) => {
                      const year = new Date().getFullYear() - 2 + i;
                      return (
                        <SelectItem key={year} value={year.toString()}>
                          {year}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {alreadyGenerated && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-[12px] text-[#F08775]">
                Ya se generaron recibos para este mes.
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpenDialog(false)}>
              Cancelar
            </Button>
            <GenerateReceiptsButton
              type={type}
              selectedDate={
                new Date(selectedYear, selectedMonth, selectedDay)
              }
              onFinish={() => setOpenDialog(false)}
            />
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
