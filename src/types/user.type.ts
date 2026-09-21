
export const USER_ROLES = ['USER', 'ADMIN'] as const;
export type UserRole = (typeof USER_ROLES)[number] | 'SUPER_ADMIN';

export type User = {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  role: UserRole;
  authVersion?: number;
  deletedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};
