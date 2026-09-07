// src/utils/generate-box-list.ts
import type { BoxList } from "@/types/box-list.type"
import type { OtherPayment } from "@/types/other-payment.type"
import type { ReceiptPayment } from "@/types/receipt.type"
import type { TicketRegistrationForDay } from "@/types/ticket-registration-for-day.type"
import type { TicketRegistration } from "@/types/ticket-registration.type"
import { PDFDocument, rgb, StandardFonts } from "pdf-lib"
import { toast } from "sonner"

type SubtotalSummaryItem = {
  key: string
  label: string
  entradas: number
  salidas: number
  neto: number
}

// ✅ Orden alfabético por apellido (y nombre) en español, ignorando mayúsculas/acentos
const collator = new Intl.Collator("es", { sensitivity: "base" })
const norm = (v?: string | null) => (v ?? "").toString().trim()

const sortByLastName = <T>(
  arr: T[],
  getName: (item: T) => { lastName?: string | null; firstName?: string | null } | null | undefined,
) => {
  return [...arr].sort((a, b) => {
    const an = getName(a)
    const bn = getName(b)

    const aLast = norm(an?.lastName)
    const bLast = norm(bn?.lastName)
    const lastCmp = collator.compare(aLast, bLast)
    if (lastCmp !== 0) return lastCmp

    const aFirst = norm(an?.firstName)
    const bFirst = norm(bn?.firstName)
    return collator.compare(aFirst, bFirst)
  })
}

export default async function generateBoxList(boxList: BoxList, userName: string): Promise<Uint8Array> {
  try {
    if (!boxList) {
      throw new Error("No se recibieron datos válidos para generar el PDF.")
    }

    // ==============================
    //  Datos base (NO se tocan)
    // ==============================
    const {
      ticketRegistrations,
      receipts,
      otherPayments,
      ticketRegistrationForDays,
      totalPrice,
      date,
      boxNumber,
      receiptPayments,
      paymentHistoryOnAccount,
    } = boxList

    const tickets = Array.isArray(ticketRegistrations) ? ticketRegistrations : []
    const ticketDays = Array.isArray(ticketRegistrationForDays) ? ticketRegistrationForDays : []
    const validReceipts = Array.isArray(receipts) ? receipts : []
    const otherPaymentsRegistration = Array.isArray(otherPayments) ? otherPayments : []

    // ✅ Filtramos nulos al inicio para evitar errores en todo el flujo
    const safeReceiptPayments = Array.isArray(receiptPayments)
      ? receiptPayments.filter((rp) => rp && rp.receipt && rp.receipt.customer)
      : []

    const safePaymentHistory = Array.isArray(paymentHistoryOnAccount)
      ? paymentHistoryOnAccount.filter((p) => p && p.receipt && p.receipt.customer)
      : []

    console.log(
      "TP detectados",
      safeReceiptPayments.filter(
        (rp) =>
          rp.paymentType === "TP" ||
          rp.receipt?.paymentType === "TP" ||
          rp.receipt?.receiptTypeKey === "TP",
      ),
    )

    // 🏠 Propietarios (owners)
    const owners = safeReceiptPayments.filter(
      (receiptPayment) =>
        receiptPayment.receipt?.customer?.customerType === "OWNER" ||
        receiptPayment.paymentType === "TP" ||
        receiptPayment.receipt?.paymentType === "TP" ||
        receiptPayment.receipt?.receiptTypeKey === "TP",
    )

    // 🧾 Tipos de recibo asociados a inquilinos
    const renterReceiptTypes = [
      "JOSE_RICARDO_AZNAR",
      "CARLOS_ALBERTO_AZNAR",
      "NIDIA_ROSA_MARIA_FONTELA",
      "ALDO_RAUL_FONTELA",
    ]

    // 👥 Inquilinos (renters)
    const renters = safeReceiptPayments.filter((receiptPayment) =>
      renterReceiptTypes.includes(receiptPayment.receipt?.receiptTypeKey ?? ""),
    )

    // 🧍 Privados (privates)
    const privates = safeReceiptPayments.filter(
      (receiptPayment) =>
        receiptPayment.receipt?.customer?.customerType === "PRIVATE" &&
        receiptPayment.paymentType !== "TP" &&
        receiptPayment.receipt?.paymentType !== "TP" &&
        receiptPayment.receipt?.receiptTypeKey !== "TP",
    )

    // 💳 Pagos en cuenta (paymentHistory)
    const paymentHistoryOwners = safePaymentHistory.filter((p) => p.receipt?.customer?.customerType === "OWNER")

    const paymentHistoryRenters = safePaymentHistory.filter((p) =>
      renterReceiptTypes.includes(p.receipt?.receiptTypeKey ?? ""),
    )

    const paymentHistoryPrivates = safePaymentHistory.filter((p) => p.receipt?.customer?.customerType === "PRIVATE")

    // 🧩 Combinaciones finales
    const combinedOwners = [...owners, ...paymentHistoryOwners]
    const combinedRenters = [...renters, ...paymentHistoryRenters]
    const combinedPrivates = [...privates, ...paymentHistoryPrivates]

    // ✅ Ordenados alfabéticamente por apellido (y nombre)
    const combinedRentersSorted = sortByLastName(combinedRenters, (rp: any) => rp?.receipt?.customer)
    const combinedPrivatesSorted = sortByLastName(combinedPrivates, (rp: any) => rp?.receipt?.customer)

    const combinedOwnersSorted = sortByLastName(combinedOwners, (rp: any) => {
      const receipt = rp?.receipt
      const vehicleCustomer = receipt?.customer?.parkingRenters?.[0]?.parkingOwner?.customer
      return vehicleCustomer ?? receipt?.customer
    })

    // 🧮 Totales globales
    let totalEfectivo = 0
    let totalTransferencias = 0

    // ==============================
    //  Configuración PDF
    // ==============================
    const PAGE_WIDTH = 595.28
    const PAGE_HEIGHT = 841.89

    const pdfDoc = await PDFDocument.create()
    let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT])
    const { height } = page.getSize()
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
    const fontItalic = await pdfDoc.embedFont(StandardFonts.HelveticaOblique)
    const fontSize = 10

    let yPosition = height - 50

    // ==============================
    // ✅ PALETA Y GRILLA (diseño "Listado de Caja")
    // ==============================
    const inkColor = rgb(0.129, 0.110, 0.078)
    const brownColor = rgb(0.353, 0.263, 0.149)
    const mutedColor = rgb(0.541, 0.478, 0.373)
    const mutedText2 = rgb(0.361, 0.322, 0.255)
    const borderLight = rgb(0.847, 0.816, 0.753)
    const borderLighter = rgb(0.937, 0.914, 0.875)
    const dashColor = rgb(0.659, 0.604, 0.502)
    const negativeColor = rgb(0.478, 0.294, 0.239)
    const badgeBg = rgb(0.941, 0.933, 0.918)
    const totalsCardBg = rgb(0.957, 0.941, 0.902)

    // Márgenes y columnas
    const marginLeft = 50
    const marginRight = 545
    const contentWidth = marginRight - marginLeft

    const colFechaX = marginLeft
    const lineAfterDateX = marginLeft + 72
    const colDescTextX = lineAfterDateX + 10

    const salidasRightX = marginRight
    const salidasLeftX = salidasRightX - 85
    const entradasRightX = salidasLeftX - 12
    const entradasLeftX = entradasRightX - 85
    const descRightEdge = entradasLeftX - 10

    // Columnas del Resumen (Sección | Entradas | Salidas | Neto)
    const resumenNetoRightX = marginRight
    const resumenSalidasRightX = marginRight - 100
    const resumenEntradasRightX = marginRight - 200

    const numberFmt = new Intl.NumberFormat("es-AR", {
      useGrouping: true,
      maximumFractionDigits: 0,
    })

    const formatNumber = (num: number): string => {
      const n = Math.round(Number(num) || 0)
      if (n === 0) return "0"
      const s = String(Math.abs(n))
      const withDots = s.replace(/\B(?=(\d{3})+(?!\d))/g, ".")
      return n < 0 ? `-${withDots}` : withDots
    }

    const formatDate = (fecha: Date) => {
      const day = String(fecha.getDate()).padStart(2, "0")
      const month = String(fecha.getMonth() + 1).padStart(2, "0")
      const year = fecha.getFullYear()
      return `${day}/${month}/${year}`
    }

    const formatDateA = (d: string | Date) => {
      if (typeof d === "string") {
        const [year, month, day] = d.split("-")
        return `${day}/${month}/${year}`
      }
      const day = String(d.getDate()).padStart(2, "0")
      const month = String(d.getMonth() + 1).padStart(2, "0")
      const year = d.getFullYear()
      return `${day}/${month}/${year}`
    }

    // ✅ draw text right-aligned
    const drawRightText = (
      text: string,
      rightX: number,
      y: number,
      f = font,
      size = fontSize,
      color = inkColor,
    ) => {
      const w = f.widthOfTextAtSize(text, size)
      page.drawText(text, { x: rightX - w, y, size, font: f, color })
    }

    const today = formatDate(new Date())
    let isFirstPage = true

    // ==============================
    // ✅ Acumulador de subtotales
    // ==============================
    const subtotals: SubtotalSummaryItem[] = []
    const upsertSubtotal = (key: string, label: string, entradas: number, salidas: number) => {
      const neto = entradas - salidas
      const existing = subtotals.find((s) => s.key === key)
      if (existing) {
        existing.entradas += entradas
        existing.salidas += salidas
        existing.neto = existing.entradas - existing.salidas
      } else {
        subtotals.push({ key, label, entradas, salidas, neto })
      }
    }

    // ==============================
    //  Helpers de dibujo (solo diseño)
    // ==============================
    const drawFooter = (p: typeof page, pageNum: number) => {
      const footerY = 38
      p.drawLine({
        start: { x: marginLeft, y: footerY + 14 },
        end: { x: marginRight, y: footerY + 14 },
        thickness: 0.75,
        color: borderLight,
      })
      const footerText = "Documento generado automáticamente"
      const w = font.widthOfTextAtSize(footerText, 8)
      p.drawText(footerText, {
        x: (PAGE_WIDTH - w) / 2,
        y: footerY,
        size: 8,
        font,
        color: dashColor,
      })
      const pageLabel = `Página ${pageNum}`
      const pw = font.widthOfTextAtSize(pageLabel, 8)
      p.drawText(pageLabel, { x: marginRight - pw, y: footerY, size: 8, font, color: dashColor })
    }

    const drawBadge = (text: string, x: number, y: number) => {
      const badgeFontSize = 7.5
      const paddingX = 4
      const w = fontBold.widthOfTextAtSize(text, badgeFontSize)
      const boxW = w + paddingX * 2
      const boxH = 11
      page.drawRectangle({ x, y: y - 2, width: boxW, height: boxH, color: badgeBg })
      page.drawText(text, { x: x + paddingX, y: y + 1, size: badgeFontSize, font: fontBold, color: brownColor })
      return boxW
    }

    const drawDashedEmptyBox = (topY: number, boxHeight = 22) => {
      const bottomY = topY - boxHeight
      const dash = [3, 2]
      page.drawLine({ start: { x: marginLeft, y: topY }, end: { x: marginRight, y: topY }, thickness: 0.75, color: borderLight, dashArray: dash })
      page.drawLine({ start: { x: marginLeft, y: bottomY }, end: { x: marginRight, y: bottomY }, thickness: 0.75, color: borderLight, dashArray: dash })
      page.drawLine({ start: { x: marginLeft, y: topY }, end: { x: marginLeft, y: bottomY }, thickness: 0.75, color: borderLight, dashArray: dash })
      page.drawLine({ start: { x: marginRight, y: topY }, end: { x: marginRight, y: bottomY }, thickness: 0.75, color: borderLight, dashArray: dash })

      const text = "No se registraron datos"
      const w = fontItalic.widthOfTextAtSize(text, 9)
      page.drawText(text, {
        x: (marginLeft + marginRight) / 2 - w / 2,
        y: (topY + bottomY) / 2 - 3,
        size: 9,
        font: fontItalic,
        color: dashColor,
      })
    }

    const drawTableHeader = () => {
      const headerY = yPosition
      page.drawText("FECHA", { x: colFechaX, y: headerY, size: 8, font: fontBold, color: mutedColor })
      page.drawText("DESCRIPCIÓN", { x: colDescTextX, y: headerY, size: 8, font: fontBold, color: mutedColor })
      drawRightText("ENTRADAS", entradasRightX, headerY, fontBold, 8, mutedColor)
      drawRightText("SALIDAS", salidasRightX, headerY, fontBold, 8, mutedColor)
      yPosition -= 6
      page.drawLine({ start: { x: marginLeft, y: yPosition }, end: { x: marginRight, y: yPosition }, thickness: 0.75, color: borderLight })
      yPosition -= 16
    }

    const drawRowSeparator = () => {
      page.drawLine({
        start: { x: marginLeft, y: yPosition + 6 },
        end: { x: marginRight, y: yPosition + 6 },
        thickness: 0.5,
        color: borderLighter,
      })
      yPosition -= 6
    }

    const ensureSpace = (neededHeight = 70) => {
      if (yPosition < neededHeight) {
        drawFooter(page, pdfDoc.getPageCount())

        page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT])
        yPosition = PAGE_HEIGHT - 50

        isFirstPage = false

        page.drawText("LISTADO DE CAJA", { x: marginLeft, y: yPosition, size: 9, font: fontBold, color: brownColor })
        drawRightText(`N° ${boxNumber} · continuación`, marginRight, yPosition, fontBold, 9, mutedColor)
        yPosition -= 8
        page.drawLine({ start: { x: marginLeft, y: yPosition }, end: { x: marginRight, y: yPosition }, thickness: 0.75, color: borderLight })
        yPosition -= 26

        drawTableHeader()
      }
    }

    // ==============================
    //  Encabezado superior (diseño)
    // ==============================
    page.drawText("LISTADO DE CAJA", { x: marginLeft, y: yPosition, size: 9, font: fontBold, color: brownColor })
    drawRightText(`N° ${boxNumber}`, marginRight, yPosition, fontBold, 9, mutedColor)
    yPosition -= 8
    page.drawLine({ start: { x: marginLeft, y: yPosition }, end: { x: marginRight, y: yPosition }, thickness: 0.75, color: borderLight })
    yPosition -= 32

    page.drawText("Listado de Caja", { x: marginLeft, y: yPosition, size: 22, font: fontBold, color: inkColor })

    const pillText = `N° ${boxNumber}`
    const pillTextW = fontBold.widthOfTextAtSize(pillText, 12)
    const pillPadX = 10
    const pillW = pillTextW + pillPadX * 2
    const pillH = 20
    page.drawRectangle({ x: marginRight - pillW, y: yPosition - 5, width: pillW, height: pillH, color: badgeBg })
    page.drawText(pillText, { x: marginRight - pillW + pillPadX, y: yPosition, size: 12, font: fontBold, color: brownColor })

    yPosition -= 34

    const metaY = yPosition
    page.drawText("Usuario:", { x: marginLeft, y: metaY, size: 9.5, font: fontBold, color: inkColor })
    page.drawText(userName, { x: marginLeft + 48, y: metaY, size: 9.5, font, color: mutedText2 })

    page.drawText("Apertura:", { x: marginLeft + 230, y: metaY, size: 9.5, font: fontBold, color: inkColor })
    page.drawText(formatDateA(date), { x: marginLeft + 282, y: metaY, size: 9.5, font, color: mutedText2 })

    page.drawText("Impresión:", { x: marginLeft + 370, y: metaY, size: 9.5, font: fontBold, color: inkColor })
    page.drawText(today, { x: marginLeft + 430, y: metaY, size: 9.5, font, color: mutedText2 })

    yPosition -= 12
    page.drawLine({ start: { x: marginLeft, y: yPosition }, end: { x: marginRight, y: yPosition }, thickness: 1.5, color: inkColor })
    yPosition -= 26

    // ==============================
    //  Helpers de secciones
    // ==============================
    const drawSectionHeaderRow = (title: string) => {
      ensureSpace(100)
      yPosition -= 8
      const upperTitle = title.toUpperCase()
      page.drawText(upperTitle, { x: marginLeft, y: yPosition, size: 10.5, font: fontBold, color: brownColor })
      yPosition -= 6
      page.drawLine({ start: { x: marginLeft, y: yPosition }, end: { x: marginRight, y: yPosition }, thickness: 1.5, color: brownColor })
      yPosition -= 14
    }

    const drawSubtotalRow = (sectionKey: string, sectionLabel: string, totalEntrada: number, totalSalida: number) => {
      ensureSpace(50)
      const neto = totalEntrada - totalSalida

      upsertSubtotal(sectionKey, sectionLabel, totalEntrada, totalSalida)

      yPosition -= 2
      page.drawLine({ start: { x: marginLeft, y: yPosition + 12 }, end: { x: marginRight, y: yPosition + 12 }, thickness: 1, color: inkColor })

      const rowY = yPosition
      const netoText = `Neto  ${formatNumber(neto)}`
      const salidasText = `Salidas  ${totalSalida ? `- ${formatNumber(totalSalida)}` : "0"}`
      const entradasText = `Entradas  ${formatNumber(totalEntrada)}`

      drawRightText(netoText, marginRight, rowY, fontBold, 10, brownColor)
      const netoW = fontBold.widthOfTextAtSize(netoText, 10)
      drawRightText(salidasText, marginRight - netoW - 28, rowY, fontBold, 10, inkColor)
      const salidasW = fontBold.widthOfTextAtSize(salidasText, 10)
      drawRightText(entradasText, marginRight - netoW - salidasW - 56, rowY, fontBold, 10, inkColor)

      yPosition -= 28
    }

    const drawTotalsESNRow = (entradas: number, salidas: number, neto: number) => {
      ensureSpace(100)
      yPosition -= 6

      const cardGap = 8
      const cardWidth = (contentWidth - cardGap * 2) / 3
      const cardHeight = 56
      const cardTop = yPosition
      const cardBottomY = cardTop - cardHeight

      const cards: { label: string; value: string; bg: ReturnType<typeof rgb>; labelColor: ReturnType<typeof rgb>; valueColor: ReturnType<typeof rgb>; big: boolean }[] = [
        {
          label: "TOTAL ENTRADAS",
          value: `$ ${formatNumber(entradas)}`,
          bg: totalsCardBg,
          labelColor: mutedColor,
          valueColor: inkColor,
          big: false,
        },
        {
          label: "TOTAL SALIDAS",
          value: salidas ? `- $ ${formatNumber(salidas)}` : "$ 0",
          bg: totalsCardBg,
          labelColor: mutedColor,
          valueColor: inkColor,
          big: false,
        },
        {
          label: "NETO",
          value: `$ ${formatNumber(neto)}`,
          bg: brownColor,
          labelColor: rgb(0.886, 0.847, 0.769),
          valueColor: rgb(1, 1, 1),
          big: true,
        },
      ]

      cards.forEach((c, i) => {
        const x = marginLeft + i * (cardWidth + cardGap)
        page.drawRectangle({ x, y: cardBottomY, width: cardWidth, height: cardHeight, color: c.bg })
        page.drawText(c.label, { x: x + 14, y: cardTop - 20, size: 8, font: fontBold, color: c.labelColor })
        page.drawText(c.value, { x: x + 14, y: cardTop - 40, size: c.big ? 15 : 13, font: fontBold, color: c.valueColor })
      })

      yPosition = cardBottomY - 20
    }

    const drawSubtotalsSummary = () => {
      ensureSpace(220)
      yPosition -= 6

      page.drawText("RESUMEN", { x: marginLeft, y: yPosition, size: 10.5, font: fontBold, color: brownColor })
      yPosition -= 6
      page.drawLine({ start: { x: marginLeft, y: yPosition }, end: { x: marginRight, y: yPosition }, thickness: 1.5, color: brownColor })
      yPosition -= 18

      const headerY = yPosition
      page.drawText("SECCIÓN", { x: marginLeft, y: headerY, size: 8, font: fontBold, color: mutedColor })
      drawRightText("ENTRADAS", resumenEntradasRightX, headerY, fontBold, 8, mutedColor)
      drawRightText("SALIDAS", resumenSalidasRightX, headerY, fontBold, 8, mutedColor)
      drawRightText("NETO", resumenNetoRightX, headerY, fontBold, 8, mutedColor)
      yPosition -= 6
      page.drawLine({ start: { x: marginLeft, y: yPosition }, end: { x: marginRight, y: yPosition }, thickness: 0.75, color: borderLight })
      yPosition -= 16

      subtotals.forEach((s) => {
        ensureSpace(40)
        const rowY = yPosition
        page.drawText(s.label, { x: marginLeft, y: rowY, size: 9.5, font, color: inkColor })
        drawRightText(formatNumber(s.entradas), resumenEntradasRightX, rowY, font, 9.5)
        drawRightText(s.salidas ? `- ${formatNumber(s.salidas)}` : "0", resumenSalidasRightX, rowY, font, 9.5)
        drawRightText(formatNumber(s.neto), resumenNetoRightX, rowY, fontBold, 9.5, brownColor)

        yPosition -= 8
        page.drawLine({ start: { x: marginLeft, y: yPosition }, end: { x: marginRight, y: yPosition }, thickness: 0.5, color: borderLighter })
        yPosition -= 14
      })

      yPosition -= 6
    }

    // ==============================
    //  Secciones de datos
    // ==============================

    const addDataSection = (
      sectionKey: string,
      title: string,
      items: any[],
      // 5 valores: desc, price, fecha, badge de tipo de pago? (EF/TR/MIX), subtítulo? (patente/ticket + horario)
      dataExtractor: (item: any) => [string, string, string, string?, string?],
    ) => {
      yPosition -= 14
      drawSectionHeaderRow(title)
      const filteredItems = items.filter((i: any) => i.paid === undefined || i.paid)
      const total = filteredItems.reduce((sum, i: any) => sum + i.price, 0)

      if (items.length > 0) {
        drawTableHeader()
        items.forEach((item: any) => {
          const [desc, priceStr, dateNow, paymentBadge, subtitle] = dataExtractor(item)
          const price = Number(priceStr)
          const hasSubtitle = Boolean(subtitle)
          const rowHeight = hasSubtitle ? 30 : 18
          ensureSpace(rowHeight + 20)

          const nameSize = 9.5
          const maxDescWidth = descRightEdge - colDescTextX
          const truncatedDesc = truncateText(desc, maxDescWidth, font, nameSize)

          const rowY = yPosition
          page.drawText(dateNow, { x: colFechaX, y: rowY, size: 9, font, color: mutedText2 })
          page.drawText(truncatedDesc, { x: colDescTextX, y: rowY, size: nameSize, font, color: inkColor })

          if (paymentBadge) {
            const nameW = font.widthOfTextAtSize(truncatedDesc, nameSize)
            drawBadge(paymentBadge, colDescTextX + nameW + 6, rowY - 1)
          }

          if (hasSubtitle) {
            page.drawText(subtitle as string, { x: colDescTextX, y: rowY - 12, size: 8, font, color: mutedColor })
          }

          drawRightText(formatNumber(price), entradasRightX, rowY, font, 9.5)
          drawRightText("—", salidasRightX, rowY, font, 9.5, dashColor)

          yPosition -= rowHeight
          drawRowSeparator()
        })
      } else {
        drawDashedEmptyBox(yPosition, 22)
        yPosition -= 34
      }

      drawSubtotalRow(sectionKey, title, total, 0)
    }

    const addDataSectionReceipt = (
      sectionKey: string,
      title: string,
      items: ReceiptPayment[],
      // 7 valores:
      // 1 desc
      // 2 price (lo que va en Entradas)
      // 3 fecha
      // 4 paymentType
      // 5 vehicleOwner?
      // 6 numberInBox? (opcional, si querés mostrarlo/usar)
      // 7 totalPriceSalida? (para la regla TERCEROS+TR)
      dataExtractor: (item: any) => [string, number, string, string, string?, number?, number?],
    ) => {
      yPosition -= 12
      drawSectionHeaderRow(title)

      let totalEntradas = 0
      let totalSalidas = 0

      const isExpensa = title.toLowerCase() === "expensas"
      const isTercero = title.toLowerCase() === "terceros"

      if (items.length > 0) {
        drawTableHeader()
        items.forEach((item) => {
          // ✅ desestructurar los 7
          const [
            desc,
            priceStr,
            dateNow,
            paymentType,
            vehicleOwner,
            numberInBox,
            totalPriceSalida,
          ] = dataExtractor(item)

          const price = Number(priceStr ?? 0)
          const displayType = paymentType === "MIX" ? "AT" : paymentType
          const hasSubtitle = Boolean(vehicleOwner)
          const rowHeight = hasSubtitle ? 30 : 18

          ensureSpace(rowHeight + 20)

          const rowY = yPosition
          page.drawText(dateNow, { x: colFechaX, y: rowY, size: 9, font, color: mutedText2 })

          const nameSize = 9.5
          const maxDescWidth = descRightEdge - colDescTextX
          const truncatedDesc = truncateText(desc, maxDescWidth, font, nameSize)
          page.drawText(truncatedDesc, { x: colDescTextX, y: rowY, size: nameSize, font, color: inkColor })

          if (displayType) {
            const nameW = font.widthOfTextAtSize(truncatedDesc, nameSize)
            drawBadge(displayType, colDescTextX + nameW + 6, rowY - 1)
          }

          if (hasSubtitle) {
            const subtitleText = isTercero ? `por cuenta de ${vehicleOwner}` : (vehicleOwner as string)
            const subtitleFont = isTercero ? fontItalic : font
            page.drawText(subtitleText, { x: colDescTextX, y: rowY - 12, size: 8, font: subtitleFont, color: mutedColor })
          }

          const treatAsCash =
            paymentType === "EF" ||
            paymentType === "CH" ||
            paymentType === "MIX" ||
            (isExpensa && paymentType === "AT")

          // ✅ Caja: entradas
          if (treatAsCash) {
            totalEntradas += price
            drawRightText(formatNumber(price), entradasRightX, rowY, font, 9.5)
            drawRightText("—", salidasRightX, rowY, font, 9.5, dashColor)
          } else {
            // ✅ Entrada normal (siempre)
            totalEntradas += price
            drawRightText(formatNumber(price), entradasRightX, rowY, font, 9.5)

            // ======================================================
            // REGLA: TERCEROS + TR => la entrada es la diferencia
            // (numberInBox, lo que efectivamente quedó en caja tras
            // compensar la deuda del propietario) y la salida es el
            // TOTAL transferido (totalPriceSalida = receiptPayment.price).
            // El saldo de la fila queda negativo a propósito: la parte
            // usada para compensar reaparece como una entrada aparte en
            // EXPENSAS (pago tipo TP/"AT") en la cuenta del propietario,
            // y ahí es donde se compensa a nivel del total global.
            // ======================================================
            if (isTercero && paymentType === "TR") {
              const salida = Number(totalPriceSalida ?? 0)
              totalSalidas += salida
              drawRightText(`- ${formatNumber(salida)}`, salidasRightX, rowY, font, 9.5, negativeColor)
            }
            // ✅ Si TERCEROS y NO es TR, dejo tu regla (salida = price)
            else if (isTercero) {
              totalSalidas += price
              drawRightText(`- ${formatNumber(price)}`, salidasRightX, rowY, font, 9.5, negativeColor)
            }
            // ✅ resto secciones
            else if (paymentType === "TR") {
              totalSalidas += price
              drawRightText(`- ${formatNumber(price)}`, salidasRightX, rowY, font, 9.5, negativeColor)
            } else {
              totalSalidas += price
              drawRightText(`- ${formatNumber(price)}`, salidasRightX, rowY, font, 9.5, negativeColor)
            }
          }

          yPosition -= rowHeight
          drawRowSeparator()
        })
      } else {
        drawDashedEmptyBox(yPosition, 22)
        yPosition -= 34
      }

      drawSubtotalRow(sectionKey, title, totalEntradas, totalSalidas)
    }


    const addDataSectionExpense = (
      sectionKey: string,
      title: string,
      items: OtherPayment[],
      // 5 valores: desc, price, fecha, type (EGRESOS/INGRESOS), paymentMethod? (CASH/TRANSFER)
      dataExtractor: (item: any) => [string, string, string, string, string?],
    ) => {
      yPosition -= 14
      drawSectionHeaderRow(title)

      let entradas = 0
      let salidas = 0

      if (items.length > 0) {
        drawTableHeader()
        items.forEach((item) => {
          ensureSpace(40)

          const [desc, priceStr, dateNow, type, paymentMethod] = dataExtractor(item)
          const price = Number(priceStr)

          const maxDescWidth = descRightEdge - colDescTextX
          const truncatedDesc = truncateText(desc, maxDescWidth, font, fontSize)

          const rowY = yPosition
          page.drawText(dateNow, { x: colFechaX, y: rowY, size: 9, font, color: mutedText2 })
          page.drawText(truncatedDesc, { x: colDescTextX, y: rowY, size: 9.5, font, color: inkColor })

          const methodBadge = paymentMethod === "TRANSFER" ? "TR" : "EF"
          const nameW = font.widthOfTextAtSize(truncatedDesc, 9.5)
          drawBadge(methodBadge, colDescTextX + nameW + 6, rowY - 1)

          // ======================================================
          // REGLA: VARIOS + TR => mismo criterio que en recibos: la
          // transferencia no afecta la caja física, así que se muestra
          // en entradas y salidas por igual (neto 0), sin importar si
          // el movimiento es un ingreso o un egreso.
          // ======================================================
          if (paymentMethod === "TRANSFER") {
            drawRightText(formatNumber(price), entradasRightX, rowY, font, 9.5)
            drawRightText(`- ${formatNumber(price)}`, salidasRightX, rowY, font, 9.5, negativeColor)
            entradas += price
            salidas += price
          } else if (type === "EGRESOS") {
            drawRightText(`- ${formatNumber(price)}`, salidasRightX, rowY, font, 9.5, negativeColor)
            drawRightText("—", entradasRightX, rowY, font, 9.5, dashColor)
            salidas += price
          } else {
            drawRightText(formatNumber(price), entradasRightX, rowY, font, 9.5)
            drawRightText("—", salidasRightX, rowY, font, 9.5, dashColor)
            entradas += price
          }

          yPosition -= 18
          drawRowSeparator()
        })
      } else {
        drawDashedEmptyBox(yPosition, 22)
        yPosition -= 34
      }

      drawSubtotalRow(sectionKey, title, entradas, salidas)
    }

    // ==============================
    //  Nombres friendly para recibos
    // ==============================
    const receiptTypeNames: Record<string, string> = {
      JOSE_RICARDO_AZNAR: "Ricardo Aznar",
      CARLOS_ALBERTO_AZNAR: "Carlos Aznar",
      NIDIA_ROSA_MARIA_FONTELA: "Nidia Fontela",
      ALDO_RAUL_FONTELA: "Aldo Fontela",
    }

    // ==============================
    //  Secciones según tu lógica
    // ==============================

    // "1h 25min" / "40min" — duración entre entrada y salida de un ticket por hora.
    const formatElapsedHM = (minutes: number): string => {
      const h = Math.floor(minutes / 60)
      const m = minutes % 60
      return h > 0 ? `${h}h ${m}min` : `${m}min`
    }

    const ticketElapsedLabel = (t: TicketRegistration): string | undefined => {
      if (!t.entryDay || !t.entryTime || !t.departureDay || !t.departureTime) return undefined
      const start = new Date(`${t.entryDay}T${t.entryTime}`)
      const end = new Date(`${t.departureDay}T${t.departureTime}`)
      const diffMin = Math.round((end.getTime() - start.getTime()) / 60000)
      if (!Number.isFinite(diffMin) || diffMin < 0) return undefined
      return `${t.entryTime.slice(0, 5)} - ${t.departureTime.slice(0, 5)} (${formatElapsedHM(diffMin)})`
    }

    // El pago de un ticket puede quedar repartido en varios movimientos (anticipo + saldo) —
    // si todos coinciden se muestra un único medio, si no, "MIX".
    const ticketPaymentBadge = (t: TicketRegistration): string | undefined => {
      const movimientos = t.movimientos ?? []
      if (movimientos.length === 0) return undefined
      const metodos = new Set(movimientos.map((m) => m.metodo))
      if (metodos.size > 1) return "MIX"
      return metodos.has("TRANSFER") ? "TR" : "EF"
    }

    addDataSection("tickets_hora", "ticket x hora", tickets, (ticket: TicketRegistration) => {
      const identifier = ticket.licensePlateOriginal || ticket.codeBarTicket || "—"
      const identifierLabel = ticket.licensePlateOriginal ? "Patente" : "Ticket"
      const subtitleParts = [`${identifierLabel}: ${identifier}`, ticketElapsedLabel(ticket)].filter(Boolean)

      return [
        ticket.description,
        ticket.price.toString(),
        ticket.dateNow ? formatDateA(ticket.dateNow) : "—",
        ticketPaymentBadge(ticket),
        subtitleParts.join("   ·   "),
      ]
    })

    addDataSection("tickets_dia", "Ticket x día/semana", ticketDays, (ticket: TicketRegistrationForDay) => {
      const subtitleParts = [
        ticket.vehiclePlateCustomer ? `Patente: ${ticket.vehiclePlateCustomer}` : undefined,
        ticket.days ? `${ticket.days} día${ticket.days > 1 ? "s" : ""}` : undefined,
        ticket.weeks ? `${ticket.weeks} semana${ticket.weeks > 1 ? "s" : ""}` : undefined,
      ].filter(Boolean)

      return [
        ticket.description,
        ticket.price.toString(),
        ticket.dateNow ? formatDateA(ticket.dateNow) : "—",
        undefined,
        subtitleParts.join("   ·   "),
      ]
    })

    addDataSectionReceipt("alquiler", "alquiler", combinedRentersSorted, (receiptPayment) => {
      const receipt = receiptPayment.receipt
      const total = receiptPayment.price
      const owner = receiptTypeNames[receipt.receiptTypeKey] || receipt.receiptTypeKey

      const paymentType =
        receiptPayment.paymentType === "TRANSFER"
          ? "TR"
          : receiptPayment.paymentType === "CASH"
            ? "EF"
            : receiptPayment.paymentType === "CHECK"
              ? "CH"
              : receiptPayment.paymentType === "CREDIT"
                ? "CR"
                : receiptPayment.paymentType === "TP"
                  ? "AT"
                  : "Desconocido"

      return [
        `${receipt.customer.lastName} ${receipt.customer.firstName}`,
        total,
        formatDateA(receipt.dateNow),
        paymentType,
        owner,
      ]
    })

    addDataSectionReceipt("expensas", "expensas", combinedOwnersSorted, (receiptPayment) => {
      const receipt = receiptPayment.receipt
      const total = receiptPayment.numberInBox

      const vehicleCustomer = receipt.customer?.parkingRenters?.[0]?.parkingOwner?.customer
      const ownerName = vehicleCustomer
        ? `${vehicleCustomer.lastName} ${vehicleCustomer.firstName}`
        : `${receipt.customer.lastName} ${receipt.customer.firstName}`

      const paymentType =
        receiptPayment.paymentType === "TRANSFER"
          ? "TR"
          : receiptPayment.paymentType === "CASH"
            ? "EF"
            : receiptPayment.paymentType === "CHECK"
              ? "CH"
              : receiptPayment.paymentType === "CREDIT"
                ? "CR"
                : receiptPayment.paymentType === "TP"
                  ? "AT"
                  : receiptPayment.paymentType === "MIX"
                    ? "MIX"
                    : "Desconocido"

      return [ownerName, total, formatDateA(receipt.dateNow), paymentType]
    })

    addDataSectionReceipt("terceros", "terceros", combinedPrivatesSorted, (receiptPayment) => {
      const receipt = receiptPayment.receipt

      // ==========================================================
      // TERCEROS + TRANSFERENCIA
      //
      // Ejemplo:
      // Alejandra paga $50.000
      // Andrés (propietario) tiene $30.000
      //
      // Entrada real a caja:
      // $50.000 - $30.000 = $20.000
      //
      // Salida:
      // $50.000
      //
      // Neto:
      // $20.000 - $50.000 = -$30.000
      // ==========================================================

      const totalPriceSalida = Number(receiptPayment.price ?? 0)

      const vehicleCustomer =
        receipt.customer?.parkingRenters?.[0]?.parkingOwner?.customer

      const vehicleOwner = vehicleCustomer
        ? `${vehicleCustomer.lastName}`
        : ""

      // Buscar cuánto corresponde al propietario
      let ownerAmount = 0

      if (vehicleCustomer?.id) {
        ownerAmount = combinedOwners
          .filter((ownerPayment) => {
            const ownerCustomer = ownerPayment?.receipt?.customer

            return ownerCustomer?.id === vehicleCustomer.id
          })
          .reduce((sum, ownerPayment) => {
            return sum + Number(ownerPayment.numberInBox ?? 0)
          }, 0)
      }

      // Si es transferencia, la entrada es solamente la diferencia
      const totalInBox =
        receiptPayment.paymentType === "TRANSFER"
          ? Math.max(0, totalPriceSalida - ownerAmount)
          : Number(receiptPayment.numberInBox ?? 0)

      const paymentType =
        receiptPayment.paymentType === "TRANSFER"
          ? "TR"
          : receiptPayment.paymentType === "CASH"
            ? "EF"
            : receiptPayment.paymentType === "CHECK"
              ? "CH"
              : receiptPayment.paymentType === "CREDIT"
                ? "CR"
                : receiptPayment.paymentType === "TP"
                  ? "AT"
                  : receiptPayment.paymentType === "MIX"
                    ? "MIX"
                    : "Desconocido"

      return [
        `${receipt.customer.lastName} ${receipt.customer.firstName}`,
        totalInBox,
        formatDateA(receipt.dateNow),
        paymentType,
        vehicleOwner,
        totalInBox,
        totalPriceSalida,
      ]
    })

    // ==============================
    //  Totales globales (NO toco la lógica)
    // ==============================
    const totalReceipts = [...combinedRenters, ...combinedOwners, ...combinedPrivates].reduce((sum, rp) => {
      if (rp.paymentType === "TRANSFER" || rp.paymentType === "CREDIT" || rp.paymentType === "TP") {
        totalTransferencias += rp.price
        return sum
      } else if (rp.paymentType === "CASH" || rp.paymentType === "CHECK") {
        totalEfectivo += rp.price
        return sum + rp.price
      } else {
        return sum
      }
    }, 0)

    const totalTickets = [...tickets, ...ticketDays]
      .filter((t: any) => t.paid === undefined || t.paid === true)
      .reduce((sum, t: any) => sum + t.price, 0)

    const totalTicketsAndReceipts = totalTickets + totalReceipts
    const subtotalSinGastos = totalTicketsAndReceipts

    let totalEgresos = 0
    let totalIngresosVarios = 0

    otherPaymentsRegistration.forEach((op) => {
      if (op.type === "EGRESOS") {
        totalEgresos += op.price
      } else {
        totalIngresosVarios += op.price
      }
    })

    const totalEntradas = totalTickets + totalEfectivo + totalTransferencias
    const totalSalidas = totalEgresos
    const total = totalEntradas - totalSalidas

    addDataSectionExpense("varios", "varios", otherPaymentsRegistration, (payment: any) => [
      payment.description,
      payment.price.toString(),
      formatDateA(payment.dateNow),
      payment.type,
      payment.paymentMethod,
    ])

    // ==============================
    // ✅ RESUMEN + TOTAL GENERAL CORRECTO
    // ==============================
    const totalsFromSubtotals = subtotals.reduce(
      (acc, s) => {
        acc.entradas += s.entradas
        acc.salidas += s.salidas
        return acc
      },
      { entradas: 0, salidas: 0 },
    )

    const netoFromSubtotals = totalsFromSubtotals.entradas - totalsFromSubtotals.salidas

    drawSubtotalsSummary()
    drawTotalsESNRow(totalsFromSubtotals.entradas, totalsFromSubtotals.salidas, netoFromSubtotals)

    // Pie de página en la última hoja
    drawFooter(page, pdfDoc.getPageCount())

    // ==============================
    //  Guardar, abrir e imprimir
    // ==============================
    const pdfBytes = await pdfDoc.save()
    const blob = new Blob([pdfBytes], { type: "application/pdf" })
    const url = URL.createObjectURL(blob)
    const newWindow = window.open(url, "_blank")
    if (newWindow) {
      newWindow.onload = () => {
        newWindow.print()
      }
    }
    const a = document.createElement("a")
    a.href = url
    a.download = `Listado-Caja-${today}.pdf`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)

    toast.success("Lista de caja generada y descargada correctamente")
    return pdfBytes
  } catch (error) {
    console.error("Error generando la lista de caja:", error)
    toast.error("Error al generar la lista de caja")
    throw error
  }
}

// Helper function to handle text wrapping (ya no trunca)
const truncateText = (text: string, maxWidth: number, font: any, fontSize: number): string => {
  return text // 🔥 devuelve siempre el texto completo
}
