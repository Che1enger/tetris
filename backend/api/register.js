import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const app = express();
app.use(express.json());

app.post('/', async (req, res) => {
    const { username, email, password } = req.body;

    try {
        const userExists = await User.findOne({ $or: [{ username }, { email }] });

        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = new User({ username, email, password: hashedPassword });

        await newUser.save();

        const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

        res.status(201).json({
            token,
            user: {
                id: newUser._id,
                username: newUser.username,
                email: newUser.email,
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

export default app;
