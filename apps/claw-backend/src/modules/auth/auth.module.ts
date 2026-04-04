import { Module } from "@nestjs/common";
import { AuthController } from "./controllers/auth.controller";
import { AuthService } from "./services/auth.service";
import { AuthManager } from "./managers/auth.manager";
import { AuthRepository } from "./repositories/auth.repository";

@Module({
  controllers: [AuthController],
  providers: [AuthService, AuthManager, AuthRepository],
  exports: [AuthService],
})
export class AuthModule {}
