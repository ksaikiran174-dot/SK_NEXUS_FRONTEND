import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import './SuperAdmin.css'

function SuperAdmin() {
  const [restaurants, setRestaurants] = useState([]);

  const [selectedRestaurant, setSelectedRestaurant] =
  useState(null);

  const [showModal, setShowModal] =
  useState(false);

  const [selectedImage, setSelectedImage] =
  useState("");

  const [showImageModal, setShowImageModal] =
  useState(false);

  const [pendingRecharges, setPendingRecharges] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    fetchRestaurants();
  }, []);

  const handleLogout = () => {
    // Clear all super admin related session keys
    localStorage.removeItem("superAdminAccessToken");
    localStorage.removeItem("superAdminRefreshToken");
    localStorage.removeItem("role");
    
    // Force redirect directly back to the role-selection gateway screen
    // Since App.jsx handles role-selection state changes on route mounts, 
    // wrapping it via window location reload or window state triggers a clean reset.
    window.location.reload(); 
  };

const formatDateTime = (dateString) => {
  if (!dateString) return "Never";
  
  // Create a proper JS Date object (JS handles the UTC to Local conversion automatically)
  const date = new Date(dateString);
  
  // Check if it's a valid date
  if (isNaN(date.getTime())) return dateString; 

  // Format it cleanly into a readable local string (e.g., "June 8, 2026, 1:28 AM")
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  });
};

// 1️⃣ Keep your exact function just like it is bro
const fetchRestaurants = async () => {
  try {
    const response = await fetch(`${import.meta.env.VITE_API_URL}/super-admin/restaurants`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("superAdminAccessToken")}`
      }
    });
    const data = await response.json();
    console.log(data);
    setRestaurants(Array.isArray(data) ? data : []);
  } catch (error) {
    console.error(error);
    setRestaurants([]);
  }
};

// 2️⃣ 🚀 THE SIMPLE SYNC ENGINE: Put this right below it
useEffect(() => {
  // Call it immediately so the page doesn't look blank on load
  fetchRestaurants();

  // ⏱️ Run your exact function automatically every 5 seconds!
  const intervalId = setInterval(() => {
    console.log("🔄 Background syncing restaurants data...");
    fetchRestaurants();
  }, 5000); // 5000ms = 5 seconds

  // 🧹 Clean up the timer when you leave the page so it doesn't leak memory
  return () => clearInterval(intervalId);
}, []); // 👈 Empty array means run this setup once on mount

  const approveRestaurant = async (id) => {
    try {
      await fetch(`${import.meta.env.VITE_API_URL}/super-admin/restaurants/${id}/approve`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("superAdminAccessToken")}`
        }
      });
      fetchRestaurants();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSuspend =
async (id) => {

  try {

    await fetch(

      `${import.meta.env.VITE_API_URL}/super-admin/restaurants/${id}/suspend`,

      {
        method: "PUT",

        headers: {
          Authorization:
            `Bearer ${localStorage.getItem("superAdminAccessToken")}`
        }
      }
    );

    fetchRestaurants();

  } catch (err) {

    console.error(err);
  }
};

  const handleApprove =
async (id) => {

  try {

    await fetch(

      `${import.meta.env.VITE_API_URL}/super-admin/restaurants/${id}/approve`,

      {
        method: "PUT",

        headers: {
          Authorization:
            `Bearer ${localStorage.getItem("superAdminAccessToken")}`
        }
      }
    );

    fetchRestaurants();

  } catch (err) {

    console.error(err);
  }
};  

  const handleDelete =
async (id) => {

  const confirmDelete =
    window.confirm(
      "Delete this restaurant?"
    );

  if (!confirmDelete) return;

  try {

    await fetch(

      `${import.meta.env.VITE_API_URL}/super-admin/restaurants/${id}`,

      {
        method: "DELETE",

        headers: {
          Authorization:
            `Bearer ${localStorage.getItem("superAdminAccessToken")}`
        }
      }
    );

    fetchRestaurants();

  } catch (err) {

    console.error(err);
  }
};

// 🟢 1️⃣ UPDATE: APPROVE SUBSCRIPTION REQUEST ROUTE HANDLER
const handleApproveSubscription = async (restaurantId) => {
  try {
    const token = localStorage.getItem("superAdminAccessToken");
    
    const response = await fetch(`${import.meta.env.VITE_API_URL}/super-admin/restaurants/${restaurantId}/approve`, {
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });

    const data = await response.json();

    if (response.ok) {
      // 🚀 SUCCESS MESSAGE ALERT
      alert(`🎉 Success! Subscription for the restaurant has been approved and extended by 30 days.`);
      
      // 🚀 REMOVE FROM UI TABLE INSTANTLY
      setRestaurants(prevRestaurants => 
        prevRestaurants.filter(r => r.id !== restaurantId)
      );
      
      // Refresh your state array list here to update the dashboard view instantly
      // e.g., fetchRestaurants();
    } else {
      alert(`❌ Failed to approve: ${data.detail || "Unknown error occurred"}`);
    }
  } catch (error) {
    console.error("Approval endpoint error:", error);
    alert("❌ Network connection failure. Could not connect to backend server.");
  }
};


// 🔴 2️⃣ UPDATE: DECLINE SUBSCRIPTION REQUEST ROUTE HANDLER
const handleDeclineSubscription = async (restaurantId, declineReason) => {
  // Guard clause checking if they forgot to give a feedback reason text string
  if (!declineReason || declineReason.trim() === "") {
    alert("⚠️ You must provide a rejection reason so the restaurant manager knows why!");
    return;
  }

  try {
    const token = localStorage.getItem("superAdminAccessToken");

    const response = await fetch(`http://127.0.0.1:8000/super-admin/restaurants/${restaurantId}/decline`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({
        reason: declineReason
      })
    });

    const data = await response.json();

    if (response.ok) {
      // 🚀 DECLINE MESSAGE ALERT
      alert(`📉 Request Declined! The manager has been notified with the reason: "${declineReason}"`);
      
      // 🚀 REMOVE FROM UI TABLE INSTANTLY
      setRestaurants(prevRestaurants => 
        prevRestaurants.filter(r => r.id !== restaurantId)
    );  

      // Refresh your state array list here to clean the screen view layout
      // e.g., fetchRestaurants();
    } else {
      alert(`❌ Failed to decline: ${data.detail || "Validation check error"}`);
    }
  } catch (error) {
    console.error("Decline action handler error:", error);
    alert("❌ Network connection failure. Could not process request.");
  }
};

const handleExtendSubscription = async (restaurantId) => {

  try {

    const response = await fetch(

      `${import.meta.env.VITE_API_URL}/super-admin/restaurants/${restaurantId}/extend?days=30`,

      {

        method: "PUT",

        headers: {

          Authorization:
            `Bearer ${localStorage.getItem("superAdminAccessToken")}`
        }
      }
    );

    if (!response.ok) {

      throw new Error(
        "Failed to extend subscription"
      );
    }

    // Refresh restaurants
    fetchRestaurants();

  } catch (error) {

    console.error(error);
  }
};

const openRestaurantModal = async (id) => {

  try {

    const response = await fetch(

      `${import.meta.env.VITE_API_URL}/super-admin/restaurants/${id}`,

      {
        headers: {
          Authorization:
            `Bearer ${localStorage.getItem("superAdminAccessToken")}`
        }
      }
    );

    const data = await response.json();

    setSelectedRestaurant(data);

    setShowModal(true);

  } catch (error) {

    console.error(error);
  }
};

const handleUnblock = async (id) => {

  try {

    await fetch(

      `${import.meta.env.VITE_API_URL}/super-admin/restaurants/${id}/unblock`,

      {
        method: "PUT",

        headers: {
          Authorization:
            `Bearer ${localStorage.getItem("superAdminAccessToken")}`
        }
      }
    );

    fetchRestaurants();

  } catch (err) {

    console.error(err);
  }
};



return (

  <div className="super-admin-page">

    {/* =======================================
          SUPER ADMIN HEADER WITH LOGOUT BUTTON
      ======================================= */}
      <div className="super-admin-header-row" style={{ display: "flex", justifyContent: "between", alignItems: "center", marginBottom: "30px", width: "100%" }}>
        <h1 className="super-admin-title" style={{ margin: 0 }}>
          Super Admin Panel
        </h1>
        <button 
          className="logout-btn" 
          onClick={handleLogout}
          style={{
            padding: "10px 20px",
            background: "#ef4444",
            color: "white",
            border: "none",
            borderRadius: "6px",
            fontWeight: "600",
            cursor: "pointer",
            marginLeft: "auto"
          }}
        >
          Logout 🚪
        </button>
      </div>

{/* =======================================
    PENDING APPROVALS (COMBINED REGISTRATION & RECHARGES)
======================================= */}

<div className="admin-section">

  <h2 className="section-title">
    Pending Approvals & Recharges
  </h2>

  <table className="admin-table">

    <thead>
      <tr>
        <th>Name</th>
        <th>Plan</th>
        <th>Type</th> 
        <th>Actions</th>
        <th>Payment Ref (UTR)</th>
        <th>Screenshot</th>
      </tr>
    </thead>

    <tbody>

      {restaurants
        .filter(
          (restaurant) =>
            // 🚀 MATCHES: New registration OR an approved restaurant with a pending recharge!
            restaurant.status === "pending" || 
            (restaurant.status === "approved" && restaurant.payment_status === "pending")
        )
        .map((restaurant) => (

          <tr key={restaurant.id}>

            <td>
              <button
                className="restaurant-link-btn"
                onClick={() => openRestaurantModal(restaurant.id)}
              >
                {restaurant.name}
              </button>
            </td>

            <td>{restaurant.plan}</td>

            {/* 🚀 DYNAMIC TYPE BADGE COL */}
            <td>
              {restaurant.status === "pending" ? (
                <span style={{ backgroundColor: "#eff6ff", color: "#2563eb", padding: "3px 8px", borderRadius: "4px", fontSize: "12px", fontWeight: "700" }}>
                  NEW REGISTER
                </span>
              ) : (
                <span style={{ backgroundColor: "#f0fdf4", color: "#16a34a", padding: "3px 8px", borderRadius: "4px", fontSize: "12px", fontWeight: "700" }}>
                  PLAN RENEWAL
                </span>
              )}
            </td>

            <td className="actions-cell">
  {/* ✅ APPROVE BUTTON (Works for both new registers and early plan renewals) */}
  <button
    className="approve-btn"
    onClick={() => handleApproveSubscription(restaurant.id)}
  >
    Approve
  </button>

  {/* DYNAMIC SECOND BUTTON BASED ON REGISTER STATUS */}
  {restaurant.status === "pending" ? (
    // Case A: New Register -> Keep original hard-cleanup Delete option
    <button
      className="delete-btn"
      onClick={() => handleDelete(restaurant.id)}
    >
      Delete
    </button>
  ) : (
    // Case B: Plan Renewal -> Show Decline option running our state machine reason feedback logic!
    <button
      className="decline-btn"
      onClick={() => {
        const reason = prompt("🚨 Enter the reason for declining this request (This note will be shown to the restaurant manager):");
        
        if (reason === null) {
          // Admin clicked "Cancel" on the prompt window box -> do nothing safely
          return; 
        }

        if (reason.trim() !== "") {
          handleDeclineSubscription(restaurant.id, reason);
        } else {
          alert("⚠️ You must provide a valid text reason to decline this renewal request!");
        }
      }}
      style={{
        backgroundColor: "#ef4444",
        color: "white",
        border: "none",
        padding: "6px 12px",
        borderRadius: "4px",
        cursor: "pointer",
        fontWeight: "600",
        marginLeft: "8px",
        transition: "background-color 0.2s"
      }}
      onMouseOver={(e) => e.target.style.backgroundColor = "#dc2626"}
      onMouseOut={(e) => e.target.style.backgroundColor = "#ef4444"}
    >
      Decline
    </button>
  )}
</td>
            
            {/* Display the UTR Reference */}
            <td>
              <strong style={{ fontFamily: "monospace", color: "#334155" }}>
                {restaurant.payment_reference || "N/A"}
              </strong>
            </td>
            
            {/* Interactive Image Preview Box Modals */}
            <td>
              {restaurant.payment_screenshot ? (
                <button
                  className="view-payment-btn"
                  onClick={() => {
                    setSelectedImage(
                      `${import.meta.env.VITE_API_URL}${restaurant.payment_screenshot}`
                    );
                    setShowImageModal(true);
                  }}
                >
                  View Screenshot
                </button>
              ) : (
                "No Screenshot"
              )}
            </td>

          </tr>
        ))}

    </tbody>

  </table>

</div>

    {/* =======================================
    ACTIVE RESTAURANTS
======================================= */}

<div className="admin-section">

  <h2 className="section-title">
    Active Restaurants
  </h2>

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
        .filter(
          (restaurant) =>
            restaurant.status === "approved" &&
            restaurant.active === true &&
            restaurant.days_left > 0
        )
        .map((restaurant) => (

          <tr key={restaurant.id}>

            <td>

  <button
    className="restaurant-link-btn"
    onClick={() =>
      openRestaurantModal(
        restaurant.id
      )
    }
  >
    {restaurant.name}
  </button>

</td>

            <td>{restaurant.plan}</td>

            <td>
              <span className="active-status">
                Active
              </span>
            </td>

            <td>

              {restaurant.subscription_expires
                ? new Date(
                    restaurant.subscription_expires
                  ).toLocaleDateString()
                : "N/A"}

            </td>

            <td>

              <span className="active-status">
                {restaurant.days_left} days
              </span>

            </td>

            <td className="actions-cell">

              <button
                className="extend-btn"
                onClick={() =>
                  handleExtendSubscription(
                    restaurant.id
                  )
                }
              >
                +30 Days
              </button>

              <button
                className="suspend-btn"
                onClick={() =>
                  handleSuspend(
                    restaurant.id
                  )
                }
              >
                Block
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

  <h2 className="section-title">
    Blocked Restaurants
  </h2>

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
        .filter(
          (restaurant) =>
            restaurant.status === "suspended"
        )
        .map((restaurant) => (

          <tr key={restaurant.id}>

            <td>

  <button
    className="restaurant-link-btn"
    onClick={() =>
      openRestaurantModal(
        restaurant.id
      )
    }
  >
    {restaurant.name}
  </button>

</td>

            <td>{restaurant.plan}</td>

            <td>

              <span className="expired-status">
                Blocked
              </span>

            </td>

            <td className="actions-cell">

              <button
  className="approve-btn"
  onClick={() =>
    handleUnblock(restaurant.id)
  }
>
  Unblock
</button>

              <button
                className="delete-btn"
                onClick={() =>
                  handleDelete(
                    restaurant.id
                  )
                }
              >
                Delete
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

      <h2 className="section-title">
        Expired Subscriptions
      </h2>

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
            .filter(
              (restaurant) =>
                restaurant.days_left !== null &&
                restaurant.days_left <= 0
            )
            .map((restaurant) => (

              <tr key={restaurant.id}>

                <td>

  <button
    className="restaurant-link-btn"
    onClick={() =>
      openRestaurantModal(
        restaurant.id
      )
    }
  >
    {restaurant.name}
  </button>

</td>

                <td>{restaurant.plan}</td>

                <td>
                  <span className="expired-status">
                    Expired
                  </span>
                </td>

                <td>

                  {restaurant.subscription_expires
                    ? new Date(
                        restaurant.subscription_expires
                      ).toLocaleDateString()
                    : "N/A"}

                </td>

                <td className="actions-cell">

                  <button
                    className="extend-btn"
                    onClick={() =>
                      handleExtendSubscription(
                        restaurant.id
                      )
                    }
                  >
                    Extend
                  </button>

                  <button
                    className="delete-btn"
                    onClick={() =>
                      handleDelete(
                        restaurant.id
                      )
                    }
                  >
                    Delete
                  </button>

                </td>

              </tr>
            ))}

        </tbody>

      </table>

    </div>
{showModal && selectedRestaurant && (

  <div className="restaurant-modal-overlay">

    <div className="restaurant-modal">

      <div className="restaurant-modal-header">

        <h2>
          Restaurant Details
        </h2>

        <button
          className="close-modal-btn"
          onClick={() =>
            setShowModal(false)
          }
        >
          ✕
        </button>

      </div>

      <div className="restaurant-modal-body">

        <div className="detail-row">
          <strong>Name:</strong>
          <span>{selectedRestaurant.name}</span>
        </div>

        <div className="detail-row">
          <strong>Email:</strong>
          <span>{selectedRestaurant.email}</span>
        </div>

        <div className="detail-row">
          <strong>Phone:</strong>
          <span>{selectedRestaurant.phone}</span>
        </div>

        <div className="detail-row">
          <strong>Plan:</strong>
          <span>{selectedRestaurant.plan}</span>
        </div>

        <div className="detail-row">
          <strong>Status:</strong>
          <span>{selectedRestaurant.status}</span>
        </div>

        <div className="detail-row">
          <strong>Payment:</strong>
          <span>
            {selectedRestaurant.payment_status}
          </span>
        </div>

        <div className="detail-row">
          <strong>Manager:</strong>
          <span>
            {selectedRestaurant.manager_name}
          </span>
        </div>

        <div className="detail-row">
          <strong>Manager Email:</strong>
          <span>
            {selectedRestaurant.manager_email}
          </span>
        </div>

<div className="detail-row">
          <strong>Created:</strong>
          <span>
            {selectedRestaurant.created_at ? (
              new Date(
                selectedRestaurant.created_at.endsWith("Z") 
                  ? selectedRestaurant.created_at 
                  : `${selectedRestaurant.created_at}Z`
              ).toLocaleString(undefined, {
                dateStyle: "medium",
                timeStyle: "medium" // 🚀 Changed to medium to show seconds
              })
            ) : (
              "N/A"
            )}
          </span>
        </div>

        <div className="detail-row">
          <strong>Subscription Started:</strong>
          <span>

            {selectedRestaurant.subscription_started_at

              ? new Date(
                  selectedRestaurant.subscription_started_at
                ).toLocaleString()

              : "N/A"}

          </span>
        </div>

        <div className="detail-row">
          <strong>Subscription Expires:</strong>
          <span>

            {selectedRestaurant.subscription_expires

              ? new Date(
                  selectedRestaurant.subscription_expires
                ).toLocaleString()

              : "N/A"}

          </span>
        </div>

<div className="detail-row">
          <strong>Last Login:</strong>
          <span>
            {selectedRestaurant.last_login ? (
              new Date(
                selectedRestaurant.last_login.endsWith("Z") 
                  ? selectedRestaurant.last_login 
                  : `${selectedRestaurant.last_login}Z`
              ).toLocaleString(undefined, {
                dateStyle: "medium",
                timeStyle: "medium" // 🚀 Changed to medium to show seconds
              })
            ) : (
              "Never"
            )}
          </span>
        </div>

      </div>

    </div>

  </div>
)}
{showImageModal && (

  <div className="image-modal-overlay">

    <div className="image-modal">

      <button
        className="close-modal-btn"
        onClick={() =>
          setShowImageModal(false)
        }
      >
        ✕
      </button>

      <img
        src={selectedImage}
        alt="Payment Screenshot"
        className="payment-preview-image"
      />

    </div>

  </div>
)}
  </div>
  
);
}

export default SuperAdmin;
