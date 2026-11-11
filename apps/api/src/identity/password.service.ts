import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { Injectable } from "@nestjs/common";

const KEY_LENGTH = 64;
const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1 } as const;

@Injectable()
export class PasswordService {
  async hash(password: string): Promise<string> {
    this.validatePassword(password);
    const salt = randomBytes(16).toString("hex");
    const derivedKey = await this.derive(password, salt, KEY_LENGTH);
    return `scrypt$${salt}$${derivedKey.toString("hex")}`;
  }

  async verify(password: string, encodedHash: string): Promise<boolean> {
    const [, salt, expectedHex] = encodedHash.split("$");
    if (!salt || !expectedHex) return false;
    const expected = Buffer.from(expectedHex, "hex");
    const actual = await this.derive(password, salt, expected.length || KEY_LENGTH);
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  }

  private derive(password: string, salt: string, keyLength: number): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      scryptCallback(password, salt, keyLength, SCRYPT_PARAMS, (error, derivedKey) => {
        if (error) reject(error);
        else resolve(derivedKey as Buffer);
      });
    });
  }

  private validatePassword(password: string) {
    if (password.length < 12) {
      throw new Error("Passwords must contain at least 12 characters");
    }
  }
}
