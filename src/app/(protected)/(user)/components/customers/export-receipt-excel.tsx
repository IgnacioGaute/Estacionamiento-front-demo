'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import { toast } from '@/lib/toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Receipt } from '@/types/receipt.type';
import { CustomerType } from '@/types/cutomer.type';
import { Receipt as ReceiptIcon } from 'lucide-react';

dayjs.extend(utc);
dayjs.extend(timezone);

interface Props {
    receipts: Receipt[];
    type: CustomerType;
  }

type ExportRow = {
  'Número Recibo': string;
  Estado: string;
  'Monto ($)': string;
  'Fecha Pago': string;
  Barcode: string;
  'Fecha de Creacion': string;
  Apellido: string;
  Nombre: string;
};

export const ExportReceiptsExcel = ({ receipts, type }: Props) => {
    const [selectedMonth, setSelectedMonth] = useState<number>(dayjs().month());
    const [exportType, setExportType] = useState<'all' | 'paid' | 'unpaid'>('all');
    const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);

    const handleExport = () => {
    const selectedMonthNum = selectedMonth; // 0-based month

    // Filtrar recibos por mes y tipo de customer
    const filteredReceipts = receipts.filter((receipt) => {
        if (!receipt.startDate) return false;
        const date = dayjs(receipt.startDate).tz("America/Argentina/Buenos_Aires");
        return date.month() === selectedMonthNum && receipt.customer.customerType === type;
    });

    if (filteredReceipts.length === 0) {
      toast.error('No hay recibos para el mes seleccionado.');
      return;
    }

    // Transformar cada receipt en fila para Excel
    const rows: ExportRow[] = filteredReceipts.map((receipt) => ({
      'Número Recibo': receipt.receiptNumber,
      Estado: receipt.status === 'PAID' ? 'Pagado' : 'Pendiente',
      'Monto ($)': receipt.price.toString(),
      'Fecha Pago': receipt.paymentDate
        ? dayjs(receipt.paymentDate).format('DD/MM/YYYY')
        : '-',
      Barcode: receipt.barcode ?? '-',
      'Fecha de Creacion': receipt.startDate
        ? dayjs(receipt.startDate).format('DD/MM/YYYY')
        : '-',
        Apellido: receipt.customer.lastName,
        Nombre: receipt.customer.firstName
    }));

    // Filtro según exportType
    const finalRows = rows.filter((row) => {
      if (exportType === 'paid') return row.Estado === 'Pagado';
      if (exportType === 'unpaid') return row.Estado === 'Pendiente';
      return true;
    });

    if (finalRows.length === 0) {
      toast.error('No hay datos que coincidan con el filtro.');
      return;
    }

    // 🧭 Ordenar alfabéticamente por Apellido y luego Nombre
finalRows.sort((a, b) => {
  const lastNameCompare = a.Apellido.localeCompare(b.Apellido, 'es', { sensitivity: 'base' });
  if (lastNameCompare !== 0) return lastNameCompare;
  return a.Nombre.localeCompare(b.Nombre, 'es', { sensitivity: 'base' });
});

    // Generar Excel
    const worksheet = XLSX.utils.json_to_sheet(finalRows);
    
    // Configurar ancho de columnas para mejor visualización
    const columnWidths = [
      { wch: 15 }, // Número Recibo
      { wch: 12 }, // Estado
      { wch: 12 }, // Monto ($)
      { wch: 15 }, // Fecha Pago
      { wch: 20 }, // Barcode
      { wch: 18 }, // Fecha de Creacion
      { wch: 20 }, // Apellido
      { wch: 20 }  // Nombre
    ];
    worksheet['!cols'] = columnWidths;
    
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Recibos');
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });

    // Guardar con nombre más descriptivo
    const monthName = dayjs().month(selectedMonth).format('MMMM');
    saveAs(blob, `recibos_${monthName}_${exportType}.xlsx`);
  };

  const handleExportTypeChange = (value: string) => {
    if (value === 'all' || value === 'paid' || value === 'unpaid') {
      setExportType(value);
    } else {
      console.warn('Valor inválido para exportType:', value);
    }
  };

  return (
    <>
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 rounded-md border-border bg-gm-surface-2 text-[12px] font-medium text-muted-foreground hover:text-foreground"
          >
            <ReceiptIcon className="size-3.5" />
            <span className="hidden sm:inline">Recibos</span>
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader className="items-center">
            <DialogTitle>Seleccionar Mes</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col space-y-4">
            {/* Mes */}
            <Select 
              onValueChange={(value) => setSelectedMonth(parseInt(value))} 
              defaultValue={selectedMonth.toString()}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un mes" />
              </SelectTrigger>
              <SelectContent>
                <ScrollArea className="h-48">
                  {Array.from({ length: 12 }, (_, i) => {
                    const monthName =
                      dayjs().month(i).format('MMMM').charAt(0).toUpperCase() +
                      dayjs().month(i).format('MMMM').slice(1);
                    return (
                      <SelectItem key={i} value={i.toString()}>
                        {monthName}
                      </SelectItem>
                    );
                  })}
                </ScrollArea>
              </SelectContent>
            </Select>

            {/* Filtro pago */}
            <Select value={exportType} onValueChange={handleExportTypeChange}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por pago" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="paid">Solo Pagados</SelectItem>
                <SelectItem value="unpaid">Solo Pendientes</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            className="mt-4"
            onClick={() => {
              handleExport();
              setIsDialogOpen(false);
            }}
          >
            Exportar
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
};
