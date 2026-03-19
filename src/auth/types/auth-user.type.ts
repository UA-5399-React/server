import { Role } from '@/users/enums/Role';

export type AuthUser = {
  id: string;
  email: string;
  role: Role;
};
