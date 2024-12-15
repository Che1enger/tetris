import React, { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "./AuthContext";
import { useTranslation } from "react-i18next";
import emailjs from "emailjs-com";
import "./form.css";

const LoginRegistrationPage = () => {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [email, setEmail] = useState("");
    const [localError, setLocalError] = useState("");
    const [isLoginForm, setIsLoginForm] = useState(true);
    const [fieldErrors, setFieldErrors] = useState({
        username: false,
        password: false,
        confirmPassword: false,
        email: false
    });

    const { login, register, loading, error, user } = useContext(AuthContext);
    const navigate = useNavigate();
    const { t } = useTranslation();

    useEffect(() => {
        if (user) {
            navigate("/menu");
        }
    }, [user, navigate]);

    const handleSubmit = async e => {
        e.preventDefault();
        setLocalError("");
        setFieldErrors({
            username: false,
            password: false,
            confirmPassword: false,
            email: false
        });

        if (!username.trim()) {
            setLocalError(t("auth.requiredField"));
            setFieldErrors(prev => ({ ...prev, username: true }));
            return;
        }

        if (!password.trim()) {
            setLocalError(t("auth.requiredField"));
            setFieldErrors(prev => ({ ...prev, password: true }));
            return;
        }

        try {
            if (isLoginForm) {
                await login({ username, password });
            } else {
                if (!confirmPassword.trim()) {
                    setLocalError(t("auth.requiredField"));
                    setFieldErrors(prev => ({ ...prev, confirmPassword: true }));
                    return;
                }

                if (!email.trim()) {
                    setLocalError(t("auth.requiredField"));
                    setFieldErrors(prev => ({ ...prev, email: true }));
                    return;
                }

                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(email)) {
                    setLocalError(t("auth.invalidEmail"));
                    setFieldErrors(prev => ({ ...prev, email: true }));
                    return;
                }

                if (password !== confirmPassword) {
                    setLocalError(t("auth.passwordsDoNotMatch"));
                    setFieldErrors(prev => ({
                        ...prev,
                        password: true,
                        confirmPassword: true
                    }));
                    return;
                }

                await register({ username, email, password });

                try {
                    await emailjs.send(
                        "service_qj1hnja",
                        "template_wwap4eq",
                        {
                            to_email: email,
                            content: `${t("auth.registrationSuccess", { username })}`
                        },
                        "5MhyZb_CU-Keibatq"
                    );
                    console.log("Email sent successfully!");
                } catch (emailError) {
                    console.error("Error sending email:", emailError);
                }
            }
        } catch (err) {
            console.error("Error:", err);
            if (err.response?.data?.code === "auth.userExists") {
                setLocalError(t(err.response.data.code));
                setFieldErrors(prev => ({ ...prev, username: true, email: true }));
            } else {
                setLocalError(t("auth.invalidCredentials"));
                setFieldErrors(prev => ({ ...prev, username: true, password: true }));
            }
        }
    };

    const displayError = error || localError;

    if (loading) {
        return <div className="loading-screen">{t("loading")}</div>;
    }

    return (
        <div className="login-container">
            <div className="login-header">
                <button
                    className={`toggle-btn ${isLoginForm ? "active" : ""}`}
                    onClick={() => setIsLoginForm(true)}
                >
                    {t("auth.login")}
                </button>
                <button
                    className={`toggle-btn ${!isLoginForm ? "active" : ""}`}
                    onClick={() => setIsLoginForm(false)}
                >
                    {t("auth.register")}
                </button>
            </div>

            <div className={`error-message ${displayError ? "visible" : ""}`}>
                {displayError}
            </div>

            <form onSubmit={handleSubmit} className="login-form">
                <div className="form-group">
                    <label>{t("auth.username")}</label>
                    <input
                        type="text"
                        value={username}
                        onChange={e => setUsername(e.target.value)}
                        placeholder={t("auth.enterUsername")}
                        className={fieldErrors.username ? "error" : ""}
                    />
                </div>

                {!isLoginForm && (
                    <div className="form-group">
                        <label>{t("auth.email")}</label>
                        <input
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            placeholder={t("auth.enterEmail")}
                            className={fieldErrors.email ? "error" : ""}
                        />
                    </div>
                )}

                <div className="form-group">
                    <label>{t("auth.password")}</label>
                    <input
                        type="password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder={t("auth.enterPassword")}
                        className={fieldErrors.password ? "error" : ""}
                    />
                </div>

                {!isLoginForm && (
                    <div className="form-group">
                        <label>{t("auth.confirmPassword")}</label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={e => setConfirmPassword(e.target.value)}
                            placeholder={t("auth.confirmYourPassword")}
                            className={fieldErrors.confirmPassword ? "error" : ""}
                        />
                    </div>
                )}

                <button type="submit" className="submit-btn login-button">
                    {isLoginForm ? t("auth.login") : t("auth.register")}
                </button>
            </form>
        </div>
    );
};

export default LoginRegistrationPage;