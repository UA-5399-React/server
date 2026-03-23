import { ObjectType } from '@nestjs/graphql';

import { PaginatedResponse } from '@/graphql/types/paginated-response';
import { UserType } from '@/users/graphql/types/user.type';

@ObjectType()
export class UsersPage extends PaginatedResponse(UserType) {}
