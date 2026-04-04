import { type ExecutionContext, UnauthorizedException } from "@nestjs/common";
import { type Reflector } from "@nestjs/core";
import * as jwt from "jsonwebtoken";
import { AuthGuard } from "../auth.guard";
import { AppConfig } from "../../config/app.config";
import { UserRole } from "../../../common/enums";
import { type JwtPayload } from "../../../common/types";

jest.mock("jsonwebtoken");

const mockJwt = jwt as jest.Mocked<typeof jwt>;

describe("AuthGuard", () => {
  let guard: AuthGuard;
  let reflector: jest.Mocked<Reflector>;

  const mockConfig = {
    JWT_SECRET: "a".repeat(32),
  };

  const validPayload: JwtPayload = {
    sub: "user-1",
    email: "test@example.com",
    role: UserRole.ADMIN,
    iat: 1700000000,
    exp: 1700001000,
  };

  function createMockContext(overrides: {
    authorization?: string;
    isPublic?: boolean;
  }): ExecutionContext {
    const request = {
      headers: {
        authorization: overrides.authorization,
      },
      user: undefined as Record<string, unknown> | undefined,
    };

    const mockContext = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(request),
      }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as unknown as ExecutionContext;

    return mockContext;
  }

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as unknown as jest.Mocked<Reflector>;

    guard = new AuthGuard(reflector);

    jest.spyOn(AppConfig, "get").mockReturnValue(mockConfig as ReturnType<typeof AppConfig.get>);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("public routes", () => {
    it("should allow access to @Public() decorated routes without token", () => {
      reflector.getAllAndOverride.mockReturnValue(true);
      const context = createMockContext({});

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it("should allow access to @Public() decorated routes even with invalid token", () => {
      reflector.getAllAndOverride.mockReturnValue(true);
      const context = createMockContext({ authorization: "Bearer invalid" });

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });
  });

  describe("protected routes", () => {
    beforeEach(() => {
      reflector.getAllAndOverride.mockReturnValue(false);
    });

    it("should allow requests with a valid JWT", () => {
      mockJwt.verify.mockReturnValue(validPayload as never);
      const context = createMockContext({ authorization: "Bearer valid-token" });

      const result = guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockJwt.verify).toHaveBeenCalledWith("valid-token", mockConfig.JWT_SECRET);
    });

    it("should set user on request after successful verification", () => {
      mockJwt.verify.mockReturnValue(validPayload as never);
      const context = createMockContext({ authorization: "Bearer valid-token" });

      guard.canActivate(context);

      const request = context.switchToHttp().getRequest();
      expect(request.user).toEqual({
        id: "user-1",
        email: "test@example.com",
        role: UserRole.ADMIN,
      });
    });

    it("should throw UnauthorizedException when no authorization header", () => {
      const context = createMockContext({});

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
      expect(() => guard.canActivate(context)).toThrow("Missing authorization header");
    });

    it("should throw UnauthorizedException for invalid header format", () => {
      const context = createMockContext({ authorization: "InvalidFormat" });

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
      expect(() => guard.canActivate(context)).toThrow("Invalid authorization header format");
    });

    it("should throw UnauthorizedException for non-Bearer scheme", () => {
      const context = createMockContext({ authorization: "Basic dXNlcjpwYXNz" });

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    });

    it("should throw UnauthorizedException when JWT verification fails (expired token)", () => {
      mockJwt.verify.mockImplementation(() => {
        throw new jwt.TokenExpiredError("jwt expired", new Date());
      });
      const context = createMockContext({ authorization: "Bearer expired-token" });

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
      expect(() => guard.canActivate(context)).toThrow("Invalid or expired token");
    });

    it("should throw UnauthorizedException when JWT verification fails (malformed token)", () => {
      mockJwt.verify.mockImplementation(() => {
        throw new jwt.JsonWebTokenError("jwt malformed");
      });
      const context = createMockContext({ authorization: "Bearer malformed-token" });

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    });
  });
});
