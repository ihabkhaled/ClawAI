import { decrypt, encrypt } from "../utilities/crypto.utility";
import { randomBytes } from "node:crypto";

describe("crypto.utility", () => {
  // Valid 32-byte key as 64-character hex string
  const validKey = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
  const wrongKey = "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789";

  describe("encrypt", () => {
    it("should produce a non-empty base64 string", () => {
      const result = encrypt("hello world", validKey);

      expect(result).toBeTruthy();
      expect(typeof result).toBe("string");
      // Verify it is valid base64
      expect(() => Buffer.from(result, "base64")).not.toThrow();
    });

    it("should produce different output each time due to random IV", () => {
      const plaintext = "same text every time";
      const result1 = encrypt(plaintext, validKey);
      const result2 = encrypt(plaintext, validKey);

      expect(result1).not.toBe(result2);
    });

    it("should throw when key is not 64-character hex (too short)", () => {
      const shortKey = "0123456789abcdef";

      expect(() => encrypt("test", shortKey)).toThrow(
        "ENCRYPTION_KEY must be a 64-character hex string (32 bytes)",
      );
    });

    it("should throw when key is not 64-character hex (too long)", () => {
      const longKey = `${validKey}ff`;

      expect(() => encrypt("test", longKey)).toThrow(
        "ENCRYPTION_KEY must be a 64-character hex string (32 bytes)",
      );
    });

    it("should handle empty string encryption", () => {
      const result = encrypt("", validKey);

      expect(result).toBeTruthy();
      expect(typeof result).toBe("string");
    });

    it("should handle unicode content", () => {
      const result = encrypt("Hello \u{1F600} Unicode \u00E9\u00E8\u00EA", validKey);

      expect(result).toBeTruthy();
    });
  });

  describe("decrypt", () => {
    it("should return the original plaintext", () => {
      const plaintext = "secret data 123";
      const encrypted = encrypt(plaintext, validKey);

      const result = decrypt(encrypted, validKey);

      expect(result).toBe(plaintext);
    });

    it("should fail with wrong key", () => {
      const encrypted = encrypt("secret", validKey);

      expect(() => decrypt(encrypted, wrongKey)).toThrow();
    });

    it("should fail with tampered ciphertext", () => {
      const encrypted = encrypt("secret", validKey);
      const buffer = Buffer.from(encrypted, "base64");
      // Flip a byte in the encrypted portion
      buffer[buffer.length - 1] = (buffer.at(-1) ?? 0) ^ 0xff;
      const tampered = buffer.toString("base64");

      expect(() => decrypt(tampered, validKey)).toThrow();
    });
  });

  describe("encrypt/decrypt round trip", () => {
    it("should round-trip short strings", () => {
      const plaintext = "a";
      const result = decrypt(encrypt(plaintext, validKey), validKey);

      expect(result).toBe(plaintext);
    });

    it("should round-trip long strings", () => {
      const plaintext = randomBytes(1024).toString("hex");
      const result = decrypt(encrypt(plaintext, validKey), validKey);

      expect(result).toBe(plaintext);
    });

    it("should round-trip JSON payloads", () => {
      const payload = JSON.stringify({ apiKey: "sk-12345", secret: "password" });
      const result = decrypt(encrypt(payload, validKey), validKey);

      expect(result).toBe(payload);
    });

    it("should round-trip unicode strings", () => {
      const plaintext = "\u00C9\u00E8\u00EA \u{1F600} \u4E16\u754C";
      const result = decrypt(encrypt(plaintext, validKey), validKey);

      expect(result).toBe(plaintext);
    });

    it("should round-trip empty string", () => {
      const result = decrypt(encrypt("", validKey), validKey);

      expect(result).toBe("");
    });
  });
});
