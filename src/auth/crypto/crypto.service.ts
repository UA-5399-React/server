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
}
