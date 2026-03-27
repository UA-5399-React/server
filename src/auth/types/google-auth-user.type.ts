export type GoogleAuthUser = {
  email: string;
  firstName?: string;
  lastName?: string;
  googleId: string;
  avatarUrl?: string;
  provider: 'google';
};
