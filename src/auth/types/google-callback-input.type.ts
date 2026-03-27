import { GoogleAuthUser } from '@/auth/types/google-auth-user.type';

export type GoogleCallbackInput = {
  googleUser: GoogleAuthUser;
  googleConnectToken?: string;
  redirectAfterLogin?: string;
};
