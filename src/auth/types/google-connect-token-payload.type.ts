import { GOOGLE_CONNECT_TOKEN_TYPE } from '@/auth/constants/auth.constants';

export type GoogleConnectTokenPayload = {
  sub: string;
  type: typeof GOOGLE_CONNECT_TOKEN_TYPE;
};
