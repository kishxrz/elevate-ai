"use client";

import { useEffect } from "react";
import { useElevate } from "@/components/Context";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import HomeView from "@/views/HomeView";
import FeaturesView from "@/views/FeaturesView";
import SolutionsView from "@/views/SolutionsView";
import PricingView from "@/views/PricingView";
import DemoView from "@/views/DemoView";
import BlogView from "@/views/BlogView";
import ContactView from "@/views/ContactView";
import DashboardView from "@/views/DashboardView";
import LoginView from "@/views/LoginView";

export default function RootPage() {
  const { currentView, setCurrentView, user, loadingAuth } = useElevate();

  // Route protection redirect to login view
  useEffect(() => {
    if (!loadingAuth) {
      if (user && currentView === "login") {
        setCurrentView("dashboard");
      }
    }
  }, [user, loadingAuth, currentView, setCurrentView]);

  if (loadingAuth) {
    return (
      <div
        style={{
          background: "#050505",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--text-primary)",
        }}
      >
        <div style={{ textAlign: "center" }}>
          {/* Loading spinner */}
          <div
            style={{
              width: "36px",
              height: "36px",
              border: "3px solid rgba(214,178,74,0.1)",
              borderTopColor: "var(--accent-gold)",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
              margin: "0 auto 16px",
            }}
          />
          <p
            style={{
              fontSize: "0.85rem",
              color: "var(--text-muted)",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            Initializing Elevate AI OS...
          </p>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>
    );
  }

  if (currentView === "login") {
    return <LoginView />;
  }

  if (currentView === "dashboard") {
    if (!user) return <LoginView />;
    return <DashboardView />;
  }

  return (
    <>
      <Navbar />
      <main>
        {currentView === "home" && <HomeView />}
        {currentView === "features" && <FeaturesView />}
        {currentView === "solutions" && <SolutionsView />}
        {currentView === "pricing" && <PricingView />}
        {currentView === "demo" && <DemoView />}
        {currentView === "blog" && <BlogView />}
        {currentView === "contact" && <ContactView />}
      </main>
      <Footer />
    </>
  );
}
