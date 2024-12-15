import React, { useState, useEffect } from "react";
import { useAuth } from "../AuthContext";
import { useTranslation } from "react-i18next";
import "./MatchHistory.css";

const API_URL = "http://localhost:5000";

const MatchHistory = () => {
    const { user } = useAuth();
    const [matches, setMatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { t } = useTranslation();

    useEffect(() => {
        fetchMatchHistory();
    }, [user?.id]);

    const fetchMatchHistory = async () => {
        if (!user?.id) return;

        try {
            const token = localStorage.getItem("token");
            if (!token) {
                setError(t("errors.noToken"));
                return;
            }

            const response = await fetch(`${API_URL}/api/matches/history`, {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error(t("errors.fetchFailed"));
            }

            const data = await response.json();
            setMatches(data.matches || []);
        } catch (error) {
            console.error("Error fetching match history:", error);
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="match-history-container">
                {t("loading")}
            </div>
        );
    }

    if (error) {
        return (
            <div className="match-history-container">
                {t("errors.error")}: {error}
            </div>
        );
    }

    return (
        <div className="match-history-container">
            <h2 className="match-history-title">{t("matchHistory.title")}</h2>
            {matches.length > 0 ? (
                <div className="match-history-list-container">
                    <ul className="match-history-list">
                        {matches.map((match, index) => (
                            <li key={index} className="match-history-item">
                                <span className="opponent-name">
                                    {match.opponentName}
                                </span>
                                <span className={`match-result ${match.result.toLowerCase()}`}>
                                    {match.result === "WIN" ? "W" : "L"}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            ) : (
                <div className="no-matches">
                    {t("matchHistory.noMatches")}
                </div>
            )}
        </div>
    );
};

export default MatchHistory;