# Referencia técnica: comprobantes

### Comprobantes (parking receipts)

`src/components/parking-receipt-delivery.tsx` opens after an entry or an exit when the playa has any delivery
channel enabled (WhatsApp / QR / print, from the backend's `receiptDelivery` settings). It issues through
`issueParkingReceiptAction`, and a failed issue can be retried without re-registering or re-charging.

**The public page is not in this repo.** It lives in the sibling app `../estacionamiento-comprobantes-demo`,
deployed as its own Railway service on its own domain, so the QR / WhatsApp link a customer receives never
reveals the system's domain. This app only builds the link, from `NEXT_PUBLIC_RECEIPTS_URL`:
`${NEXT_PUBLIC_RECEIPTS_URL}/c/<token>` (plus `?print=58|80` for the thermal layout). Without that variable the
delivery dialog says so instead of rendering broken links. Entry and exit have different tokens; the entry link
does not change when the stay is closed. `ParkingReceiptView` is duplicated in both repos — the dialog previews
the receipt here, the public app renders it there; keep them in sync by hand.

### PDF / Excel generation

`src/utils/generate-*.ts` fill pre-made PDF templates from `/public/*.pdf` with `pdf-lib`
(`generate-all-receipts.ts`, `generate-receipt-without-registering.ts`, `generate-box-list.ts`);
`generate-receipt.ts` is legacy and fully commented out. Excel exports live in
`(protected)/admin/components/export-*.tsx` (`xlsx`). The customer-facing comprobante export (canvas → PNG → PDF)
now lives in the comprobantes app, not here.
