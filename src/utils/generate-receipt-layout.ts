import { PDFDocument, PDFFont, PDFImage, PDFPage, rgb } from 'pdf-lib';

export interface ReceiptLineItem {
  description: string;
  amount: number;
}

export interface ReceiptBarcode {
  image: PDFImage;
  width: number;
  height: number;
  text: string;
}

export interface ReceiptPdfData {
  comercioName: string;
  receiptNumber: string;
  date: string;
  recipientName: string;
  concept: string;
  items: ReceiptLineItem[];
  total: number;
  barcode?: ReceiptBarcode | null;
}

const ADDRESS_LINE = 'Av. Mitre 1453 - Loc. 1 (5500) Ciudad - Mendoza · Tel: (0261) 4250167';

const INK = rgb(0x21 / 255, 0x1c / 255, 0x14 / 255);
const BROWN = rgb(0x5a / 255, 0x43 / 255, 0x26 / 255);
const MUTED = rgb(0x8a / 255, 0x7a / 255, 0x5f / 255);
const BORDER = rgb(0xd8 / 255, 0xd0 / 255, 0xc0 / 255);
const BORDER_LIGHT = rgb(0xef / 255, 0xe9 / 255, 0xdf / 255);

const PAGE_WIDTH = 595.5;
const PAGE_HEIGHT = 419.25;
const MARGIN = 26;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const CONTENT_HEIGHT = PAGE_HEIGHT - MARGIN * 2;

function formatAmount(amount: number): string {
  return `$ ${amount.toLocaleString('es-AR')}`;
}

function rightAlign(page: PDFPage, text: string, rightX: number, y: number, size: number, font: PDFFont, color = INK) {
  const width = font.widthOfTextAtSize(text, size);
  page.drawText(text, { x: rightX - width, y, size, font, color });
}

function drawCopy(
  page: PDFPage,
  font: PDFFont,
  fontBold: PDFFont,
  x0: number,
  yTop: number,
  data: ReceiptPdfData,
  copyLabel: string,
) {
  const width = CONTENT_WIDTH;
  const rightX = x0 + width;

  page.drawText(data.comercioName, { x: x0, y: yTop - 14, size: 15, font: fontBold, color: INK });
  page.drawText(ADDRESS_LINE, { x: x0, y: yTop - 27, size: 7.8, font, color: MUTED });

  rightAlign(page, 'RECIBO', rightX, yTop - 8, 7.5, fontBold, MUTED);
  rightAlign(page, `N° ${data.receiptNumber}`, rightX, yTop - 25, 15, fontBold, BROWN);
  rightAlign(page, `Fecha: ${data.date}`, rightX, yTop - 37, 8.5, font, INK);

  const headerBottomY = yTop - 42;
  page.drawLine({ start: { x: x0, y: headerBottomY }, end: { x: rightX, y: headerBottomY }, thickness: 1.3, color: BROWN });

  const infoY = headerBottomY - 16;
  page.drawText('Recibido de: ', { x: x0, y: infoY, size: 9.5, font: fontBold, color: INK });
  const recibidoWidth = fontBold.widthOfTextAtSize('Recibido de: ', 9.5);
  page.drawText(data.recipientName, { x: x0 + recibidoWidth, y: infoY, size: 9.5, font, color: INK });

  const conceptX = x0 + 230;
  page.drawText('Concepto: ', { x: conceptX, y: infoY, size: 9.5, font: fontBold, color: INK });
  const conceptoWidth = fontBold.widthOfTextAtSize('Concepto: ', 9.5);
  page.drawText(data.concept, { x: conceptX + conceptoWidth, y: infoY, size: 9.5, font, color: INK });

  const colCantX = x0;
  const colDescX = x0 + 40;

  const tableTop = infoY - 16;
  page.drawText('CANT.', { x: colCantX, y: tableTop, size: 7.2, font: fontBold, color: MUTED });
  page.drawText('DESCRIPCIÓN', { x: colDescX, y: tableTop, size: 7.2, font: fontBold, color: MUTED });
  rightAlign(page, 'IMPORTE', rightX, tableTop, 7.2, fontBold, MUTED);

  const headerLineY = tableTop - 5;
  page.drawLine({ start: { x: x0, y: headerLineY }, end: { x: rightX, y: headerLineY }, thickness: 0.75, color: BORDER });

  let rowY = headerLineY - 14;
  const rowLineHeight = 16;
  const rowCount = Math.max(data.items.length, 2);
  for (let i = 0; i < rowCount; i++) {
    const item = data.items[i];
    if (item) {
      page.drawText('1', { x: colCantX, y: rowY, size: 9, font, color: INK });
      page.drawText(item.description, { x: colDescX, y: rowY, size: 9, font, color: INK });
      rightAlign(page, formatAmount(item.amount), rightX, rowY, 9, font, INK);
    }
    page.drawLine({ start: { x: x0, y: rowY - 5 }, end: { x: rightX, y: rowY - 5 }, thickness: 0.5, color: BORDER_LIGHT });
    rowY -= rowLineHeight;
  }

  const stubTop = yTop - CONTENT_HEIGHT + 34;
  const totalLineY = stubTop + 20;
  page.drawLine({ start: { x: x0, y: totalLineY }, end: { x: rightX, y: totalLineY }, thickness: 1.3, color: INK });
  const totalText = formatAmount(data.total);
  rightAlign(page, totalText, rightX, totalLineY + 6, 15, fontBold, BROWN);
  const totalTextWidth = fontBold.widthOfTextAtSize(totalText, 15);
  const totalLabelWidth = font.widthOfTextAtSize('Total', 8.5);
  page.drawText('Total', { x: rightX - totalTextWidth - 10 - totalLabelWidth, y: totalLineY + 8, size: 8.5, font, color: MUTED });

  const stubY = yTop - CONTENT_HEIGHT + 8;
  if (data.barcode) {
    page.drawImage(data.barcode.image, {
      x: x0,
      y: stubY + 8,
      width: data.barcode.width,
      height: data.barcode.height,
    });
    page.drawText(data.barcode.text, { x: x0, y: stubY, size: 10.5, font: fontBold, color: INK });
  } else {
    page.drawRectangle({ x: x0, y: stubY + 10, width: 90, height: 20, borderColor: BORDER, borderWidth: 0.75 });
  }
  rightAlign(page, copyLabel, rightX, stubY + 4, 7.5, font, MUTED);
}

export function getComercioName(
  customerType: string,
  hasEffectivePendingReceipt: boolean,
  receiptTypeKey?: string | null,
): string {
  if (customerType === 'OWNER') return 'CONSORCIO GARAGE MITRE';

  if (hasEffectivePendingReceipt && customerType !== 'PRIVATE') {
    switch (receiptTypeKey) {
      case 'JOSE_RICARDO_AZNAR':
        return 'José Ricardo Aznar';
      case 'CARLOS_ALBERTO_AZNAR':
        return 'Carlos Alberto Aznar';
      case 'NIDIA_ROSA_MARIA_FONTELA':
        return 'Nidia Rosa María Fontela';
      case 'ALDO_RAUL_FONTELA':
        return 'Aldo Raúl Fontela';
      default:
        return 'CONSORCIO GARAGE MITRE';
    }
  }

  return 'GARAGE MITRE';
}

export function addReceiptPages(pdfDoc: PDFDocument, font: PDFFont, fontBold: PDFFont, data: ReceiptPdfData): [PDFPage, PDFPage] {
  const contentTop = PAGE_HEIGHT - MARGIN;

  const originalPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  drawCopy(originalPage, font, fontBold, MARGIN, contentTop, data, 'Original');

  const duplicatePage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  drawCopy(duplicatePage, font, fontBold, MARGIN, contentTop, data, 'Duplicado');

  return [originalPage, duplicatePage];
}
