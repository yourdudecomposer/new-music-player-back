import { Router } from 'express';
import multer from 'multer';
import { verifyToken } from '../middleware/auth.middleware';
import { uploadFile, listUserFiles, deleteFile } from '../services/yandexStorage.service';
import { downloadYoutubeAsMp3 } from '../services/youtube.service';

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

    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ message: 'YouTube URL is required' });
    }

    const username = req.user.username;

    // Download audio from YouTube
    const { buffer, title, filename } = await downloadYoutubeAsMp3(url);

    // Create a multer-compatible file object
    const file: Express.Multer.File = {
      fieldname: 'track',
      originalname: filename,
      encoding: '7bit',
      mimetype: 'audio/mpeg',
      buffer: buffer,
      size: buffer.length,
      destination: '',
      filename: filename,
      path: filename,
      stream: require('stream').Readable.from(buffer),
    };

    // Upload to Yandex Storage
    const fileUrl = await uploadFile(file, username);

    res.status(201).json({
      message: 'YouTube audio downloaded and uploaded successfully',
      url: fileUrl,
      name: filename,
      title: title,
      uploadedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('YouTube download error:', error);
    res.status(500).json({ 
      message: 'Failed to download YouTube audio',
      error: error.message || 'Unknown error'
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
