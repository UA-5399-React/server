import { Role } from '@/users/enums/Role';

export type JwtPayload = {
  sub: string;
  email: string;
  role: Role;
};
