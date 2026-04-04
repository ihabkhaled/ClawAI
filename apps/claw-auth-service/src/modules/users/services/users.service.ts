import { Injectable } from "@nestjs/common";
import { UsersRepository } from "../repositories/users.repository";
import { hashPassword } from "@common/utilities";
import { CreateUserDto } from "../dto/create-user.dto";
import {
  DuplicateEntityException,
  EntityNotFoundException,
} from "../../../common/errors";
import { PaginatedResult } from "../../../common/types";
import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE } from "../../../common/constants";
import { SafeUser } from "../types/users.types";
import { toSafeUser } from "../service.utilities/to-safe-user.utility";

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async create(dto: CreateUserDto): Promise<SafeUser> {
    const existingByEmail = await this.usersRepository.findByEmail(dto.email);
    if (existingByEmail) {
      throw new DuplicateEntityException("User", "email");
    }

    const existingByUsername = await this.usersRepository.findByUsername(dto.username);
    if (existingByUsername) {
      throw new DuplicateEntityException("User", "username");
    }

    const passwordHash = await hashPassword(dto.password);

    const user = await this.usersRepository.create({
      email: dto.email,
      username: dto.username,
      passwordHash,
      role: dto.role,
      status: "ACTIVE",
    });

    return toSafeUser(user);
  }

  async findById(id: string): Promise<SafeUser> {
    const user = await this.usersRepository.findById(id);
    if (!user) {
      throw new EntityNotFoundException("User", id);
    }
    return toSafeUser(user);
  }

  async findAll(
    page: number = DEFAULT_PAGE,
    limit: number = DEFAULT_PAGE_SIZE,
  ): Promise<PaginatedResult<SafeUser>> {
    const skip = (page - 1) * limit;
    const { users, total } = await this.usersRepository.findAll({ skip, take: limit });

    return {
      data: users.map(toSafeUser),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
