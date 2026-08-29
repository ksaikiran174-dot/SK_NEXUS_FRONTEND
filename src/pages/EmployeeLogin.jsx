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
            {/* Highly Apt Food-Tech Kitchen Chef Hat Node */}
              <div className="neon-icon-box employee-icon">
                <ChefHat size={56} strokeWidth={1.5} className="vector-icon-green" />
              </div>
            <h2 className="visual-title">Staff</h2>
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
              <p className="form-subtitle">Sign in to access dashboard</p>
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