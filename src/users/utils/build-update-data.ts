import { UpdateMeDto } from '@/users/dto/update-me.dto';
import { User } from '@/users/entities/user.schema';
import { UpdateUserInput } from '@/users/graphql/inputs/update-user.input';

export function buildUpdateData(dto: UpdateMeDto | UpdateUserInput): Partial<User> {
  const updateData: Partial<User> = {};

  if (dto.firstName !== undefined) {
    updateData.firstName = dto.firstName.trim();
  }

  if (dto.lastName !== undefined) {
    updateData.lastName = dto.lastName.trim();
  }

  if (dto.phone !== undefined) {
    updateData.phone = dto.phone.trim();
  }

  if ('avatarUrl' in dto && dto.avatarUrl !== undefined) {
    updateData.avatarUrl = dto.avatarUrl?.trim();
  }

  return updateData;
}
