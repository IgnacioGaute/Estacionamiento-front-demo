import { User } from "./user.type";
import { PaginatedResponse } from "./paginated-response.type";

export type Note = {

    id: string;
    description: string;
    sourceKey?: string | null;
    origin?: string | null;
    sourceType?: string | null;
    sourceId?: string | null;
    context?: string | null;
    date: string | null;
    hours: string | null;
    user: User | null;
    createdAt: Date;
}

export type EstadoAviso = 'TODOS' | 'SIN_LEER' | 'LEIDOS';
export type OrigenAviso = 'TODOS' | 'EQUIPO' | 'VEHICULOS' | 'CAJA' | 'CLIENTES';
export type FiltrosAvisos = { estado?: EstadoAviso; origen?: OrigenAviso; desde?: string; hasta?: string; autor?: string };

// La cartelera: la página de avisos, cuáles siguen pendientes para quien lee, cuántos hay en cada
// estado con los filtros aplicados, el resumen de la playa y quiénes publicaron.
export type ListaAvisos = PaginatedResponse<Note> & {
    pendientes: string[];
    conteos: { todos: number; sinLeer: number; leidos: number };
    resumen: { total: number; sinLeer: number; hoy: number };
    autores: { id: string; nombre: string }[];
}