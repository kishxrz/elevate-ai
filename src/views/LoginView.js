"use client";

import React, { useState } from "react";
import { useElevate } from "@/components/Context";
import { Sparkles, ArrowLeft, Lock, Mail, User, Eye, EyeOff } from "lucide-react";

export default function LoginView() {
  const { 
    signInWithGoogle, 
    signInWithGithub, 
    signUpWithEmail, 
    signInWithEmail, 
    resetPassword, 
    setCurrentView,
    navigateTo
  } = useElevate();

  // Active tab: "signin" or "signup" or "forgot"
  const [activeTab, setActiveTab] = useState("signin");

  // Input states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // UI state managers
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Sign In submit handler
  const handleSignIn = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg("Please fill out all fields.");
      return;
    }

    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      await signInWithEmail(email, password);
      // Automatically route to Dashboard on successful login
      setCurrentView("dashboard");
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || "Failed to sign in. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  // Sign Up submit handler
  const handleSignUp = async (e) => {
    e.preventDefault();
    if (!fullName || !email || !password || !confirmPassword) {
      setErrorMsg("Please fill out all fields.");
      return;
    }

    if (password.length < 6) {
      setErrorMsg("Password must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      await signUpWithEmail(email, password, fullName);
      setSuccessMsg("Account created. Please verify your email.");
      // Do not enter dashboard until email is verified, clear inputs
      setEmail("");
      setPassword("");
      setFullName("");
      setConfirmPassword("");
      setActiveTab("signin"); // Move user to sign in tab
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || "Failed to create account.");
    } finally {
      setLoading(false);
    }
  };

  // Forgot password submit handler
  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!email) {
      setErrorMsg("Please enter your email address.");
      return;
    }

    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      await resetPassword(email);
      setSuccessMsg("Password reset email sent. Please check your inbox.");
      setEmail("");
      setActiveTab("signin");
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || "Failed to send reset link.");
    } finally {
      setLoading(false);
    }
  };

  // Google Login redirect
  const handleGoogleLogin = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      await signInWithGoogle();
      // Supabase OAuth signIn redirects the browser automatically, 
      // but on returning, page.js will auto-route to dashboard.
    } catch (err) {
      setErrorMsg(err.message || "Failed to launch Google Login.");
      setLoading(false);
    }
  };

  // GitHub Login redirect
  const handleGithubLogin = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      await signInWithGithub();
      // Redirects browser.
    } catch (err) {
      setErrorMsg(err.message || "Failed to launch GitHub Login.");
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        background: "#050505",
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--text-primary)",
        position: "relative",
        overflow: "hidden",
        fontFamily: "var(--font-sans, inherit)",
        padding: "20px",
      }}
    >
      {/* Background glow effects */}
      <div
        style={{
          position: "absolute",
          top: "10%",
          left: "20%",
          width: "400px",
          height: "400px",
          background: "radial-gradient(circle, rgba(214, 178, 74, 0.05) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "10%",
          right: "20%",
          width: "450px",
          height: "450px",
          background: "radial-gradient(circle, rgba(14, 138, 109, 0.03) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      <div
        className="premium-card gold-glow"
        style={{
          width: "100%",
          maxWidth: "460px",
          padding: "40px",
          borderRadius: "24px",
          position: "relative",
          zIndex: 10,
        }}
      >
        {/* Brand Logo Header */}
        <div style={{ marginBottom: "28px", textAlign: "center" }}>
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "50%",
              background: "rgba(214, 178, 74, 0.1)",
              border: "1px solid rgba(214, 178, 74, 0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 12px",
            }}
          >
            <Sparkles size={18} style={{ color: "var(--accent-gold)" }} />
          </div>
          <h2
            className="serif-display"
            style={{
              fontSize: "1.6rem",
              fontWeight: "400",
              letterSpacing: "0.02em",
              marginBottom: "6px",
            }}
          >
            ELEVATE <span style={{ color: "var(--accent-gold)", fontStyle: "italic" }}>AI</span>
          </h2>
          <p
            style={{
              fontSize: "0.78rem",
              color: "var(--text-muted)",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              margin: 0,
            }}
          >
            Enterprise Growth OS
          </p>
        </div>

        {/* Tab Headers */}
        {activeTab !== "forgot" && (
          <div
            style={{
              display: "flex",
              borderBottom: "1px solid var(--border-color)",
              marginBottom: "28px",
            }}
          >
            <button
              onClick={() => {
                setActiveTab("signin");
                setErrorMsg("");
                setSuccessMsg("");
              }}
              style={{
                flex: 1,
                background: "none",
                border: "none",
                color: activeTab === "signin" ? "var(--accent-gold)" : "var(--text-muted)",
                fontSize: "0.9rem",
                fontWeight: activeTab === "signin" ? "600" : "500",
                padding: "12px",
                cursor: "pointer",
                borderBottom: activeTab === "signin" ? "2px solid var(--accent-gold)" : "2px solid transparent",
                transition: "all 0.2s ease",
              }}
            >
              Sign In
            </button>
            <button
              onClick={() => {
                setActiveTab("signup");
                setErrorMsg("");
                setSuccessMsg("");
              }}
              style={{
                flex: 1,
                background: "none",
                border: "none",
                color: activeTab === "signup" ? "var(--accent-gold)" : "var(--text-muted)",
                fontSize: "0.9rem",
                fontWeight: activeTab === "signup" ? "600" : "500",
                padding: "12px",
                cursor: "pointer",
                borderBottom: activeTab === "signup" ? "2px solid var(--accent-gold)" : "2px solid transparent",
                transition: "all 0.2s ease",
              }}
            >
              Sign Up
            </button>
          </div>
        )}

        {/* Alert Notifications */}
        {errorMsg && (
          <div
            style={{
              background: "rgba(220, 38, 38, 0.08)",
              border: "1px solid rgba(220, 38, 38, 0.3)",
              padding: "12px 16px",
              borderRadius: "10px",
              marginBottom: "24px",
              fontSize: "0.82rem",
              color: "#ff8b8b",
              lineHeight: "1.4",
              textAlign: "left",
            }}
          >
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div
            style={{
              background: "rgba(14, 138, 109, 0.08)",
              border: "1px solid rgba(14, 138, 109, 0.3)",
              padding: "12px 16px",
              borderRadius: "10px",
              marginBottom: "24px",
              fontSize: "0.82rem",
              color: "var(--accent-emerald)",
              lineHeight: "1.4",
              textAlign: "left",
            }}
          >
            {successMsg}
          </div>
        )}

        {/* FORMS CONTAINER */}
        <div style={{ position: "relative" }}>
          {loading && (
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: "rgba(5, 5, 5, 0.6)",
                zIndex: 100,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "12px",
              }}
            >
              <div
                style={{
                  width: "24px",
                  height: "24px",
                  border: "2px solid rgba(214,178,74,0.1)",
                  borderTopColor: "var(--accent-gold)",
                  borderRadius: "50%",
                  animation: "spin 0.8s linear infinite",
                }}
              />
            </div>
          )}

          {/* TAB 1: SIGN IN */}
          {activeTab === "signin" && (
            <form onSubmit={handleSignIn}>
              <div className="form-group" style={{ marginBottom: "16px", textAlign: "left" }}>
                <label className="form-label" style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>Email Address</label>
                <div style={{ position: "relative" }}>
                  <Mail size={14} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                  <input
                    type="email"
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="form-input"
                    style={{ paddingLeft: "36px" }}
                    disabled={loading}
                    required
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: "20px", textAlign: "left" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <label className="form-label" style={{ fontSize: "0.78rem", color: "var(--text-secondary)", margin: 0 }}>Password</label>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("forgot");
                      setErrorMsg("");
                      setSuccessMsg("");
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--accent-gold)",
                      fontSize: "0.75rem",
                      cursor: "pointer",
                      padding: 0,
                    }}
                  >
                    Forgot Password?
                  </button>
                </div>
                <div style={{ position: "relative" }}>
                  <Lock size={14} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="form-input"
                    style={{ paddingLeft: "36px", paddingRight: "36px" }}
                    disabled={loading}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: "absolute",
                      right: "12px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      color: "var(--text-muted)",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      padding: 0,
                    }}
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-gold"
                style={{ width: "100%", padding: "12px", fontSize: "0.9rem", fontWeight: "600", marginBottom: "24px" }}
                disabled={loading}
              >
                Sign In to Platform
              </button>
            </form>
          )}

          {/* TAB 2: SIGN UP */}
          {activeTab === "signup" && (
            <form onSubmit={handleSignUp}>
              <div className="form-group" style={{ marginBottom: "16px", textAlign: "left" }}>
                <label className="form-label" style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>Full Name</label>
                <div style={{ position: "relative" }}>
                  <User size={14} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                  <input
                    type="text"
                    placeholder="Enter full name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="form-input"
                    style={{ paddingLeft: "36px" }}
                    disabled={loading}
                    required
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: "16px", textAlign: "left" }}>
                <label className="form-label" style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>Email Address</label>
                <div style={{ position: "relative" }}>
                  <Mail size={14} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                  <input
                    type="email"
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="form-input"
                    style={{ paddingLeft: "36px" }}
                    disabled={loading}
                    required
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: "16px", textAlign: "left" }}>
                <label className="form-label" style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>Password</label>
                <div style={{ position: "relative" }}>
                  <Lock size={14} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Min 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="form-input"
                    style={{ paddingLeft: "36px", paddingRight: "36px" }}
                    disabled={loading}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: "absolute",
                      right: "12px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      color: "var(--text-muted)",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      padding: 0,
                    }}
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: "20px", textAlign: "left" }}>
                <label className="form-label" style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>Confirm Password</label>
                <div style={{ position: "relative" }}>
                  <Lock size={14} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                  <input
                    type="password"
                    placeholder="Re-enter password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="form-input"
                    style={{ paddingLeft: "36px" }}
                    disabled={loading}
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-gold"
                style={{ width: "100%", padding: "12px", fontSize: "0.9rem", fontWeight: "600", marginBottom: "24px" }}
                disabled={loading}
              >
                Create Growth Account
              </button>
            </form>
          )}

          {/* TAB 3: FORGOT PASSWORD */}
          {activeTab === "forgot" && (
            <form onSubmit={handleForgotPassword}>
              <div style={{ textAlign: "left", marginBottom: "24px" }}>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("signin");
                    setErrorMsg("");
                    setSuccessMsg("");
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--text-muted)",
                    fontSize: "0.8rem",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: 0,
                    marginBottom: "16px",
                  }}
                >
                  <ArrowLeft size={12} />
                  <span>Back to Sign In</span>
                </button>
                <h3 className="serif-display" style={{ fontSize: "1.2rem", marginBottom: "8px" }}>Reset Password</h3>
                <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", lineHeight: "1.4", margin: 0 }}>
                  Enter your email address below, and we will dispatch a secure recovery link.
                </p>
              </div>

              <div className="form-group" style={{ marginBottom: "24px", textAlign: "left" }}>
                <label className="form-label" style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>Email Address</label>
                <div style={{ position: "relative" }}>
                  <Mail size={14} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                  <input
                    type="email"
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="form-input"
                    style={{ paddingLeft: "36px" }}
                    disabled={loading}
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-gold"
                style={{ width: "100%", padding: "12px", fontSize: "0.9rem", fontWeight: "600", marginBottom: "16px" }}
                disabled={loading}
              >
                Send Recovery Link
              </button>
            </form>
          )}
        </div>

        {/* Separator */}
        {activeTab !== "forgot" && (
          <div style={{ display: "flex", alignItems: "center", margin: "0 0 24px" }}>
            <div style={{ flex: 1, height: "1px", background: "rgba(255, 255, 255, 0.08)" }} />
            <span style={{ padding: "0 12px", fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Or Authenticate Via</span>
            <div style={{ flex: 1, height: "1px", background: "rgba(255, 255, 255, 0.08)" }} />
          </div>
        )}

        {/* OAuth Buttons */}
        {activeTab !== "forgot" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "24px" }}>
            <button
              onClick={handleGoogleLogin}
              className="btn btn-secondary"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "12px",
                padding: "10px 24px",
                fontSize: "0.85rem",
                fontWeight: "500",
                width: "100%",
                background: "rgba(255, 255, 255, 0.02)",
                border: "1px solid var(--border-color)",
                color: "var(--text-primary)",
                cursor: "pointer",
              }}
              disabled={loading}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
              </svg>
              <span>Continue with Google</span>
            </button>

            <button
              onClick={handleGithubLogin}
              className="btn btn-secondary"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "12px",
                padding: "10px 24px",
                fontSize: "0.85rem",
                fontWeight: "500",
                width: "100%",
                background: "rgba(255, 255, 255, 0.02)",
                border: "1px solid var(--border-color)",
                color: "var(--text-primary)",
                cursor: "pointer",
              }}
              disabled={loading}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.137 20.162 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
              </svg>
              <span>Continue with GitHub</span>
            </button>
          </div>
        )}

        {/* Footer Back action */}
        <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "20px" }}>
          <button
            onClick={() => navigateTo("home")}
            style={{
              background: "none",
              border: "none",
              color: "var(--text-muted)",
              fontSize: "0.8rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              margin: "0 auto",
              padding: "4px 8px",
            }}
            disabled={loading}
          >
            <ArrowLeft size={14} />
            <span>Back to Homepage</span>
          </button>
        </div>
      </div>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
