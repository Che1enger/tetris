import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";
import Profile from "../components/Profile";
import { useTranslation } from "react-i18next";
import "./ProfilePage.css";

const ProfilePage = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { t } = useTranslation();

    const handleColorChange = newColor => {
        localStorage.setItem(`blockColor_${user?.id}`, newColor);
    };

    const handleBackToMenu = () => {
        navigate("/menu");
    };

    return (
        <div className="profile-page">
            <div className="profile-page-container">
                <Profile onColorChange={handleColorChange} />
                <button className="back-button" onClick={handleBackToMenu}>
                    ← {t("profile.back")}
                </button>
            </div>
        </div>
    );
};

export default ProfilePage;