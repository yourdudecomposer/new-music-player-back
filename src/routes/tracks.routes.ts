import { Router } from 'express';
import multer from 'multer';
import { verifyToken } from '../middleware/auth.middleware';
import { uploadFile, listUserFiles, deleteFile } from '../services/yandexStorage.service';
import { 
  getVideoInfo, 
  downloadYoutubeAsMp3, 
  readFileToBuffer, 
  deleteTempFile 
} from '../services/youtube.service';
import path from 'path';

const router = Router();

// Настраиваем multer для хранения файла в памяти
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Получить все треки пользователя
router.get('/', verifyToken, async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
    const username = req.user.username;
    const files = await listUserFiles(username);    
    res.json(files);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to fetch tracks' });
  }
});

// Загрузить новый трек
router.post('/upload', verifyToken, upload.single('track'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const username = req.user.username;
    const fileUrl = await uploadFile(req.file, username);
    
    res.status(201).json({
      message: 'File uploaded successfully',
      url: fileUrl,
      name: req.file.originalname,
      uploadedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to upload file' });
  }
});

// Скачать с YouTube
router.post('/youtube', verifyToken, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { url, customTitle } = req.body;
    if (!url) {
      return res.status(400).json({ message: 'YouTube URL is required' });
    }
    if (!customTitle) {
      return res.status(400).json({ message: 'Custom title is required' });
    }

    const username = req.user.username;

    console.log('Получаем информацию о видео...');
    // const videoInfo = await getVideoInfo(url, customTitle);

    const videoInfo = {
      title: customTitle,
    }
    console.log('Видео:', videoInfo.title);

    // Создаем безопасное имя файла
    const safeTitle = videoInfo.title
      .replace(/[^a-z0-9]/gi, '_')
      .toLowerCase()
      .substring(0, 50);
    const fileName = `${safeTitle}.mp3`;

    console.log('Скачиваем и конвертируем видео...');
    const tempFilePath = await downloadYoutubeAsMp3(url, fileName);

    console.log('Читаем файл в buffer...');
    const fileBuffer = await readFileToBuffer(tempFilePath);

    console.log('Загружаем в Yandex Storage...');
    // Создаем объект файла для multer
    const file: Express.Multer.File = {
      fieldname: 'track',
      originalname: fileName,
      encoding: '7bit',
      mimetype: 'audio/mpeg',
      size: fileBuffer.length,
      buffer: fileBuffer,
      destination: '',
      filename: '',
      path: '',
      stream: null as any,
    };

    const fileUrl = await uploadFile(file, username);

    // Удаляем временный файл
    await deleteTempFile(tempFilePath);

    console.log('✅ Успешно загружено в хранилище');

    res.status(201).json({
      message: 'Video downloaded and uploaded successfully',
      url: fileUrl,
      name: fileName,
      title: videoInfo.title,
      uploadedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error downloading from YouTube:', error);
    res.status(500).json({ 
      message: 'Failed to download from YouTube',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Удалить трек
router.delete('/:filename', verifyToken, async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
    const username = req.user.username;
    const { filename } = req.params;
    
    await deleteFile(filename, username);
    
    res.status(200).json({ message: `File ${filename} deleted successfully` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to delete file' });
  }
});

export default router;
