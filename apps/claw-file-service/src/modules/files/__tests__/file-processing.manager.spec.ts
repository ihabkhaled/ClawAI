import { FileProcessingManager } from "../managers/file-processing.manager";
import { type FilesRepository } from "../repositories/files.repository";
import { type FileChunksRepository } from "../repositories/file-chunks.repository";
import { type RabbitMQService } from "@claw/shared-rabbitmq";
import { EventPattern } from "@claw/shared-types";
import { FileIngestionStatus } from "../../../generated/prisma";

jest.mock("../../../common/utilities", () => ({
  verifyAccessToken: jest.fn(),
  saveFile: jest.fn().mockReturnValue("/data/uploads/test-file.txt"),
  deleteFile: jest.fn(),
  readFile: jest.fn().mockReturnValue(Buffer.from("default")),
}));

const { readFile } = jest.requireMock("../../../common/utilities") as {
  readFile: jest.Mock;
};

const MOCK_TEXT_CONTENT = "First paragraph.\n\nSecond paragraph.\n\nThird paragraph.";
const MOCK_JSON_CONTENT = JSON.stringify({ key1: "value1", key2: "value2", key3: "value3" });
const MOCK_CSV_CONTENT = "name,age\nAlice,30\nBob,25\nCharlie,35";
const MOCK_MARKDOWN_CONTENT = "# Section 1\nContent 1\n## Section 2\nContent 2\n# Section 3\nContent 3";

const mockFile = {
  id: "file-1",
  userId: "user-1",
  filename: "test.txt",
  mimeType: "text/plain",
  sizeBytes: 1024,
  storagePath: "/data/uploads/test-file.txt",
  ingestionStatus: FileIngestionStatus.PENDING,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockFilesRepository = (): Partial<Record<keyof FilesRepository, jest.Mock>> => ({
  updateIngestionStatus: jest.fn().mockResolvedValue(mockFile),
});

const mockFileChunksRepository = (): Record<keyof FileChunksRepository, jest.Mock> => ({
  createMany: jest.fn().mockResolvedValue(3),
  findByFileId: jest.fn(),
  deleteByFileId: jest.fn(),
});

const mockRabbitMQ = (): Partial<Record<keyof RabbitMQService, jest.Mock>> => ({
  publish: jest.fn().mockResolvedValue(undefined),
});

describe("FileProcessingManager", () => {
  let manager: FileProcessingManager;
  let filesRepo: ReturnType<typeof mockFilesRepository>;
  let chunksRepo: ReturnType<typeof mockFileChunksRepository>;
  let rabbitMQ: ReturnType<typeof mockRabbitMQ>;

  beforeEach(() => {
    filesRepo = mockFilesRepository();
    chunksRepo = mockFileChunksRepository();
    rabbitMQ = mockRabbitMQ();
    manager = new FileProcessingManager(
      filesRepo as unknown as FilesRepository,
      chunksRepo as unknown as FileChunksRepository,
      rabbitMQ as unknown as RabbitMQService,
    );
  });

  describe("processFile", () => {
    it("should process text file into paragraph chunks", async () => {
      readFile.mockReturnValue(Buffer.from(MOCK_TEXT_CONTENT));

      await manager.processFile(mockFile);

      expect(filesRepo.updateIngestionStatus).toHaveBeenCalledWith(
        "file-1",
        FileIngestionStatus.PROCESSING,
      );
      expect(chunksRepo.createMany).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ fileId: "file-1", chunkIndex: 0, content: "First paragraph." }),
          expect.objectContaining({ fileId: "file-1", chunkIndex: 1, content: "Second paragraph." }),
          expect.objectContaining({ fileId: "file-1", chunkIndex: 2, content: "Third paragraph." }),
        ]),
      );
      expect(filesRepo.updateIngestionStatus).toHaveBeenCalledWith(
        "file-1",
        FileIngestionStatus.COMPLETED,
      );
    });

    it("should process JSON file by splitting keys", async () => {
      readFile.mockReturnValue(Buffer.from(MOCK_JSON_CONTENT));
      const jsonFile = { ...mockFile, mimeType: "application/json" };

      await manager.processFile(jsonFile);

      expect(chunksRepo.createMany).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ chunkIndex: 0 }),
          expect.objectContaining({ chunkIndex: 1 }),
          expect.objectContaining({ chunkIndex: 2 }),
        ]),
      );
    });

    it("should process CSV file by splitting rows", async () => {
      readFile.mockReturnValue(Buffer.from(MOCK_CSV_CONTENT));
      const csvFile = { ...mockFile, mimeType: "text/csv" };

      await manager.processFile(csvFile);

      expect(chunksRepo.createMany).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ chunkIndex: 0 }),
        ]),
      );
    });

    it("should process markdown file by splitting sections", async () => {
      readFile.mockReturnValue(Buffer.from(MOCK_MARKDOWN_CONTENT));
      const mdFile = { ...mockFile, mimeType: "text/markdown" };

      await manager.processFile(mdFile);

      expect(chunksRepo.createMany).toHaveBeenCalled();
      expect(filesRepo.updateIngestionStatus).toHaveBeenCalledWith(
        "file-1",
        FileIngestionStatus.COMPLETED,
      );
    });

    it("should publish file.chunked event on success", async () => {
      readFile.mockReturnValue(Buffer.from(MOCK_TEXT_CONTENT));

      await manager.processFile(mockFile);

      expect(rabbitMQ.publish).toHaveBeenCalledWith(
        EventPattern.FILE_CHUNKED,
        expect.objectContaining({
          fileId: "file-1",
          userId: "user-1",
        }),
      );
    });

    it("should set status to FAILED and publish file.failed on error", async () => {
      readFile.mockImplementation(() => {
        throw new Error("File not found");
      });

      await manager.processFile(mockFile);

      expect(filesRepo.updateIngestionStatus).toHaveBeenCalledWith(
        "file-1",
        FileIngestionStatus.FAILED,
      );
      expect(rabbitMQ.publish).toHaveBeenCalledWith(
        "file.failed",
        expect.objectContaining({
          fileId: "file-1",
          error: "File not found",
        }),
      );
    });
  });

  describe("updateIngestionStatus", () => {
    it("should update ingestion status", async () => {
      await manager.updateIngestionStatus("file-1", FileIngestionStatus.COMPLETED);

      expect(filesRepo.updateIngestionStatus).toHaveBeenCalledWith(
        "file-1",
        FileIngestionStatus.COMPLETED,
      );
    });
  });
});
