import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { join } from 'path';

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      path: 'graphql',
      autoSchemaFile:
        process.env.NODE_ENV === 'production'
          ? true
          : join(process.cwd(), 'src/graphql/schema.gql'),
      sortSchema: true,
      playground: true,
    }),
  ],
})
export class AppGraphQLModule {}
