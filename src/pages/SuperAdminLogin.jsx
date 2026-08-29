import { useState } from "react";
import { motion } from "framer-motion";
import "./Login.css";

function SuperAdminLogin({ onLoginSuccess, onBackClick }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // 🧼 Client-side Validation
    if (!email || !password) {
      setError("Please fill in all fields");
      setLoading(false);
      return;
    }

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
          role: "super_admin",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.detail || data.message || "Login failed");
        return;
      }

      // 🧼 Clear any residual low-privilege keys to keep session secure
      localStorage.removeItem("employeeAccessToken");
      localStorage.removeItem("employeeRefreshToken");
      localStorage.removeItem("managerAccessToken");
      localStorage.removeItem("managerRefreshToken");

      // 🎯 Fix: Use scoped prefix keys consistently for Super Admin roles
      localStorage.setItem("superAdminAccessToken", data.access_token);
      localStorage.setItem("superAdminRefreshToken", data.refresh_token);
      localStorage.setItem("role", "super_admin");

      onLoginSuccess();
    } catch (err) {
      console.error(err);
      setError("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container super-admin-auth">
      <motion.div
        className="auth-wrapper"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {/* Left Side - Visual Section */}
        <motion.div
          className="auth-visual"
          initial={{ x: -50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <div className="visual-content">
            <div className="visual-icon admin-icon">
              {/* SVG Graphic — Shield + Crown + Gear (system authority / control) */}
              <svg viewBox="0 0 200 240" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Shield body */}
                <path
                  d="M100 38 L158 62 L158 122 Q158 178 100 212 Q42 178 42 122 L42 62 Z"
                  fill="#312e81"
                />
                <path
                  d="M100 50 L146 69 L146 121 Q146 166 100 195 Q54 166 54 121 L54 69 Z"
                  fill="#4338ca"
                />

                {/* Crown resting on top of the shield */}
                <path
                  d="M68 44 L74 16 L92 34 L100 10 L108 34 L126 16 L132 44 Z"
                  fill="#fbbf24"
                />
                <rect x="66" y="42" width="68" height="10" rx="2" fill="#f59e0b" />
                <circle cx="74" cy="18" r="4" fill="#fde68a" />
                <circle cx="100" cy="12" r="5" fill="#fde68a" />
                <circle cx="126" cy="18" r="4" fill="#fde68a" />

                {/* Gear / control cog centered in the shield */}
                <g transform="translate(100,122)">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <rect
                      key={i}
                      x="-6"
                      y="-38"
                      width="12"
                      height="18"
                      rx="2"
                      fill="#e0e7ff"
                      transform={`rotate(${i * 45})`}
                    />
                  ))}
                  <circle r="26" fill="#e0e7ff" />
                  <circle r="11" fill="#4338ca" />
                </g>

                {/* Base / platform under the shield */}
                <ellipse cx="100" cy="222" rx="46" ry="8" fill="#1e1b4b" opacity="0.35" />
              </svg>
            </div>
            <h2 className="visual-title">Super Admin</h2>
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
              <h1 className="form-title">Super Admin Login</h1>
              <p className="form-subtitle">Access system control panel</p>
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

            <form onSubmit={handleLogin} className="form">
              <div className="form-group">
                <label htmlFor="admin-email">Email</label>
                <input
                  id="admin-email"
                  type="email"
                  className="form-input"
                  placeholder="admin@system.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="admin-password">Password</label>
                <input
                  id="admin-password"
                  type="password"
                  className="form-input"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
              </div>

              <motion.button
                type="submit"
                className="btn-login admin-submit"
                disabled={loading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                style ={{ backgroundColor: loading ? "#262626" : "#404040", cursor: loading ? "not-allowed" : "pointer" }}
              > 
                {loading ? (
                  <>
                    <span className="spinner"></span>
                    Signing In...
                  </>
                ) : (
                  <>Login</>
                )}
              </motion.button>
            </form>

            <div className="form-footer" style={{ marginTop: "15px" }}>
              <button
                type="button"
                className="back-btn"
                onClick={onBackClick}
                style={{ width: "100%" }}
              >
                &larr; Back
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}

export default SuperAdminLogin;