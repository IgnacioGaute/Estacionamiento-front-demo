import { tenantFetch as fetch } from '@/lib/tenant-fetch';

import {
  UpdateUserPasswordType,
  UpdateUserSchemaType,
  UserSchemaType,
} from '@/schemas/user.schema';
import { PaginatedResponse } from '@/types/paginated-response.type';
import { User } from '@/types/user.type';
import { revalidateTag } from 'next/cache';
import { getCacheTag } from './cache-tags';
import { getAuthHeaders } from '@/lib/auth';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export const getUsers = async (authToken?: string) => {
  try {
    const response = await fetch(`${BASE_URL}/users`, {
      headers: await getAuthHeaders(authToken),
      next: {
        tags: [getCacheTag('users', 'all')],
      },
    });
    const data = await response.json();

    if (response.ok) {
      return data as PaginatedResponse<User>;
    } else {
      console.error(data);
      return null;
    }
  } catch (error) {
    console.error(error);
    return null;
  }
};

export const getUserById = async (id: string, authToken?: string) => {
  try {
    const response = await fetch(`${BASE_URL}/users/${id}`, {
      headers: await getAuthHeaders(authToken),
    });
    const data = await response.json();

    if (response.ok) {
      return data as User;
    } else {
      return null;
    }
  } catch (error) {
    console.error(error);
    return null;
  }
};

export const getUserByEmail = async (email: string, authToken?: string) => {
  try {
    if (!email) return null;

    const response = await fetch(`${BASE_URL}/users?filter.email=${encodeURIComponent(email)}`, {
      headers: await getAuthHeaders(authToken),
    });
    const data = await response.json();
    const { data: user } = data as PaginatedResponse<User>;

    if (response.ok) {
      return user[0];
    } else {
      console.error(data);
      return null;
    }
  } catch (error) {
    console.error(error);
    return null;
  }
};

export const getUserByUsername = async (
  username: string,
  authToken?: string,
) => {
  try {
    if (!username) return null;

    const response = await fetch(
      `${BASE_URL}/users?filter.username=${encodeURIComponent(username)}`,
      {
        headers: await getAuthHeaders(authToken),
      },
    );
    const data = await response.json();
    const { data: user } = data as PaginatedResponse<User>;

    if (response.ok) {
      return user[0];
    } else {
      console.error(data);
      return null;
    }
  } catch (error) {
    console.error(error);
    return null;
  }
};

export const createUser = async (user: UserSchemaType, authToken?: string) => {
  try {
    const response = await fetch(`${BASE_URL}/users`, {
      method: 'POST',
      headers: await getAuthHeaders(authToken),
      body: JSON.stringify(user),
    });
    const data = await response.json();

    if (response.ok) {
      revalidateTag(getCacheTag('users', 'all'));
      return data as User;
    } else {
      console.error(data);
      return null;
    }
  } catch (error) {
    console.error(error);
    return null;
  }
};

export const updateUser = async (
  id: string,
  user: Partial<UpdateUserSchemaType>,
  authToken?: string,
) => {
  try {
    const response = await fetch(`${BASE_URL}/users/${id}`, {
      method: 'PATCH',
      headers: await getAuthHeaders(authToken),
      body: JSON.stringify(user),
    });

    const data = await response.json();
    revalidateTag(getCacheTag('users', 'all'));
    revalidateTag(getCacheTag('users', 'single', id));
    if (!response.ok) {
      console.error(data);
      return {
        error: {
          code: data.code || 'UNKNOWN_ERROR',
          message: data.message || 'Error desconocido',
        },
      };
    }

    return data;
  } catch (error) {
    console.error('Error en updateUser:', error);
    throw error;
  }
};

export const deleteUser = async (id: string, authToken?: string) => {
  try {
    const response = await fetch(`${BASE_URL}/users/${id}`, {
      method: 'DELETE',
      headers: await getAuthHeaders(authToken),
    });

    const data = await response.json();

    if (response.ok) {
      revalidateTag(getCacheTag('users', 'all'));
      revalidateTag(getCacheTag('users', 'single', id));
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

export const updatePassword = async (
  id: string,
  values: UpdateUserPasswordType,
  authToken?: string,
) => {
  try {
    const response = await fetch(`${BASE_URL}/users/${id}/password`, {
      method: 'PATCH',
      headers: await getAuthHeaders(authToken),
      body: JSON.stringify(values),
    });
    const data = await response.json();
    revalidateTag('users');
    revalidateTag(id);
    if (!response.ok) {
      console.error(data);
      return {
        error: {
          code: data.code || 'UNKNOWN_ERROR',
          message: data.message || 'Error desconocido',
        },
      };
    }
    return data;
  } catch (error) {
    console.error(error);
    return null;
  }
};

