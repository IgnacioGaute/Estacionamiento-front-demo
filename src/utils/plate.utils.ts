// Las patentes se guardan y comparan siempre en mayúsculas sin separadores — un espacio o
// punto de más (tipeado o pegado) rompía las búsquedas por coincidencia exacta.
export function sanitizePlateInput(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}
