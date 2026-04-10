import { UseGuards } from '@nestjs/common';
import {
  Args,
  Context,
  ID,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';

import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import { Roles } from '@/auth/decorators/Roles';
import { GqlAuthGuard } from '@/auth/guards/gql-auth.guard';
import { RolesGuard } from '@/auth/guards/roles.guard';
import type { AuthUser } from '@/auth/types/auth-user.type';
import type { UserDocument } from '@/users/entities/user.schema';
import { Role } from '@/users/enums/role.enum';
import { UsersQueryArgs } from '@/users/graphql/args/users-query.args';
import { CreateUserInput } from '@/users/graphql/inputs/create-user.input';
import { UpdateUserInput } from '@/users/graphql/inputs/update-user.input';
import { CreateUserPayload } from '@/users/graphql/types/create-user-payload.type';
import type { GraphqlLoadersContext } from '@/users/graphql/types/data-loader.type';
import { UserType } from '@/users/graphql/types/user.type';
import { UsersPage } from '@/users/graphql/types/users-page.type';
import { UsersService } from '@/users/users.service';

import { UserStatsType } from './graphql/types/user-stats.type';

@UseGuards(GqlAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN)
@Resolver(() => UserType)
export class UsersResolver {
  constructor(private readonly usersService: UsersService) {}

  @Query(() => UsersPage)
  async users(@Args() args: UsersQueryArgs): Promise<UsersPage> {
    return await this.usersService.findAll(args);
  }

  @Query(() => UserType)
  user(@Args('id', { type: () => ID }) id: string) {
    return this.usersService.findById(id);
  }

  @Mutation(() => CreateUserPayload)
  async createUser(
    @Args('input') input: CreateUserInput,
    @CurrentUser() currentUser: AuthUser,
  ): Promise<UserType | { message: string }> {
    return await this.usersService.createByAdmin(input, currentUser);
  }

  @Mutation(() => UserType)
  async updateUser(
    @Args('input') input: UpdateUserInput,
    @CurrentUser() currentUser: AuthUser,
  ): Promise<UserType> {
    return await this.usersService.updateByAdmin(input, currentUser);
  }

  @Mutation(() => Boolean)
  async deleteUser(
    @Args('id', { type: () => ID }) id: string,
    @CurrentUser() currentUser: AuthUser,
  ): Promise<boolean> {
    return await this.usersService.deleteByAdmin(id, currentUser);
  }

  @ResolveField(() => UserType, { nullable: true })
  async createdBy(
    @Parent() user: UserDocument,
    @Context('loaders') loaders: GraphqlLoadersContext['loaders'],
  ): Promise<UserDocument | null> {
    if (!user.createdBy) {
      return null;
    }
    return loaders.userById.load(user.createdBy.toString());
  }

  @Query(() => UserStatsType)
  async userStats() {
    return this.usersService.getStats();
  }
}
