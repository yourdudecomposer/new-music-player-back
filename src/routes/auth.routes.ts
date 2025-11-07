import { Router } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'fallback-refresh-secret';

// Загружаем пользователей из .env
const users = process.env.USERS_DB ? JSON.parse(process.env.USERS_DB) : [];

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required' });
  }

  const user = users.find((u: any) => u.username === username);
  if (!user) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  // Сравниваем предоставленный пароль с хэшем в "базе"
  const isPasswordValid = bcrypt.compareSync(password, user.passwordHash);
  if (!isPasswordValid) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  // Генерируем Access Token (короткий срок - 15 минут)
  const accessToken = jwt.sign({ username: user.username }, JWT_SECRET, {
    expiresIn: '15m',
  });

  // Генерируем Refresh Token (длинный срок - 1 дней)
  const refreshToken = jwt.sign({ username: user.username }, REFRESH_TOKEN_SECRET, {
    expiresIn: '30m',
  });

  console.log(refreshToken);
  console.log(accessToken);
  
  res.json({ token: accessToken, refreshToken });
});

router.post('/refresh', (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ message: 'Refresh token is required' });
  }

  try {
    const decoded = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET) as { username: string };
    
    // Проверяем существование пользователя
    const user = users.find((u: any) => u.username === decoded.username);
    if (!user) {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }

    // Генерируем новые токены
    const accessToken = jwt.sign({ username: user.username }, JWT_SECRET, {
      expiresIn: '15m',
    });

    const newRefreshToken = jwt.sign({ username: user.username }, REFRESH_TOKEN_SECRET, {
      expiresIn: '30m',
    });

    res.json({ token: accessToken, refreshToken: newRefreshToken });
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired refresh token' });
  }
});

export default router;
