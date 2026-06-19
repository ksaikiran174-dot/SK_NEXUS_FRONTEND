import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import ConfirmationModal from "../components/ConfirmationModal";
import "./Login.css";

function Login({ onLoginSuccess, onRegisterClick, onBackClick }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [resetStep, setResetStep] = useState(1);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotPayload, setForgotPayload] = useState({
    otp: "",
    new_password: "",
    confirm_password: "",
  });
  const [loadingForgot, setLoadingForgot] = useState(false);
  const [modal, setModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    type: "confirm",
    onConfirm: null,
    confirmText: "OK",
    cancelText: "Cancel",
    showCancelButton: false,
  });

  useEffect(() => {
    window.scrollTo(0, 0);
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

    // 🎯 FRONTEND RESTRICTION: Enforce minimum password lengths
    if (password.length < 8) {
      setError("Password must be at least 8 characters long");
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
          role: "manager",
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSuccess("✓ Login successful! Redirecting...");

        // Clear any leftover cross-contamination session data from previous accounts
        localStorage.clear();

        // Safely resolve plan and restaurant status mapping layers
        const userPlan = data.user?.plan || data.plan || "basic";
        const restaurantStatus = data.user?.restaurant_status || data.restaurant_status || "pending";
        const paymentRef = data.user?.payment_reference || data.payment_reference || "Not Found";

        if (data.access_token) {
          localStorage.setItem("managerAccessToken", data.access_token);
          localStorage.setItem("managerRefreshToken", data.refresh_token);
          localStorage.setItem("role", "manager");
          localStorage.setItem("plan", userPlan);
          localStorage.setItem("restaurantStatus", restaurantStatus); 
          localStorage.setItem("managerUTR", paymentRef);        
        }

        if (rememberMe) {
          localStorage.setItem("rememberedEmail", email);
        }

        setTimeout(() => {
          onLoginSuccess({ 
            plan: userPlan,
            restaurant_status: restaurantStatus,
            payment_reference: paymentRef 
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

  // Phase 1: Fire off the OTP generation request
  const handleRequestOtp = async (e) => {
    e.preventDefault();
    try {
      setLoadingForgot(true);
      const res = await fetch("https://sknexus-production.up.railway.app/auth/forgot-password/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail }),
      });
      if (res.ok) {
        setModal({
          isOpen: true,
          title: "OTP Sent",
          message: "Check your email for the 6-digit reset code.",
          type: "success",
          onConfirm: () => {
            setResetStep(2);
            setModal({ ...modal, isOpen: false });
          },
          confirmText: "OK",
          showCancelButton: false,
        });
      } else {
        setModal({
          isOpen: true,
          title: "Request Failed",
          message: "Could not process your request. Please try again.",
          type: "error",
          onConfirm: () => setModal({ ...modal, isOpen: false }),
          confirmText: "OK",
          showCancelButton: false,
        });
      }
    } catch (err) {
      setModal({
        isOpen: true,
        title: "Connection Error",
        message: "Unable to connect to the server. Please check your internet connection.",
        type: "error",
        onConfirm: () => setModal({ ...modal, isOpen: false }),
        confirmText: "OK",
        showCancelButton: false,
      });
    } finally {
      setLoadingForgot(false);
    }
  };

  // Phase 2: Submit the values to verify and save the new password
  const handleExecuteReset = async (e) => {
    e.preventDefault();
    
    // 🎯 FRONTEND RESTRICTION: Ensure security boundaries match schema requirements
    if (forgotPayload.otp.length !== 6) {
      setModal({
        isOpen: true,
        title: "Invalid Code",
        message: "The reset code must be exactly 6 digits.",
        type: "error",
        onConfirm: () => setModal({ ...modal, isOpen: false }),
        confirmText: "OK",
        showCancelButton: false,
      });
      return;
    }

    if (forgotPayload.new_password.length < 8) {
      setModal({
        isOpen: true,
        title: "Weak Password",
        message: "New password must be at least 8 characters long.",
        type: "error",
        onConfirm: () => setModal({ ...modal, isOpen: false }),
        confirmText: "OK",
        showCancelButton: false,
      });
      return;
    }

    if (forgotPayload.new_password !== forgotPayload.confirm_password) {
      setModal({
        isOpen: true,
        title: "Password Mismatch",
        message: "The passwords you entered do not match. Please try again.",
        type: "error",
        onConfirm: () => setModal({ ...modal, isOpen: false }),
        confirmText: "OK",
        showCancelButton: false,
      });
      return;
    }

    try {
      setLoadingForgot(true);
      const res = await fetch("https://sknexus-production.up.railway.app/auth/forgot-password/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: forgotEmail,
          otp: forgotPayload.otp,
          new_password: forgotPayload.new_password,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setModal({
          isOpen: true,
          title: "Password Updated",
          message: "Your password has been successfully updated. Please log in with your new password.",
          type: "success",
          onConfirm: () => {
            setShowForgotModal(false);
            setResetStep(1);
            setForgotEmail("");
            setForgotPayload({ otp: "", new_password: "", confirm_password: "" });
            setModal({ ...modal, isOpen: false });
          },
          confirmText: "OK",
          showCancelButton: false,
        });
      } else {
        setModal({
          isOpen: true,
          title: "Reset Failed",
          message: data.detail || "Failed to reset your password. Please try again.",
          type: "error",
          onConfirm: () => setModal({ ...modal, isOpen: false }),
          confirmText: "OK",
          showCancelButton: false,
        });
      }
    } catch (err) {
      setModal({
        isOpen: true,
        title: "Error",
        message: "An error occurred while processing your request. Please try again.",
        type: "error",
        onConfirm: () => setModal({ ...modal, isOpen: false }),
        confirmText: "OK",
        showCancelButton: false,
      });
    } finally {
      setLoadingForgot(false);
    }
  };

  return (
    <div className="auth-container manager-auth">
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
            <div className="visual-icon manager-icon">
              {/* SVG Graphic */}
              <svg viewBox="0 0 200 240" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M60 45 Q60 20 100 20 Q140 20 140 45 L140 70 Q100 75 60 70 Z" fill="#2c1810" />
                <circle cx="100" cy="65" r="30" fill="#f4c4a0" />
                <ellipse cx="88" cy="60" rx="5" ry="8" fill="#4a90e2" />
                <ellipse cx="112" cy="60" rx="5" ry="8" fill="#4a90e2" />
                <circle cx="88" cy="62" r="2" fill="white" />
                <circle cx="112" cy="62" r="2" fill="white" />
                <path d="M82 50 Q88 48 94 50" stroke="#2c1810" strokeWidth="2" strokeLinecap="round" />
                <path d="M106 50 Q112 48 118 50" stroke="#2c1810" strokeWidth="2" strokeLinecap="round" />
                <line x1="100" y1="62" x2="100" y2="75" stroke="#d4a574" strokeWidth="1.5" />
                <path d="M92 82 Q100 88 108 82" stroke="#d4666a" strokeWidth="2" strokeLinecap="round" fill="none" />
                <rect x="92" y="93" width="16" height="12" fill="#f4c4a0" />
                <path d="M55 105 L55 180 Q55 195 70 200 L130 200 Q145 195 145 180 L145 105 Z" fill="#1a3a52" />
                <path d="M85 105 L85 140 L115 140 L115 105" fill="#ffffff" />
                <path d="M98 105 L96 135 L100 137 L104 135 L102 105" fill="#c41e3a" />
                <path d="M55 105 Q70 100 100 100 Q130 100 145 105" stroke="#0f2438" strokeWidth="1" />
                <path d="M60 120 L30 150" stroke="#f4c4a0" strokeWidth="14" strokeLinecap="round" />
                <path d="M140 120 L170 150" stroke="#f4c4a0" strokeWidth="14" strokeLinecap="round" />
                <circle cx="28" cy="152" r="8" fill="#f4c4a0" />
                <circle cx="172" cy="152" r="8" fill="#f4c4a0" />
              </svg>
            </div>
            <h2 className="visual-title">Manager Login</h2>
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
              <h1 className="form-title">Welcome Back</h1>
              <p className="form-subtitle">Sign in to your manager account</p>
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
                  placeholder="manager@restaurant.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  maxLength="100" // 🎯 RULE: Hard stop at 100 matching Schema limits
                  required
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
                    maxLength="128" // 🎯 RULE: Hard stop at 128 matching Schema limits
                    required
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
                className="btn-login"
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
            </form>

            <div className="form-footer">
              <div className="footer-buttons">
                <button
                  type="button"
                  className="footer-link-btn signup"
                  onClick={onRegisterClick}
                >
                  📝 Sign Up
                </button>
                <button
                  type="button"
                  className="footer-link-btn forgot"
                  onClick={() => setShowForgotModal(true)}
                >
                  🔑 Forgot Password?
                </button>
              </div>
              <button
                type="button"
                className="footer-back-btn"
                onClick={onBackClick}
              >
                ← Back
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="forgot-password-overlay">
          <motion.div
            className="forgot-password-modal"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <div className="forgot-modal-header">
              <h3 className="forgot-modal-title">Reset Your Password</h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => {
                  setShowForgotModal(false);
                  setResetStep(1);
                  setForgotEmail("");
                  setForgotPayload({ otp: "", new_password: "", confirm_password: "" });
                }}
              >
                ✕
              </button>
            </div>

            {resetStep === 1 ? (
              <form onSubmit={handleRequestOtp} className="forgot-form">
                <p className="forgot-description">
                  Enter your email address below to receive a 6-digit reset code.
                </p>
                <div className="form-group">
                  <label htmlFor="forgot-email">Email Address</label>
                  <input
                    id="forgot-email"
                    type="email"
                    required
                    className="form-input"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="manager@restaurant.com"
                    disabled={loadingForgot}
                    maxLength="100" // 🎯 RULE: Hard stop at 100 matching Schema limits
                  />
                </div>
                <div className="forgot-modal-footer">
                  <button
                    type="button"
                    className="btn-cancel"
                    onClick={() => {
                      setShowForgotModal(false);
                      setResetStep(1);
                      setForgotEmail("");
                      setForgotPayload({ otp: "", new_password: "", confirm_password: "" });
                    }}
                  >
                    Cancel
                  </button>
                  <motion.button
                    type="submit"
                    className="btn-forgot-submit"
                    disabled={loadingForgot}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {loadingForgot ? (
                      <>
                        <span className="spinner"></span>
                        Sending...
                      </>
                    ) : (
                      "Send Reset Code"
                    )}
                  </motion.button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleExecuteReset} className="forgot-form">
                <div className="form-group">
                  <label htmlFor="otp">6-Digit Reset Code</label>
                  <input
                    id="otp"
                    type="text"
                    required
                    className="form-input"
                    placeholder="123456"
                    value={forgotPayload.otp}
                    disabled={loadingForgot}
                    // 🎯 FILTER MECHANISM: Force purely numerical inputs and block key entry at 6 chars
                    onChange={(e) => {
                      const cleanOtp = e.target.value.replace(/[^0-9]/g, "");
                      if (cleanOtp.length > 6) return;
                      setForgotPayload((prev) => ({
                        ...prev,
                        otp: cleanOtp,
                      }));
                    }}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="new-password">New Password</label>
                  <input
                    id="new-password"
                    type="password"
                    required
                    className="form-input"
                    placeholder="••••••••"
                    value={forgotPayload.new_password}
                    disabled={loadingForgot}
                    maxLength="128" // 🎯 RULE: Limit maximum input string payload
                    onChange={(e) =>
                      setForgotPayload((prev) => ({
                        ...prev,
                        new_password: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="confirm-password">Confirm Password</label>
                  <input
                    id="confirm-password"
                    type="password"
                    required
                    className="form-input"
                    placeholder="••••••••"
                    value={forgotPayload.confirm_password}
                    disabled={loadingForgot}
                    maxLength="128" // 🎯 RULE: Limit maximum input string payload
                    onChange={(e) =>
                      setForgotPayload((prev) => ({
                        ...prev,
                        confirm_password: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="forgot-modal-footer">
                  <button
                    type="button"
                    className="btn-back"
                    onClick={() => setResetStep(1)}
                  >
                    &larr; Back
                  </button>
                  <motion.button
                    type="submit"
                    className="btn-forgot-submit btn-success"
                    disabled={loadingForgot}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {loadingForgot ? (
                      <>
                        <span className="spinner"></span>
                        Updating...
                      </>
                    ) : (
                      "Update Password"
                    )}
                  </motion.button>
                </div>
              </form>
            )}
          </motion.div>
        </div>
      )}
      <ConfirmationModal
        isOpen={modal.isOpen}
        title={modal.title}
        message={modal.message}
        type={modal.type}
        onConfirm={modal.onConfirm}
        onCancel={() => setModal({ ...modal, isOpen: false })}
        confirmText={modal.confirmText}
        cancelText={modal.cancelText}
        showCancelButton={modal.showCancelButton}
      />
    </div>
  );
}

export default Login;
