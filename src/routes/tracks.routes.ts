import { Router } from 'express';
import multer from 'multer';
import { verifyToken } from '../middleware/auth.middleware';
import { uploadFile, listUserFiles, deleteFile } from '../services/yandexStorage.service';

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
