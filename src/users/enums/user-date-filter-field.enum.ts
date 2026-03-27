import { registerEnumType } from '@nestjs/graphql';

export enum UserDateFilterField {
  createdAt = 'createdAt',
  updatedAt = 'updatedAt',
  lastLoginAt = 'lastLoginAt',
}

registerEnumType(UserDateFilterField, {
  name: 'UserDateFilterField',
});
