import { UserResponseDto } from './dto/user-response.dto';
import { UserDocument } from './entities/user.schema';
import { UserListItem } from './types/user-list-item.type';

export function toUserListResponseDto(user: UserListItem): UserResponseDto {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    firstName: user.firstName!,
    lastName: user.lastName!,
    phone: user.phone,
    avatarUrl: user.avatarUrl ?? undefined,
    isActive: user.isActive,
    isEmailConfirmed: user.isEmailConfirmed,
    wishlist: (user.wishlist ?? []).map((item) => ({
      productId: item.productId.toString(),
      title: item.title,
      price: item.price,
      image: item.image,
    })),
  };
}

export function toUserResponseDto(user: UserDocument): UserResponseDto {
  return {
    id: user._id.toString(),
    email: user.email,
    role: user.role,
    firstName: user.firstName,
    lastName: user.lastName!,
    phone: user.phone,
    avatarUrl: user.avatarUrl,
    isActive: user.isActive,
    isEmailConfirmed: user.isEmailConfirmed,
    isGoogleConnected: Boolean(user.googleId),
    wishlist: (user.wishlist ?? []).map((item) => ({
      productId: item.productId.toString(),
      title: item.title,
      price: item.price,
      image: item.image,
    })),
  };
}
