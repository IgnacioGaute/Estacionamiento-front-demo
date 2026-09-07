import { ReceiptSchemaType } from "@/schemas/receipt.schema";
import { ScannerReceipt } from "@/types/receipt.type";
import { Scanner } from "@/types/ticket.type";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export const startScanner = async (values: { barCode: string }) => {
  try {
    const response = await fetch(`${BASE_URL}/scanner/start-scanner`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => null);
      console.error("Respuesta no OK:", errorBody ?? response);
      return { error: errorBody?.message || `Error en la solicitud: ${response.statusText}` };
    }

    const data = await response.json();

    if (data.success === false) {
      return { error: data.message || "Error desconocido en el scanner" };
    }

    return data as Scanner;
  } catch (error) {
    console.error("Error en Scanner:", error);
    return { error: "Error de conexión con el servidor" };
  }
};

export const receiptScanner = async (values: ReceiptSchemaType, ) => {
  try {
    console.log("Enviando petición a la API:", values);

    const response = await fetch(`${BASE_URL}/scanner/receiptScanner`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => null);
      console.error("Respuesta no OK:", errorBody ?? response);
      return { error: errorBody?.message || `Error en la solicitud: ${response.statusText}` };
    }

    const data = await response.json();

    if (data.success === false) {
      return { error: data.message || "Error desconocido en el scanner" };
    }

    return data as ScannerReceipt;
  } catch (error) {
    console.error("Error en Scanner:", error);
    return { error: "Error de conexión con el servidor" };
  }
};



