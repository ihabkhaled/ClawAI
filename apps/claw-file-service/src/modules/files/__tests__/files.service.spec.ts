import { FilesService } from "../services/files.service";
import { type FilesRepository } from "../repositories/files.repository";
import { type FileChunksRepository } from "../repositories/file-chunks.repository";
import { type RabbitMQService } from "@claw/shared-rabbitmq";
import { EventPattern } from "@claw/shared-types";
import { BusinessException, EntityNotFoundException } from "../../../common/errors";
import { FileIngestionStatus } from "../../../generated/prisma";

jest.mock("../../../common/utilities", () => ({
  verifyAccessToken: jest.fn(),
  saveFile: jest.fn().mockReturnValue("/data/uploads/test-file.txt"),
  deleteFile: jest.fn(),
  readFile: jest.fn().mockReturnValue(Buffer.from("test content")),
}));

const mockFile = {
  id: "file-1",
  userId: "user-1",
  filename: "test.txt",
  mimeType: "text/plain",
  sizeBytes: 1024,
  storagePath: "/data/uploads/test-file.txt",
  content: null,
  ingestionStatus: FileIngestionStatus.PENDING,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockFileWithChunks = {
  ...mockFile,
  chunks: [
    {
      id: "chunk-1",
      fileId: "file-1",
      chunkIndex: 0,
      content: "test content",
      createdAt: new Date(),
    },
  ],
};

const mockChunk = {
  id: "chunk-1",
  fileId: "file-1",
  chunkIndex: 0,
  content: "test content",
  createdAt: new Date(),
};

const mockFilesRepository = (): Record<keyof FilesRepository, jest.Mock> => ({
  create: jest.fn(),
  findById: jest.fn(),
  findAll: jest.fn(),
  updateIngestionStatus: jest.fn(),
  delete: jest.fn(),
  countAll: jest.fn(),
});

const mockFileChunksRepository = (): Record<keyof FileChunksRepository, jest.Mock> => ({
  createMany: jest.fn(),
  findByFileId: jest.fn(),
  deleteByFileId: jest.fn(),
});


const mockRabbitMQ = (): Partial<Record<keyof RabbitMQService, jest.Mock>> => ({
  publish: jest.fn().mockResolvedValue(undefined),
});

describe("FilesService", () => {
  let service: FilesService;
  let filesRepo: ReturnType<typeof mockFilesRepository>;
  let chunksRepo: ReturnType<typeof mockFileChunksRepository>;
  let rabbitMQ: ReturnType<typeof mockRabbitMQ>;

  beforeEach(() => {
    filesRepo = mockFilesRepository();
    chunksRepo = mockFileChunksRepository();
    rabbitMQ = mockRabbitMQ();
    service = new FilesService(
      filesRepo as unknown as FilesRepository,
      chunksRepo as unknown as FileChunksRepository,
      rabbitMQ as unknown as RabbitMQService,
    );
  });

  describe("uploadFile", () => {
    it("should upload a file and publish event", async () => {
      filesRepo.create.mockResolvedValue(mockFile);

      const result = await service.uploadFile("user-1", {
        filename: "test.txt",
        mimeType: "text/plain",
        sizeBytes: 1024,
        content: Buffer.from("test content").toString("base64"),
      });

      expect(result).toEqual(mockFile);
      expect(filesRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "user-1",
          filename: "test.txt",
          mimeType: "text/plain",
          sizeBytes: 1024,
        }),
      );
      expect(rabbitMQ.publish).toHaveBeenCalledWith(
        EventPattern.FILE_UPLOADED,
        expect.objectContaining({
          fileId: "file-1",
          userId: "user-1",
        }),
      );
    });

    it("should store file content when provided", async () => {
      const fileWithContent = { ...mockFile, content: "SGVsbG8=" };
      filesRepo.create.mockResolvedValue(fileWithContent);

      await service.uploadFile("user-1", {
        filename: "test.txt",
        mimeType: "text/plain",
        sizeBytes: 1024,
        content: "SGVsbG8=",
      });

      expect(filesRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ content: "SGVsbG8=" }),
      );
    });

    it("should reject invalid MIME type", async () => {
      await expect(
        service.uploadFile("user-1", {
          filename: "test.exe",
          mimeType: "application/x-executable" as "text/plain",
          sizeBytes: 1024,
        }),
      ).rejects.toThrow(BusinessException);
    });

    it("should reject file exceeding size limit", async () => {
      await expect(
        service.uploadFile("user-1", {
          filename: "test.txt",
          mimeType: "text/plain",
          sizeBytes: 60 * 1024 * 1024, // 60MB
        }),
      ).rejects.toThrow(BusinessException);
    });
  });

  describe("getFiles", () => {
    it("should return paginated files", async () => {
      filesRepo.findAll.mockResolvedValue([mockFile]);
      filesRepo.countAll.mockResolvedValue(1);

      const result = await service.getFiles("user-1", {
        page: 1,
        limit: 20,
      });

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
      expect(result.meta.totalPages).toBe(1);
    });

    it("should pass filters to repository", async () => {
      filesRepo.findAll.mockResolvedValue([]);
      filesRepo.countAll.mockResolvedValue(0);

      await service.getFiles("user-1", {
        page: 1,
        limit: 20,
        ingestionStatus: FileIngestionStatus.COMPLETED,
        search: "test",
      });

      expect(filesRepo.findAll).toHaveBeenCalledWith(
        { userId: "user-1", ingestionStatus: FileIngestionStatus.COMPLETED, search: "test" },
        1,
        20,
      );
    });
  });

  describe("getFile", () => {
    it("should return file when found and owned by user", async () => {
      filesRepo.findById.mockResolvedValue(mockFileWithChunks);

      const result = await service.getFile("file-1", "user-1");

      expect(result.id).toBe("file-1");
    });

    it("should throw EntityNotFoundException when not found", async () => {
      filesRepo.findById.mockResolvedValue(null);

      await expect(service.getFile("nonexistent", "user-1")).rejects.toThrow(
        EntityNotFoundException,
      );
    });

    it("should throw BusinessException when user does not own file", async () => {
      filesRepo.findById.mockResolvedValue(mockFileWithChunks);

      await expect(service.getFile("file-1", "other-user")).rejects.toThrow(
        BusinessException,
      );
    });
  });

  describe("deleteFile", () => {
    it("should delete file, chunks, and disk file", async () => {
      filesRepo.findById.mockResolvedValue(mockFileWithChunks);
      filesRepo.delete.mockResolvedValue(mockFile);
      chunksRepo.deleteByFileId.mockResolvedValue(1);

      const result = await service.deleteFile("file-1", "user-1");

      expect(result).toEqual(mockFile);
      expect(chunksRepo.deleteByFileId).toHaveBeenCalledWith("file-1");
      expect(filesRepo.delete).toHaveBeenCalledWith("file-1");
    });

    it("should throw EntityNotFoundException when not found", async () => {
      filesRepo.findById.mockResolvedValue(null);

      await expect(service.deleteFile("nonexistent", "user-1")).rejects.toThrow(
        EntityNotFoundException,
      );
    });

    it("should throw BusinessException when user does not own file", async () => {
      filesRepo.findById.mockResolvedValue(mockFileWithChunks);

      await expect(service.deleteFile("file-1", "other-user")).rejects.toThrow(
        BusinessException,
      );
    });
  });

  describe("getChunks", () => {
    it("should return chunks for a file", async () => {
      filesRepo.findById.mockResolvedValue(mockFileWithChunks);
      chunksRepo.findByFileId.mockResolvedValue([mockChunk]);

      const result = await service.getChunks("file-1", "user-1");

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(mockChunk);
    });

    it("should throw EntityNotFoundException when file not found", async () => {
      filesRepo.findById.mockResolvedValue(null);

      await expect(service.getChunks("nonexistent", "user-1")).rejects.toThrow(
        EntityNotFoundException,
      );
    });
  });
});
