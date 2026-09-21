import { tenantFetch as fetch } from '@/lib/tenant-fetch';
import { getAuthHeaders } from "@/lib/auth";
import { getCacheTag } from "./cache-tags";
import { PaginatedResponse } from "@/types/paginated-response.type";
import { Note } from "@/types/note.type";
import { NoteSchemaType, UpdateNoteSchemaType } from "@/schemas/note.schema";
import { revalidateTag } from "next/cache";


const BASE_URL = process.env.NEXT_PUBLIC_API_URL;


export const getNotes = async (authToken?: string, page = 1, search = '') => {
    try {
      const response = await fetch(`${BASE_URL}/notes?page=${page}&limit=6&search=${encodeURIComponent(search)}`, {
        cache: 'no-store',
        headers: await getAuthHeaders(authToken),
        next: {
          tags: [getCacheTag('notes', 'all')],
        },
      });
      const data = await response.json();
  
      if (response.ok) {
        return data as PaginatedResponse<Note>;
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

  export const getTodayNotes = async (userId: string, authToken?: string): Promise<Note[]> => {
    try {
      const response = await fetch(`${BASE_URL}/notes/today/${userId}`, {
        headers: await getAuthHeaders(authToken),
      });
      const data = await response.json();
  
      if (response.ok && Array.isArray(data)) {
        return data as Note[];
      } else {
        console.error('Error en la respuesta de getTodayNotes:', data);
        return [];
      }
    } catch (error) {
      console.error('Error en getTodayNotes:', error);
      return []; 
    }
  };
  

