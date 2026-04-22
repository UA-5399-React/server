import { Role } from '@/users/enums/role.enum';

type WishlistListItem = {
  productId: { toString(): string } | string;
  title: string;
  price: number;
  image?: string;
};

export type UserListItem = {
  id: string;
  email: string;
  role: Role;
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatarUrl?: string | null;
  isActive: boolean;
  isEmailConfirmed: boolean;
  wishlist: WishlistListItem[];
  lastLoginAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
};
