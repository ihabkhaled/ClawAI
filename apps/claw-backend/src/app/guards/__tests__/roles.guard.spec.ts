import { type ExecutionContext } from "@nestjs/common";
import { type Reflector } from "@nestjs/core";
import { RolesGuard } from "../roles.guard";
import { UserRole } from "../../../common/enums";

describe("RolesGuard", () => {
  let guard: RolesGuard;
  let reflector: jest.Mocked<Reflector>;

  function createMockContext(user?: {
    id: string;
    email: string;
    role: UserRole;
  }): ExecutionContext {
    const request = { user };

    return {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(request),
      }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as unknown as ExecutionContext;
  }

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as unknown as jest.Mocked<Reflector>;

    guard = new RolesGuard(reflector);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("no @Roles() decorator", () => {
    it("should allow access when no roles are required (undefined)", () => {
      reflector.getAllAndOverride.mockReturnValue(undefined);
      const context = createMockContext({
        id: "user-1",
        email: "test@example.com",
        role: UserRole.VIEWER,
      });

      expect(guard.canActivate(context)).toBe(true);
    });

    it("should allow access when roles array is empty", () => {
      reflector.getAllAndOverride.mockReturnValue([]);
      const context = createMockContext({
        id: "user-1",
        email: "test@example.com",
        role: UserRole.VIEWER,
      });

      expect(guard.canActivate(context)).toBe(true);
    });
  });

  describe("with @Roles() decorator", () => {
    it("should allow access when user has a matching role", () => {
      reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);
      const context = createMockContext({
        id: "user-1",
        email: "admin@example.com",
        role: UserRole.ADMIN,
      });

      expect(guard.canActivate(context)).toBe(true);
    });

    it("should allow access when user matches one of multiple required roles", () => {
      reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN, UserRole.OPERATOR]);
      const context = createMockContext({
        id: "user-1",
        email: "operator@example.com",
        role: UserRole.OPERATOR,
      });

      expect(guard.canActivate(context)).toBe(true);
    });

    it("should reject access when user role does not match", () => {
      reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);
      const context = createMockContext({
        id: "user-1",
        email: "viewer@example.com",
        role: UserRole.VIEWER,
      });

      expect(guard.canActivate(context)).toBe(false);
    });

    it("should reject access when user is not present on request", () => {
      reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);
      const context = createMockContext();

      expect(guard.canActivate(context)).toBe(false);
    });

    it("should reject VIEWER when only OPERATOR and ADMIN are allowed", () => {
      reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN, UserRole.OPERATOR]);
      const context = createMockContext({
        id: "user-1",
        email: "viewer@example.com",
        role: UserRole.VIEWER,
      });

      expect(guard.canActivate(context)).toBe(false);
    });

    it("should check roles using reflector with correct metadata key", () => {
      reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);
      const context = createMockContext({
        id: "user-1",
        email: "admin@example.com",
        role: UserRole.ADMIN,
      });

      guard.canActivate(context);

      expect(reflector.getAllAndOverride).toHaveBeenCalledWith("roles", [
        context.getHandler(),
        context.getClass(),
      ]);
    });
  });
});
