import { HttpStatus } from "@nestjs/common";
import {
  AccountSuspendedException,
  BusinessException,
  DuplicateEntityException,
  EntityNotFoundException,
  InvalidCredentialsException,
  InvalidRefreshTokenException,
} from "../errors/business.exception";

describe("BusinessException", () => {
  describe("base BusinessException", () => {
    it("should have the correct status code", () => {
      const exception = new BusinessException("test error", "TEST_CODE", HttpStatus.BAD_REQUEST);

      expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
    });

    it("should have the correct code property", () => {
      const exception = new BusinessException("test error", "TEST_CODE");

      expect(exception.code).toBe("TEST_CODE");
    });

    it("should default to BAD_REQUEST status", () => {
      const exception = new BusinessException("test error", "TEST_CODE");

      expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
    });

    it("should serialize to an object with message, code, and statusCode", () => {
      const exception = new BusinessException("test error", "TEST_CODE", HttpStatus.FORBIDDEN);
      const response = exception.getResponse();

      expect(response).toEqual({
        message: "test error",
        code: "TEST_CODE",
        statusCode: HttpStatus.FORBIDDEN,
      });
    });

    it("should accept custom HTTP status codes", () => {
      const exception = new BusinessException(
        "conflict",
        "CONFLICT_CODE",
        HttpStatus.CONFLICT,
      );

      expect(exception.getStatus()).toBe(HttpStatus.CONFLICT);
    });
  });

  describe("EntityNotFoundException", () => {
    it("should have NOT_FOUND status", () => {
      const exception = new EntityNotFoundException("User", "123");

      expect(exception.getStatus()).toBe(HttpStatus.NOT_FOUND);
    });

    it("should have ENTITY_NOT_FOUND code", () => {
      const exception = new EntityNotFoundException("User", "abc-123");

      expect(exception.code).toBe("ENTITY_NOT_FOUND");
    });

    it("should include entity name and id in message", () => {
      const exception = new EntityNotFoundException("Connector", "conn-456");
      const response = exception.getResponse() as Record<string, unknown>;

      expect(response["message"]).toBe("Connector with id 'conn-456' not found");
    });
  });

  describe("DuplicateEntityException", () => {
    it("should have CONFLICT status", () => {
      const exception = new DuplicateEntityException("User", "email");

      expect(exception.getStatus()).toBe(HttpStatus.CONFLICT);
    });

    it("should have DUPLICATE_ENTITY code", () => {
      const exception = new DuplicateEntityException("User", "email");

      expect(exception.code).toBe("DUPLICATE_ENTITY");
    });

    it("should include entity name and field in message", () => {
      const exception = new DuplicateEntityException("User", "email");
      const response = exception.getResponse() as Record<string, unknown>;

      expect(response["message"]).toBe("User with this email already exists");
    });
  });

  describe("InvalidCredentialsException", () => {
    it("should have UNAUTHORIZED status", () => {
      const exception = new InvalidCredentialsException();

      expect(exception.getStatus()).toBe(HttpStatus.UNAUTHORIZED);
    });

    it("should have INVALID_CREDENTIALS code", () => {
      const exception = new InvalidCredentialsException();

      expect(exception.code).toBe("INVALID_CREDENTIALS");
    });
  });

  describe("AccountSuspendedException", () => {
    it("should have FORBIDDEN status", () => {
      const exception = new AccountSuspendedException();

      expect(exception.getStatus()).toBe(HttpStatus.FORBIDDEN);
    });

    it("should have ACCOUNT_SUSPENDED code", () => {
      const exception = new AccountSuspendedException();

      expect(exception.code).toBe("ACCOUNT_SUSPENDED");
    });
  });

  describe("InvalidRefreshTokenException", () => {
    it("should have UNAUTHORIZED status", () => {
      const exception = new InvalidRefreshTokenException();

      expect(exception.getStatus()).toBe(HttpStatus.UNAUTHORIZED);
    });

    it("should have INVALID_REFRESH_TOKEN code", () => {
      const exception = new InvalidRefreshTokenException();

      expect(exception.code).toBe("INVALID_REFRESH_TOKEN");
    });
  });
});
