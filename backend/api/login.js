import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const app = express();
app.use(express.json());

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    
    try {
        // Используем индексы для быстрого поиска пользователя по username
        const user = await User.findOne({ username }).select('password');  // Выбираем только поле password

        if (!user) {
            return res.status(400).json({ message: 'User not found' });
        }

        // Сравниваем пароль
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid password' });
        }

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

        res.json({
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});


export default app;
