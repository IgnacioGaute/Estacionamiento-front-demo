'use client';

import { Button } from '@/components/ui/button';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { toast } from 'sonner';
import { Ticket } from '@/types/ticket.type';

interface Props {
  tickets: Ticket[];
}

type ExportRow = {
  'Código de barras': string;
  'Tipo de vehículo': string;
};

export const ExportTicketsExcel = ({ tickets }: Props) => {
  const handleExport = () => {
    if (!tickets || tickets.length === 0) {
      toast.error('No hay tickets para exportar.');
      return;
    }

    // Transformar cada ticket en fila simple
    const rows: ExportRow[] = tickets.map((ticket) => ({
      'Código de barras': ticket.codeBar,
      'Tipo de vehículo': ticket.vehicleType,
    }));

    // 🧭 Ordenar por código de barras (opcional)
    rows.sort((a, b) =>
      a['Código de barras'].localeCompare(b['Código de barras'], 'es', { sensitivity: 'base' })
    );

    const worksheet = XLSX.utils.json_to_sheet(rows);

    // Configurar ancho de columnas
    const columnWidths = [
      { wch: 25 }, // Código de barras
      { wch: 18 }, // Tipo de vehículo
    ];
    worksheet['!cols'] = columnWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Tickets');
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });

    saveAs(blob, `tickets.xlsx`);
    toast.success('Archivo de tickets exportado correctamente ✅');
  };

  return (
    <Button
      variant="ghost"
      className="w-full justify-start"
      size="sm"
      onClick={handleExport}
    >
      Exportar Excel Tickets
    </Button>
  );
};
