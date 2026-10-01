-- Image-to-video: the image a clip animates (file-service id); null for text-to-video.
ALTER TABLE "video_generations" ADD COLUMN "source_file_id" TEXT;
