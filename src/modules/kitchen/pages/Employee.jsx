import { useEffect, useState } from "react";
import { createSocket } from "../../../services/socket";
import { useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import "./Employee.css";
import { apiFetch } from "../../../services/api";
import { useDarkMode } from "../../../context/DarkModeContext";
import { clearEmployeeData } from "../../../services/auth";
import ConfirmationModal from "../../../components/ConfirmationModal";
import ToastContainer from "../../../components/ToastContainer";
import { inferToastType } from "../../../utils/ToastHelpers";

function KitchenEmployee() {
  const [orders, setOrders] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const soundRef = useRef(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showLowStock, setShowLowStock] = useState(false);
  const [lowStockMessage, setLowStockMessage] = useState("");
  const [showRestore, setShowRestore] =
  useState(false);
  const [lowStockItems, setLowStockItems] =
  useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [menu, setMenu] = useState([]);
  const [settings, setSettings] =
  useState({});
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const [
  processingOrders,
  setProcessingOrders
] = useState([]);
  const [
  currentTime,
  setCurrentTime
] = useState(Date.now());

  // Confirmation Modal State
  const [confirmationModal, setConfirmationModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    isDangerous: false,
    confirmText: "Confirm",
    onConfirm: null,
  });

  const handleLogout = () => {
    clearEmployeeData();
    localStorage.removeItem("role");
    window.location.href = "/";
  };

const addNotification = (text, type) => {
  const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  setNotifications((prev) => {
    // 🎯 1. Check if an identical message is already active in the stack
    const isDuplicate = prev.some((n) => n.text === text);
    
    // 🛡️ If it's a duplicate, return the previous state as-is (stops the second toast)
    if (isDuplicate) return prev;

    // 🚀 Otherwise, add the new unique toast safely
    return [
      ...prev,
      {
        id,
        text,
        type: type || inferToastType(text),
      },
    ];
  });

  // ⏱️ Auto-dismiss timer remains at a snappy 2 seconds
  setTimeout(() => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, 2000);
};

const getWaitingTime = (
  createdAt
) => {

  if (!createdAt) {
    return "Unknown";
  }

  const created =
    new Date(createdAt);

  if (
    isNaN(created.getTime())
  ) {
    return "Unknown";
  }

  const now = new Date();

  const diffMs =
    now - created;

  const minutes =
    Math.floor(
      diffMs / 60000
    );

  if (minutes < 1) {
    return "Just now";
  }

  if (minutes < 60) {
    return `${minutes} mins ago`;
  }

  const hours =
    Math.floor(
      minutes / 60
    );

  return `${hours} hrs ago`;
};
  
/* =========================
   WEBSOCKET
========================= */

/* =========================
   EMPLOYEE WEBSOCKET
========================= */

useEffect(() => {
  const token = localStorage.getItem("employeeAccessToken");
  if (!token) return;

  let socket = null;
  let reconnectTimer = null;
  let pingInterval = null;

  const connectWebSocket = () => {
    socket = createSocket("employee");
    if (!socket) return;

    socket.onopen = () => {
      console.log("Connected ✅");
      // Keep alive ping
      pingInterval = setInterval(() => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send("ping");
        }
      }, 30000);
    };

    socket.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      console.log("WS:", msg);  
      console.log("MANAGER WS:", msg);

      /* --- NEW ORDER --- */
      if (msg.type === "new_order") {
        setOrders((prev) => {
          const exists = prev.some((o) => String(o.id) === String(msg.data.id));
          if (exists) return prev;
          return [...prev, msg.data];
        });

        if (soundRef.current) {
          // Reset sound to start if it was already playing
          soundRef.current.currentTime = 0;
    
          // Play with a catch block to handle browser "Autoplay" blocks gracefully
          const playPromise = soundRef.current.play();
    
          if (playPromise !== undefined) {
            playPromise.catch((error) => {
              console.warn("Playback failed. Browser blocked audio until user interaction.", error);
      });
    }
  }
        addNotification("🆕 New order received");
      }

      /* --- ORDER UPDATE --- */
      if (msg.type === "order_update") {
        if (msg.data.status === "rejected") {
          setOrders((prev) =>
            prev.filter((o) => String(o.id) !== String(msg.data.id))
          );
          addNotification(`Order ${msg.data.token_id} ${msg.data.status} ❌`);
        } else {
          setOrders((prev) =>
            prev.map((o) =>
              String(o.id) === String(msg.data.id)
                ? { ...o, status: msg.data.status }
                : o
            )
          );
          addNotification(`Order ${msg.data.token_id} ${msg.data.status} `);
        }
      }

      /* --- ORDER COMPLETED --- */
      if (msg.type === "order_completed") {
        setOrders((prev) =>
          prev.filter((o) => String(o.id) !== String(msg.data.id))
        );
        addNotification(`Order ${msg.data.token_id} completed `);
      }

      /* --- LOW STOCK ALERT RECEIVED --- */
      if (msg.type === "low_stock") {
        setLowStockItems((prev) => {
          // Check if it's already there (prevents duplicates)
          if (prev.some((item) => item.item_name === msg.data.name)) {
            return prev;
          }

          // Only notify if it's actually new to this client
          addNotification(`⚠️ Low Stock Alert: ${msg.data.name}`);

          return [
            ...prev,
            {
              item_name: msg.data.name,
              id: msg.data.id || Date.now(), // Fallback ID
            },
          ];
        });
      }

      /* --- STOCK RESTORED --- */
      if (msg.type === "stock_restored") {
        setLowStockItems((prev) => {
          const exists = prev.some((item) => item.item_name === msg.data.name);
          if (exists) {
            addNotification(`✅ Stock Restored: ${msg.data.name}`);
          }
          return prev.filter((item) => item.item_name !== msg.data.name);
        });
      }
    }; // END of onmessage

    socket.onerror = (err) => {
      console.error("WebSocket error:", err);
    };

    socket.onclose = (event) => {
      console.log("Socket closed:", event.code);
      if (pingInterval) clearInterval(pingInterval);

      // Auto reconnect
      reconnectTimer = setTimeout(() => {
        console.log("Reconnecting...");
        connectWebSocket();
      }, 2000);
    };
  };

  connectWebSocket();

  return () => {
    <audio ref={soundRef} src="/sounds/for_acceptance.wav" preload="auto" />
    if (reconnectTimer) clearTimeout(reconnectTimer);
    if (pingInterval) clearInterval(pingInterval);
    if (
      socket &&
      (socket.readyState === WebSocket.OPEN ||
        socket.readyState === WebSocket.CONNECTING)
    ) {
      socket.close();
    }
  };
}, []);



// 5. Update order status
const handleUpdate =
  async (
    id,
    status
  ) => {

    if (
      processingOrders.includes(id)
    ) return;

    setProcessingOrders(
      (prev) => [
        ...prev,
        id
      ]
    );

    try {

      const res=
      await apiFetch(
        `${import.meta.env.VITE_API_URL}/orders/${id}`,
        {
          method: "PATCH",

          body: JSON.stringify({
            status: status
          })
        },
        "employee"
      );



    } catch (err) {

      console.error(err);
      addNotification("❌ Failed to update order status");

    } finally {

      setProcessingOrders(
        (prev) =>
          prev.filter(
            (oId) =>
              oId !== id
          )
      );
    }
};


// 6. Complete order

const handleComplete =
  async (id) => {

    if (
      processingOrders.includes(id)
    ) return;

    setProcessingOrders(
      (prev) => [
        ...prev,
        id
      ]
    );

    try {

      await apiFetch(
        `${import.meta.env.VITE_API_URL}/orders/${id}/complete`,
        {
          method: "PATCH"
        },
        "employee"
      );

    } catch (err) {

      console.error(err);

    } finally {

      setProcessingOrders(
        (prev) =>
          prev.filter(
            (oId) =>
              oId !== id
          )
      );
    }
};


useEffect(() => {

  const token =
    localStorage.getItem(
      "employeeAccessToken"
    );

  if (!token) return;

  apiFetch(
    `${import.meta.env.VITE_API_URL}/orders`,
    {
      headers: {
        Authorization:
          `Bearer ${token}`,
      },
    }, "employee"
  )
    .then((res) => res.json())

    .then((data) => {

      console.log(data);

      if (Array.isArray(data)) {

        setOrders(data);
      }
    })

    .catch(console.error);

}, []);

useEffect(() => {

  const token =
    localStorage.getItem(
      "employeeAccessToken"
    );

  apiFetch(
    `${import.meta.env.VITE_API_URL}/menu`,
    {
      headers: {
        Authorization:
          `Bearer ${token}`,
      },
    }, "employee"
  )
    .then((res) => res.json())

    .then((data) => {

      if (Array.isArray(data)) {

        setMenu(data);

      } else {

        setMenu([]);
      }
    })

    .catch((err) =>
      console.error(
        "Failed to fetch menu:",
        err
      )
    );

}, []);

useEffect(() => {
  const token = localStorage.getItem("employeeAccessToken");
  if (!token) return;

  apiFetch(`${import.meta.env.VITE_API_URL}/low-stock`, {
    headers: { Authorization: `Bearer ${token}` },
  }, "employee")
    .then((res) => res.json())
    .then((data) => {
      // Backend returns a list of LowStock objects: [{item_name: "...", id: ...}]
      if (Array.isArray(data)) {
        setLowStockItems(data);
      }
    })
    .catch(console.error);
}, []);

useEffect(() => {

  apiFetch(
    `${import.meta.env.VITE_API_URL}/settings`,
    {},
    "employee"
  )
    .then((res) => res.json())

    .then((data) => {

      setSettings(data);
    })

    .catch(console.error);

}, []);


useEffect(() => {

  const timer =
    setInterval(() => {

      setCurrentTime(
        Date.now()
      );

    }, 60000);

  return () =>
    clearInterval(timer);

}, []);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const res = await apiFetch(`${import.meta.env.VITE_API_URL}/settings/users/me`, { method: "GET" }, "employee");
        if (res.ok) {
          const userData = await res.json();
          setCurrentUser(userData);
        }
      } catch (err) {
        console.error("❌ Failed to fetch active employee profile:", err);
      }
    };
    fetchUserProfile();
  }, []);

return (
    <div className="employee-container">

      {/* HIDDEN AUDIO TAG - Place it here! */}
    <audio 
      ref={soundRef} 
      src="/sounds/for_acceptance.wav" 
      preload="auto" 
      style={{ display: 'none' }} 
    />

      {/* ========== SIDEBAR ========== */}
      <aside className="employee-sidebar">
<div className="sidebar-header">
  {/* 🚀 DYNAMIC LOGO CHECK: Shows the restaurant logo if it exists, otherwise falls back to the chef icon */}
  {settings?.logo_url ? (
    <img
      src={settings.logo_url}
      alt="logo"
      className="sidebar-logo"
    />
  ) : (
    <span className="sidebar-icon">👨‍🍳</span>
  )}
  <h1>{settings?.restaurant_name || "Restaurant"} Employee</h1>
</div>

        <nav className="sidebar-nav">
          <div
            className={`sidebar-link ${!showLowStock && !showRestore ? 'active' : ''}`}
            onClick={() => {
              setShowLowStock(false);
              setShowRestore(false);
            }}
          >
            <span className="sidebar-icon">📝</span>
            <span>Orders</span>
          </div>

          <div
            className={`sidebar-link ${showLowStock ? 'active' : ''}`}
            onClick={() => {
              setShowLowStock(true);
              setShowRestore(false);
            }}
          >
            <span className="sidebar-icon">⚠️</span>
            <span>Low Stock Alert</span>
          </div>
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-link" onClick={toggleDarkMode}>
            <span className="sidebar-icon">{isDarkMode ? "☀️" : "🌙"}</span>
            <span>{isDarkMode ? "Light Mode" : "Dark Mode"}</span>
          </div>

          <div className="sidebar-link logout-link" onClick={handleLogout}>
            <span className="sidebar-icon">🚪</span>
            <span>Logout</span>
          </div>
        </div>
      </aside>

      {/* ========== MAIN CONTENT ========== */}
      <main className="employee-main">
        
        {/* ========== ORDERS VIEW ========== */}
        {!showLowStock && !showRestore && (
          <div className="orders-page">
                    {/* ✉️ TOP RIGHT EMPLOYEE EMAIL CARD */}
      {currentUser?.email && (
  <div className="employee-profile-card">
    <span className="employee-profile-label">
      Logged In
    </span>

    <span className="employee-profile-email">
      {currentUser.email}
    </span>
  </div>
)}
            <div className="main-header" style={{ borderTop: 'none' }}>
              <h1>📝 Incoming Orders</h1>
            </div>

            {orders.length === 0 ? (
              <div className="card" style={{ textAlign: "center", padding: "60px 20px" }}>
                <p style={{ fontSize: "18px", color: "var(--text-secondary)", textAlign: "left" }}>
                  No orders at the moment. Please wait...
                </p>
              </div>
            ) : (
              <div className="grid grid-3">
                {orders.map((order) => (
                  <motion.div
                    key={order.id}
                    className={`order-card ${order.status}`}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3 }}
                  >
                    
                    <div className="order-header">
                      <div className="order-token">{settings?.token_prefix}-{order.token_id}</div>
                      <span className={`order-status-badge ${order.status}`}>
                        {order.status === "pending" ? "⏳ Pending" : "✅ Accepted"}
                      </span>
                    </div>

                    {order.items && order.items.length > 0 && (
                      <div className="order-items">
                        <div className="order-items-title">Items to Prepare:</div>
                        <div className="order-items-list">
                          {order.items.map((item, idx) => (
                            <div key={idx} className="order-item">
                              <span className="order-item-name">{item.name}</span>
                              <span className="order-item-qty">x{item.quantity}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="order-details">
                      <div className="order-detail-row">
                        <span className="order-detail-label">Payment:</span>
                        <span className="order-detail-value">
                          {order.payment_mode === "cash" ? "💵 Cash" : "💳 Online"}
                        </span>
                      </div>
                      <div className="order-detail-row">
                        <span className="order-detail-label">Total:</span>
                        <span className="order-detail-value" style={{ color: "var(--primary-color)", fontWeight: "700" }}>
                          ₹{Number(order.total_price || 0).toFixed(2)}
                        </span>
                      </div>
                    </div>

                    <div className="order-actions">
                      {order.status === "pending" && (
                        <>
                          <button
                            className="btn btn-success btn-sm"
                            onClick={() => handleUpdate(order.id, "accepted")}
                            disabled={processingOrders.includes(order.id)}
                          >
                            {processingOrders.includes(order.id) ? "Processing..." : "✅ Accept"}
                          </button>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => {
                              setConfirmationModal({
                                isOpen: true,
                                title: "Reject Order",
                                message: `Are you sure you want to reject order #${order.token_id}? This action cannot be undone.`,
                                isDangerous: true,
                                confirmText: "Reject",
                                onConfirm: async () => {
                                  setConfirmationModal((prev) => ({ ...prev, isOpen: false }));
                                  await handleUpdate(order.id, "rejected");
                                },
                              });
                            }}
                            disabled={processingOrders.includes(order.id)}
                          >
                            {processingOrders.includes(order.id) ? "Processing..." : "❌ Reject"}
                          </button>
                          <p
  style={{
    marginTop: "8px",
    fontSize: "13px",
    fontWeight: "600",

    color: "#dc2626"
  }}
>
  🕒 Waiting:
  {" "}
  {getWaitingTime(
    order.created_at
  )}
</p>
                        </>
                      )}

                      {order.status === "accepted" && (
                        <button
                          className="btn btn-success btn-block"
                          onClick={() => handleComplete(order.id)}
                          disabled={processingOrders.includes(order.id)}
                        >
                          {processingOrders.includes(order.id) ? "Processing..." : "✅ Mark as Completed"}
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}


{/* ========== LOW STOCK ALERT VIEW ========== */}

{showLowStock && (
  <>
    <div className="main-header">
      <h1>⚠️ Send Low Stock Alert</h1>
    </div>

    <div className="stock-section">

      

      {/* AVAILABLE ITEMS */}
<div className="stock-card alert">

  <div className="stock-header modern">

    <div className="stock-header-left">
      <h2>📦 Available Items</h2>
      <p>Items ready for orders</p>
    </div>

    <div className="stock-count-badge">
      {
        menu.filter(
          (item) =>
            !lowStockItems.some(
              (low) =>
                low.item_name === item.name
            )
        ).length
      }
    </div>

  </div>

  <div className="stock-item-list">

    {menu
      .filter(
        (item) =>
          !lowStockItems.some(
            (low) =>
              low.item_name === item.name
          )
      )
      .map((item, index) => (

        <motion.div
          key={index}
          className="stock-item"
          initial={{
            opacity: 0,
            y: 15
          }}
          animate={{
            opacity: 1,
            y: 0
          }}
          transition={{
            duration: 0.3,
            delay: index * 0.05
          }}
        >

          <div className="stock-row">

            <div className="stock-info">
              <div className="stock-name">
                {item.name}
              </div>
            </div>

            <button
              className="btn btn-warning stock-btn"

              onClick={async () => {
  try {
    const response = await apiFetch(`${import.meta.env.VITE_API_URL}/low-stock`, {
      method: "POST",
      body: JSON.stringify({ name: item.name }),
    }, "employee");

    if (response.ok) {
      console.error("failed to send alert")
    }
  } catch (err) {
    console.error("Failed to send alert:", err);
  }
}}
            >
              ⚠ Send Alert
            </button>

          </div>

        </motion.div>
      ))}

  </div>

</div>

{/* LOW STOCK ITEMS */}
<div className="stock-card restore">

  <div className="stock-header modern">

    <div className="stock-header-left">
      <h2>⚠️ Low Stock Items</h2>
      <p>Items needing refill</p>
    </div>

    <div className="stock-count-badge warning">
      {lowStockItems.length}
    </div>

  </div>

  <div className="stock-restore-list">

    {lowStockItems.length === 0 ? (

      <div className="empty-stock-state">
        ✅ No low stock items
      </div>

    ) : (

      lowStockItems.map(
        (itemData, index) => (

          <motion.div
            key={itemData.id || index}
            className="stock-restore-item"
            initial={{
              opacity: 0,
              y: 15
            }}
            animate={{
              opacity: 1,
              y: 0
            }}
            transition={{
              duration: 0.3,
              delay: index * 0.05
            }}
          >

            <div className="stock-row">

              <div className="stock-info">
                <div className="stock-name">
                  {itemData.item_name}
                </div>
              </div>

              <button
  className="btn btn-success stock-btn"
  onClick={async () => {
  try {
    const response = await apiFetch(
      `${import.meta.env.VITE_API_URL}/low-stock/${itemData.item_name}`,
      { method: "DELETE" },
      "employee"
    );

  } catch (err) {
    console.error("Failed to restore item:", err);
  }
}}
>
  ♻ Restore
</button>

            </div>

          </motion.div>
        )
      )

    )}

  </div>



</div>
</div>
  </>
)}



{/* ========== RESTORE STOCK VIEW ========== */}




        <ToastContainer notifications={notifications} />

        {lowStockMessage && (
          <motion.div
            className="toast toast--warning toast--anchored-bottom"
            role="status"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            <span className="toast-icon" aria-hidden="true">
              !
            </span>
            <span className="toast-message">{lowStockMessage}</span>
          </motion.div>
        )}
      </main>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmationModal.isOpen}
        title={confirmationModal.title}
        message={confirmationModal.message}
        isDangerous={confirmationModal.isDangerous}
        confirmText={confirmationModal.confirmText}
        onConfirm={confirmationModal.onConfirm || (() => {})}
        onCancel={() => setConfirmationModal({ ...confirmationModal, isOpen: false })}
      />
    </div>
  );
}

export default KitchenEmployee;
