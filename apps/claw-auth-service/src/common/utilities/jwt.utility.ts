import * as jwt from "jsonwebtoken";
import type { SignOptions } from "jsonwebtoken";
import type { JwtPayload } from "../types";

export function signAccessToken(payload: Record<string, unknown>, secret: string, expiresIn: SignOptions["expiresIn"]): string {
  return jwt.sign(payload, secret, { expiresIn });
}

export function verifyAccessToken(token: string, secret: string): JwtPayload {
  return jwt.verify(token, secret) as JwtPayload;
}

export function signRefreshToken(): string {
  const crypto = require("node:crypto") as typeof import("node:crypto");
  return crypto.randomBytes(48).toString("hex");
}
