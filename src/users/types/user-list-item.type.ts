import { Role } from '@/users/enums/role.enum';

export type UserListItem = {
  id: string;
  email: string;
  role: Role;
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatarUrl?: string | null;
  isActive: boolean;
  isEmailConfirmed: boolean;
  lastLoginAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
};
