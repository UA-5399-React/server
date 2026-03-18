import { UserResponseDto } from './dto/user-response.dto';
import { UserDocument } from './entities/user.schema';

export function toUserResponseDto(user: UserDocument): UserResponseDto {
  return {
    id: user._id.toString(),
    email: user.email,
    role: user.role,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    avatarUrl: user.avatarUrl,
    isActive: user.isActive,
    isEmailConfirmed: user.isEmailConfirmed,
  };
}
