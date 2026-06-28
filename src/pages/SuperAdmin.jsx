import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import "./SuperAdmin.css";
import ToastContainer from "../components/ToastContainer";
import { inferToastType } from "../utils/ToastHelpers";
import ConfirmationModal from "../components/ConfirmationModal"; // 🚀 Import our custom modal framework

function SuperAdmin() {
  const [restaurants, setRestaurants] = useState([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState("");
  const [showImageModal, setShowImageModal] = useState(false);
  
  // 🎯 Manage custom toast arrays cleanly
  const [notifications, setNotifications] = useState([]);

  /* ── ⏱️ TRACK INDIVIDUAL BUTTON LOADING INDICATORS (Isolate actions per row) ── */
  const [isProcessing, setIsProcessing] = useState({});

  /* ── 🛡️ CUSTOM CONFIRMATION MODAL STATE MACHINE ── */
  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
    type: "confirm",
    confirmText: "Confirm",
    isDangerous: false,
  });

  /* ── 📝 STATE FOR CAPTURING DECLINE REJECTION NOTE WITHIN MODAL ── */
  const [declineInput, setDeclineInput] = useState("");
  const [activeDeclineId, setActiveDeclineId] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    fetchRestaurants();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("superAdminAccessToken");
    localStorage.removeItem("superAdminRefreshToken");
    localStorage.removeItem("role");
    window.location.reload(); 
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return "Never";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString; 
    return date.toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short"
    });
  };

  const fetchRestaurants = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/super-admin/restaurants`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("superAdminAccessToken")}`
        }
      });
      const data = await response.json();
      setRestaurants(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      setRestaurants([]);
    }
  };

  const addNotification = (text, type) => {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setNotifications((prev) => {
      const isDuplicate = prev.some((n) => n.text === text);
      if (isDuplicate) return prev;
      return [...prev, { id, text, type: type || inferToastType(text) }];
    });
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 2000);
  };

  /* ── ⏱️ THE SYNC ENGINE BACKGROUND INTERVALS ── */
  useEffect(() => {
    fetchRestaurants();
    const intervalId = setInterval(() => {
      console.log("🔄 Background syncing restaurants data...");
      fetchRestaurants();
    }, 5000);
    return () => clearInterval(intervalId);
  }, []);

  // Utility flags to set and remove asynchronous processing spinners on target elements
  const startLoading = (actionKey) => setIsProcessing(prev => ({ ...prev, [actionKey]: true }));
  const stopLoading = (actionKey) => setIsProcessing(prev => ({ ...prev, [actionKey]: false }));
  const closeConfirmModal = () => setModalConfig(prev => ({ ...prev, isOpen: false }));

  const approveRestaurant = async (id) => {
    const actionKey = `approve-${id}`;
    startLoading(actionKey);
    try {
      await fetch(`${import.meta.env.VITE_API_URL}/super-admin/restaurants/${id}/approve`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${localStorage.getItem("superAdminAccessToken")}` }
      });
      await fetchRestaurants();
    } catch (err) {
      console.error(err);
    } finally {
      stopLoading(actionKey);
    }
  };

  const handleSuspend = async (id) => {
    setModalConfig({
      isOpen: true,
      title: "Block Workspace Access?",
      message: "Are you sure you want to suspend this restaurant profile? Their management staff will be immediately locked out of live platform configurations until unblocked manually.",
      type: "warning",
      confirmText: "Block Access",
      isDangerous: true,
      onConfirm: async () => {
        closeConfirmModal();
        const actionKey = `suspend-${id}`;
        startLoading(actionKey);
        try {
          await fetch(`${import.meta.env.VITE_API_URL}/super-admin/restaurants/${id}/suspend`, {
            method: "PUT",
            headers: { Authorization: `Bearer ${localStorage.getItem("superAdminAccessToken")}` }
          });
          await fetchRestaurants();
          addNotification("🔒 Restaurant workspace access successfully suspended.");
        } catch (err) {
          console.error(err);
        } finally {
          stopLoading(actionKey);
        }
      }
    });
  };

  const handleUnblock = async (id) => {
    const actionKey = `unblock-${id}`;
    startLoading(actionKey);
    try {
      await fetch(`${import.meta.env.VITE_API_URL}/super-admin/restaurants/${id}/unblock`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${localStorage.getItem("superAdminAccessToken")}` }
      });
      await fetchRestaurants();
      addNotification("🔓 Workspace access granted to restaurant group successfully.");
    } catch (err) {
      console.error(err);
    } finally {
      stopLoading(actionKey);
    }
  };

  const handleDelete = async (id) => {
    setModalConfig({
      isOpen: true,
      title: "Permanently Delete Restaurant?",
      message: "Warning! This action is irreversible. All linked active transactional histories, catalog settings, and credential parameters will be wiped from the data cluster database logs forever.",
      type: "error",
      confirmText: "Delete Log Permanently",
      isDangerous: true,
      onConfirm: async () => {
        closeConfirmModal();
        const actionKey = `delete-${id}`;
        startLoading(actionKey);
        try {
          await fetch(`${import.meta.env.VITE_API_URL}/super-admin/restaurants/${id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${localStorage.getItem("superAdminAccessToken")}` }
          });
          await fetchRestaurants();
          addNotification("🗑️ Restaurant records deleted permanently.");
        } catch (err) {
          console.error(err);
        } finally {
          stopLoading(actionKey);
        }
      }
    });
  };

  const handleApproveSubscription = async (restaurantId) => {
    const actionKey = `sub-approve-${restaurantId}`;
    startLoading(actionKey);
    try {
      const token = localStorage.getItem("superAdminAccessToken");
      const response = await fetch(`${import.meta.env.VITE_API_URL}/super-admin/restaurants/${restaurantId}/approve`, {
        method: "PUT",
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await response.json();

      if (response.ok) {
        addNotification(`🎉 Success! Subscription for the restaurant has been approved and extended.`);
        setRestaurants(prevRestaurants => prevRestaurants.filter(r => r.id !== restaurantId));
        await fetchRestaurants();
      } else {
        addNotification(`❌ Failed to approve: ${data.detail || "Unknown error occurred"}`);
      }
    } catch (error) {
      console.error(error);
      addNotification("❌ Network connection failure. Could not connect to backend server.");
    } finally {
      stopLoading(actionKey);
    }
  };

  const openDeclineInterface = (restaurantId) => {
    setDeclineInput(""); 
    setActiveDeclineId(restaurantId);
  };

  const processDeclineSubscription = async () => {
    if (!declineInput || declineInput.trim() === "") {
      addNotification("⚠️ You must provide a rejection reason so the restaurant manager knows why!");
      return;
    }

    const targetId = activeDeclineId;
    setActiveDeclineId(null); 
    const actionKey = `sub-decline-${targetId}`;
    startLoading(actionKey);

    try {
      const token = localStorage.getItem("superAdminAccessToken");
      // 🚀 FIXED: Replaced production hardcoded string with dynamic environment base URL variable safely
      const response = await fetch(`${import.meta.env.VITE_API_URL}/super-admin/restaurants/${targetId}/decline`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ reason: declineInput })
      });

      const data = await response.json();

      if (response.ok) {
        addNotification(`📉 Request Declined! The manager has been notified with the reason: "${declineInput}"`);
        setRestaurants(prevRestaurants => prevRestaurants.filter(r => r.id !== targetId));
        await fetchRestaurants();
      } else {
        addNotification(`❌ Failed to decline: ${data.detail || "Validation check error"}`);
      }
    } catch (error) {
      console.error(error);
      addNotification("❌ Network connection failure. Could not process request.");
    } finally {
      stopLoading(actionKey);
    }
  };

  const handleExtendSubscription = async (restaurantId) => {
    const actionKey = `extend-${restaurantId}`;
    startLoading(actionKey);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/super-admin/restaurants/${restaurantId}/extend?days=30`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${localStorage.getItem("superAdminAccessToken")}` }
      });
      if (!response.ok) throw new Error("Failed to extend subscription");
      addNotification("📆 Subscription window extended manually by 30 days.");
      await fetchRestaurants();
    } catch (error) {
      console.error(error);
    } finally {
      stopLoading(actionKey);
    }
  };

  const openRestaurantModal = async (id) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/super-admin/restaurants/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("superAdminAccessToken")}` }
      });
      const data = await response.json();
      setSelectedRestaurant(data);
      setShowModal(true);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="super-admin-page">
      <ToastContainer notifications={notifications} />

      {/* ── CENTRAL APP CONFIRMATION MODAL ENGINE ── */}
      <ConfirmationModal
        isOpen={modalConfig.isOpen}
        title={modalConfig.title}
        message={modalConfig.message}
        type={modalConfig.type}
        confirmText={modalConfig.confirmText}
        isDangerous={modalConfig.isDangerous}
        onConfirm={modalConfig.onConfirm}
        onCancel={closeConfirmModal}
      />

      {/* ── TEXT INPUT INJECTION SUB-MODAL INTERFACE FOR MANUAL REJECTION FEEDBACKS ── */}
      <ConfirmationModal
        isOpen={activeDeclineId !== null}
        title="Reject Extension Request"
        message="Please state the validation discrepancy clear reason text for declining this payment profile receipt configuration log entry below:"
        type="warning"
        confirmText="Reject Transfer"
        onCancel={() => setActiveDeclineId(null)}
        onConfirm={processDeclineSubscription}
      >
        <input 
          type="text"
          className="form-input"
          style={{ width: "100%", marginTop: "12px", padding: "10px", borderRadius: "6px", border: "1px solid #cbd5e1" }}
          placeholder="E.g., Transaction reference code UTR matching receipt not found in bank statements..."
          value={declineInput}
          onChange={(e) => setDeclineInput(e.target.value)}
        />
      </ConfirmationModal>

      {/* =======================================
            SUPER ADMIN HEADER WITH LOGOUT BUTTON
        ======================================= */}
      <div className="super-admin-header-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px", width: "100%" }}>
        <h1 className="super-admin-title" style={{ margin: 0 }}>
          Super Admin Panel
        </h1>
        <button 
          className="logout-btn" 
          onClick={handleLogout}
          style={{
            padding: "10px 20px", background: "#ef4444", color: "white",
            border: "none", borderRadius: "6px", fontWeight: "600",
            cursor: "pointer", marginLeft: "auto"
          }}
        >
          Logout 🚪
        </button>
      </div>

      {/* =======================================
          PENDING APPROVALS (COMBINED REGISTRATION & RECHARGES)
      ======================================= */}
      <div className="admin-section">
        <h2 className="section-title">Pending Approvals & Recharges</h2>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Plan</th>
              <th>Registration Status</th>
              <th>Payment Path</th>
              <th>Actions</th>
              <th>Payment Ref (UTR)</th>
              <th>Screenshot</th>
            </tr>
          </thead>
          <tbody>
            {restaurants
              .filter((restaurant) => restaurant.status === "pending" || (restaurant.status === "approved" && restaurant.payment_status === "pending"))
              .map((restaurant) => {
                const isTrial = String(restaurant.request_type).toLowerCase() === "trial";

                return (
                  <tr key={restaurant.id}>
                    <td>
                      <button className="restaurant-link-btn" onClick={() => openRestaurantModal(restaurant.id)}>
                        {restaurant.name}
                      </button>
                    </td>

                    <td>{restaurant.plan}</td>

                    <td>
                      {restaurant.status === "pending" ? (
                        <span style={{ backgroundColor: "#eff6ff", color: "#2563eb", padding: "4px 10px", borderRadius: "4px", fontSize: "11px", fontWeight: "700", display: "inline-block" }}>
                          NEW REGISTER
                        </span>
                      ) : (
                        <span style={{ backgroundColor: "#f0fdf4", color: "#16a34a", padding: "4px 10px", borderRadius: "4px", fontSize: "11px", fontWeight: "700", display: "inline-block" }}>
                          PLAN RENEWAL
                        </span>
                      )}
                    </td>

                    <td>
                      {isTrial ? (
                        <span style={{ backgroundColor: "#fef3c7", color: "#d97706", padding: "4px 10px", borderRadius: "4px", fontSize: "11px", fontWeight: "800", border: "1px solid #f59e0b", display: "inline-block" }}>
                          🌱 FREE TRIAL
                        </span>
                      ) : (
                        <span style={{ backgroundColor: "#f3e8ff", color: "#7c3aed", padding: "4px 10px", borderRadius: "4px", fontSize: "11px", fontWeight: "800", border: "1px solid #8b5cf6", display: "inline-block" }}>
                          💰 PAID SIGNUP
                        </span>
                      )}
                    </td>

                    {/* 🚀 FIXED: Operational Actions Cell now allows declining both new entries and renewals cleanly with input reasons */}
                    <td className="actions-cell">
                      <button
                        className="approve-btn"
                        disabled={isProcessing[`sub-approve-${restaurant.id}`]}
                        onClick={() => handleApproveSubscription(restaurant.id)}
                      >
                        {isProcessing[`sub-approve-${restaurant.id}`] ? "Processing..." : "Approve"}
                      </button>

                      <button
                        className="decline-btn"
                        disabled={isProcessing[`sub-decline-${restaurant.id}`]}
                        onClick={() => openDeclineInterface(restaurant.id)}
                        style={{
                          backgroundColor: "#ef4444", color: "white", border: "none",
                          padding: "6px 12px", borderRadius: "4px", cursor: "pointer",
                          fontWeight: "600", marginLeft: "8px"
                        }}
                      >
                        {isProcessing[`sub-decline-${restaurant.id}`] ? "Processing..." : "Decline"}
                      </button>

                      {restaurant.status === "pending" && (
                        <button
                          className="delete-btn"
                          disabled={isProcessing[`delete-${restaurant.id}`]}
                          onClick={() => handleDelete(restaurant.id)}
                          style={{ marginLeft: "8px" }}
                        >
                          {isProcessing[`delete-${restaurant.id}`] ? "Deleting..." : "Delete"}
                        </button>
                      )}
                    </td>

                    <td>
                      <strong style={{ fontFamily: "monospace", color: "#334155", fontSize: "13px" }}>
                        {isTrial ? "TRIAL_REQUEST" : (restaurant.payment_reference || "N/A")}
                      </strong>
                    </td>

                    <td>
                      {restaurant.payment_screenshot && restaurant.payment_screenshot !== "FREE_TRIAL" ? (
                        <button
                          className="view-payment-btn"
                          onClick={() => {
                            let finalUrl = restaurant.payment_screenshot;

                            if (!finalUrl.startsWith("http://") && !finalUrl.startsWith("https://")) {
                              const baseUrl = import.meta.env.VITE_API_URL.endsWith('/') 
                                ? import.meta.env.VITE_API_URL.slice(0, -1) 
                                : import.meta.env.VITE_API_URL;
                                
                              const filePath = finalUrl.startsWith('/') ? finalUrl : `/${finalUrl}`;
                              finalUrl = `${baseUrl}${filePath}`;
                            }

                            setSelectedImage(finalUrl);
                            setShowImageModal(true);
                          }}
                        >
                          View Screenshot
                        </button>
                      ) : (
                        <span style={{ color: "#94a3b8", fontSize: "13px", fontStyle: "italic" }}>No Screenshot</span>
                      )}
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {/* =======================================
          ACTIVE RESTAURANTS
      ======================================= */}
      <div className="admin-section">
        <h2 className="section-title">Active Restaurants</h2>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Plan</th>
              <th>Status</th>
              <th>Expiry</th>
              <th>Days Left</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {restaurants
              .filter((restaurant) => restaurant.status === "approved" && restaurant.active === true && restaurant.days_left > 0)
              .map((restaurant) => (
                <tr key={restaurant.id}>
                  <td>
                    <button className="restaurant-link-btn" onClick={() => openRestaurantModal(restaurant.id)}>
                      {restaurant.name}
                    </button>
                  </td>
                  <td>{restaurant.plan}</td>
                  <td>
                    <span className="active-status">Active</span>
                  </td>
                  <td>
                    {restaurant.subscription_expires ? new Date(restaurant.subscription_expires).toLocaleDateString() : "N/A"}
                  </td>
                  <td>
                    <span className="active-status">{restaurant.days_left} days</span>
                  </td>
                  <td className="actions-cell">
                    <button
                      className="extend-btn"
                      disabled={isProcessing[`extend-${restaurant.id}`]}
                      onClick={() => handleExtendSubscription(restaurant.id)}
                    >
                      {isProcessing[`extend-${restaurant.id}`] ? "Saving..." : "+30 Days"}
                    </button>
                    <button
                      className="suspend-btn"
                      disabled={isProcessing[`suspend-${restaurant.id}`]}
                      onClick={() => handleSuspend(restaurant.id)}
                    >
                      {isProcessing[`suspend-${restaurant.id}`] ? "Blocking..." : "Block"}
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* =======================================
          BLOCKED RESTAURANTS
      ======================================= */}
      <div className="admin-section">
        <h2 className="section-title">Blocked Restaurants</h2>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Plan</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {restaurants
              .filter((restaurant) => restaurant.status === "suspended")
              .map((restaurant) => (
                <tr key={restaurant.id}>
                  <td>
                    <button className="restaurant-link-btn" onClick={() => openRestaurantModal(restaurant.id)}>
                      {restaurant.name}
                    </button>
                  </td>
                  <td>{restaurant.plan}</td>
                  <td>
                    <span className="expired-status">Blocked</span>
                  </td>
                  <td className="actions-cell">
                    <button
                      className="approve-btn"
                      disabled={isProcessing[`unblock-${restaurant.id}`]}
                      onClick={() => handleUnblock(restaurant.id)}
                    >
                      {isProcessing[`unblock-${restaurant.id}`] ? "Opening..." : "Unblock"}
                    </button>
                    <button
                      className="delete-btn"
                      disabled={isProcessing[`delete-${restaurant.id}`]}
                      onClick={() => handleDelete(restaurant.id)}
                    >
                      {isProcessing[`delete-${restaurant.id}`] ? "Deleting..." : "Delete"}
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* =======================================
          EXPIRED SUBSCRIPTIONS
      ======================================= */}
      <div className="admin-section">
        <h2 className="section-title">Expired Subscriptions</h2>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Plan</th>
              <th>Status</th>
              <th>Expired On</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {restaurants
              .filter((restaurant) => restaurant.days_left !== null && restaurant.days_left <= 0)
              .map((restaurant) => (
                <tr key={restaurant.id}>
                  <td>
                    <button className="restaurant-link-btn" onClick={() => openRestaurantModal(restaurant.id)}>
                      {restaurant.name}
                    </button>
                  </td>
                  <td>{restaurant.plan}</td>
                  <td>
                    <span className="expired-status">Expired</span>
                  </td>
                  <td>
                    {restaurant.subscription_expires ? new Date(restaurant.subscription_expires).toLocaleDateString() : "N/A"}
                  </td>
                  <td className="actions-cell">
                    <button
                      className="extend-btn"
                      disabled={isProcessing[`extend-${restaurant.id}`]}
                      onClick={() => handleExtendSubscription(restaurant.id)}
                    >
                      {isProcessing[`extend-${restaurant.id}`] ? "Extending..." : "Extend"}
                    </button>
                    <button
                      className="delete-btn"
                      disabled={isProcessing[`delete-${restaurant.id}`]}
                      onClick={() => handleDelete(restaurant.id)}
                    >
                      {isProcessing[`delete-${restaurant.id}`] ? "Deleting..." : "Delete"}
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* ── DETAILS MODAL POPUP ── */}
      {showModal && selectedRestaurant && (
        <div className="restaurant-modal-overlay">
          <div className="restaurant-modal">
            <div className="restaurant-modal-header">
              <h2>Restaurant Details</h2>
              <button className="close-modal-btn" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="restaurant-modal-body">
              <div className="detail-row"><strong>Name:</strong> <span>{selectedRestaurant.name}</span></div>
              <div className="detail-row"><strong>Email:</strong> <span>{selectedRestaurant.email}</span></div>
              <div className="detail-row"><strong>Phone:</strong> <span>{selectedRestaurant.phone}</span></div>
              <div className="detail-row"><strong>Plan:</strong> <span>{selectedRestaurant.plan}</span></div>
              <div className="detail-row"><strong>Status:</strong> <span>{selectedRestaurant.status}</span></div>
              <div className="detail-row"><strong>Payment:</strong> <span>{selectedRestaurant.payment_status}</span></div>
              <div className="detail-row"><strong>Manager:</strong> <span>{selectedRestaurant.manager_name}</span></div>
              <div className="detail-row"><strong>Manager Email:</strong> <span>{selectedRestaurant.manager_email}</span></div>
              <div className="detail-row">
                <strong>Created:</strong>
                <span>
                  {selectedRestaurant.created_at ? (
                    new Date(selectedRestaurant.created_at.endsWith("Z") ? selectedRestaurant.created_at : `${selectedRestaurant.created_at}Z`).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "medium" })
                  ) : "N/A"}
                </span>
              </div>
              <div className="detail-row">
                <strong>Subscription Started:</strong>
                <span>{selectedRestaurant.subscription_started_at ? new Date(selectedRestaurant.subscription_started_at).toLocaleString() : "N/A"}</span>
              </div>
              <div className="detail-row">
                <strong>Subscription Expires:</strong>
                <span>{selectedRestaurant.subscription_expires ? new Date(selectedRestaurant.subscription_expires).toLocaleString() : "N/A"}</span>
              </div>
              <div className="detail-row">
                <strong>Last Login:</strong>
                <span>
                  {selectedRestaurant.last_login ? (
                    new Date(selectedRestaurant.last_login.endsWith("Z") ? selectedRestaurant.last_login : `${selectedRestaurant.last_login}Z`).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "medium" })
                  ) : "Never"}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── IMAGE SNAPSHOT MODAL POPUP ── */}
      {showImageModal && (
        <div className="image-modal-overlay">
          <div className="image-modal">
            <button className="close-modal-btn" onClick={() => setShowImageModal(false)}>✕</button>
            <img src={selectedImage} alt="Payment Screenshot" className="payment-preview-image" />
          </div>
        </div>
      )}
    </div>
  );
}

export default SuperAdmin;