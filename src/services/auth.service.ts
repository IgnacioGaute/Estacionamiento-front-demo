import { tenantFetch as fetch } from '@/lib/tenant-fetch';
import { getAuthHeaders } from '@/lib/auth';
import { LoginSchemaType } from '@/schemas/auth/login.schema';
import { PasswordResetToken } from '@/types/password-reset-token.type';
import { User } from '@/types/user.type';
import { VerificationToken } from '@/types/verification-token.type';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export const loginUser = async (values: LoginSchemaType, authToken: string) => {
  try {
    const user = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: await getAuthHeaders(authToken),
      body: JSON.stringify(values),
    });
    const data = await user.json();

    if (user.ok) {
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

export const getVerificationTokenByToken = async (
  token: string,
  authToken: string,
) => {
  try {
    const response = await fetch(
      `${BASE_URL}/auth/verification-token?token=${encodeURIComponent(token)}`,
      {
        headers: await getAuthHeaders(authToken),
      },
    );
    const data = await response.json();

    if (response.ok) {
      return data as VerificationToken;
    } else {
      console.error(data);
      return null;
    }
  } catch (error) {
    console.error(error);
    return null;
  }
};

export const getVerificationTokenByEmail = async (
  email: string,
  authToken: string,
) => {
  try {
    const response = await fetch(
      `${BASE_URL}/auth/verification-token?email=${encodeURIComponent(email)}`,
      {
        headers: await getAuthHeaders(authToken),
      },
    );
    const data = await response.json();

    if (response.ok) {
      return data as VerificationToken;
    } else {
      console.error(data);
      return null;
    }
  } catch (error) {
    console.error(error);
    return null;
  }
};

export const generateVerificationToken = async (
  email: string,
  authToken: string,
) => {
  try {
    const response = await fetch(`${BASE_URL}/auth/verification-token`, {
      method: 'POST',
      headers: await getAuthHeaders(authToken),
      body: JSON.stringify({ email }),
    });

    const data = await response.json();

    if (response.ok) {
      return data as VerificationToken;
    } else {
      console.error(data);
      return null;
    }
  } catch (error) {
    console.error(error);
    return null;
  }
};

export const deleteVerificationToken = async (
  id: string,
  authToken: string,
) => {
  try {
    const response = await fetch(`${BASE_URL}/auth/verification-token/${id}`, {
      method: 'DELETE',
      headers: await getAuthHeaders(authToken),
    });

    const data = await response.json();

    if (response.ok) {
      return true;
    } else {
      console.error(data);
      return false;
    }
  } catch (error) {
    console.error(error);
    return false;
  }
};

export const getPasswordResetTokenByToken = async (
  token: string,
  authToken: string,
) => {
  try {
    const response = await fetch(
      `${BASE_URL}/auth/password-reset-token?token=${encodeURIComponent(token)}`,
      {
        headers: await getAuthHeaders(authToken),
      },
    );
    const data = await response.json();

    if (response.ok) {
      return data as PasswordResetToken;
    } else {
      console.error(data);
      return null;
    }
  } catch (error) {
    console.error(error);
    return null;
  }
};

export const getPasswordResetTokenByEmail = async (
  email: string,
  authToken: string,
) => {
  try {
    const response = await fetch(
      `${BASE_URL}/auth/password-reset-token?email=${encodeURIComponent(email)}`,
      {
        headers: await getAuthHeaders(authToken),
      },
    );
    const data = await response.json();

    if (response.ok) {
      return data as PasswordResetToken;
    } else {
      console.error(data);
      return null;
    }
  } catch (error) {
    console.error(error);
    return null;
  }
};

export const generatePasswordResetToken = async (
  email: string,
  authToken: string,
) => {
  try {
    const response = await fetch(`${BASE_URL}/auth/password-reset-token`, {
      method: 'POST',
      headers: await getAuthHeaders(authToken),
      body: JSON.stringify({ email }),
    });

    const data = await response.json();

    if (response.ok) {
      return data as PasswordResetToken;
    } else {
      console.error(data);
      return null;
    }
  } catch (error) {
    console.error(error);
    return null;
  }
};

export const deletePasswordResetToken = async (
  id: string,
  authToken: string,
) => {
  try {
    const response = await fetch(
      `${BASE_URL}/auth/password-reset-token/${id}`,
      {
        method: 'DELETE',
        headers: await getAuthHeaders(authToken),
      },
    );

    const data = await response.json();

    if (response.ok) {
      return true;
    } else {
      console.error(data);
      return false;
    }
  } catch (error) {
    console.error(error);
    return false;
  }
};
