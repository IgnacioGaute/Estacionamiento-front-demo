'use client';

import { Button } from '@/components/ui/button';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { toast } from 'sonner';

interface ParkingTypeLike {
  id: string;
  name: string;
  amount: number;
}

interface Props {
  parkings: ParkingTypeLike[];
  fileName?: string;
}

type ExportRow = {
  ID: string;
  'Tipo de Parking': string;
  'Monto ($)': string;
};

export const ExportParkingExcel = ({ parkings, fileName = 'parking' }: Props) => {
  const handleExport = () => {
    if (!parkings || parkings.length === 0) {
      toast.error('No hay datos de parking para exportar.');
      return;
    }

    const rows: ExportRow[] = parkings.map((parking) => ({
      ID: parking.id,
      'Tipo de Parking': parking.name,
      'Monto ($)': parking.amount.toString(),
    }));

    rows.sort((a, b) =>
      a['Tipo de Parking'].localeCompare(b['Tipo de Parking'], 'es', { sensitivity: 'base' })
    );

    const worksheet = XLSX.utils.json_to_sheet(rows);

    const columnWidths = [
      { wch: 25 },
      { wch: 25 },
      { wch: 15 },
      { wch: 40 },
    ];
    worksheet['!cols'] = columnWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Parking');
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });

    saveAs(blob, `${fileName}.xlsx`);
    toast.success('Archivo de parking exportado correctamente ✅');
  };

  return (
    <Button
      variant="ghost"
      className="w-full justify-start"
      size="sm"
      onClick={handleExport}
    >
      Exportar Excel Parking
    </Button>
  );
};
