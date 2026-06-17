import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import "./Register.css";

function Register({
  onRegisterSuccess,
  onLoginClick,
  onBackClick
}) {
  const [formData, setFormData] = useState({
    restaurantName: "",
    ownerName: "",
    email: "",
    phone: "",
    plan: "",
    password: "",
    confirmPassword: ""
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentCompleted, setPaymentCompleted] = useState(false);
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentScreenshot, setPaymentScreenshot] = useState(null);

  // 🚀 NEW STATE: Differentiates standard workflows from free trials
  const [isTrialRequest, setIsTrialRequest] = useState(false);

  const PLAN_PRICES = {
    basic: 999,
    pro: 1999,
    enterprise: 3999
  };

  // =========================================
  // HANDLE INPUT
  // =========================================
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  // =========================================
  // VALIDATION
  // =========================================
  const validateForm = () => {
    if (
      !formData.restaurantName ||
      !formData.ownerName ||
      !formData.email ||
      !formData.phone ||
      !formData.plan || // Safety check: Plan must be selected!
      !formData.password ||
      !formData.confirmPassword
    ) {
      setError("Please fill in all fields including choosing a plan");
      return false;
    }

    if (formData.restaurantName.trim().length < 2) {
      setError("Restaurant name is too short");
      return false;
    }

    if (formData.ownerName.trim().length < 2) {
      setError("Owner name is too short");
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError("Please enter a valid email");
      return false;
    }

    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters");
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return false;
    }

    return true;
  };

  // =========================================
  // CORE REGISTRATION SUBMIT HANDLER
  // =========================================
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
      let screenshotPath = "FREE_TRIAL";
      let refId = "TRIAL_REQUEST";

      // ── IF IT IS A PAID SUBSCRIPTION SYSTEM REQUEST ──
      if (!isTrialRequest) {
        if (!paymentScreenshot) {
          setError("Please upload your payment verification screenshot, bro!");
          setLoading(false);
          return;
        }

        if (paymentScreenshot.size > 5 * 1024 * 1024) {
          setError("Screenshot image must be smaller than 5MB, bro!");
          setLoading(false);
          return;
        }

        const imageFormData = new FormData();
        imageFormData.append("file", paymentScreenshot);

        // Upload picture chunk to system disk
        const uploadResponse = await fetch(
          `${import.meta.env.VITE_API_URL}/auth/upload-payment-image`,
          {
            method: "POST",
            body: imageFormData
          }
        );

        const uploadData = await uploadResponse.json();
        screenshotPath = uploadData.image_path;
        refId = paymentReference;
      }

      // ── SUBMIT MAIN REGISTRATION LOGIC PACKET ──
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/auth/register`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            restaurant_name: formData.restaurantName,
            owner_name: formData.ownerName,
            email: formData.email,
            phone: formData.phone,
            password: formData.password,
            plan: formData.plan,
            request_type: isTrialRequest ? "trial" : "paid", // 🚀 Informs your admin panel query flags
            payment_reference: refId,
            payment_screenshot: screenshotPath
          })
        }
      );

      if (response.ok) {
        const data = await response.json();

        setSuccess(
          isTrialRequest 
            ? "✓ Free Trial registration submitted! Awaiting Admin Activation." 
            : "✓ Paid workspace registration submitted! Awaiting Admin verification."
        );

        // SAVE SEGMENTED TOKENS
        localStorage.setItem("managerAccessToken", data.access_token);
        localStorage.setItem("managerRefreshToken", data.refresh_token);
        localStorage.setItem("plan", formData.plan);

        setTimeout(() => {
          onRegisterSuccess();
        }, 1200);

      } else {
        const errorData = await response.json();
        setError(errorData.detail || "Registration failed");
      }

    } catch (err) {
      setError("Connection error. Please try again.");
      console.error("Registration error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="auth-container manager-auth">
      <motion.div
        className="auth-wrapper"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        {/* ========================================= */}
        {/* LEFT SIDE */}
        {/* ========================================= */}
        <motion.div
          className="auth-visual"
          initial={{ x: -50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <div className="visual-content">
            <div className="visual-icon manager-icon">🚀</div>
            <div className="launch-badge">Business OS Platform</div>
            <h2 className="visual-title">Launch Your Business System</h2>
            <p className="visual-description">
              Manage orders, employees, analytics, tokens, payments, and daily operations from one powerful dashboard.
            </p>

            <div className="visual-features">
              <div className="feature">
                <span className="feature-icon">📦</span>
                <span className="feature-text">Live Order Tracking</span>
              </div>
              <div className="feature">
                <span className="feature-icon">👨‍🍳</span>
                <span className="feature-text">Employee Management</span>
              </div>
              <div className="feature">
                <span className="feature-icon">📊</span>
                <span className="feature-text">Sales Analytics</span>
              </div>
              <div className="feature">
                <span className="feature-icon">⚡</span>
                <span className="feature-text">Real-time Dashboard</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ========================================= */}
        {/* RIGHT SIDE */}
        {/* ========================================= */}
        <motion.div
          className="auth-form-container"
          initial={{ x: 50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className="auth-form-inner">
            <div className="form-header">
              <h1 className="form-title">Create Business Workspace</h1>
              <p className="form-subtitle">Set up your business management system</p>
            </div>

            {/* ALERTS */}
            {error && (
              <motion.div className="alert alert-error" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                <span>⚠️</span>
                <span>{error}</span>
              </motion.div>
            )}

            {success && (
              <motion.div className="alert alert-success" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                <span>✓</span>
                <span>{success}</span>
              </motion.div>
            )}

            {/* FORM */}
            <form onSubmit={handleRegister} className="form">
              {/* RESTAURANT NAME */}
              <div className="form-group">
                <label htmlFor="restaurantName">Restaurant Name</label>
                <input
                  id="restaurantName"
                  className="form-input"
                  type="text"
                  placeholder="SK Restaurants"
                  name="restaurantName"
                  value={formData.restaurantName}
                  onChange={handleInputChange}
                  disabled={loading}
                />
              </div>

              {/* OWNER NAME */}
              <div className="form-group">
                <label htmlFor="ownerName">Owner Name</label>
                <input
                  id="ownerName"
                  className="form-input"
                  type="text"
                  placeholder="Sai Kiran"
                  name="ownerName"
                  value={formData.ownerName}
                  onChange={handleInputChange}
                  disabled={loading}
                />
              </div>

              {/* EMAIL */}
              <div className="form-group">
                <label htmlFor="email">Business Email</label>
                <input
                  id="email"
                  className="form-input"
                  type="email"
                  placeholder="owner@restaurant.com"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  disabled={loading}
                />
              </div>

              {/* PHONE */}
              <div className="form-group">
                <label htmlFor="phone">Phone Number</label>
                <input
                  id="phone"
                  className="form-input"
                  type="text"
                  placeholder="+91 9876543210"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  disabled={loading}
                />
              </div>

              {/* PLAN SELECTION */}
              <div className="form-group">
                <label htmlFor="plan">Subscription Plan</label>
                <select
                  id="plan"
                  className="form-input"
                  name="plan"
                  value={formData.plan}
                  onChange={handleInputChange}
                  required
                >
                  <option value="" disabled hidden>
                    -- Not Selected / Choose a Plan --
                  </option>
                  <option value="basic">Basic Plan</option>
                  <option value="pro">Pro Plan</option>
                  <option value="enterprise">Enterprise Plan</option>
                </select>
              </div>

              {/* PASSWORD */}
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

              {/* CONFIRM PASSWORD */}
              <div className="form-group">
                <label htmlFor="confirmPassword">Confirm Password</label>
                <div className="password-input-wrapper">
                  <input
                    id="confirmPassword"
                    className="form-input"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Re-enter password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    disabled={loading}
                  >
                    {showConfirmPassword ? "👁️" : "🙈"}
                  </button>
                </div>
              </div>

              {/* 🎯 SEGMENTED METHOD SELECTION BUTTON LAYOUT */}
              {formData.plan && (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px", margin: "15px 0" }}>
                  
                  {/* Option A: Paid Path */}
                  <button
                    type="button"
                    className={`btn-payment ${paymentCompleted && !isTrialRequest ? 'completed' : ''}`}
                    onClick={() => {
                      setIsTrialRequest(false);
                      setShowPaymentModal(true);
                    }}
                    disabled={loading}
                    style={{
                      width: "100%",
                      padding: "12px",
                      background: (paymentCompleted && !isTrialRequest) ? "#22c55e" : "#2563eb",
                      color: "white",
                      border: "none",
                      borderRadius: "8px",
                      fontWeight: "600",
                      cursor: "pointer"
                    }}
                  >
                    {paymentCompleted && !isTrialRequest 
                      ? "✓ Payment Completed (30-Day Setup)" 
                      : `Pay ₹${PLAN_PRICES[formData.plan]} / Month`}
                  </button>

                  {/* Option B: Free Trial Path */}
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentCompleted(false); // resets paid path flags
                      setPaymentReference("");
                      setPaymentScreenshot(null);
                      setIsTrialRequest(true);
                    }}
                    disabled={loading}
                    style={{
                      width: "100%",
                      padding: "12px",
                      background: isTrialRequest ? "#10b981" : "transparent",
                      color: isTrialRequest ? "white" : "#10b981",
                      border: "2px solid #10b981",
                      borderRadius: "8px",
                      fontWeight: "700",
                      cursor: "pointer",
                      transition: "all 0.2s ease"
                    }}
                  >
                    {isTrialRequest ? "🌱 Free Trial Selected (7-Day Setup)" : "Start 7-Day Free Trial"}
                  </button>
                </div>
              )}

{/* REGISTER EXECUTION CTA BUTTON */}
<motion.button
  type="submit"
  className="btn-register"
  // 🔐 Safety Lock: Must either finish the payment form OR explicitly select the trial path!
  disabled={loading || (!paymentCompleted && !isTrialRequest)}
  style={{
    opacity: (loading || (!paymentCompleted && !isTrialRequest)) ? 0.6 : 1
  }}
  whileHover={{ scale: 1.02 }}
  whileTap={{ scale: 0.98 }}
>
  {loading ? (
    <>
      <span className="spinner"></span>
      Creating Workspace...
    </>
  ) : (
    <>Create Workspace</> // Always premium, always real! 😂🚀
  )}
</motion.button>
            </form>

            {/* FOOTER */}
            <div className="form-footer">
              <p>
                Already have a workspace?{" "}
                <button type="button" className="link-btn" onClick={onLoginClick}>
                  Sign in here
                </button>
              </p>
              <button type="button" className="back-btn" onClick={onBackClick}>
                &larr; Back
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* PAYMENT SCREEN INTERCEPT MODAL */}
      {showPaymentModal && (
        <div className="payment-modal-overlay">
          <div className="payment-modal" style={{ position: "relative", padding: "30px 20px" }}>
            <button 
              type="button"
              className="modal-close-btn"
              onClick={() => setShowPaymentModal(false)}
              style={{
                position: "absolute",
                top: "12px",
                right: "16px",
                background: "none",
                border: "none",
                fontSize: "24px",
                cursor: "pointer",
                color: "#64748b",
                fontWeight: "bold",
                padding: "4px"
              }}
            >
              &times;
            </button>

            <h2>Complete Payment</h2>
            <img src="/logo.png" alt="QR Code" className="payment-qr" />
            <p>UPI ID: saikiran@upi</p>
            <h3>Amount: ₹{PLAN_PRICES[formData.plan]}</h3>

            <input
              type="text"
              placeholder="Enter UTR / Reference ID"
              value={paymentReference}
              onChange={(e) => setPaymentReference(e.target.value)}
              required
            />

            <input
              type="file"
              accept="image/*"
              onChange={(e) => setPaymentScreenshot(e.target.files[0])}
              required
            />

            <button
              type="button"
              disabled={!paymentReference.trim() || !paymentScreenshot}
              onClick={() => {
                setPaymentCompleted(true);
                setShowPaymentModal(false);
              }}
              style={{
                width: "100%",
                padding: "12px",
                backgroundColor: (!paymentReference.trim() || !paymentScreenshot) ? "#cbd5e1" : "#22c55e",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                cursor: (!paymentReference.trim() || !paymentScreenshot) ? "not-allowed" : "pointer",
                fontWeight: "600",
                marginTop: "10px",
                transition: "background-color 0.2s"
              }}
            >
              {(!paymentReference.trim() || !paymentScreenshot) 
                ? "Please fill details to continue" 
                : "Confirm Payment Details"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Register;