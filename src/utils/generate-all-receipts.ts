import { PDFDocument, StandardFonts } from 'pdf-lib';
import { toast } from 'sonner';
import JsBarcode from 'jsbarcode';
import { generateReceiptsManual, getCustomers } from '@/services/customers.service';
import { CustomerType } from '@/types/cutomer.type';
import { addReceiptPages, getComercioName, ReceiptLineItem } from './generate-receipt-layout';

export async function generateAllReceipts(type: CustomerType, selectedDate?: Date, token?: string) {
  try {
    const dateStr = selectedDate?.toISOString().slice(0, 10); // 'YYYY-MM-DD'

    // 1) Crear en el backend los recibos de ese mes
    const result = await generateReceiptsManual(type, dateStr);
    if (result?.error) {
      toast.error(`No se pudieron crear recibos: ${result.error.message}`);
      return;
    }
    const customers = await getCustomers(type, token) || [];
    customers.sort((a, b) => a.lastName.localeCompare(b.lastName));
    const activeCustomers = customers.filter(customer => customer.deletedAt === null);

    const combinedPdfDoc = await PDFDocument.create();
    const font = await combinedPdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await combinedPdfDoc.embedFont(StandardFonts.HelveticaBold);

    for (const customer of activeCustomers) {
      const pendingReceipt = customer.receipts.find((receipt: any) => {
        if (receipt.status !== 'PENDING') return false;

        const [year, month, day] = receipt.startDate.split('-').map(Number);
        const receiptDate = new Date(year, month - 1, day);

        const targetMonth = selectedDate?.getMonth();
        const targetYear = selectedDate?.getFullYear();

        return (
          receiptDate instanceof Date &&
          !isNaN(receiptDate.getTime()) &&
          receiptDate.getMonth() === targetMonth &&
          receiptDate.getFullYear() === targetYear
        );
      });

      const today = selectedDate;
      const todayFormatted = today?.toLocaleDateString();

      let barcodeImage = null;
      let barcodeDims = null;

      if (pendingReceipt?.barcode) {
        const canvas = document.createElement('canvas');
        JsBarcode(canvas, pendingReceipt.barcode, {
          format: 'CODE128',
          width: 2,
          height: 40,
          displayValue: false,
        });
        const barcodeDataUrl = canvas.toDataURL('image/png');
        const base64 = barcodeDataUrl.split(',')[1];
        const binaryString = atob(base64);
        const barcodeBytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          barcodeBytes[i] = binaryString.charCodeAt(i);
        }
        barcodeImage = await combinedPdfDoc.embedPng(barcodeBytes);
        barcodeDims = barcodeImage.scale(0.5);
      }

      const items: ReceiptLineItem[] = [];
      let total = 0;

      if (customer.customerType === 'OWNER') {
        for (const garage of customer.parkingOwners) {
          items.push({ description: `Expensas comunes ${garage.garageNumber}`, amount: garage.amount });
          total += garage.amount;
        }
      } else {
        for (const renter of customer.parkingRenters) {
          const plateOwner = renter.parkingOwner?.customer
            ? `(${renter.parkingOwner.customer.lastName} ${renter.parkingOwner.customer.firstName})`
            : '';
          items.push({ description: `Cochera mensual ${renter.garageNumber} ${plateOwner}`, amount: renter.amount });
          total += renter.amount;
        }
      }

      const receiptNumber =
        customer.customerType === 'OWNER' || customer.customerType === 'RENTER'
          ? pendingReceipt?.receiptNumber ?? ''
          : '';

      const comercioName = getComercioName(
        customer.customerType,
        Boolean(pendingReceipt),
        pendingReceipt?.receiptTypeKey,
      );

      addReceiptPages(combinedPdfDoc, font, fontBold, {
        comercioName,
        receiptNumber,
        date: todayFormatted ?? '',
        recipientName: `${customer.lastName} ${customer.firstName}`,
        concept: customer.customerType === 'OWNER' ? 'Expensas comunes' : 'Cochera mensual',
        items,
        total,
        barcode:
          pendingReceipt?.barcode && barcodeImage && barcodeDims
            ? {
                image: barcodeImage,
                width: barcodeDims.width,
                height: barcodeDims.height,
                text: pendingReceipt.barcode,
              }
            : null,
      });
    }

    const finalPdfBytes = await combinedPdfDoc.save();
    const blob = new Blob([finalPdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);

    const newWindow = window.open(url, '_blank');
    if (newWindow) {
      newWindow.onload = () => {
        newWindow.print();
      };
    }

    toast.success('Todos los recibos han sido generados correctamente');
  } catch (error) {
    console.error('Error al generar todos los recibos:', error);
    toast.error('Error al generar los recibos');
  }
}
