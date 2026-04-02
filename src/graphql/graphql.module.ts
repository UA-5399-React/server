import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { join } from 'path';

import { createUserByIdLoader } from '@/users/graphql/loaders/create-user-by-id.loader';
import { GraphqlLoadersContext } from '@/users/graphql/types/data-loader.type';
import { UsersModule } from '@/users/users.module';
import { UsersService } from '@/users/users.service';

@Module({
  imports: [
    GraphQLModule.forRootAsync<ApolloDriverConfig>({
      driver: ApolloDriver,
      imports: [UsersModule],
      inject: [UsersService],
      useFactory: (usersService: UsersService) => ({
        path: 'graphql',
        autoSchemaFile:
          process.env.NODE_ENV === 'production'
            ? true
            : join(process.cwd(), 'src/graphql/schema.gql'),
        sortSchema: true,
        playground: true,
        context: ({ req, res }): GraphqlLoadersContext => ({
          req,
          res,
          loaders: {
            userById: createUserByIdLoader(usersService),
          },
        }),
      }),
    }),
  ],
})
export class AppGraphQLModule {}
