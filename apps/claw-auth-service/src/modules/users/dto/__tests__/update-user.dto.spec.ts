import { updateUserSchema } from '../update-user.dto';

describe('updateUserSchema', () => {
  describe('firstName/lastName', () => {
    it('should parse an absent firstName/lastName to undefined', () => {
      const result = updateUserSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.firstName).toBeUndefined();
        expect(result.data.lastName).toBeUndefined();
      }
    });

    it("should parse an empty string '' to null", () => {
      const result = updateUserSchema.safeParse({ firstName: '', lastName: '' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.firstName).toBeNull();
        expect(result.data.lastName).toBeNull();
      }
    });

    it("should parse a whitespace-only string '   ' to null", () => {
      const result = updateUserSchema.safeParse({ firstName: '   ', lastName: '   ' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.firstName).toBeNull();
        expect(result.data.lastName).toBeNull();
      }
    });

    it('should parse explicit null to null', () => {
      const result = updateUserSchema.safeParse({ firstName: null, lastName: null });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.firstName).toBeNull();
        expect(result.data.lastName).toBeNull();
      }
    });

    it("should trim '  Ada  ' to 'Ada'", () => {
      const result = updateUserSchema.safeParse({ firstName: '  Ada  ' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.firstName).toBe('Ada');
      }
    });

    it('should accept a 64-character name', () => {
      const longName = 'a'.repeat(64);
      const result = updateUserSchema.safeParse({ firstName: longName });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.firstName).toBe(longName);
      }
    });

    it('should reject a 65-character name', () => {
      const longName = 'a'.repeat(65);
      const result = updateUserSchema.safeParse({ firstName: longName });
      expect(result.success).toBe(false);
    });

    it('should be independent of username', () => {
      const result = updateUserSchema.safeParse({ firstName: 'Ada' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.firstName).toBe('Ada');
        expect(result.data.lastName).toBeUndefined();
        expect(result.data.username).toBeUndefined();
      }
    });
  });
});
