import { AuthService } from "../services/auth.service";
import { type AuthManager } from "../managers/auth.manager";
import { type LoginResult, type RefreshResult, type UserProfile } from "../types/auth.types";

describe("AuthService", () => {
  let authService: AuthService;
  let authManager: jest.Mocked<AuthManager>;

  const mockLoginResult: LoginResult = {
    tokens: {
      accessToken: "access-token-123",
      refreshToken: "refresh-token-456",
    },
    user: {
      id: "user-1",
      email: "test@example.com",
      username: "testuser",
      role: "ADMIN",
      mustChangePassword: false,
    },
  };

  const mockRefreshResult: RefreshResult = {
    tokens: {
      accessToken: "new-access-token",
      refreshToken: "new-refresh-token",
    },
  };

  const mockUserProfile: UserProfile = {
    id: "user-1",
    email: "test@example.com",
    username: "testuser",
    role: "ADMIN",
    status: "ACTIVE",
    mustChangePassword: false,
    createdAt: new Date("2025-01-01"),
  };

  beforeEach(() => {
    authManager = {
      login: jest.fn(),
      refresh: jest.fn(),
      logout: jest.fn(),
      getProfile: jest.fn(),
    } as unknown as jest.Mocked<AuthManager>;

    authService = new AuthService(authManager);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("login", () => {
    it("should delegate to authManager.login and return the result", async () => {
      authManager.login.mockResolvedValue(mockLoginResult);

      const result = await authService.login("test@example.com", "password123");

      expect(authManager.login).toHaveBeenCalledWith("test@example.com", "password123");
      expect(result).toEqual(mockLoginResult);
    });

    it("should propagate errors from authManager.login", async () => {
      authManager.login.mockRejectedValue(new Error("Invalid credentials"));

      await expect(authService.login("bad@example.com", "wrong")).rejects.toThrow(
        "Invalid credentials",
      );
    });
  });

  describe("refresh", () => {
    it("should delegate to authManager.refresh and return the result", async () => {
      authManager.refresh.mockResolvedValue(mockRefreshResult);

      const result = await authService.refresh("refresh-token-456");

      expect(authManager.refresh).toHaveBeenCalledWith("refresh-token-456");
      expect(result).toEqual(mockRefreshResult);
    });

    it("should propagate errors from authManager.refresh", async () => {
      authManager.refresh.mockRejectedValue(new Error("Invalid refresh token"));

      await expect(authService.refresh("bad-token")).rejects.toThrow("Invalid refresh token");
    });
  });

  describe("logout", () => {
    it("should delegate to authManager.logout", async () => {
      authManager.logout.mockResolvedValue();

      await authService.logout("user-1");

      expect(authManager.logout).toHaveBeenCalledWith("user-1");
    });

    it("should propagate errors from authManager.logout", async () => {
      authManager.logout.mockRejectedValue(new Error("Logout failed"));

      await expect(authService.logout("user-1")).rejects.toThrow("Logout failed");
    });
  });

  describe("getProfile", () => {
    it("should delegate to authManager.getProfile and return user data", async () => {
      authManager.getProfile.mockResolvedValue(mockUserProfile);

      const result = await authService.getProfile("user-1");

      expect(authManager.getProfile).toHaveBeenCalledWith("user-1");
      expect(result).toEqual(mockUserProfile);
    });

    it("should propagate errors from authManager.getProfile", async () => {
      authManager.getProfile.mockRejectedValue(new Error("User not found"));

      await expect(authService.getProfile("nonexistent")).rejects.toThrow("User not found");
    });
  });
});
