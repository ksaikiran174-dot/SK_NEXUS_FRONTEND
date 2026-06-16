import { useState, useEffect, useRef, useAuth } from "react";
import { motion } from "framer-motion";
import Login from "./pages/Login";
import Register from "./pages/Register";
import EmployeeLogin from "./pages/EmployeeLogin";
import EmployeeRegister from "./pages/EmployeeRegister";
import RoleSelection from "./pages/RoleSelection";
import { clearAllRoleData, clearManagerData, clearEmployeeData } from "./services/auth";
import SplashScreen from "./components/SplashScreen";
import SuperAdmin from "./pages/SuperAdmin";
import SuperAdminLogin from "./pages/SuperAdminLogin";
import { getPendingOrders, deleteOfflineOrder } from "./utils/db";
import { DarkModeProvider } from './context/DarkModeContext';
import PendingApproval from "./pages/pendingApproval"; 
/* ==========================================================
    DYNAMIC EXTENSION SWITCHES
========================================================== */
import BillingManager from "./modules/billing/pages/Manager";

import KitchenManager from "./modules/kitchen/pages/Manager";
import KitchenEmployee from "./modules/kitchen/pages/Employee";

import TableManager from "./modules/table_order/pages/Manager";
import TableEmployee from "./modules/table_order/pages/Employee";

// 🛠️ HELPER FUNCTION TO MAP TIER PLANS TO EXTENSION MODES DYNAMICALLY
const getModeFromPlan = (plan) => {
  if (plan === "basic") return "billing";
  if (plan === "pro") return "kitchen";
  if (plan === "enterprise") return "table";
  return "billing"; 
};

// 🎯 DASHBOARD ANIMATION COMPONENT - PERFECTED 5-SECOND STEADY ENGINE
function DashboardAnimation({ role, onAnimationComplete }) {
  const [messageIndex, setMessageIndex] = useState(0);
  const audioRef = useRef(null);

  const currentPlan = localStorage.getItem("plan") || "basic";
  const dynamicMode = getModeFromPlan(currentPlan);

  const roleConfig = {
    manager: {
      icon: "👔",
      title: "Welcome Manager",
      color: "#2563eb",
      avatar: "https://cdn-icons-png.flaticon.com/512/4140/4140048.png",
      messages: [
        "🔐 Verifying secure access...",
        "📊 Loading business analytics...",
        dynamicMode === "billing" ? "💵 Fetching register shift history..." : "👥 Syncing employee activity...",
        "💰 Preparing today's sales data...",
        "✅ System ready for management",
      ],
    },
    employee: {
      icon: dynamicMode === "billing" ? "💳" : dynamicMode === "table" ? "📱" : "👨‍🍳",
      title: dynamicMode === "billing" ? "Welcome Cashier" : dynamicMode === "table" ? "Welcome Employee" : "Welcome Chef",
      color: "#10b981",
      avatar: "https://cdn-icons-png.flaticon.com/512/168/168882.png",
      messages: [
        "🔐 Authenticating your credentials...",
        dynamicMode === "billing" 
          ? "💵 Opening checkout terminal registry..." 
          : dynamicMode === "table" 
          ? "📍 Loading live dining table layout..." 
          : "🍽️ Loading kitchen dispatch orders...",
        "📋 Preparing operations layout queue...",
        "👥 Syncing team updates...",
        dynamicMode === "billing" ? "✅ Terminal ready for transactions!" : "✅ App ready to operate!",
      ],
    },
    super_admin: {
      title: "Super Admin Panel",
      subtitle: "Loading platform controls...",
      color: "#4f46e5",
      avatar: "https://cdn-icons-png.flaticon.com/512/2206/2206368.png",
      messages: [
        "🔐 Verifying administrative access...",
        "🏢 Fetching registered global branches...",
        "💳 Synchronizing client subscription states...",
        "⚙️ Initializing platform control panels...",
        "✅ Super Admin controls established!"
      ]
    }
  };

  const config = roleConfig[role];

  useEffect(() => {
    // ⏱️ 5 Ticks * 950ms = 4750ms total sequence time
    if (messageIndex < config.messages.length - 1) {
      const timer = setTimeout(() => {
        setMessageIndex((prev) => prev + 1);
      }, 3000); 
      return () => clearTimeout(timer);
    } else {
      // 🎉 Hold on final success state for 250ms to seamlessly hit exactly 5.0 seconds
      const transitionTimer = setTimeout(() => {
        if (onAnimationComplete) onAnimationComplete();
      }, 3000);
      return () => clearTimeout(transitionTimer);
    }
  }, [messageIndex, config.messages.length, onAnimationComplete]);

  useEffect(() => {
    const introAudio = new Audio("/sounds/intro.wav");
    introAudio.volume = 0.5;
    audioRef.current = introAudio;

    const playPromise = introAudio.play();
    if (playPromise !== undefined) {
      playPromise.catch((error) => {
        console.log("Audio handled safely:", error.message);
      });
    }

    return () => {
      if (audioRef.current) {
        playPromise.then(() => {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
        }).catch(() => {});
      }
    };
  }, []);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        background: `linear-gradient(135deg, ${config.color}20 0%, ${config.color}10 100%)`,
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif",
        padding: "20px 16px",
        boxSizing: "border-box"
      }}
    >
      <style>{`
        .dash-avatar-outer { width: 140px; height: 140px; }
        .dash-avatar-img { width: 140px; height: 140px; border-width: 5px; }
        .dash-title { font-size: 32px; margin-bottom: 40px; }
        .dash-msg-container { gap: 12px; margin-bottom: 40px; }
        .dash-msg-card { padding: 12px 16px; font-size: 14px; }
        .dash-launching-text { font-size: 24px; }

        @media (max-width: 430px) {
          .dash-avatar-outer { width: 100px; height: 100px; margin-bottom: 20px; }
          .dash-avatar-img { width: 100px; height: 100px; border-width: 4px; }
          .dash-title { font-size: 22px; margin-bottom: 24px; letter-spacing: -0.5px; }
          .dash-msg-container { gap: 8px; margin-bottom: 24px; }
          .dash-msg-card { padding: 10px 12px; font-size: 13px; border-width: 1px !important; }
          .dash-launching-text { font-size: 18px; }
        }
      `}</style>

      <div style={{ position: "relative", marginBottom: "30px" }} className="dash-avatar-outer">
        <motion.div
          animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.7, 0.4] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          style={{
            position: "absolute",
            inset: "-20px",
            borderRadius: "50%",
            background: `radial-gradient(circle, ${config.color}55 0%, transparent 70%)`,
            filter: "blur(25px)"
          }}
        />
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
          style={{
            position: "absolute",
            inset: "-10px",
            borderRadius: "50%",
            border: `3px dashed ${config.color}`,
            opacity: 0.5,
          }}
        />
        <img
          src={config.avatar}
          alt={config.title}
          className="dash-avatar-img"
          style={{
            borderRadius: "50%",
            objectFit: "cover",
            borderStyle: "solid",
            borderColor: config.color,
            background: "white",
            boxShadow: `0 0 40px ${config.color}55`,
            position: "relative",
            zIndex: 2
          }}
        />
      </div>

      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="dash-title"
        style={{
          fontWeight: "700",
          color: "#1e293b",
          textAlign: "center",
        }}
      >
        {config.title}
      </motion.h1>

      <div
        className="dash-msg-container"
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          maxWidth: "400px",
          padding: "0",
          boxSizing: "border-box"
        }}
      >
        {config.messages.map((msg, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -20 }}
            animate={index <= messageIndex ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
            transition={{ duration: 0.4 }}
            className="dash-msg-card"
            style={{
              background: index < messageIndex ? "#e0f2fe" : "#f1f5f9",
              border: `2px solid ${index < messageIndex ? config.color : "#cbd5e1"}`,
              borderRadius: "8px",
              fontWeight: "500",
              color: index < messageIndex ? config.color : "#64748b",
            }}
          >
            {index < messageIndex && "✓ "}{msg}
          </motion.div>
        ))}
      </div>

      {messageIndex === config.messages.length - 1 && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.4, type: "spring", stiffness: 100 }}
          className="dash-launching-text"
          style={{ fontWeight: "600", color: config.color }}
        >
          🎉 Launching Dashboard...
        </motion.div>
      )}
    </div>
  );
}


/* ===================================
    APP CORE
=================================== */
function App() {
  const [authState, setAuthState] = useState("loading");
  const [role, setRole] = useState(null);
  const [plan, setPlan] = useState("basic");
  const [isConnected, setIsConnected] = useState(false);
  
  const [restaurantStatus, setRestaurantStatus] = useState(() => {
    return localStorage.getItem("restaurantStatus") || "approved"; 
  });

  const [showSplash, setShowSplash] = useState(() => {
    const hasRole = localStorage.getItem("role"); 
    return !hasRole; 
  });

  /* ==========================================================
     🎯 PERFORMANCE TUNER: RENDER REALS HIDDEN IN BACKGROUND TO FETCH DATA
  ========================================================== */
  const [forcePreloadDashboards, setForcePreloadDashboards] = useState(false);

  const clearManagerData = () => { 
    localStorage.removeItem("managerAccessToken");
    localStorage.removeItem("managerRefreshToken");
    localStorage.removeItem("restaurantStatus");
  };

  const clearEmployeeData = () => {
    localStorage.removeItem("employeeAccessToken");
    localStorage.removeItem("employeeRefreshToken");
  };

  const clearSuperAdminData = () => {
    localStorage.removeItem("superAdminAccessToken");
    localStorage.removeItem("superAdminRefreshToken");
  };

  const clearAllRoleData = () => {
    clearManagerData();
    clearEmployeeData();
    clearSuperAdminData();
    localStorage.removeItem("role");
    localStorage.removeItem("plan"); 
  };

  /* =========================
      OFFLINE SYNC WORKER LOOP
  ========================= */
  useEffect(() => {
    const handleGlobalOrderSync = async () => {
      if (!navigator.onLine) return;

      const queuedOrders = await getPendingOrders();
      if (queuedOrders.length === 0) return;

      console.log(`🔄 Network restored! Found ${queuedOrders.length} offline orders...`);

      for (const order of queuedOrders) {
        try {
          const token = localStorage.getItem("managerAccessToken") || localStorage.getItem("employeeAccessToken");
          
          if (!token) break;

          const { localId, syncStatus, retryCount, ...cleanBackendPayload } = order;

          const response = await fetch(`${import.meta.env.VITE_API_URL}/orders`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(cleanBackendPayload)
          });

          if (response.ok) {
            await deleteOfflineOrder(order.localId);
            if (typeof fetchTransactions === "function") fetchTransactions();
          }
        } catch (syncError) {
          console.error(`❌ Sync failed`, syncError);
          break;
        }
      }
    };

    window.addEventListener('online', handleGlobalOrderSync);
    if (navigator.onLine) handleGlobalOrderSync();
    return () => window.removeEventListener('online', handleGlobalOrderSync);
  }, [authState]);


  /* ===================================
      INITIAL APP MOUNT AUTH CHECKER
  =================================== */
  useEffect(() => {
    if (authState !== "loading") return;

    const savedRole = localStorage.getItem("role");
    
    if (!savedRole) {
      setAuthState("role-selection");
      return;
    }

    let token = null;
    if (savedRole === "manager") token = localStorage.getItem("managerAccessToken");
    else if (savedRole === "employee") token = localStorage.getItem("employeeAccessToken");
    else if (savedRole === "super_admin") token = localStorage.getItem("superAdminAccessToken");

    if (!token) {
      setRole(savedRole);
      if (savedRole === "employee") setAuthState("employee-login");
      else if (savedRole === "super_admin") setAuthState("super-admin-login");
      else setAuthState("login");
      return;
    }

    setRole(savedRole);
    
    const savedPlan = localStorage.getItem("plan") || "basic";
    setPlan(savedPlan);

    const savedStatus = localStorage.getItem("restaurantStatus") || "approved";
    setRestaurantStatus(savedStatus);
    
    // 🚀 If auto-logging in, bypass animation screens to go direct
    setAuthState("authenticated"); 
    console.log("🎯 Auto-authenticated active session successfully!");
  }, []); 


  /* =========================
      APP.JSX WEBSOCKET
  ========================= */
  useEffect(() => {
    const token = localStorage.getItem("managerAccessToken") || localStorage.getItem("employeeAccessToken");
    const savedRole = localStorage.getItem("role");

    if (!token || !savedRole || (savedRole === "manager" && restaurantStatus === "pending")) return;

    let socket = null;
    let reconnectTimer = null;
    let isComponentMounted = true;

    const connectWebSocket = () => {
      if (!isComponentMounted) return;

      console.log("Attempting App WebSocket connection...");
      
      const wsUrl = `wss://sknexus-production.up.railway.app/ws/${savedRole}?token=${token}`;
      socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        if (!isComponentMounted) return;
        console.log("Connected ✅");
        setIsConnected(true);
      };

      socket.onmessage = (event) => {
        if (!isComponentMounted) return;
        try {
          const msg = JSON.parse(event.data);
          console.log("WS Message:", msg);
        } catch (e) {
          console.error("Error parsing WS message", e);
        }
      };

      socket.onerror = (err) => {
        if (!isComponentMounted) return;
        console.log("Socket encountered an error connecting.");
      };

      socket.onclose = (event) => {
        if (!isComponentMounted) return;

        console.log("Disconnected ❌");
        setIsConnected(false);

        reconnectTimer = setTimeout(() => {
          if (isComponentMounted) {
            console.log("Reconnecting App Socket...");
            connectWebSocket();
          }
        }, 5000); 
      };
    };

    connectWebSocket();

    return () => {
      isComponentMounted = false;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (socket) {
        if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
          socket.close();
        }
      }
    };
  }, [restaurantStatus]); 


  /* =========================
      AUTHENTICATION ANIMATION MONITOR
  ========================= */
  useEffect(() => {
    if (authState === "authenticating") {
      // 🚀 THE MAGIC: The instant we enter the animation state, turn on the background preloader flag!
      setForcePreloadDashboards(true);

      if (role === "manager" && restaurantStatus === "pending") {
        setAuthState("authenticated");
        return;
      }

      // If websocket connects instantly, we can unlock early
      if (isConnected) {
        setAuthState("authenticated");
        return;
      }
    }
  }, [authState, isConnected, role, restaurantStatus]);

  const activeSessionToken = 
    localStorage.getItem("managerAccessToken") || 
    localStorage.getItem("employeeAccessToken") || 
    localStorage.getItem("superAdminAccessToken");

  const currentUserProfile = (authState === "authenticated" || forcePreloadDashboards) && role && activeSessionToken
    ? { id: activeSessionToken.slice(-15), plan: plan }
    : null;

  if (showSplash) return <SplashScreen onFinish={() => setShowSplash(false)} />;

  if (authState === "loading") {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "linear-gradient(135deg, #2563eb 0%, #1e40af 100%)", color: "white" }}>
        Loading...
      </div>
    );
  }

  // Helper template renderer to keep code clean
  const getSubDashboardComponent = () => {
    if (role === "super_admin") return <SuperAdmin />;
    
    if (role === "manager" && restaurantStatus === "pending") {
      return (
        <PendingApproval 
          restaurantData={{ payment_reference: localStorage.getItem("managerUTR") }} 
          onLogout={() => {
            clearAllRoleData();
            setRole(null);
            setAuthState("role-selection");
          }}
        />
      );
    }

    const mode = getModeFromPlan(plan); 
    switch (mode) {
      case "billing":
        return role === "manager" ? <BillingManager /> : (
          <div style={{ padding: "20px", textAlign: "center", color: "#ef4444", fontWeight: "bold" }}>
            Error: Billing mode does not have an employee dashboard. Please login as a manager.
          </div>
        );
      case "kitchen":
        return role === "manager" ? <KitchenManager /> : <KitchenEmployee />;
      case "table":
        return role === "manager" ? <TableManager /> : <TableEmployee />;
      default:
        return <div style={{ padding: "20px", textAlign: "center" }}>Unknown subscription extension configuration.</div>;
    }
  };

  // 🎯 MAIN ROUTING FUNCTION FOR APP COMPONENT RENDERING
  const renderAppView = () => {
    if (authState === "role-selection") {
      const handleRoleSelect = (selectedRole) => {
        if (selectedRole === "manager") clearEmployeeData();
        else clearManagerData();

        setRole(selectedRole);
        localStorage.setItem("role", selectedRole);

        if (selectedRole === "employee") setAuthState("employee-login");
        else if (selectedRole === "super_admin") setAuthState("super-admin-login");
        else setAuthState("login");
      };
      return <RoleSelection onSelectRole={handleRoleSelect} />;
    }

    if (authState === "employee-login") {
      return (
        <EmployeeLogin
          onLoginSuccess={(data) => {
            localStorage.setItem("role", "employee");
            if (data?.accessToken) localStorage.setItem("employeeAccessToken", data.accessToken);
            if (data?.refreshToken) localStorage.setItem("employeeRefreshToken", data.refreshToken);

            setRole("employee");
            const targetPlan = data?.plan || "basic";
            setPlan(targetPlan);
            localStorage.setItem("plan", targetPlan);
            setAuthState("authenticating");
          }}
          onRegisterClick={() => setAuthState("employee-register")}
          onBackClick={() => {
            clearEmployeeData();
            localStorage.removeItem("role");
            setRole(null);
            setAuthState("role-selection");
          }}
        />
      );
    }

    if (authState === "employee-register") {
      return (
        <EmployeeRegister
          onRegisterSuccess={(data) => {
            localStorage.setItem("role", "employee");
            if (data?.accessToken) localStorage.setItem("employeeAccessToken", data.accessToken);
            setRole("employee");
            setAuthState("authenticating");
          }}
          onLoginClick={() => setAuthState("employee-login")}
          onBackClick={() => setAuthState("employee-login")}
        />
      );
    }

    if (authState === "super-admin-login") {
      return (
        <SuperAdminLogin
          onLoginSuccess={(data) => {
            localStorage.setItem("role", "super_admin");
            if (data?.accessToken) localStorage.setItem("superAdminAccessToken", data.accessToken);
            setRole("super_admin");
            setAuthState("authenticating");
          }}
          onBackClick={() => {
            localStorage.removeItem("superAdminAccessToken");
            localStorage.removeItem("role");
            setRole(null);
            setAuthState("role-selection");
          }}
        />
      );
    }

    if (authState === "login") {
      return (
        <Login
          onLoginSuccess={(data) => {
            localStorage.setItem("role", "manager");
            if (data?.accessToken) localStorage.setItem("managerAccessToken", data.accessToken);
            if (data?.refreshToken) localStorage.setItem("managerRefreshToken", data.refreshToken);

            const status = data?.restaurant_status || "approved"; 
            setRestaurantStatus(status);
            localStorage.setItem("restaurantStatus", status);

            setRole("manager");
            const targetPlan = data?.plan || "basic";
            setPlan(targetPlan);
            localStorage.setItem("plan", targetPlan); 
            setAuthState("authenticating");
          }}
          onRegisterClick={() => setAuthState("register")}
          onBackClick={() => {
            localStorage.removeItem("superAdminAccessToken");
            localStorage.removeItem("role");
            setRole(null);
            setAuthState("role-selection");
          }}
        />
      );
    }

    if (authState === "register") {
      return (
        <Register
          onRegisterSuccess={(data) => {
            localStorage.setItem("role", "manager");
            if (data?.accessToken) localStorage.setItem("managerAccessToken", data.accessToken);

            const status = data?.restaurant_status || "pending";
            setRestaurantStatus(status);
            localStorage.setItem("restaurantStatus", status);

            setRole("manager");
            setAuthState("authenticating");
          }}
          onLoginClick={() => setAuthState("login")}
          onBackClick={() => setAuthState("login")}
        />
      );
    }

    /* ==============================================================================
        🎯 BOTH STATES PARALLELED (AUTHENTICATING & AUTHENTICATED)
    ============================================================================== */
    if (authState === "authenticating" && role) {
      return (
        <>
          {/* 1. Visible entry ticker sequence animation interface */}
          <DashboardAnimation role={role} onAnimationComplete={() => setAuthState("authenticated")} />
          
          {/* 2. Background DOM Injection Mount: Completely invisible, but executes its useEffect hooks instantly! */}
          <div style={{ display: "none", visibility: "hidden" }} aria-hidden="true">
            {getSubDashboardComponent()}
          </div>
        </>
      );
    }

    if (authState === "authenticated" && role) {
      return getSubDashboardComponent();
    }

    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "linear-gradient(135deg, #2563eb 0%, #1e40af 100%)", fontSize: "18px", fontWeight: "600", color: "white" }}>
        Resolving application interface context...
      </div>
    );
  };

  return (
    <DarkModeProvider currentUser={currentUserProfile}>
      {renderAppView()}
    </DarkModeProvider>
  );
}

export default App;