import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';


const API_URL = window.location.hostname.includes('ngrok')
    ? 'https://bb60-62-65-196-16.ngrok-free.app' : 'http://localhost:5000';

export const AuthContext = createContext(null);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(() => {
        
        const savedUser = localStorage.getItem('user');
        return savedUser ? JSON.parse(savedUser) : null;
    });

    const [loading, setLoading] = useState(true); 
    const [error, setError] = useState(null);

    useEffect(() => {
        const initializeAuth = async () => {
            try {
                const token = localStorage.getItem('token');
                if (token) {
                    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
                    const response = await axios.get(`${API_URL}/api/verify-token`);
                    setUser(response.data.user);
                }
            } catch (err) {
                console.error('Ошибка проверки токена:', err);
                logout(); 
            } finally {
                setLoading(false); 
            }
        };

        initializeAuth();
    }, []);

    const login = async (userData) => {
        setLoading(true);
        setError(null);
        try {
            console.log('Attempting login with:', { ...userData, password: '***' });
            const response = await axios.post(`${API_URL}/api/login`, userData);
            console.log('Login response:', response.data);

            const { token, user } = response.data;

            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(user));
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            setUser(user);
        } catch (err) {
            console.error('Login error details:', {
                response: err.response?.data,
                status: err.response?.status,
                headers: err.response?.headers
            });
            setError(err.response?.data?.message || 'Ошибка входа');
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const register = async (userData) => {
        setLoading(true);
        setError(null);
        try {
            const response = await axios.post(`${API_URL}/api/register`, userData);
            const { token, user } = response.data;

            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(user));
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            setUser(user);
        } catch (err) {
            setError(err.response?.data?.message || 'Ошибка регистрации');
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
        delete axios.defaults.headers.common['Authorization'];
    };

    const value = {
        user,
        login,
        register,
        logout,
        loading,
        error,
        isAuthenticated: !!user
    };

    return (
        <AuthContext.Provider value={value}>
            {children} {}
        </AuthContext.Provider>
    );
};
