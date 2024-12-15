import express from 'express';
import User from '../models/User.js';
import Game from '../models/Game.js';
import { authenticateToken } from './middleware/authenticate.js';

const app = express();
app.use(express.json());

app.get('/', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const gamesPlayed = await Game.countDocuments({
            $or: [{ player1: user._id }, { player2: user._id }]
        });

        const totalGamesPlayed = Math.max(gamesPlayed, user.gamesPlayed || 0);

        res.json({
            username: user.username,
            email: user.email,
            networkWins: user.networkWins || 0,
            singlePlayerMaxScore: user.singlePlayerMaxScore || 0,
            networkMaxScore: user.networkMaxScore || 0,
            gamesPlayed: totalGamesPlayed
        });
    } catch (error) {
        console.error('Error fetching profile:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

export default app;
