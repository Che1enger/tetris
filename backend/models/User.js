const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        minlength: 3
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please fill a valid email address']
    },
    password: {
        type: String,
        required: true,
        minlength: 6
    },
    singlePlayerMaxScore: {
        type: Number,
        default: 0
    },
    networkMaxScore: {
        type: Number,
        default: 0
    },
    networkWins: {
        type: Number,
        default: 0
    },
    gamesPlayed: {
        type: Number,
        default: 0
    },
    blockColor: {
        type: String,
        default: '#00f0f0'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Optional: Add email validation
UserSchema.path('email').validate(function(value) {
    return /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(value);
}, 'Invalid email format');

module.exports = mongoose.model('User', UserSchema);