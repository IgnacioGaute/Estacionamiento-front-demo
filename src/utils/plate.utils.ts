// Las patentes se guardan y comparan siempre en mayúsculas sin separadores — un espacio o
// punto de más (tipeado o pegado) rompía las búsquedas por coincidencia exacta.
export function sanitizePlateInput(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

// Formatos argentinos: auto vieja (ABC123), auto Mercosur (AB123CD), moto vieja (123ABC) y
// moto Mercosur (A123BCD). Chequeo liviano para avisos y para el escáner; el server recalcula.
export function looksLikeKnownPlateFormat(raw: string): boolean {
  const normalized = sanitizePlateInput(raw);
  return (
    /^[A-Z]{3}\d{3}$/.test(normalized) ||
    /^[A-Z]{2}\d{3}[A-Z]{2}$/.test(normalized) ||
    /^\d{3}[A-Z]{3}$/.test(normalized) ||
    /^[A-Z]\d{3}[A-Z]{3}$/.test(normalized)
  );
}
