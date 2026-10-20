import { tenantFetch as fetch } from '@/lib/tenant-fetch';
import { getAuthHeaders } from "@/lib/auth";
import { getCacheTag } from "./cache-tags";
import { PaginatedResponse } from "@/types/paginated-response.type";
import { FiltrosAvisos, ListaAvisos, Note } from "@/types/note.type";
import { NoteSchemaType, UpdateNoteSchemaType } from "@/schemas/note.schema";
import { revalidateTag } from "next/cache";


const BASE_URL = process.env.NEXT_PUBLIC_API_URL;


export const AVISOS_POR_PAGINA = 20;

export const getNotes = async (authToken?: string, page = 1, search = '', filtros: FiltrosAvisos = {}) => {
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(AVISOS_POR_PAGINA), search });
      params.append('sortBy', 'createdAt:DESC');
      params.append('sortBy', 'id:DESC');
      for (const [clave, valor] of Object.entries(filtros)) if (valor && valor !== 'TODOS') params.set(clave, valor);
      const response = await fetch(`${BASE_URL}/notes?${params}`, {
        cache: 'no-store',
        headers: await getAuthHeaders(authToken),
        next: {
          tags: [getCacheTag('notes', 'all')],
        },
      });
      const data = await response.json();
  
      if (response.ok) {
        return data as ListaAvisos;
      } else {
        console.error(data);
        return null;
      }
    } catch (error) {
      console.error(error);
      return null;
    }
  };

  export const getNoteById = async (noteId:string, authToken?: string) => {
    try {
      const response = await fetch(`${BASE_URL}/notes/${noteId}`, {
        headers: await getAuthHeaders(authToken),
      });
      const data = await response.json();
  
      if (response.ok) {
        return data as Note;
      } else {
        console.error(data);
        return null;
      }
    } catch (error) {
      console.error(error);
      return null;
    }
  };

export const createNote = async (
    values: NoteSchemaType, userId: string, authToken?: string
  ) => {
    try {
      const response = await fetch(`${BASE_URL}/notes/users/${userId}`, {
        method: 'POST',
        headers: await getAuthHeaders(authToken),
        body: JSON.stringify(values),
      });
  
      const data = await response.json();
  
      if (response.ok) {
        revalidateTag(getCacheTag('notes', 'all'));
        return data as Note;
      } else {
        console.error('Error en la respuesta:', data);
        return null;
      }
    } catch (error) {
      console.error('Error en create notes:', error);
      return null;
    }
  };

  export const updateNote = async (
    id: string,
    note: Partial<UpdateNoteSchemaType>, authToken?: string
  ) => {
    try {
      const response = await fetch(`${BASE_URL}/notes/${id}`, {
        method: 'PATCH',
        headers: await getAuthHeaders(authToken),
        body: JSON.stringify(note),
      });
      const data = await response.json();
  
      if (response.ok) {
        revalidateTag(getCacheTag('notes', 'all'));
        return data as Note;
      } else {
        console.error(data);
        return null;
      }
    } catch (error) {
      console.error(error);
      return null;
    }
  };
  
  export const deleteNote = async (id: string, authToken?: string) => {
    try {
      const response = await fetch(`${BASE_URL}/notes/${id}`, {
        headers: await getAuthHeaders(authToken),
        method: 'DELETE',
      });
      const data = await response.json();
  
      if (response.ok) {
        revalidateTag(getCacheTag('notes', 'all'));
        return data;
      } else {
        console.error(data);
        return null;
      }
    } catch (error) {
      console.error(error);
      return null;
    }
  };

  export const getTodayNotes = async (userId: string, authToken?: string, page = 1): Promise<{ data: Note[]; meta: { totalItems: number; totalPages: number } }> => {
    try {
      const response = await fetch(`${BASE_URL}/notes/today/${userId}?page=${page}`, {
        headers: await getAuthHeaders(authToken),
      });
      const data = await response.json();
  
      if (response.ok && Array.isArray(data.data)) {
        return data;
      } else {
        throw new Error('No se pudieron consultar las notas.');
      }
    } catch (error) {
      console.error('Error en getTodayNotes:', error);
      throw error;
    }
  };
  

