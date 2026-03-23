import { registerEnumType } from '@nestjs/graphql';

export enum UsersSortField {
  createdAt = 'createdAt',
  updatedAt = 'updatedAt',
  lastLoginAt = 'lastLoginAt',
  email = 'email',
}

registerEnumType(UsersSortField, { name: 'UserSortField' });
