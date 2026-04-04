import * as jwt from "jsonwebtoken";
import type { JwtPayload } from "../types";

export function verifyAccessToken(token: string, secret: string): JwtPayload {
  return jwt.verify(token, secret) as JwtPayload;
}
