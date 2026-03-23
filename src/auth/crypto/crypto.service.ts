import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

export class CryptoService {
  async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt();

    return await bcrypt.hash(password, salt);
  }

  async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  generateSha256HashBase64(text: string): string {
    return crypto.createHash('sha256').update(text).digest('base64');
  }

  async preparePassword(input?: string): Promise<Record<string, string>> {
    const rawPassword: string = input ?? this.generateTemporaryPassword();
    const passwordHash: string = await this.hashPassword(rawPassword);
    return { rawPassword, passwordHash };
  }

  generateTemporaryPassword(): string {
    const length = 8;
    const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lower = 'abcdefghijklmnopqrstuvwxyz';
    const digits = '0123456789';
    const symbols = '!@#$%^&*';

    const all = upper + lower + digits + symbols;

    const getRandomChar = (chars: string) => chars[crypto.randomInt(0, chars.length)];

    const passwordChars = [
      getRandomChar(upper),
      getRandomChar(lower),
      getRandomChar(digits),
      getRandomChar(symbols),
    ];

    for (let i = passwordChars.length; i < length; i++) {
      passwordChars.push(getRandomChar(all));
    }

    for (let i = passwordChars.length - 1; i > 0; i--) {
      const j = crypto.randomInt(0, i + 1);
      [passwordChars[i], passwordChars[j]] = [passwordChars[j], passwordChars[i]];
    }

    return passwordChars.join('');
  }
}
