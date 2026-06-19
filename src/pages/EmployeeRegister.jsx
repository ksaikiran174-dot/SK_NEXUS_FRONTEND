import { useState } from "react";
import { motion } from "framer-motion";
import "./Register.css";

function EmployeeRegister({ onRegisterSuccess, onLoginClick, onBackClick }) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const validateForm = () => {
    if (!formData.name || !formData.email || !formData.password) {
      setError("Please fill in all fields");
      return false;
    }

    if (formData.name.trim().length < 2) {
      setError("Name must be at least 2 characters");
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError("Please enter a valid email address");
      return false;
    }

    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters");
      return false;
    }

    return true;
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    if (!validateForm()) {
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/employees`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("managerAccessToken")}`,
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSuccess("✓ Employee account created successfully!");

        // 🎯 FIX: Avoid saving undefined. Inherit plan from server response if available
        if (data?.plan) {
          localStorage.setItem("plan", data.plan);
        }

        setTimeout(() => {
          onRegisterSuccess();
        }, 1500);
      } else {
        const errorData = await response.json();
        setError(errorData.detail || errorData.message || "Registration failed");
      }
    } catch (err) {
      setError("Connection error. Please try again.");
      console.error(err);
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
              <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Chef Hat */}
                <rect x="35" y="10" width="30" height="12" rx="2" fill="#ffffff" />
                {/* Head */}
                <circle cx="50" cy="35" r="12" fill="#f4c4a0" />
                {/* Chef Coat */}
                <path d="M30 50C30 45 35 42 50 42C65 42 70 45 70 50L70 75C70 77 68 80 65 80L35 80C32 80 30 77 30 75Z" fill="#ffffff" />
                {/* Apron lines */}
                <path d="M28 75L20 95M72 75L80 95" stroke="#8b4513" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <h2 className="visual-title">Join Our Kitchen Team</h2>
            <p className="visual-description">
              Create your account and start managing orders efficiently. Collaborate with your team and streamline kitchen operations.
            </p>
            <div className="visual-features">
              <div className="feature">
                <span className="feature-icon">🍳</span>
                <span className="feature-text">Order Management</span>
              </div>
              <div className="feature">
                <span className="feature-icon">👥</span>
                <span className="feature-text">Team Collaboration</span>
              </div>
              <div className="feature">
                <span className="feature-icon">⚡</span>
                <span className="feature-text">Real-time Updates</span>
              </div>
            </div>
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
              <h1 className="form-title">Create Employee Account</h1>
              <p className="form-subtitle">Add a new employee to your restaurant</p>
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

            <form onSubmit={handleRegister} className="form">
              <div className="form-group">
                <label htmlFor="name">Full Name</label>
                <input
                  id="name"
                  className="form-input"
                  type="text"
                  placeholder="Jane Cook"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="email">Email Address</label>
                <input
                  id="email"
                  className="form-input"
                  type="email"
                  placeholder="employee@restaurant.com"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
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
                    placeholder="At least 8 characters"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
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

              <motion.button
                type="submit"
                className="btn-register employee"
                disabled={loading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {loading ? (
                  <>
                    <span className="spinner"></span>
                    Creating Account...
                  </>
                ) : (
                  <>Create Employee</>
                )}
              </motion.button>
            </form>

            {/* Link to login directly if needed */}
            <div style={{ textAlign: "center", marginTop: "15px" }}>
              <p style={{ fontSize: "14px", color: "#64748b" }}>
                Already have an account?{" "}
                <button 
                  onClick={onLoginClick} 
                  style={{ background: "none", border: "none", color: "#c41e3a", fontWeight: "600", cursor: "pointer" }}
                >
                  Sign In
                </button>
              </p>
            </div>

            {/* Back to Settings Button */}
            <div className="form-footer" style={{ marginTop: "20px", textAlign: "center", borderTop: "1px solid #e2e8f0", paddingTop: "20px" }}>
               <button
                 type="button"
                 onClick={onBackClick}
                 className="btn-back-link"
                 style={{
                   background: "none",
                   border: "none",
                   color: "#64748b",
                   cursor: "pointer",
                   fontSize: "14px",
                   fontWeight: "600",
                   display: "flex",
                   alignItems: "center",
                   justifyContent: "center",
                   gap: "8px",
                   width: "100%"
                 }}
               >
                 <span>&larr;</span> Back to Manager Settings
               </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}

export default EmployeeRegister;           