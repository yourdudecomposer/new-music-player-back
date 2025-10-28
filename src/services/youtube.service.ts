// @ts-ignore - @vreden/youtube_scraper has no type definitions
import { ytmp3 } from '@vreden/youtube_scraper';
import axios from 'axios';

/**
 * Downloads audio from YouTube and converts it to MP3 buffer
 * @param url - YouTube video URL
 * @returns Promise with audio buffer and metadata (title, filename)
 */
export async function downloadYoutubeAsMp3(url: string): Promise<{
  buffer: Buffer;
  title: string;
  filename: string;
}> {
  try {
    // Validate YouTube URL
    const youtubeRegex = /^https?:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)/;
    if (!youtubeRegex.test(url)) {
      throw new Error('Invalid YouTube URL');
    }

    // Get download link from @vreden/youtube_scraper
    const result: any = await ytmp3(url, '128');
    
    if (!result.status) {
      throw new Error('Failed to get YouTube audio download link');
    }

    // The API returns url in result.download
    const downloadUrl = result.download.url;
    const title = result.download.filename || `track_${Date.now()}`;
    console.log('[YouTube] Downloading:', title);

    // Validate download URL
    if (!downloadUrl) {
      throw new Error('Download URL is missing');
    }

    // Download audio file
    const response = await axios({
      method: 'GET',
      url: downloadUrl,
      responseType: 'stream',
    });

    // Convert stream to buffer
    const chunks: Buffer[] = [];
    
    await new Promise<void>((resolve, reject) => {
      response.data.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
      });
      
      response.data.on('end', () => {
        resolve();
      });
      
      response.data.on('error', (error: Error) => {
        console.error('Download stream error:', error);
        reject(error);
      });
    });

    const buffer = Buffer.concat(chunks);
    
    // Generate safe filename
    const safeTitle = title.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);
    const filename = `${safeTitle}.mp3`;
    console.log('[YouTube] Downloaded:', filename);

    return {
      buffer,
      title,
      filename,
    };
  } catch (error) {
    console.error('YouTube download error:', error);
    throw error;
  }
}
