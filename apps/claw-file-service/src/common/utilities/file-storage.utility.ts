import * as fs from "fs";
import * as path from "path";
import { AppConfig } from "../../app/config/app.config";

export function saveFile(filename: string, content: Buffer): string {
  const config = AppConfig.get();
  const storagePath = path.join(config.FILE_STORAGE_PATH, filename);
  const dir = path.dirname(storagePath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(storagePath, content);
  return storagePath;
}

export function deleteFile(storagePath: string): void {
  if (fs.existsSync(storagePath)) {
    fs.unlinkSync(storagePath);
  }
}

export function readFile(storagePath: string): Buffer {
  return fs.readFileSync(storagePath);
}
