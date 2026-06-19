import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import "./Login.css";

function EmployeeLogin({ onLoginSuccess, onRegisterClick, onBackClick }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // 🎯 Hook up the preserved session email on configuration mount
  useEffect(() => {
    const savedEmail = localStorage.getItem("rememberedEmail");
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    // Basic validation
    if (!email || !password) {
      setError("Please fill in all fields");
      setLoading(false);
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
          role: "employee", // 🎯 Keeps it locked to employee role
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSuccess("✓ Login successful! Redirecting...");

        // 🧼 Target clear only conflicting data tokens instead of hitting .clear()
        localStorage.removeItem("managerAccessToken");
        localStorage.removeItem("managerRefreshToken");
        localStorage.removeItem("employeeAccessToken");
        localStorage.removeItem("employeeRefreshToken");

        // 🎯 Safely resolve plan or any specific metadata flags if your system sends them
        const userPlan = data.user?.plan || data.plan || "basic";
        
        if (data.access_token) {
          // 🔥 Mirrored storage logic using employee target identifiers
          localStorage.setItem("employeeAccessToken", data.access_token);
          localStorage.setItem("employeeRefreshToken", data.refresh_token);
          localStorage.setItem("role", "employee");
          localStorage.setItem("plan", userPlan);
        }

        if (rememberMe) {
          localStorage.setItem("rememberedEmail", email);
        } else {
          localStorage.removeItem("rememberedEmail");
        }

        // ✅ Single, clean execution wrapper passing elements up to your App.jsx layout
        setTimeout(() => {
          onLoginSuccess({ 
            role: "employee",
            plan: userPlan
          });
        }, 1000);

      } else {
        const errorData = await response.json();
        setError(errorData.detail || errorData.message || "Invalid email or password");
      }
    } catch (err) {
      setError("Connection error. Please try again.");
      console.error("Login error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container employee-auth">
      <motion.div
        className="auth-wrapper"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        {/* Left Side - Visual Section */}
        <motion.div
          className="auth-visual"
          initial={{ x: -50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <div className="visual-content">
            <div className="visual-icon chef-icon">
              <svg viewBox="0 0 200 260" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Chef Hat */}
                <rect x="65" y="10" width="70" height="20" rx="2" fill="#ffffff" />
                <path d="M65 30 Q65 42 100 48 Q135 42 135 30" fill="#ffffff" stroke="#ddd" strokeWidth="0.5" />
                {/* Hat band */}
                <rect x="60" y="28" width="80" height="4" fill="#c41e3a" />
                {/* Hair */}
                <path d="M75 48 Q75 35 100 33 Q125 35 125 48" fill="#8b4513" />
                {/* Head */}
                <circle cx="100" cy="70" r="28" fill="#f4c4a0" />
                {/* Eyes - anime style */}
                <ellipse cx="86" cy="65" rx="6" ry="9" fill="#6eb5d4" />
                <ellipse cx="114" cy="65" rx="6" ry="9" fill="#6eb5d4" />
                <circle cx="86" cy="68" r="2.5" fill="#2c1810" />
                <circle cx="114" cy="68" r="2.5" fill="#2c1810" />
                <circle cx="87" cy="66" r="1" fill="white" />
                <circle cx="115" cy="66" r="1" fill="white" />
                {/* Eyebrows */}
                <path d="M78 55 Q86 52 92 55" stroke="#2c1810" strokeWidth="2" strokeLinecap="round" />
                <path d="M108 55 Q114 52 122 55" stroke="#2c1810" strokeWidth="2" strokeLinecap="round" />
                {/* Nose */}
                <line x1="100" y1="68" x2="100" y2="80" stroke="#d4a574" strokeWidth="1.5" />
                {/* Mouth - happy smile */}
                <path d="M90 85 Q100 92 110 85" stroke="#d4666a" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                {/* Neck */}
                <rect x="92" y="96" width="16" height="10" fill="#f4c4a0" />
                {/* Chef Coat */}
                <path d="M55 106 L55 220 Q55 235 70 240 L130 240 Q145 235 145 220 L145 106 Z" fill="#ffffff" stroke="#ddd" strokeWidth="0.5" />
                {/* Chef Coat buttons */}
                <circle cx="75" cy="135" r="3" fill="#c41e3a" />
                <circle cx="75" cy="165" r="3" fill="#c41e3a" />
                <circle cx="75" cy="195" r="3" fill="#c41e3a" />
                <circle cx="125" cy="135" r="3" fill="#c41e3a" />
                <circle cx="125" cy="165" r="3" fill="#c41e3a" />
                <circle cx="125" cy="195" r="3" fill="#c41e3a" />
                {/* Apron straps */}
                <line x1="85" y1="106" x2="80" y2="220" stroke="#8b4513" strokeWidth="3" />
                <line x1="115" y1="106" x2="120" y2="220" stroke="#8b4513" strokeWidth="3" />
                {/* Arms */}
                <path d="M58 130 L25 160" stroke="#f4c4a0" strokeWidth="13" strokeLinecap="round" />
                <path d="M142 130 L175 160" stroke="#f4c4a0" strokeWidth="13" strokeLinecap="round" />
                {/* Hands holding spoon/utensil */}
                <circle cx="22" cy="163" r="7" fill="#f4c4a0" />
                <circle cx="178" cy="163" r="7" fill="#f4c4a0" />
              </svg>
            </div>
            <h2 className="visual-title">Kitchen Staff</h2>
          </div>
        </motion.div>

        {/* Right Side - Form Section */}
        <motion.div
          className="auth-form-container"
          initial={{ x: 50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className="auth-form-inner">
            <div className="form-header">
              <h1 className="form-title">Employee Login</h1>
              <p className="form-subtitle">Sign in to access kitchen dashboard</p>
            </div>

            {error && (
              <motion.div
                className="alert alert-error"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <span>⚠️</span>
                <span>{error}</span>
              </motion.div>
            )}

            {success && (
              <motion.div
                className="alert alert-success"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <span>✓</span>
                <span>{success}</span>
              </motion.div>
            )}

            <form onSubmit={handleLogin} className="form">
              <div className="form-group">
                <label htmlFor="email">Email Address</label>
                <input
                  id="email"
                  className="form-input"
                  type="email"
                  placeholder="employee@restaurant.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="password">Password</label>
                <div className="password-input-wrapper">
                  <input
                    id="password"
                    className="form-input"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={loading}
                  >
                    {showPassword ? "👁️" : "🙈"}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label className="remember-checkbox">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    disabled={loading}
                  />
                  <span>Remember me</span>
                </label>
              </div>

              <motion.button
                type="submit"
                className="btn-login employee"
                disabled={loading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              > 
                {loading ? (
                  <>
                    <span className="spinner"></span>
                    Logging in...
                  </>
                ) : (
                  <>Sign In</>
                )}
              </motion.button>
              
              <button
                type="button"
                className="back-btn"
                onClick={onBackClick}
                style={{ marginTop: "12px", width: "100%" }}
              >
                &larr; Back
              </button>
            </form>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}

export default EmployeeLogin;