import { Role } from '@/users/enums/role.enum';

export type JwtPayload = {
  sub: string;
  email: string;
  role: Role;
};
