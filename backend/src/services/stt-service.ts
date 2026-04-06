import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { logger } from '../lib/logger.js';

let openai: OpenAI | null = null;
if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

/**
 * Speech-to-Text Service using OpenAI Whisper
 */
export class STTService {
  /**
   * Transcribes an audio buffer to text.
   * Supports common formats like ogg, mp3, m4a, wav, etc.
   */
  public async transcribe(buffer: Buffer, originalName: string = 'audio.ogg'): Promise<string | null> {
    if (!openai) {
      logger.warn('[STTService] OpenAI not configured. Skipping transcription.');
      return null;
    }

    const tempDir = os.tmpdir();
    // Ensure the filename has a valid extension for Whisper
    const ext = path.extname(originalName) || '.ogg';
    const tempFilePath = path.join(tempDir, `stt-${Date.now()}${ext}`);

    try {
      // Write buffer to temp file
      fs.writeFileSync(tempFilePath, buffer);

      logger.info({ tempFilePath, size: buffer.length }, '[STTService] Sending audio to Whisper...');

      // Transcribe using Whisper-1
      const response = await openai.audio.transcriptions.create({
        file: fs.createReadStream(tempFilePath),
        model: 'whisper-1',
        language: 'pt', // Hinting Portuguese for better accuracy
      });

      const text = response.text?.trim();
      if (text) {
        logger.info({ textLength: text.length }, '[STTService] Transcription successful');
        return text;
      }

      return null;
    } catch (error: any) {
      logger.error({ error: error.message, originalName }, '[STTService] Transcription failed');
      return null;
    } finally {
      // Cleanup temp file safely
      try {
        if (fs.existsSync(tempFilePath)) {
          fs.unlinkSync(tempFilePath);
        }
      } catch (e) {
        logger.error({ e }, '[STTService] Failed to cleanup temp file');
      }
    }
  }
}

export const sttService = new STTService();
