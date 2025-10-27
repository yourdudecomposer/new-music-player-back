import fs from "fs";
import ytdl from "@distube/ytdl-core";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import path from "path";
import { promisify } from "util";

// Configure ffmpeg path
if (ffmpegPath) {
  ffmpeg.setFfmpegPath(ffmpegPath);
}

const TEMP_DIR = path.join(__dirname, "../../temp");
const readFilePromise = promisify(fs.readFile);
const unlinkPromise = promisify(fs.unlink);
const mkdirPromise = promisify(fs.mkdir);

/**
 * Get video information from YouTube URL
 * @param url - YouTube video URL
 * @returns Promise with video information (title, duration, etc.)
 */
export async function getVideoInfo(url: string, customTitle: string) {
  try {
    const info = await ytdl.getInfo(url);
    return {
      title: info.videoDetails.title,
      duration: info.videoDetails.lengthSeconds,
      author: info.videoDetails.author.name,
      viewCount: info.videoDetails.viewCount,
    };
  } catch (error) {
    console.error("Error getting video info:", error);
    // throw new Error("Failed to get video information");
    return {
        title: customTitle
      };
  }
}

/**
 * Download YouTube video and convert to MP3
 * @param url - YouTube video URL
 * @param fileName - Output filename
 * @returns Promise resolving to the path of the downloaded file
 */
export async function downloadYoutubeAsMp3(url: string, fileName: string): Promise<string> {
  return new Promise(async (resolve, reject) => {
    try {
      // Ensure temp directory exists
      if (!fs.existsSync(TEMP_DIR)) {
        await mkdirPromise(TEMP_DIR, { recursive: true });
      }

      const outputPath = path.join(TEMP_DIR, fileName);
      
      console.log("Downloading video...");
      const stream = ytdl(url, { quality: "highestaudio" });

      console.log("Converting to MP3...");
      ffmpeg(stream)
        .audioBitrate(128)
        .toFormat("mp3")
        .save(outputPath)
        .on("end", () => {
          console.log(`File saved: ${outputPath}`);
          resolve(outputPath);
        })
        .on("error", (err) => {
          console.error("FFmpeg error:", err);
          reject(err);
        });

      stream.on("error", (err) => {
        console.error("YouTube download error:", err);
        reject(err);
      });
    } catch (error) {
      console.error("Error downloading from YouTube:", error);
      reject(error);
    }
  });
}

/**
 * Read file from disk and return as buffer
 * @param filePath - Path to the file
 * @returns Promise with file buffer
 */
export async function readFileToBuffer(filePath: string): Promise<Buffer> {
  try {
    const buffer = await readFilePromise(filePath);
    return buffer;
  } catch (error) {
    console.error("Error reading file to buffer:", error);
    throw new Error("Failed to read file to buffer");
  }
}

/**
 * Delete temporary file
 * @param filePath - Path to the file to delete
 */
export async function deleteTempFile(filePath: string): Promise<void> {
  try {
    await unlinkPromise(filePath);
    console.log(`Deleted temporary file: ${filePath}`);
  } catch (error) {
    console.error("Error deleting temporary file:", error);
    throw new Error("Failed to delete temporary file");
  }
}

