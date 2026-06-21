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
    confirmPassword: "",
    paymentReference: "" // 🎯 Fixed: Kept inside formData to match input name attribute
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentCompleted, setPaymentCompleted] = useState(false);
  const [paymentScreenshot, setPaymentScreenshot] = useState(null);

  // 🚀 NEW STATE: Differentiates standard workflows from free trials
  const [isTrialRequest, setIsTrialRequest] = useState(false);

  const PLAN_PRICES = {
    basic: 499,
    pro: 999,
    enterprise: 999
  };

  // =========================================
  // HANDLE INPUT
  // =========================================
  const handleInputChange = (e) => {
    const { name, value } = e.target;

    // 🎯 RESTRICTION: Lock Reference / UTR Number to digits only with a 22-digit maximum cap
    if (name === "paymentReference") {
      const onlyDigits = value.replace(/[^0-9]/g, "");
      if (onlyDigits.length > 22) return;

      setFormData((prev) => ({
        ...prev,
        [name]: onlyDigits
      }));
      return;
    }

    // Default handler for all other standard form fields
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
      !formData.plan || 
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
        // Validate Payment Reference length before processing uploads
        const refLength = formData.paymentReference?.length || 0;
        if (refLength < 12 || refLength > 22) {
          setError("❌ Error: Payment Reference Number must be between 12 and 22 digits long.");
          setLoading(false);
          return;
        }

        // Optional screenshot verification layout 
        if (paymentScreenshot) {
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

          if (!uploadResponse.ok) {
            throw new Error("Failed to upload verification image screenshot.");
          }

          const uploadData = await uploadResponse.json();
          screenshotPath = uploadData.image_path;
        } else {
          screenshotPath = "NO_SCREENSHOT_PROVIDED";
        }

        refId = formData.paymentReference;
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
            request_type: isTrialRequest ? "trial" : "paid", 
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
        localStorage.setItem("managerAccessToken", data.access_token || data.accessToken);
        localStorage.setItem("managerRefreshToken", data.refresh_token);
        localStorage.setItem("plan", formData.plan);
        
        localStorage.setItem("managerRequestType", isTrialRequest ? "trial" : "paid");
        localStorage.setItem("managerUTR", isTrialRequest ? "TRIAL_REQUEST" : formData.paymentReference);
        localStorage.setItem("managerScreenshot", screenshotPath);

        setTimeout(() => {
          onRegisterSuccess(data); 
        }, 1200);
      } else {
        const errorData = await response.json();
        setError(errorData.detail || "Registration failed");
      }

    } catch (err) {
      setError(err.message || "Connection error. Please try again.");
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

              {/* ========================================= */}
              {/* 🎯 SMART DYNAMIC METHOD SELECTION LAYOUT */}
              {/* ========================================= */}
              {formData.plan && (
                <div style={{ margin: "20px 0", display: "flex", flexDirection: "column", gap: "12px" }}>
                  
                  {/* CASE 1: USER IS ON THE TRIAL PATH */}
                  {isTrialRequest ? (
                    <motion.div 
                      initial={{ scale: 0.95, opacity: 0 }} 
                      animate={{ scale: 1, opacity: 1 }}
                      style={{ display: "flex", flexDirection: "column", gap: "8px" }}
                    >
                      <div style={{
                        width: "100%",
                        padding: "14px",
                        background: "#e6f4ea",
                        color: "#137333",
                        border: "2px solid #10b981",
                        borderRadius: "8px",
                        fontWeight: "700",
                        textAlign: "center",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "8px"
                      }}>
                        🌱 Free Trial Selected (7-Day Setup)
                      </div>

                      <p style={{ fontSize: "13px", color: "#64748b", margin: "4px 0 0 0", textAlign: "center" }}>
                        Want full continuous access instead?{" "}
                        <button
                          type="button"
                          className="link-btn"
                          onClick={() => {
                            setIsTrialRequest(false);
                            setShowPaymentModal(true);
                          }}
                          style={{ 
                            color: "#2563eb", 
                            fontWeight: "600", 
                            background: "none", 
                            border: "none", 
                            padding: "0", 
                            cursor: "pointer",
                            textDecoration: "underline" 
                          }}
                        >
                          Pay Now for 30-Day Setup
                        </button>
                      </p>
                    </motion.div>
                  ) : (
                    /* CASE 2: USER IS ON THE PAID PATH (DEFAULT OR TOGGLED) */
                    <motion.div 
                      initial={{ scale: 0.95, opacity: 0 }} 
                      animate={{ scale: 1, opacity: 1 }}
                      style={{ display: "flex", flexDirection: "column", gap: "8px" }}
                    >
                      <button
                        type="button"
                        className={`btn-payment ${paymentCompleted ? 'completed' : ''}`}
                        onClick={() => setShowPaymentModal(true)}
                        disabled={loading}
                        style={{
                          width: "100%",
                          padding: "14px",
                          background: paymentCompleted ? "#22c55e" : "#2563eb",
                          color: "white",
                          border: "none",
                          borderRadius: "8px",
                          fontWeight: "600",
                          cursor: "pointer",
                          boxShadow: "0 2px 4px rgba(37, 99, 235, 0.1)"
                        }}
                      >
                        {paymentCompleted 
                          ? "✓ Payment Information Saved" 
                          : `Pay ₹${PLAN_PRICES[formData.plan]} / Month`}
                      </button>

                      <p style={{ fontSize: "13px", color: "#64748b", margin: "4px 0 0 0", textAlign: "center" }}>
                        Not ready to commit?{" "}
                        <button
                          type="button"
                          onClick={() => {
                            setPaymentCompleted(false);
                            setFormData(prev => ({ ...prev, paymentReference: "" }));
                            setPaymentScreenshot(null);
                            setIsTrialRequest(true);
                          }}
                          disabled={loading}
                          style={{
                            color: "#10b981",
                            fontWeight: "600",
                            background: "none",
                            border: "none",
                            padding: "0",
                            cursor: "pointer",
                            textDecoration: "underline"
                          }}
                        >
                          Start 7-Day Free Trial
                        </button>
                      </p>
                    </motion.div>
                  )}
                </div>
              )}

              {/* REGISTER EXECUTION CTA BUTTON */}
              <motion.button
                type="submit"
                className="btn-register"
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
                  <>Create Workspace</>
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
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 99999
        }}>
          <div 
            style={{ 
              position: "relative", 
              padding: "40px 24px 30px 24px",
              backgroundColor: "#ffffff",
              borderRadius: "12px",
              maxWidth: "450px",
              width: "90%",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)"
            }}
          >
            {/* 🎯 FIXED ACCURATE TOP-RIGHT CLOSE CONTAINER BLOCK */}
            <div style={{ position: "absolute", top: "12px", right: "16px", zIndex: 10000 }}>
              <button 
                type="button"
                onClick={() => setShowPaymentModal(false)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "30px",
                  lineHeight: "1",
                  cursor: "pointer",
                  color: "#94a3b8",
                  fontWeight: "bold",
                  padding: "4px"
                }}
                onMouseEnter={(e) => e.target.style.color = "#475569"}
                onMouseLeave={(e) => e.target.style.color = "#94a3b8"}
              >
                &times;
              </button>
            </div>

            <h2 style={{ marginTop: "0", textAlign: "center", color: "#1e293b" }}>Complete Payment</h2>
            
            <img src="/qr_code.jpeg" alt="QR Code" style={{ display: "block", margin: "0 auto 15px", maxWidth: "180px", borderRadius: "6px" }} />
            <p style={{ textAlign: "center", fontWeight: "600", color: "#334155", margin: "5px 0" }}>UPI ID: 8464053060-2@ybl</p>
            <h3 style={{ textAlign: "center", color: "#1e293b", marginTop: "5px" }}>Amount: ₹{PLAN_PRICES[formData.plan]}</h3>

            {/* UTR / Payment Reference Input Field */}
            <input
              type="text"
              name="paymentReference"
              placeholder="Enter 12-22 Digit Ref / UTR Number"
              value={formData.paymentReference}
              onChange={handleInputChange}
              style={{ width: "100%", padding: "12px", margin: "10px 0", borderRadius: "6px", border: "1px solid #cbd5e1", boxSizing: "border-box" }}
            />

            {/* Payment Screenshot Input Field */}
            <label style={{ fontSize: "12px", display: "block", textAlign: "left", color: "#64748b", marginBottom: "4px", fontWeight: "500" }}>
              Upload Transaction Screenshot (Optional)
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setPaymentScreenshot(e.target.files[0] || null)}
              style={{ width: "100%", marginBottom: "15px" }}
            />

            <button
              type="button"
              disabled={!formData.paymentReference.trim() || formData.paymentReference.trim().length < 12 || formData.paymentReference.trim().length > 22} 
              onClick={() => {
                const utrLength = formData.paymentReference.trim().length;
                if (utrLength < 12 || utrLength > 22) return; 

                setPaymentCompleted(true);
                setShowPaymentModal(false);
              }}
              style={{
                width: "100%",
                padding: "12px",
                backgroundColor: (!formData.paymentReference.trim() || formData.paymentReference.trim().length < 12 || formData.paymentReference.trim().length > 22) 
                  ? "#cbd5e1" 
                  : "#22c55e",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                cursor: (!formData.paymentReference.trim() || formData.paymentReference.trim().length < 12 || formData.paymentReference.trim().length > 22) 
                  ? "not-allowed" 
                  : "pointer",
                fontWeight: "600",
                marginTop: "10px",
                transition: "background-color 0.2s"
              }}
            >
              {!formData.paymentReference.trim() 
                ? "Please enter UTR Number to continue" 
                : (formData.paymentReference.trim().length < 12 || formData.paymentReference.trim().length > 22)
                  ? `⚠️ UTR must be 12-22 digits (Current: ${formData.paymentReference.trim().length})`
                  : "Confirm Payment Details"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Register;