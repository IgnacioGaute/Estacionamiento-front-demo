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
import { Customer, CustomerType } from '@/types/cutomer.type';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Receipt } from '@/types/receipt.type';
import { FileSpreadsheet } from 'lucide-react';

dayjs.extend(utc);
dayjs.extend(timezone);

interface Props {
  receipts: Receipt[];
  type: CustomerType;
}

type ExportRow = {
  Apellido: string;
  Nombre: string;
  '¿Pagó este mes?': string;
  'Monto Actual': string;
  Dueño: string;
};

export const ExportCustomersExcel = ({ receipts, type }: Props) => {


  const [selectedYear, setSelectedYear] = useState<string>(
    dayjs().format('YYYY')
  );
  const [selectedMonth, setSelectedMonth] = useState<string>(
    dayjs().format('MM')
  );
  const [exportType, setExportType] = useState<'all' | 'paid' | 'unpaid'>(
    'all'
  );
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);

const handleExport = () => {
  const selectedMonthNum = parseInt(selectedMonth, 10) - 1; // 0-indexed
  const selectedYearNum = parseInt(selectedYear, 10);

  // Filtramos los recibos por el mes y año seleccionados
 const filteredReceipts = receipts.filter((receipt) => {
    const date = dayjs(receipt.startDate).tz('America/Argentina/Buenos_Aires');
    return (
      date.month() === selectedMonthNum &&
      date.year() === selectedYearNum &&
      receipt.customer.customerType === type
    );
  });
  if (filteredReceipts.length === 0) {
    toast.error('No hay recibos para el mes seleccionado.');
    return;
  }
  // Agrupar por cliente
  const customerMap = new Map<string, ExportRow>();

for (const receipt of filteredReceipts) {
  const customer = receipt.customer;
  const fullNameKey = `${customer.firstName}_${customer.lastName}_${customer.id}`;

  if (!customerMap.has(fullNameKey)) {
    let ownerLabel = '';

    // Primero verificar el tipo de customer para manejar correctamente los PRIVATE
    if (receipt.customer.customerType === 'PRIVATE') {
      // Para customers PRIVATE, buscar el owner real a través de parkingRenters
      const vehicleRenter = receipt.customer.parkingRenters?.[0];
      if (vehicleRenter) {
        if (vehicleRenter.parkingOwner?.customer) {
          // Si el owner es un customer real
          ownerLabel = `${vehicleRenter.parkingOwner.customer.firstName} ${vehicleRenter.parkingOwner.customer.lastName}`;
        } else {
          // Dueño-tipo dinámico (Aznar/Fontela/etc.) — `owner` ya es el nombre legible.
          ownerLabel = vehicleRenter.owner;
        }
      } else {
        ownerLabel = 'Sin owner asignado';
      }
    } else if (receipt.receiptTypeKey === 'OWNER') {
      ownerLabel = 'Garage Mitre';
    } else if (receipt.receiptTypeKey === 'GARAGE_MITRE') {
      const vehicleCustomer = receipt.customer.parkingRenters?.[0]?.parkingOwner?.customer;
      ownerLabel = vehicleCustomer
        ? `${vehicleCustomer.firstName} ${vehicleCustomer.lastName}`
        : 'Garage Mitre';
    } else {
      ownerLabel = receipt.receiptTypeKey;
    }

    customerMap.set(fullNameKey, {
      Apellido: customer.lastName,
      Nombre: customer.firstName,
      '¿Pagó este mes?': receipt.status === 'PAID' ? 'Si' : 'No',
      'Monto Actual': receipt.price.toString(),
      Dueño: ownerLabel,
    });
  }
}


  const allRows = Array.from(customerMap.values());

  // Aplico el filtro de tipo de exportación
  const finalRows = allRows.filter((row) => {
    if (exportType === 'paid') return row['¿Pagó este mes?'] === 'Si';
    if (exportType === 'unpaid') return row['¿Pagó este mes?'] === 'No';
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
    { wch: 20 }, // Apellido
    { wch: 20 }, // Nombre
    { wch: 15 }, // ¿Pagó este mes?
    { wch: 15 }, // Monto Actual
    { wch: 25 }  // Dueño
  ];
  worksheet['!cols'] = columnWidths;
  
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Clientes');
  const excelBuffer = XLSX.write(workbook, {
    bookType: 'xlsx',
    type: 'array',
  });
  const blob = new Blob([excelBuffer], {
    type: 'application/octet-stream',
  });
  saveAs(blob, `clientes_pagos_${selectedYear}_${selectedMonth}.xlsx`);
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
            <FileSpreadsheet className="size-3.5" />
            <span className="hidden sm:inline">Clientes</span>
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader className="items-center">
            <DialogTitle>Seleccionar Fecha</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col space-y-4">
            {/* Año */}
            <Select onValueChange={setSelectedYear} defaultValue={selectedYear}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar Año" />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 5 }, (_, i) => (
                  <SelectItem key={i} value={(dayjs().year() - i).toString()}>
                    {dayjs().year() - i}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Mes */}
            <Select
              onValueChange={setSelectedMonth}
              defaultValue={selectedMonth}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un mes" />
              </SelectTrigger>
              <SelectContent>
                <ScrollArea className="h-48">
                  {Array.from({ length: 12 }, (_, i) => {
                    const monthNumber = (i + 1).toString().padStart(2, '0');
                    return (
                      <SelectItem key={monthNumber} value={monthNumber}>
                        {dayjs().month(i).format('MMMM')}
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
    <SelectItem value="paid">Solo los que pagaron</SelectItem>
    <SelectItem value="unpaid">Solo los que no pagaron</SelectItem>
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
