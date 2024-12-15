import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './AuthContext';
import './App.css';
import './i18n'; 
import LoginRegistrationPage from './Form';
import MainMenu from './Menu';
import TetrisGame from './TetrisGame';
import ProtectedRoute from './ProtectedRoute';
import NetworkedTetris from './NetworkedTetris';
import ProfilePage from './pages/ProfilePage';

const App = () => {
    return (
        <AuthProvider>
            <Router>
                <Routes>
                    <Route path="/" element={<LoginRegistrationPage />} />
                    <Route 
                        path="/menu" 
                        element={
                            <ProtectedRoute>
                                <MainMenu />
                            </ProtectedRoute>
                        } 
                    />
                    <Route 
                        path="/profile" 
                        element={
                            <ProtectedRoute>
                                <ProfilePage />
                            </ProtectedRoute>
                        } 
                    />
                    <Route 
                        path="/game/single" 
                        element={
                            <ProtectedRoute>
                                <TetrisGame/>
                            </ProtectedRoute>
                        } 
                    />
                    <Route 
                        path="/game/network" 
                        element={
                            <ProtectedRoute>
                                <NetworkedTetris/>
                            </ProtectedRoute>
                        } 
                    />
                </Routes>
            </Router>
        </AuthProvider>
    );
};

export default App;
