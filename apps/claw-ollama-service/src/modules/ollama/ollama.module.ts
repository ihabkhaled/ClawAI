import { Module } from "@nestjs/common";
import { OllamaController } from "./ollama.controller";
import { OllamaService } from "./ollama.service";

@Module({
  controllers: [OllamaController],
  providers: [OllamaService],
  exports: [OllamaService],
})
export class OllamaModule {}
