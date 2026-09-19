-- F3b (ADR-108): spreadsheets, slide decks and zip bundles.
ALTER TYPE "FileFormat" ADD VALUE IF NOT EXISTS 'XLSX';
ALTER TYPE "FileFormat" ADD VALUE IF NOT EXISTS 'PPTX';
ALTER TYPE "FileFormat" ADD VALUE IF NOT EXISTS 'ZIP';
