import DataLoader from 'dataloader';
import type { Request } from 'express';

import type { UserDocument } from '@/users/entities/user.schema';

export type GraphqlLoadersContext = {
  req: Request;
  loaders: {
    userById: DataLoader<string, UserDocument | null>;
  };
};
