import { GOOGLE_CONNECT_TOKEN_TYPE } from '@/auth/constants/auth.cookies';

export type GoogleConnectTokenPayload = {
  sub: string;
  type: typeof GOOGLE_CONNECT_TOKEN_TYPE;
};
