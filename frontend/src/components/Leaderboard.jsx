import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import "./Leaderboard.css";

const API_URL = "http://localhost:5000";

const Leaderboard = () => {
    const [activeTab, setActiveTab] = useState("single");
    const [singlePlayerLeaderboard, setSinglePlayerLeaderboard] = useState([]);
    const [networkLeaderboard, setNetworkLeaderboard] = useState([]);
    const { t } = useTranslation();

    useEffect(() => {
        fetchLeaderboardData();
    }, []);

    const fetchLeaderboardData = async () => {
        try {
            const token = localStorage.getItem("token");
            const headers = {
                "Authorization": `Bearer ${token}`
            };

            const singleResponse = await fetch(`${API_URL}/api/leaderboard/single`, { headers });
            const singleData = await singleResponse.json();
            console.log("Single Leaderboard Raw Response:", singleData);
            setSinglePlayerLeaderboard(singleData.data || []);

            const networkResponse = await fetch(`${API_URL}/api/leaderboard/network`, { headers });
            const networkData = await networkResponse.json();
            console.log("Network Leaderboard Raw Response:", networkData);
            setNetworkLeaderboard(networkData.data || []);
        } catch (error) {
            console.error("Error fetching leaderboard data:", error);
        }
    };

    return (
        <div className="leaderboard-container">
            <div className="leaderboard-tabs">
                <button
                    className={`tab-button ${activeTab === "single" ? "active" : ""}`}
                    onClick={() => setActiveTab("single")}
                >
                    {t("leaderboard.singlePlayer")}
                </button>
                <button
                    className={`tab-button ${activeTab === "network" ? "active" : ""}`}
                    onClick={() => setActiveTab("network")}
                >
                    {t("leaderboard.networkGame")}
                </button>
            </div>

            <div className="leaderboard-content">
                {activeTab === "single" ? (
                    <div className="leaderboard-list">
                        <h3>
                            {t("leaderboard.title")} ({t("leaderboard.singlePlayer")})
                        </h3>
                        <div className="leaderboard-header">
                            <span>{t("leaderboard.player")}</span>
                            <span>{t("leaderboard.bestScore")}</span>
                        </div>
                        {singlePlayerLeaderboard.map((player, index) => (
                            <div key={index} className="leaderboard-item">
                                <span className="player-name">{player.username}</span>
                                <span className="player-score">{player.maxScore}</span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="leaderboard-list">
                        <h3>
                            {t("leaderboard.title")} ({t("leaderboard.networkGame")})
                        </h3>
                        <div className="leaderboard-header">
                            <span>{t("leaderboard.player")}</span>
                            <span>{t("leaderboard.wins")}</span>
                        </div>
                        {networkLeaderboard.map((player, index) => (
                            <div key={index} className="leaderboard-item">
                                <span className="player-name">{player.username}</span>
                                <span className="player-score">{player.wins}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Leaderboard;