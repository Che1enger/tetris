import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { useTranslation } from 'react-i18next';
import './Profile.css';
import MatchHistory from './MatchHistory';

const API_URL = 'https://backend2-hazel.vercel.app';

const Profile = ({ onColorChange }) => {
    const { t, i18n } = useTranslation();
    const { user } = useAuth();
    const [profileData, setProfileData] = useState({
        username: '',
        email: '',
        networkWins: 0,
        singlePlayerMaxScore: 0,
        networkMaxScore: 0,
        gamesPlayed: 0
    });
    const [selectedColor, setSelectedColor] = useState('#00f0f0');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Reset state when user changes
    useEffect(() => {
        setProfileData({
            username: '',
            email: '',
            networkWins: 0,
            singlePlayerMaxScore: 0,
            networkMaxScore: 0,
            gamesPlayed: 0
        });
        setSelectedColor('#00f0f0');
        setError(null);
        if (user?.id) {
            fetchProfileData();
        }
    }, [user?.id]); 

    const fetchProfileData = async () => {
        if (!user?.id) return;

        try {
            const token = localStorage.getItem('token');
            if (!token) {
                setError('No authentication token found');
                return;
            }

            const response = await fetch(`${API_URL}/api/profile`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch profile data');
            }

            const data = await response.json();
            setProfileData(data);

            const savedColor = localStorage.getItem(`blockColor_${user.id}`);
            if (savedColor) {
                setSelectedColor(savedColor);
            }
        } catch (err) {
            console.error('Error fetching profile:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleColorChange = async (e) => {
        if (!user?.id) return;

        const newColor = e.target.value;
        
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                setError('No authentication token found');
                return;
            }

            const response = await fetch(`${API_URL}/api/profile/color`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ blockColor: newColor })
            });
            
            if (!response.ok) {
                throw new Error('Failed to update color');
            }

            setSelectedColor(newColor);
            if (onColorChange) {
                onColorChange(newColor);
            }
        } catch (error) {
            console.error('Error updating color:', error);
            setError(error.message);
        }
    };

    const handleLanguageChange = (language) => {
        i18n.changeLanguage(language);
        localStorage.setItem('language', language);
    };

    return (
        <div className="profile-container">
            {loading ? (
                <div className="loading" style={{ backgroundColor: '#1a1a1a' }}>{t('loading')}</div>
            ) : error ? (
                <div className="error" style={{ backgroundColor: '#1a1a1a' }}>{error}</div>
            ) : (
                <>

                <div className="profile-header">
                        <h2 style={{ backgroundColor: 'transparent' }}>{t('profile.title')}</h2>
                        <div className="profile-info">
                            <p style={{ backgroundColor: '#242424' }}><strong style={{ backgroundColor: '#242424' }}>{t('profile.username')}:</strong> {profileData.username}</p>
                            <p style={{ backgroundColor: '#242424' }}><strong style={{ backgroundColor: '#242424' }}>{t('profile.email')}:</strong> {profileData.email}</p>
                        </div>
                    </div>
                    
                    <div className="profile-stats">
                        <h3 style={{ backgroundColor: 'transparent' }}>{t('profile.stats')}</h3>
                        <div className="stats-grid">
                            <div className="stat-item">
                                <span className="stat-label" style={{ backgroundColor: 'transparent' }}>{t('profile.networkWins')}:</span>
                                <span className="stat-value" style={{ backgroundColor: 'transparent' }}>{profileData.networkWins}</span>
                            </div>
                            <div className="stat-item">
                                <span className="stat-label" style={{ backgroundColor: 'transparent' }}>{t('profile.singlePlayerMaxScore')}:</span>
                                <span className="stat-value" style={{ backgroundColor: 'transparent' }}>{profileData.singlePlayerMaxScore}</span>
                            </div>
                            <div className="stat-item">
                                <span className="stat-label" style={{ backgroundColor: 'transparent' }}>{t('profile.networkMaxScore')}:</span>
                                <span className="stat-value" style={{ backgroundColor: 'transparent' }}>{profileData.networkMaxScore}</span>
                            </div>
                            <div className="stat-item">
                                <span className="stat-label" style={{ backgroundColor: 'transparent' }}>{t('profile.gamesPlayed')}:</span>
                                <span className="stat-value" style={{ backgroundColor: 'transparent' }}>{profileData.gamesPlayed}</span>
                            </div>
                        </div>
                    </div>

                    <div className="color-picker">
                        <label htmlFor="blockColor" style={{ backgroundColor: 'transparent' }}>{t('profile.blockColor')}:</label>
                        <input
                            type="color"
                            id="blockColor"
                            value={selectedColor}
                            onChange={handleColorChange}
                        />
                    </div>

                    <div className="language-selector">
                        <button
                            className={`language-btn ${i18n.language === 'en' ? 'active' : ''}`}
                            onClick={() => handleLanguageChange('en')}
                        >
                            English
                        </button>
                        <button
                            className={`language-btn ${i18n.language === 'uk' ? 'active' : ''}`}
                            onClick={() => handleLanguageChange('uk')}
                        >
                            Українська
                        </button>
                    </div>
                    

                    <div className="match-history-section">
                        <MatchHistory />
                    </div>
                </>
            )}
        </div>
    );
};

export default Profile;
