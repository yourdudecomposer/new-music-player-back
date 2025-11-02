import dotenv from 'dotenv';
// Загружаем переменные окружения ПЕРВЫМ делом, до всех остальных импортов
dotenv.config();

import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.routes';
import trackRoutes from './routes/tracks.routes';

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors()); // Разрешаем кросс-доменные запросы
app.use(express.json()); // Для парсинга JSON-тел запросов

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/tracks', trackRoutes);

// Простой роут для проверки работы сервера
app.get('/', (req, res) => {
  res.send('Music Player API is running!');
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
