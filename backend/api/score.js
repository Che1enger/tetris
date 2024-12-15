import express from 'express';
import User from '../models/User.js';
import { authenticateToken } from './middleware/authenticate.js';

const app = express();
app.use(express.json());

app.post('/update', authenticateToken, async (req, res) => {
    const { score } = req.body;
    const userId = req.user.userId;

    try {
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (score > (user.singlePlayerMaxScore || 0)) {
            user.singlePlayerMaxScore = score;
            await user.save();
            return res.json({ success: true, maxScore: user.singlePlayerMaxScore });
        }

        return res.json({ success: true, maxScore: user.singlePlayerMaxScore });
    } catch (error) {
        console.error('Error updating score:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

export default app;
