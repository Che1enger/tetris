import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import loginRouter from './api/login.js';  // Импортируем маршруты
import registerRouter from './api/register.js';
import leaderboardRouter from './api/leaderboard.js';
import scoreRouter from './api/score.js';
import profileRouter from './api/profile.js';

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());  // Парсинг JSON в теле запросов

// Подключение к MongoDB
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    socketTimeoutMS: 45000,
    connectTimeoutMS: 45000
})
.then(() => console.log('MongoDB connected'))
.catch((err) => console.error('MongoDB connection error:', err));


// Роуты
app.use('/api/login', loginRouter);  // Маршрут для логина
app.use('/api/register', registerRouter);  // Маршрут для регистрации
app.use('/api/leaderboard', leaderboardRouter);  // Лидерборд
app.use('/api/score', scoreRouter);  // Обновление счета
app.use('/api/profile', profileRouter);  // Профиль пользователя

// Экспортируем сервер для Vercel
export default app;
