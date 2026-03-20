import { Role } from '../../../dist 4/users/enums/Role';

export type JwtPayload = {
  sub: string;
  email: string;
  role: Role;
};
