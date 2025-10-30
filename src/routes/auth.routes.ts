import { Router } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import db from '../db.json';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required' });
  }

  const user = db.users.find((u: any) => u.username === username);
  if (!user) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  // Сравниваем предоставленный пароль с хэшем в "базе"
  const isPasswordValid = bcrypt.compareSync(password, user.passwordHash);
  if (!isPasswordValid) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  // Генерируем JWT
  const token = jwt.sign({ username: user.username }, JWT_SECRET, {
    expiresIn: '1h',
  });

  res.json({ token });
});

export default router;
