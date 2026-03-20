import { BadRequestException, ForbiddenException } from '@nestjs/common';

import { AuthUser } from '@/auth/types/auth-user.type';
import { User, UserDocument } from '@/users/entities/user.schema';
import { Role } from '@/users/enums/role.enum';
import { UpdateUserInput } from '@/users/graphql/inputs/update-user.input';
import { buildUpdateData } from '@/users/utils/build-update-data';

export const editableRolesMap: Record<Role, Role[]> = {
  [Role.SUPER_ADMIN]: [Role.SUPER_ADMIN, Role.ADMIN, Role.CUSTOMER],
  [Role.ADMIN]: [Role.CUSTOMER],
  [Role.CUSTOMER]: [],
};

export function canEditUser(currentUserRole: Role, targetRole: Role): boolean {
  return editableRolesMap[currentUserRole]?.includes(targetRole) ?? false;
}

export function buildAdminUpdateData(
  input: UpdateUserInput,
  currentUser: AuthUser,
  targetUser: UserDocument,
): Partial<User> {
  if (!canEditUser(currentUser.role, targetUser.role)) {
    throw new ForbiddenException('You cannot edit this user');
  }
  const updateData = buildUpdateData(input);
  const isSelfUpdate = currentUser.id === targetUser.id;

  switch (currentUser.role) {
    case Role.SUPER_ADMIN:
      if (isSelfUpdate) {
        if (input.role !== undefined) {
          throw new ForbiddenException('SUPER_ADMIN cannot change their own role');
        }
        if (input.isActive === false) {
          throw new ForbiddenException('SUPER_ADMIN cannot deactivate themselves');
        }
      }

      if (input.role !== undefined) updateData.role = input.role;
      if (typeof input.isActive === 'boolean') updateData.isActive = input.isActive;
      if (typeof input.isEmailConfirmed === 'boolean') {
        updateData.isEmailConfirmed = input.isEmailConfirmed;
      }
      break;

    case Role.ADMIN:
      if (isSelfUpdate && input.isActive === false) {
        throw new ForbiddenException('ADMIN cannot deactivate themselves');
      }

      if (typeof input.isActive === 'boolean') {
        updateData.isActive = input.isActive;
      }

      if (input.role !== undefined || typeof input.isEmailConfirmed === 'boolean') {
        throw new ForbiddenException('ADMIN cannot change role or email confirmation status');
      }
      break;
  }

  return updateData;
}

export function validateRoleCreation(targetRole: Role, currentUserRole: Role): void {
  if (currentUserRole === Role.ADMIN && targetRole !== Role.CUSTOMER) {
    throw new BadRequestException('Admin can create only customers');
  }

  if (currentUserRole === Role.CUSTOMER) {
    throw new BadRequestException('You are not allowed to create users');
  }
}
