import { BadRequestException } from "@nestjs/common";
import { z } from "zod";
import { ZodValidationPipe } from "../zod-validation.pipe";

describe("ZodValidationPipe", () => {
  const testSchema = z.object({
    name: z.string().min(1).max(50),
    age: z.number().int().positive(),
    email: z.string().email(),
  });

  let pipe: ZodValidationPipe;

  const mockMetadata = {
    type: "body" as const,
    metatype: undefined,
    data: undefined,
  };

  beforeEach(() => {
    pipe = new ZodValidationPipe(testSchema);
  });

  describe("valid data", () => {
    it("should pass valid data through unchanged", () => {
      const input = { name: "Alice", age: 30, email: "alice@example.com" };

      const result = pipe.transform(input, mockMetadata);

      expect(result).toEqual(input);
    });

    it("should strip extra properties not in the schema", () => {
      const input = { name: "Bob", age: 25, email: "bob@example.com", extra: "field" };

      const result = pipe.transform(input, mockMetadata) as Record<string, unknown>;

      expect(result["name"]).toBe("Bob");
      expect(result["extra"]).toBeUndefined();
    });

    it("should transform data per Zod schema coercion", () => {
      const coercingSchema = z.object({
        count: z.coerce.number(),
      });
      const coercingPipe = new ZodValidationPipe(coercingSchema);

      const result = coercingPipe.transform({ count: "42" }, mockMetadata) as Record<
        string,
        unknown
      >;

      expect(result["count"]).toBe(42);
    });

    it("should apply default values from schema", () => {
      const schemaWithDefaults = z.object({
        name: z.string(),
        role: z.string().default("viewer"),
      });
      const defaultPipe = new ZodValidationPipe(schemaWithDefaults);

      const result = defaultPipe.transform({ name: "Charlie" }, mockMetadata) as Record<
        string,
        unknown
      >;

      expect(result["role"]).toBe("viewer");
    });
  });

  describe("invalid data", () => {
    it("should throw BadRequestException for missing required fields", () => {
      expect(() => pipe.transform({}, mockMetadata)).toThrow(BadRequestException);
    });

    it("should throw BadRequestException with validation errors array", () => {
      try {
        pipe.transform({}, mockMetadata);
        fail("Expected BadRequestException to be thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        const response = (error as BadRequestException).getResponse() as Record<string, unknown>;
        expect(response["message"]).toBe("Validation failed");
        expect(Array.isArray(response["errors"])).toBe(true);
      }
    });

    it("should include field paths in validation errors", () => {
      try {
        pipe.transform({ name: "", age: -5, email: "not-email" }, mockMetadata);
        fail("Expected BadRequestException to be thrown");
      } catch (error) {
        const response = (error as BadRequestException).getResponse() as Record<string, unknown>;
        const errors = response["errors"] as Array<{ field: string; message: string }>;
        const fields = errors.map((e) => e.field);
        expect(fields).toContain("name");
        expect(fields).toContain("age");
        expect(fields).toContain("email");
      }
    });

    it("should reject wrong types", () => {
      expect(() =>
        pipe.transform({ name: 123, age: "not a number", email: true }, mockMetadata),
      ).toThrow(BadRequestException);
    });

    it("should reject null input", () => {
      expect(() => pipe.transform(null, mockMetadata)).toThrow(BadRequestException);
    });

    it("should work with different schema types (string schema)", () => {
      const stringPipe = new ZodValidationPipe(z.string().min(3));

      expect(stringPipe.transform("hello", mockMetadata)).toBe("hello");
      expect(() => stringPipe.transform("ab", mockMetadata)).toThrow(BadRequestException);
    });

    it("should work with enum schemas", () => {
      const enumSchema = z.object({
        status: z.enum(["ACTIVE", "INACTIVE"]),
      });
      const enumPipe = new ZodValidationPipe(enumSchema);

      expect(enumPipe.transform({ status: "ACTIVE" }, mockMetadata)).toEqual({
        status: "ACTIVE",
      });
      expect(() => enumPipe.transform({ status: "INVALID" }, mockMetadata)).toThrow(
        BadRequestException,
      );
    });
  });
});
