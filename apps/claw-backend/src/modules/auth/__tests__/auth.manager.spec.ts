import * as argon2 from "argon2";
import * as jwt from "jsonwebtoken";
import { AuthManager } from "../managers/auth.manager";
import { type AuthRepository } from "../repositories/auth.repository";
import { AppConfig } from "../../../app/config/app.config";
import { UserRole, UserStatus } from "../../../common/enums";
import {
  AccountSuspendedException,
  InvalidCredentialsException,
  InvalidRefreshTokenException,
} from "../../../common/errors";
import { type Session, type User } from "@prisma/client";

jest.mock("argon2");
jest.mock("jsonwebtoken");
jest.mock("node:crypto", () => ({
  randomBytes: jest.fn().mockReturnValue(Buffer.from("a".repeat(48))),
}));

const mockArgon2 = argon2 as jest.Mocked<typeof argon2>;
const mockJwt = jwt as jest.Mocked<typeof jwt>;

describe("AuthManager", () => {
  let authManager: AuthManager;
  let authRepository: jest.Mocked<AuthRepository>;

  const mockUser: User = {
    id: "user-1",
    email: "test@example.com",
    username: "testuser",
    passwordHash: "$argon2id$hashed-password",
    role: UserRole.ADMIN,
    status: UserStatus.ACTIVE,
    mustChangePassword: false,
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-01"),
  };

  const mockConfig = {
    JWT_SECRET: "a".repeat(32),
    JWT_ACCESS_EXPIRY: "15m",
    JWT_REFRESH_EXPIRY: "7d",
  };

  beforeEach(() => {
    authRepository = {
      findUserByEmail: jest.fn(),
      findUserById: jest.fn(),
      createSession: jest.fn(),
      findSessionByRefreshToken: jest.fn(),
      deleteSession: jest.fn(),
      deleteSessionsByUserId: jest.fn(),
      deleteExpiredSessions: jest.fn(),
    } as unknown as jest.Mocked<AuthRepository>;

    authManager = new AuthManager(authRepository);

    jest.spyOn(AppConfig, "get").mockReturnValue(mockConfig as ReturnType<typeof AppConfig.get>);
    mockJwt.sign.mockReturnValue("signed-jwt-token" as never);
    authRepository.createSession.mockResolvedValue({
      id: "session-1",
      userId: "user-1",
      refreshToken: "generated-refresh-token",
      expiresAt: new Date(),
      createdAt: new Date(),
    } as Session);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("login", () => {
    it("should return tokens and user data for valid credentials", async () => {
      authRepository.findUserByEmail.mockResolvedValue(mockUser);
      mockArgon2.verify.mockResolvedValue(true);

      const result = await authManager.login("test@example.com", "password123");

      expect(authRepository.findUserByEmail).toHaveBeenCalledWith("test@example.com");
      expect(mockArgon2.verify).toHaveBeenCalledWith(mockUser.passwordHash, "password123");
      expect(result.tokens.accessToken).toBe("signed-jwt-token");
      expect(result.user.id).toBe("user-1");
      expect(result.user.email).toBe("test@example.com");
    });

    it("should throw InvalidCredentialsException when user does not exist", async () => {
      authRepository.findUserByEmail.mockResolvedValue(null);

      await expect(authManager.login("nobody@example.com", "password")).rejects.toThrow(
        InvalidCredentialsException,
      );
    });

    it("should throw InvalidCredentialsException when password is invalid", async () => {
      authRepository.findUserByEmail.mockResolvedValue(mockUser);
      mockArgon2.verify.mockResolvedValue(false);

      await expect(authManager.login("test@example.com", "wrong-password")).rejects.toThrow(
        InvalidCredentialsException,
      );
    });

    it("should throw AccountSuspendedException when user is suspended", async () => {
      const suspendedUser: User = { ...mockUser, status: UserStatus.SUSPENDED };
      authRepository.findUserByEmail.mockResolvedValue(suspendedUser);

      await expect(authManager.login("test@example.com", "password123")).rejects.toThrow(
        AccountSuspendedException,
      );
    });

    it("should throw InvalidCredentialsException when user status is PENDING", async () => {
      const pendingUser: User = { ...mockUser, status: UserStatus.PENDING };
      authRepository.findUserByEmail.mockResolvedValue(pendingUser);

      await expect(authManager.login("test@example.com", "password123")).rejects.toThrow(
        InvalidCredentialsException,
      );
    });

    it("should create a session after successful login", async () => {
      authRepository.findUserByEmail.mockResolvedValue(mockUser);
      mockArgon2.verify.mockResolvedValue(true);

      await authManager.login("test@example.com", "password123");

      expect(authRepository.createSession).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "user-1",
          refreshToken: expect.any(String) as string,
          expiresAt: expect.any(Date) as Date,
        }),
      );
    });

    it("should sign JWT with correct payload and config", async () => {
      authRepository.findUserByEmail.mockResolvedValue(mockUser);
      mockArgon2.verify.mockResolvedValue(true);

      await authManager.login("test@example.com", "password123");

      expect(mockJwt.sign).toHaveBeenCalledWith(
        {
          sub: "user-1",
          email: "test@example.com",
          role: UserRole.ADMIN,
        },
        mockConfig.JWT_SECRET,
        { expiresIn: "15m" },
      );
    });
  });

  describe("refresh", () => {
    const mockSession: Session = {
      id: "session-1",
      userId: "user-1",
      refreshToken: "valid-refresh-token",
      expiresAt: new Date(Date.now() + 86400000), // 1 day in the future
      createdAt: new Date(),
    };

    it("should return new token pair for valid refresh token", async () => {
      authRepository.findSessionByRefreshToken.mockResolvedValue(mockSession);
      authRepository.findUserById.mockResolvedValue(mockUser);

      const result = await authManager.refresh("valid-refresh-token");

      expect(result.tokens.accessToken).toBe("signed-jwt-token");
      expect(authRepository.deleteSession).toHaveBeenCalledWith("session-1");
    });

    it("should throw InvalidRefreshTokenException for non-existent session", async () => {
      authRepository.findSessionByRefreshToken.mockResolvedValue(null);

      await expect(authManager.refresh("bad-token")).rejects.toThrow(
        InvalidRefreshTokenException,
      );
    });

    it("should throw InvalidRefreshTokenException for expired session", async () => {
      const expiredSession: Session = {
        ...mockSession,
        expiresAt: new Date(Date.now() - 86400000), // 1 day in the past
      };
      authRepository.findSessionByRefreshToken.mockResolvedValue(expiredSession);

      await expect(authManager.refresh("expired-token")).rejects.toThrow(
        InvalidRefreshTokenException,
      );
      expect(authRepository.deleteSession).toHaveBeenCalledWith("session-1");
    });

    it("should throw InvalidRefreshTokenException when user is not active", async () => {
      authRepository.findSessionByRefreshToken.mockResolvedValue(mockSession);
      const suspendedUser: User = { ...mockUser, status: UserStatus.SUSPENDED };
      authRepository.findUserById.mockResolvedValue(suspendedUser);

      await expect(authManager.refresh("valid-refresh-token")).rejects.toThrow(
        InvalidRefreshTokenException,
      );
    });

    it("should throw InvalidRefreshTokenException when user does not exist", async () => {
      authRepository.findSessionByRefreshToken.mockResolvedValue(mockSession);
      authRepository.findUserById.mockResolvedValue(null);

      await expect(authManager.refresh("valid-refresh-token")).rejects.toThrow(
        InvalidRefreshTokenException,
      );
    });
  });

  describe("logout", () => {
    it("should delete all sessions for the user", async () => {
      authRepository.deleteSessionsByUserId.mockResolvedValue();

      await authManager.logout("user-1");

      expect(authRepository.deleteSessionsByUserId).toHaveBeenCalledWith("user-1");
    });
  });

  describe("getProfile", () => {
    it("should return user profile for existing user", async () => {
      authRepository.findUserById.mockResolvedValue(mockUser);

      const result = await authManager.getProfile("user-1");

      expect(result.id).toBe("user-1");
      expect(result.email).toBe("test@example.com");
      expect(result.username).toBe("testuser");
      expect(result.role).toBe(UserRole.ADMIN);
      expect(result.status).toBe(UserStatus.ACTIVE);
    });

    it("should throw InvalidCredentialsException when user does not exist", async () => {
      authRepository.findUserById.mockResolvedValue(null);

      await expect(authManager.getProfile("nonexistent")).rejects.toThrow(
        InvalidCredentialsException,
      );
    });

    it("should include mustChangePassword and createdAt in profile", async () => {
      const userWithFlag: User = { ...mockUser, mustChangePassword: true };
      authRepository.findUserById.mockResolvedValue(userWithFlag);

      const result = await authManager.getProfile("user-1");

      expect(result.mustChangePassword).toBe(true);
      expect(result.createdAt).toEqual(new Date("2025-01-01"));
    });
  });
});
