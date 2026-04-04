import * as argon2 from "argon2";
import { UsersService } from "../services/users.service";
import { type UsersRepository } from "../repositories/users.repository";
import { DuplicateEntityException, EntityNotFoundException } from "../../../common/errors";
import { UserRole } from "../../../common/enums";
import { type User } from "@prisma/client";
import { type CreateUserDto } from "../dto/create-user.dto";

jest.mock("argon2");

const mockArgon2 = argon2 as jest.Mocked<typeof argon2>;

describe("UsersService", () => {
  let usersService: UsersService;
  let usersRepository: jest.Mocked<UsersRepository>;

  const mockUser: User = {
    id: "user-1",
    email: "test@example.com",
    username: "testuser",
    passwordHash: "$argon2id$hashed",
    role: UserRole.VIEWER,
    status: "ACTIVE",
    mustChangePassword: false,
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-01"),
  };

  const mockUser2: User = {
    id: "user-2",
    email: "second@example.com",
    username: "seconduser",
    passwordHash: "$argon2id$hashed2",
    role: UserRole.OPERATOR,
    status: "ACTIVE",
    mustChangePassword: false,
    createdAt: new Date("2025-01-02"),
    updatedAt: new Date("2025-01-02"),
  };

  beforeEach(() => {
    usersRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findByUsername: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<UsersRepository>;

    usersService = new UsersService(usersRepository);
    mockArgon2.hash.mockResolvedValue("$argon2id$new-hash" as never);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("create", () => {
    const createDto: CreateUserDto = {
      email: "new@example.com",
      username: "newuser",
      password: "securePassword123",
      role: UserRole.VIEWER,
    };

    it("should create a user and return safe user data", async () => {
      usersRepository.findByEmail.mockResolvedValue(null);
      usersRepository.findByUsername.mockResolvedValue(null);
      usersRepository.create.mockResolvedValue({
        ...mockUser,
        email: createDto.email,
        username: createDto.username,
      });

      const result = await usersService.create(createDto);

      expect(usersRepository.findByEmail).toHaveBeenCalledWith("new@example.com");
      expect(usersRepository.findByUsername).toHaveBeenCalledWith("newuser");
      expect(mockArgon2.hash).toHaveBeenCalledWith("securePassword123");
      expect(result.email).toBe("new@example.com");
      expect(result).not.toHaveProperty("passwordHash");
    });

    it("should throw DuplicateEntityException when email already exists", async () => {
      usersRepository.findByEmail.mockResolvedValue(mockUser);

      await expect(usersService.create(createDto)).rejects.toThrow(DuplicateEntityException);
    });

    it("should throw DuplicateEntityException when username already exists", async () => {
      usersRepository.findByEmail.mockResolvedValue(null);
      usersRepository.findByUsername.mockResolvedValue(mockUser);

      await expect(usersService.create(createDto)).rejects.toThrow(DuplicateEntityException);
    });

    it("should hash the password before storing", async () => {
      usersRepository.findByEmail.mockResolvedValue(null);
      usersRepository.findByUsername.mockResolvedValue(null);
      usersRepository.create.mockResolvedValue(mockUser);

      await usersService.create(createDto);

      expect(usersRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          passwordHash: "$argon2id$new-hash",
        }),
      );
    });

    it("should pass the correct role and status to repository", async () => {
      usersRepository.findByEmail.mockResolvedValue(null);
      usersRepository.findByUsername.mockResolvedValue(null);
      usersRepository.create.mockResolvedValue(mockUser);

      await usersService.create(createDto);

      expect(usersRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          role: UserRole.VIEWER,
          status: "ACTIVE",
        }),
      );
    });
  });

  describe("findById", () => {
    it("should return safe user data when user exists", async () => {
      usersRepository.findById.mockResolvedValue(mockUser);

      const result = await usersService.findById("user-1");

      expect(usersRepository.findById).toHaveBeenCalledWith("user-1");
      expect(result.id).toBe("user-1");
      expect(result.email).toBe("test@example.com");
      expect(result).not.toHaveProperty("passwordHash");
    });

    it("should throw EntityNotFoundException when user does not exist", async () => {
      usersRepository.findById.mockResolvedValue(null);

      await expect(usersService.findById("nonexistent")).rejects.toThrow(
        EntityNotFoundException,
      );
    });

    it("should include all safe user fields in the result", async () => {
      usersRepository.findById.mockResolvedValue(mockUser);

      const result = await usersService.findById("user-1");

      expect(result).toEqual({
        id: "user-1",
        email: "test@example.com",
        username: "testuser",
        role: UserRole.VIEWER,
        status: "ACTIVE",
        mustChangePassword: false,
        createdAt: new Date("2025-01-01"),
        updatedAt: new Date("2025-01-01"),
      });
    });
  });

  describe("findAll", () => {
    it("should return paginated results with default parameters", async () => {
      usersRepository.findAll.mockResolvedValue({
        users: [mockUser, mockUser2],
        total: 2,
      });

      const result = await usersService.findAll();

      expect(usersRepository.findAll).toHaveBeenCalledWith({ skip: 0, take: 20 });
      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(2);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(20);
      expect(result.meta.totalPages).toBe(1);
    });

    it("should calculate correct skip for page 2", async () => {
      usersRepository.findAll.mockResolvedValue({ users: [], total: 0 });

      await usersService.findAll(2, 10);

      expect(usersRepository.findAll).toHaveBeenCalledWith({ skip: 10, take: 10 });
    });

    it("should calculate totalPages correctly", async () => {
      usersRepository.findAll.mockResolvedValue({
        users: [mockUser],
        total: 25,
      });

      const result = await usersService.findAll(1, 10);

      expect(result.meta.totalPages).toBe(3);
    });

    it("should return safe user objects without passwordHash", async () => {
      usersRepository.findAll.mockResolvedValue({
        users: [mockUser],
        total: 1,
      });

      const result = await usersService.findAll();

      expect(result.data[0]).not.toHaveProperty("passwordHash");
      expect(result.data[0]?.id).toBe("user-1");
    });

    it("should return empty data array when no users exist", async () => {
      usersRepository.findAll.mockResolvedValue({ users: [], total: 0 });

      const result = await usersService.findAll();

      expect(result.data).toHaveLength(0);
      expect(result.meta.total).toBe(0);
      expect(result.meta.totalPages).toBe(0);
    });
  });
});
