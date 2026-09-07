import { PDFDocument, StandardFonts } from 'pdf-lib';
import { toast } from 'sonner';
import JsBarcode from 'jsbarcode';
import { addReceiptPages, getComercioName, ReceiptLineItem } from './generate-receipt-layout';

interface MonthDebt {
  month: string; // p.ej. "2025-05-01"
  amount: number;
}

export async function generateReceiptsWithoutRegistering(customer: any, pendingReceipt?: any) {
  try {
    const combinedPdfDoc = await PDFDocument.create();
    const font = await combinedPdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await combinedPdfDoc.embedFont(StandardFonts.HelveticaBold);

    const effectivePendingReceipt = pendingReceipt ?? customer.receipts.find((receipt: any) => receipt.status === 'PENDING');
    const pendingPrice = effectivePendingReceipt ? effectivePendingReceipt.startAmount : 0;

    const monthsDebt = customer.monthsDebt;
    const isSameMonthDebt = Array.isArray(monthsDebt) && pendingReceipt
      ? monthsDebt.some((debt: MonthDebt) => {
          return dayjsIsSameMonth(debt.month, pendingReceipt.startDate);
        })
      : false;
    void isSameMonthDebt;

    let barcodeImage = null;
    let barcodeDims = null;

    if (effectivePendingReceipt?.barcode) {
      const canvas = document.createElement('canvas');
      JsBarcode(canvas, effectivePendingReceipt.barcode, {
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
        const amount = customer.numberOfVehicles === 1 ? pendingPrice : pendingPrice / customer.numberOfVehicles;
        items.push({ description: `Expensas comunes ${garage.garageNumber}`, amount });
      }
      total = pendingPrice;
    } else {
      const sumRenterAmounts = customer.parkingRenters.reduce((acc: number, r: any) => acc + r.amount, 0);
      const priceMatchesSum = sumRenterAmounts === pendingPrice;

      for (const renter of customer.parkingRenters) {
        const plateOwner = renter.parkingOwner?.customer
          ? `(${renter.parkingOwner.customer.lastName} ${renter.parkingOwner.customer.firstName})`
          : '';
        const renterPrice = priceMatchesSum ? renter.amount : pendingPrice / customer.parkingRenters.length;
        items.push({ description: `Cochera mensual ${renter.garageNumber} ${plateOwner}`, amount: renterPrice });
        total += renterPrice;
      }
    }

    const receiptNumber =
      customer.customerType === 'OWNER' || customer.customerType === 'RENTER'
        ? pendingReceipt?.receiptNumber ?? ''
        : '';

    const comercioName = getComercioName(
      customer.customerType,
      Boolean(effectivePendingReceipt),
      effectivePendingReceipt?.receiptTypeKey,
    );

    addReceiptPages(combinedPdfDoc, font, fontBold, {
      comercioName,
      receiptNumber,
      date: effectivePendingReceipt.startDate,
      recipientName: `${customer.lastName} ${customer.firstName}`,
      concept: customer.customerType === 'OWNER' ? 'Expensas comunes' : 'Cochera mensual',
      items,
      total,
      barcode:
        effectivePendingReceipt?.barcode && barcodeImage && barcodeDims
          ? {
              image: barcodeImage,
              width: barcodeDims.width,
              height: barcodeDims.height,
              text: effectivePendingReceipt.barcode,
            }
          : null,
    });

    const finalPdfBytes = await combinedPdfDoc.save();
    const blob = new Blob([finalPdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);

    const newWindow = window.open(url, '_blank');
    if (newWindow) {
      newWindow.onload = () => {
        newWindow.print();
      };
    }

    toast.success('Recibo Impreso');
  } catch (error) {
    console.error('Error al generar todos los recibos:', error);
    toast.error('Error al generar los recibos');
  }
}

function dayjsIsSameMonth(a: string, b: string): boolean {
  const da = new Date(a);
  const db = new Date(b);
  return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth();
}
