import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes';
import trackRoutes from './routes/tracks.routes';

// Загружаем переменные окружения
dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors()); // Разрешаем кросс-доменные запросы
app.use(express.json()); // Для парсинга JSON-тел запросов

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
