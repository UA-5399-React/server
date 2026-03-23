import { Role } from '@/users/enums/role.enum';

export type AuthUser = {
  id: string;
  email: string;
  role: Role;
};
