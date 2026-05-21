import DataLoader from 'dataloader';

import type { UserDocument } from '@/users/entities/user.schema';
import { UsersService } from '@/users/users.service';

export function createUserByIdLoader(usersService: UsersService) {
  return new DataLoader<string, UserDocument | null>(async (ids) => {
    const users = await usersService.findByIds(ids as string[]);
    const filtered = await usersService.withActiveWishlistOnlyMany(users);

    const usersMap = new Map(filtered.map((user) => [user.id, user]));

    return ids.map((id) => usersMap.get(id) ?? null);
  });
}
