import { Types } from 'mongoose';

import { Role } from '@/users/enums/role.enum';

export type CreateUserData = {
  email: string;
  passwordHash: string;
  role: Role;

  firstName?: string;
  lastName?: string;
  phone?: string;
  avatarUrl?: string;

  isActive?: boolean;
  isEmailConfirmed?: boolean;

  createdBy?: Types.ObjectId | string | null;
};
