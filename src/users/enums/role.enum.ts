import { registerEnumType } from '@nestjs/graphql';

export enum Role {
  ADMIN = 'admin',
  CUSTOMER = 'customer',
  SUPER_ADMIN = 'super_admin',
}
registerEnumType(Role, {
  name: 'Role',
});
