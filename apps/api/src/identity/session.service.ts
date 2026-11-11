import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { Injectable } from "@nestjs/common";

export const SESSION_COOKIE = "educore_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 8;

@Injectable()
export class SessionService {
  issue(now = new Date()) {
    const token = randomBytes(32).toString("base64url");
    const expiresAt = new Date(now.getTime() + SESSION_TTL_SECONDS * 1000);
    return {
      token,
      tokenHash: this.hash(token),
      expiresAt,
    };
  }

  hash(token: string): string {
    return createHash("sha256").update(token, "utf8").digest("hex");
  }

  matches(token: string, expectedHash: string): boolean {
    const actual = Buffer.from(this.hash(token), "utf8");
    const expected = Buffer.from(expectedHash, "utf8");
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  }
}
