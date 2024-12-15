import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { useTranslation } from "react-i18next";
import Leaderboard from "./components/Leaderboard";
import PersonIcon from "@mui/icons-material/Person";
import "./Menu.css";

const Menu = () => {
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const { t } = useTranslation();

    const handleLogout = () => {
        logout();
        navigate("/");
    };

    return (
        <div className="menu-container">
            <div className="main">
                <div className="welcome-message">
                    <div>
                        <h1 className="menu-title">Tetris</h1>
                        {t("menu.welcome")}, <strong className="user-greeting">{user?.username}</strong>!
                    </div>
                    <button
                        onClick={() => navigate("/profile")}
                        className="menu-button profile-button"
                        id="profile"
                    >
                        <PersonIcon fontSize="medium" />
                    </button>
                </div>

                <div className="menu-buttons">
                    <button
                        onClick={() => navigate("/game/single")}
                        className="menu-button"
                    >
                        {t("menu.singlePlayer")}
                    </button>
                    <button
                        onClick={() => navigate("/game/network")}
                        className="menu-button"
                    >
                        {t("menu.networkGame")}
                    </button>
                    <button onClick={handleLogout} className="menu-button logout">
                        {t("menu.logout")}
                    </button>
                </div>

                <Leaderboard className="leaderboard" />
            </div>
        </div>
    );
};

export default Menu;