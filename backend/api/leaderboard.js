import express from 'express';
import User from '../models/User.js';
import { authenticateToken } from './middleware/authenticate.js';  // Пример использования middleware

const app = express();
app.use(express.json());

app.get('/single', authenticateToken, async (req, res) => {
    try {
        const topPlayers = await User.find()
            .sort({ singlePlayerMaxScore: -1 })
            .limit(5)
            .select('username singlePlayerMaxScore');

        res.json({ success: true, data: topPlayers });
    } catch (error) {
        console.error('Error fetching leaderboard:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

export default app;
