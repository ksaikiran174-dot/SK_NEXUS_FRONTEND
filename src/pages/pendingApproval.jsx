import React from "react";

const PendingApproval = ({ restaurantData, onLogout }) => {
  // Resolve flat vs nested backend data payloads safely
  const data = restaurantData?.restaurantData || restaurantData;

  // 🎯 Clean evaluation using exact key values
  const isTrial = String(data?.request_type).toLowerCase() === "trial" || 
                  String(data?.payment_reference).toLowerCase() === "trial_request";

  const utrNumber = data?.payment_reference || "Not Found / Uploaded";
  const adminContact = "+1234567890"; // 🎯 Put your actual contact phone number here

  // WhatsApp template routing configuration
  const whatsappMessage = isTrial
    ? `Hi Admin, please activate my Free Trial setup for my restaurant: ${data?.name || data?.restaurant_name || "My Restaurant"}`
    : `Hi Admin, please approve my restaurant UTR: ${utrNumber}`;

  const storedPendingData = (() => {
  try {
    return JSON.parse(localStorage.getItem("pendingRestaurantData") || "null");
  } catch {
    return null;
  }
})();

const data = restaurantData?.restaurantData || restaurantData || storedPendingData || {};

const requestType = String(data?.request_type || "").toLowerCase();
const paymentRef = String(data?.payment_reference || "").toLowerCase();

const isTrial =
  requestType === "trial" ||
  paymentRef === "trial_request" ||
  data?.payment_screenshot === "FREE_TRIAL";

const utrNumber = data?.payment_reference || "Not Found / Uploaded";

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        {/* Animated Icon Container */}
        <div style={styles.iconContainer}>
          {isTrial ? (
            <span style={{ fontSize: "55px" }}>🌱</span>
          ) : (
            <span style={{ fontSize: "55px" }}>⏳</span>
          )}
        </div>

        <h2 style={styles.heading}>
          {isTrial ? "Trial Request Submitted!" : "Workspace Request Submitted!"}
        </h2>
        
        <p style={styles.subtext}>
          {isTrial ? (
            <>Your free trial workspace setup is currently undergoing quick administrative configuration. Please wait a moment while the super-admin activates your trial access pipeline.</>
          ) : (
            <>Your restaurant setup is currently undergoing administrative review. Please wait for the super-admin to verify your payment status and activate your dashboard.</>
          )}
        </p>

        <hr style={styles.divider} />

        {/* Informational Data Points */}
        <div style={styles.infoBox}>
          {/* Route / Payment Verification Row */}
          <div style={styles.infoRow}>
            <span style={styles.label}>
              {isTrial ? "Requested Route:" : "Submitted UTR / Reference No:"}
            </span>
            {isTrial ? (
              <span style={{ 
                backgroundColor: "#fef3c7", color: "#d97706", padding: "4px 10px", 
                borderRadius: "6px", fontSize: "12px", fontWeight: "800", 
                border: "1px solid #f59e0b", display: "inline-block"
              }}>
                🌱 FREE TRIAL ACCESS
              </span>
            ) : (
              <span style={styles.value}>
                {utrNumber}
              </span>
            )}
          </div>

          {/* System Setup Status Row */}
          <div style={styles.infoRow}>
            <span style={styles.label}>Current Setup Status:</span>
            <span style={{ 
              backgroundColor: "#fffbeb", color: "#b45309", padding: "4px 10px", 
              borderRadius: "6px", fontSize: "12px", fontWeight: "700", 
              border: "1px solid #fcd34d", display: "inline-block"
            }}>
              ⚠️ PENDING APPROVAL
            </span>
          </div>
        </div> 

        {/* Support Call-to-Actions */}
        <div style={styles.supportSection}>
          <p style={styles.supportText}>Have any questions or need urgent activation?</p>
          <a href={`tel:${adminContact}`} className="btn btn-primary" style={styles.supportBtn}>
            📞 Call Support Admin
          </a>
          <a 
            href={`https://wa.me/${adminContact.replace("+", "")}?text=${encodeURIComponent(whatsappMessage)}`} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="btn btn-success" 
            style={styles.supportBtn}
          >
            💬 WhatsApp Chat
          </a>
        </div>

        {/* Exit Vector */}
        <button onClick={onLogout} className="btn btn-outline-danger" style={styles.logoutBtn}>
          ↪️ Log Out / Switch Account
        </button>
      </div>
    </div>
  );
};

const styles = {
  container: { display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", backgroundColor: "#f8f9fa", padding: "20px" },
  card: { maxWidth: "550px", width: "100%", backgroundColor: "#ffffff", borderRadius: "12px", boxShadow: "0 4px 15px rgba(0, 0, 0, 0.1)", padding: "40px 30px", textAlign: "center" },
  iconContainer: { fontSize: "50px", marginBottom: "15px" },
  heading: { color: "#212529", fontSize: "24px", fontWeight: "600", marginBottom: "10px" },
  subtext: { color: "#6c757d", fontSize: "15px", lineHeight: "1.6", marginBottom: "20px" },
  divider: { border: "0", borderTop: "1px solid #dee2e6", margin: "20px 0" },
  infoBox: { backgroundColor: "#f1f3f5", borderRadius: "8px", padding: "15px", textAlign: "left", marginBottom: "25px" },
  infoRow: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px", fontSize: "14px" },
  label: { color: "#495057" },
  value: { color: "#212529", fontWeight: "500", fontFamily: "monospace" },
  supportSection: { marginBottom: "25px" },
  supportText: { fontSize: "14px", color: "#495057", marginBottom: "10px" },
  supportBtn: { display: "inline-flex", alignItems: "center", justifyContent: "center", width: "100%", padding: "10px", fontWeight: "500", marginBottom: "10px", borderRadius: "6px", textDecoration: "none" },
  logoutBtn: { width: "100%", padding: "8px", fontSize: "14px" },
};

export default PendingApproval;

