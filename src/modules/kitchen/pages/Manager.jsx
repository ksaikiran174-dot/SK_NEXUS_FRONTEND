import { useEffect, useState } from "react";
import { createSocket } from "../../../services/socket";
import { useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useNavigate } from
"react-router-dom";
import { useDarkMode } from "../../../context/DarkModeContext";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line
} from "recharts";
import "./Manager.css";
import { apiFetch } from "../../../services/api";
import { clearManagerData } from "../../../services/auth";
import ConfirmationModal from "../../../components/ConfirmationModal";
import ToastContainer from "../../../components/ToastContainer";
import { inferToastType } from "../../../utils/ToastHelpers";
import { saveOfflineOrder } from "../../../utils/db";
import { downloadSalesReport } from "../../../utils/reports";
import EmployeeRegister from "../../../pages/EmployeeRegister";

// 🎯 HIGH-SPEED COMPRESSION + CLOUDINARY FIXED UPLOADER
const uploadDirectToCloudinary = async (file) => {
  if (!file) return "";

  const compressImage = (sourceFile) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(sourceFile);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          
          const MAX_WIDTH = 600; 
          let width = img.width;
          let height = img.height;

          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob((blob) => {
            resolve(blob);
          }, "image/jpeg", 0.75);
        };
      };
    });
  };

  try {
    console.log(`⏳ Original raw size: ${(file.size / 1024 / 1024).toFixed(2)} MB`);
    
    // 1. Get the compressed binary blob
    const compressedBlob = await compressImage(file);
    
    // 🛠️ THE FIX: Convert the raw blob into a fully valid File instance wrapper
    const optimizedFile = new File([compressedBlob], "menu_item.jpg", { type: "image/jpeg" });
    console.log(`⚡ Compressed optimized size: ${(optimizedFile.size / 1024).toFixed(2)} KB`);

    const formData = new FormData();
    
    // 2. Append our brand new clean File object instance
    formData.append("file", optimizedFile);
    
    // ⚠️ COPIED EXACTLY FROM YOUR CREDENTIAL LOG DATA 👇
    formData.append("upload_preset", "sk_nexus_preset"); // Ensure this is your correct preset string name!
    const cloudName = "dcwc8blaa"; 

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      { method: "POST", body: formData }
    );

    if (!response.ok) {
      // Let's log the exact error reason from Cloudinary if it fails again
      const errData = await response.json();
      console.error("Cloudinary Engine Rejection Reason:", errData);
      throw new Error(errData.error?.message || "Direct upload failed");
    }

    const data = await response.json();
    return data.secure_url; 
  } catch (error) {
    console.error("Cloudinary upload utility crashed:", error);
    throw error;
  }
};

function KitchenManager() {
  const [orders, setOrders] = useState([]);
  const [item, setItem] = useState("");
  const [qty, setQty] = useState("");
  const [notifications, setNotifications] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedItem, setSelectedItem] = useState(null);
  const [filterOrderStatus, setFilterOrderStatus] = useState("all");
  const [filterOrderToken, setFilterOrderToken] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [cart, setCart] = useState([]);
  const [paymentMode, setPaymentMode] = useState("cash");
  const [showMenu, setShowMenu] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [selectedInfoItem, setSelectedInfoItem] = useState(null);
  const [filterToken, setFilterToken] = useState("");
  const [filterPayment, setFilterPayment] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [analytics, setAnalytics] = useState(null);
  const [lowStockItems, setLowStockItems] = useState([]);
  const refillStockSoundRef = useRef(null);
  const lowStockSoundRef = useRef(null);
  const acceptSoundRef = useRef(null);
  const completeSoundRef = useRef(null);
  const rejectSoundRef = useRef(null);
  const [menu, setMenu] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(null);
  const [showEmployeeRegister, setShowEmployeeRegister] = useState(false);
  const [editingItem, setEditingItem] =
  useState(null);
  const [editName, setEditName] =
  useState("");
  const [editPrice, setEditPrice] =
  useState("");
  const [editDescription, setEditDescription] =
  useState("");
  const [editImage, setEditImage] =
  useState("");
  const [showManageMenu, setShowManageMenu] = useState(false);
  const [showSubscription, setShowSubscription] = useState(false);
  const [newItemName, setNewItemName] =
  useState("");
  const [newItemPrice, setNewItemPrice] =
  useState("");
  const [newItemDescription,
  setNewItemDescription] =
  useState("");
  const [newItemImage,
  setNewItemImage] =
  useState("");
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [selectedFile, setSelectedFile] =
  useState(null);
  const [previewImage, setPreviewImage] =
  useState("");
  const fileInputRef = useRef(null);
  const [editSelectedFile,
  setEditSelectedFile] =
  useState(null);
  const [editPreviewImage,
  setEditPreviewImage] =
  useState("");
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const [closeDaySummary, setCloseDaySummary] = useState(null); // Holds { totalRevenue, cashSales, onlineSales, date }
  const [masterCycleSummary, setMasterCycleSummary] = useState(null);
  // Add these with your other useState lines at the top of the component
  const [newItemCategory, setNewItemCategory] = useState("");
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [customCategoryInput, setCustomCategoryInput] = useState("");
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [subscriptionTimeLeft, setSubscriptionTimeLeft] = useState('');
  const [isExpiryCritical, setIsExpiryCritical] = useState(false);
  const [showRechargeModal, setShowRechargeModal] = useState(false);
  const [rechargePending, setRechargePending] = useState(false); // 👈 Tracks if a request was submitted
  const [submittedUtr, setSubmittedUtr] = useState('');

  const [showSummaryView, setShowSummaryView] = useState(true);
const [showAnalyticsView, setShowAnalyticsView] = useState(false);
const [showTransactions, setShowTransactions] = useState(false);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Helper: close sidebar (call this in every tab onClick)
  const closeSidebar = () => setSidebarOpen(false);

const [showPasswordForm, setShowPasswordForm] = useState(false);
const [passwordPayload, setPasswordPayload] = useState({
  current_password: "",
  new_password: "",
  confirm_password: ""
});
const [passwordSubmitting, setPasswordSubmitting] = useState(false);

const handlePasswordInputChange = (e) => {
  const { name, value } = e.target;
  setPasswordPayload(prev => ({ ...prev, [name]: value }));
};

  // State tracking for editing an item's category inline
  const [editCategory, setEditCategory] = useState("");
  const [isEditCustomCategory, setIsEditCustomCategory] = useState(false);
  const [editCustomCategoryInput, setEditCustomCategoryInput] = useState("");
  const [
  currentTime,
  setCurrentTime
] = useState(Date.now());
  const [settings, setSettings] = useState(() => {
  // Check if we have saved preferences in the browser
  const savedPrefs = localStorage.getItem("managerPreferences");
  const prefs = savedPrefs ? JSON.parse(savedPrefs) : { enable_sound: true, enable_low_stock_alert: true };

  return {
    restaurant_name: "",
    address: "",
    phone: "",
    gst_number: "",
    token_prefix: "TOK",
    // 🎯 Set initial states from localStorage dynamically!
    enable_sound: prefs.enable_sound,
    subscription_expires: "",
    payment_status: "",
    email: ""     
  };
});

const settingsRef = useRef(settings);
// Keep the Ref tracking layer perfectly in sync with state updates
useEffect(() => {
  settingsRef.current = settings;
}, [settings]);

  const [
  creatingOrder,
  setCreatingOrder
] = useState(false);
  const [isConnected, setIsConnected] =
  useState(false);
  const [
  employeeOnline,
  setEmployeeOnline
  ] = useState(false);
  const [summary, setSummary] =
  useState({

    total_sales: 0,

    completed_orders: 0,

    rejected_orders: 0,

    cash_sales: 0,

    online_sales: 0,

    average_order: 0
  });
  const [businessDay, setBusinessDay] =
  useState(null);

const [showSettings, setShowSettings] =
  useState(false);

  // Confirmation Modal States
  const [confirmationModal, setConfirmationModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    isDangerous: false,
    confirmText: "Confirm",
    onConfirm: null,
  });

  
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

  const filteredMenu = menu.filter((item) =>
  item.name.toLowerCase().includes(search.toLowerCase())
    );

  const filteredOrders = orders.filter((order) => {
    // Filter by status
    if (filterOrderStatus !== "all" && order.status !== filterOrderStatus) {
      return false;
    }
    // Filter by token
    if (filterOrderToken && !order.token_id.toString().includes(filterOrderToken)) {
      return false;
    }
    return true;
  });

  const total = cart.reduce(
  (sum, item) => sum + item.price * item.quantity,
      0
    );

    const handleQtyChange = (index, newQty) => {
  if (newQty < 1) return;
  setCart((prev) =>
    prev.map((item, i) =>
      i === index
        ? { ...item, quantity: newQty }
        : item
    )
  );
};

  const handleRemoveItem = (index) => {
  setCart((prev) => prev.filter((_, i) => i !== index));
    };

    const handleAddItem = () => {
  if (!selectedItem || !qty) return;

  const newItem = {
    name: selectedItem.name,
    quantity: Number(qty),
    price: selectedItem.price,
  };
  setCart((prev) => [...prev, newItem]);

  // reset input
  setSearch("");
  setSelectedItem(null);
  setQty("");
};

const downloadTransactionsPDF = () => {

  const doc = new jsPDF();

  doc.setFontSize(18);

  doc.text("Restaurant Transactions", 14, 20);

  const tableData = transactions.map((txn) => [
    txn.token_id,

    txn.items
      .map(
        (i) => `${i.name} x${i.quantity}`
      )
      .join(", "),

    `Rs. ${txn.total_price}`,

    txn.payment_mode,

      new Date(txn.created_at)
      .toLocaleString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })
  ]);

  autoTable(doc, {

    startY: 30,

    head: [[
      "Token",
      "Items",
      "Total",
      "Payment",
      "Ordered Time"
    ]],

    body: tableData,
  });

  doc.save("transactions.pdf");
  };



const downloadReceipt = (transaction) => {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: [80, 200], 
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 7; // Increased margin for safety
  const rightBoundary = pageWidth - margin; 
  let y = 10;

  const centerText = (text, yPos, style = "normal", size = 10) => {
    doc.setFont("JetBrains Mono", style);
    doc.setFontSize(size);
    doc.text(text, pageWidth / 2, yPos, { align: "center" });
  };

  const drawDivider = (yPos) => {
    doc.setDrawColor(220); // Even lighter gray for a cleaner look
    doc.line(margin, yPos, rightBoundary, yPos);
  };

  // --- HEADER SECTION ---
  if (settings?.logo_url) {
    try {
      doc.addImage(settings.logo_url, "PNG", pageWidth / 2 - 8, y, 16, 16);
      y += 20;
    } catch (e) { y += 0; }
  }

  centerText(settings.restaurant_name?.toUpperCase() || "RESTAURANT", y, "bold", 13);
  y += 6;
  centerText(settings.address || "Hyderabad", y, "normal", 8);
  y += 4;
  centerText(`Tel: ${settings.phone || ""} | GST: ${settings.gst_number || ""}`, y, "normal", 8);
  y += 8;

  drawDivider(y);
  y += 6;

  // --- TRANSACTION INFO ---
  doc.setFontSize(9);
  doc.setFont("JetBrains Mono", "bold");
  doc.text(`${settings.token_prefix || "TOK"}-${transaction.token_id}`, margin, y);
  
  // Adjusted right alignment anchor
  doc.text(transaction.payment_mode?.toUpperCase() || "ONLINE", rightBoundary, y, { align: "right" });
  y += 5;

  doc.setFont("JetBrains Mono", "normal");
  doc.setFontSize(8);
  const orderTime = new Date(transaction.created_at).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true
  });
  doc.text(`Date: ${orderTime}`, margin, y);
  y += 6;

  drawDivider(y);
  y += 6;

  // --- ITEMS TABLE HEADER ---
  doc.setFont("JetBrains Mono", "bold");
  doc.setFontSize(8);
  doc.text("ITEM", margin, y);
  doc.text("QTY", rightBoundary - 20, y, { align: "right" }); // Shifted left
  doc.text("TOTAL", rightBoundary, y, { align: "right" });
  y += 4;

  // --- ITEMS LIST ---
  doc.setFont("JetBrains Mono", "normal");
  transaction.items.forEach((item) => {
    // We restrict item name width to prevent overlapping QTY
    const splitName = doc.splitTextToSize(item.name, 35); 
    doc.text(splitName, margin, y);
    
    // Aligning QTY and Price relative to our safe right boundary
    doc.text(`${item.quantity}`, rightBoundary - 20, y, { align: "right" });
    doc.text(`${(item.price * item.quantity).toFixed(2)}`, rightBoundary, y, { align: "right" });
    
    y += (splitName.length * 4) + 1;
  });

  y += 2;
  drawDivider(y);
  y += 7;

  // --- SUMMARY SECTION ---
  doc.setFontSize(10);
  doc.setFont("JetBrains Mono", "bold");
  doc.text("GRAND TOTAL", margin, y);
  doc.setFontSize(11);
  // Total price logic
  doc.text(`${Number(transaction.total_price).toFixed(2)}`, rightBoundary, y, { align: "right" });
  y += 10;

  // --- FOOTER ---
  drawDivider(y);
  y += 6;
  centerText("Thank you for dining with us!", y, "italic", 8);
  y += 4;
  centerText("Visit Again!", y, "normal", 8);
  
  y += 8;
  doc.setFontSize(7);
  centerText(`Receipt ID: ${transaction.id || transaction._id || 'N/A'}`, y, "normal", 7);

  // --- SAVE ---
  doc.save(`Receipt-${transaction.token_id}.pdf`);
};

const printToken = (order, onComplete) => {
  // 🎯 FIX 1: Increased default window width (from 300 to 450) 
  // This gives Chrome enough room to show the Token AND the print options together!
  const printWindow = window.open(
    "",
    "_blank",
    "width=450,height=650,top=100,left=100,resizable=yes"
  );

  printWindow.document.write(`
<html>
<head>
  <title>Token Receipt</title>
  <style>
    @page {
      size: 80mm auto;
      margin: 0;
    }
    @media print {
      body {
        width: 72mm;
        margin: 0 auto;
        padding: 5mm 0;
      }
      .no-print { display: none !important; } /* Hide screen elements during print */
    }
    body {
      font-family: 'Courier New', Arial, sans-serif;
      width: 100%;
      max-width: 280px;
      margin: 0 auto;
      padding: 15px;
      color: #000;
      box-sizing: border-box;
    }
    .center { text-align: center; }
    .restaurant-name { font-size: 20px; font-weight: bold; text-transform: uppercase; }
    .subtitle { font-size: 11px; margin-bottom: 8px; }
    .divider { border-top: 1px dashed #000; margin: 10px 0; }
    
    /* Highlighted Token Area so it catches the eye instantly on screen */
    .token {
      font-size: 36px;
      font-weight: bold;
      text-align: center;
      margin: 12px 0;
      padding: 5px;
      background: #f3f4f6; /* Soft gray background on screen */
    }
    @media print { .token { background: transparent; } }

    .row { display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 13px; }
    .total { font-size: 16px; font-weight: bold; margin-top: 8px; }
    .footer { text-align: center; font-size: 11px; margin-top: 14px; }
  </style>
</head>
<body>
  <div class="center">
    ${settings?.logo_url ? `<div><img src="${settings.logo_url}" width="60" /></div>` : ""}
    <div class="restaurant-name">${settings?.restaurant_name || "RESTAURANT"}</div>
    <div class="subtitle">${settings?.subtitle || "Fresh & Delicious"}</div>
    <div style="font-size: 11px;">${settings?.address || ""}</div>
    <div style="font-size: 11px;">Phone: ${settings?.phone || ""}</div>
  </div>

  <div class="divider"></div>

  <div class="token">
    <span>${settings?.token_prefix || "TOK"}-${order.token_id}</span>
  </div>

  <div class="divider"></div>

  ${order.items.map(item => `
    <div class="row">
      <span>${item.name} x${item.quantity}</span>
      <span>₹${(item.price * item.quantity).toFixed(2)}</span>
    </div>
  `).join("")}

  <div class="divider"></div>

  <div class="row total">
    <span>Total</span>
    <span>₹${Number(order.total_price).toFixed(2)}</span>
  </div>
  
  <div class="divider"></div>

  <div class="footer">
    ${new Date(order.created_at).toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })}
    <br /><br />
    Thank You ❤️
  </div>
</body>
</html>
`);

  printWindow.document.close();
  printWindow.focus();
  
  // 🎯 FIX 2: Delay the print trigger by 400ms!
  setTimeout(() => {
    printWindow.print();
    
    // Auto-destroys the window right after they hit Save/Cancel
    setTimeout(() => {
      // 🚀 THE TIMING FIX: Run the callback here so the main screen updates *after* print closes!
      if (typeof onComplete === "function") {
        onComplete();
      }

      // Fallback cleanups
      if (typeof setCart === "function") setCart([]);
      if (typeof setCreatingOrder === "function") setCreatingOrder(false);
      
      printWindow.close();
    }, 300);
  }, 400); 
};


/* =========================================================================
    🚀 UNIFIED DASHBOARD MOUNT ENGINE (Perfect Sync & Clean Key Mapping)
========================================================================= */
const hasFetched = useRef(false);
const [isLoading, setIsLoading] = useState(true);

// Dedicated standalone manual triggers for real-time actions/buttons
const refreshTransactions = async () => {
  try {
    const res = await apiFetch(`${import.meta.env.VITE_API_URL}/orders/transactions`, {}, "manager");
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) setTransactions(data);
    }
  } catch (err) { console.error("Error updating transactions:", err); }
};

const refreshSummary = async () => {
  try {
    const res = await apiFetch(`${import.meta.env.VITE_API_URL}/business-day/summary`, {}, "manager");
    if (res.ok) {
      const data = await res.json();
      // Keep state storage raw and raw-mappable just like your working setup!
      setSummary(data); 
    }
  } catch (err) { console.error("Error updating summary:", err); }
};

const refreshAnalytics = async () => {
  try {
    const res = await apiFetch(`${import.meta.env.VITE_API_URL}/orders/analytics`, {}, "manager");
    if (res.ok) {
      const data = await res.json();
      setAnalytics(data);
    }
  } catch (err) { console.error("Error updating analytics:", err); }
};

const loadSettings = async () => {
  try {
    const res = await apiFetch(`${import.meta.env.VITE_API_URL}/settings`, {}, "manager");
    if (res.ok) {
      const data = await res.json();
      setSettings(prev => ({ ...prev, ...data }));
    }
  } catch (err) { console.error("Settings fetch failed:", err); }
};

// MASTER INITIALIZATION LOOP
useEffect(() => {
  const token = localStorage.getItem("managerAccessToken");

  if (!token) {
    window.location.href = "/";
    return;
  }

  if (hasFetched.current) return;
  hasFetched.current = true;

  const loadAllDashboardData = async () => {
    try {
      setIsLoading(true);
      console.log("🔥 Firing clean single-batch parallel dashboard engine...");

      // ⚡ Cleaned up extra overlapping network paths to prevent state locking!
      const [
        ordersRes,
        menuRes,
        lowStockRes,
        settingsRes,
        activeDayRes,
        summaryRes,
        employeeRes,
        transactionsRes, 
        analyticsRes
      ] = await Promise.all([
        apiFetch(`${import.meta.env.VITE_API_URL}/orders`, {}, "manager"),
        apiFetch(`${import.meta.env.VITE_API_URL}/menu`, {}, "manager"),
        apiFetch(`${import.meta.env.VITE_API_URL}/low-stock`, {}, "manager"),
        apiFetch(`${import.meta.env.VITE_API_URL}/settings`, {}, "manager"),
        apiFetch(`${import.meta.env.VITE_API_URL}/business-day/active`, {}, "manager"),
        apiFetch(`${import.meta.env.VITE_API_URL}/business-day/summary`, {}, "manager"),
        apiFetch(`${import.meta.env.VITE_API_URL}/employees`, {}, "manager"),
        apiFetch(`${import.meta.env.VITE_API_URL}/orders/transactions`, {}, "manager").catch(e => e),
        apiFetch(`${import.meta.env.VITE_API_URL}/orders/analytics`, {}, "manager").catch(e => e), 
      ]);

      // 📥 1. Sync Orders Data straight into Transactions
      if (ordersRes.ok) {
        const ordersData = await ordersRes.json();
        if (Array.isArray(ordersData)) setOrders(ordersData);
      }

      // 📥 2. Sync Menu Data
      if (menuRes.ok) {
        const menuData = await menuRes.json();
        if (Array.isArray(menuData)) setMenu(menuData);
      }

      // 📥 3. Sync Low Stock Data
      if (lowStockRes.ok) {
        const lowStockData = await lowStockRes.json();
        if (Array.isArray(lowStockData)) {
          setLowStockItems(lowStockData.map((item) => item.item_name || item));
        }
      }

      if (settingsRes.ok) {
        const settingsData = settingsRes.ok ? await settingsRes.json() : {};
        setSettings(prev => ({ ...prev, ...settingsData }));
        setIsLoadingSettings(false); 
      }

      // 📥 5. Sync Active Business Day Status
      if (activeDayRes.ok) {
        const activeDayData = await activeDayRes.json();
        setBusinessDay(activeDayData);
      }

      // 📥 6. Sync Summary & Analytics Data Pools simultaneously
      if (summaryRes.ok) {
        const summaryData = await summaryRes.json();
        setSummary(summaryData); // Perfectly mirrored data holder sync!
      }

      // 📥 7. Sync Employees Data
      if (employeeRes.ok) {
        const employeeData = await employeeRes.json();
        setEmployees(employeeData);
      }

      if (transactionsRes?.ok) {
        const d = await transactionsRes.json();
        if (Array.isArray(d)) setTransactions(d);
      }

      if (analyticsRes?.ok) {
        const d = await analyticsRes.json();
        setAnalytics(d);
      }

    } catch (error) {
      console.error("❌ Critical Dashboard Boot Failure:", error);
    } finally {
      setIsLoading(false);
    }
  };

  /* =========================
      🎵 AUDIO ENGINE PRELOADER
  ========================= */
  const loadAudio = (path) => {
    const audio = new Audio(path);
    audio.preload = "auto";
    return audio;
  };

  refillStockSoundRef.current = loadAudio("/sounds/for_lowStockRefillment.wav");
  lowStockSoundRef.current = loadAudio("/sounds/for_lowStockAlert.wav");
  acceptSoundRef.current = loadAudio("/sounds/for_acceptance.wav");
  completeSoundRef.current = loadAudio("/sounds/for_completion.wav");
  rejectSoundRef.current = loadAudio("/sounds/for_rejection.wav");

  // Fire execution loop
  loadAllDashboardData();
}, []);


/* =========================================================================
    ⏱️ REAL-TIME CHRONO TIMERS & SUBSCRIPTION MONITORS
========================================================================= */
// 1. Clock Engine (updates current system timing reference string every 60s)
useEffect(() => {
  const clockTimer = setInterval(() => {
    setCurrentTime(Date.now());
  }, 60000);
  return () => clearInterval(clockTimer);
}, []);

// 2. Subscription Expiry Visual Countdown Engine
useEffect(() => {
  const expiryDateString = settings?.subscription_expires;
  if (!expiryDateString) {
    setSubscriptionTimeLeft('No Active Plan');
    return;
  }

  const calculateRemainingDays = () => {
    const totalTimeDiff = new Date(expiryDateString) - new Date();
    
    if (totalTimeDiff <= 0) {
      setSubscriptionTimeLeft('Expired');
      setIsExpiryCritical(true);
      return;
    }

    const remainingDays = Math.floor(totalTimeDiff / (1000 * 60 * 60 * 24));
    const remainingHours = Math.floor((totalTimeDiff / (1000 * 60 * 60)) % 24);

    setIsExpiryCritical(remainingDays < 3);
    setSubscriptionTimeLeft(`${remainingDays}d ${remainingHours}h remaining`);
  };

  calculateRemainingDays();
  const timerInterval = setInterval(calculateRemainingDays, 60000);
  return () => clearInterval(timerInterval);
}, [settings?.subscription_expires]);

// 3. Background Sync Long-Poller for Pending Subscriptions
useEffect(() => {
  let intervalId;
  if (settings?.subscription_status === "pending_renewal") {
    intervalId = setInterval(() => {
      console.log("🕵️ Checking background approval sync updates...");
      loadSettings();
    }, 5000);
  }
  return () => { if (intervalId) clearInterval(intervalId); };
}, [settings?.subscription_status]);


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


/* =========================
    WEBSOCKET (CLEAN & WORKING)
========================= */
useEffect(() => {
  const token = localStorage.getItem("managerAccessToken");

  if (!token) return;

  let socket = null;
  let reconnectTimer = null;
  let isComponentMounted = true;

  const connectWebSocket = () => {
    socket = createSocket("manager");

    if (!socket) return;

    socket.onopen = () => {
      if (!isComponentMounted) return;
      console.log("Connected ✅");
      setIsConnected(true);
    };

    socket.onmessage = (event) => {
      if (!isComponentMounted) return;

      const msg = JSON.parse(event.data);
      console.log("WS:", msg);

      // 🎯 THE SECRET SAUCE: Fetch fresh preferences directly from disk on every incoming message
      const savedPrefs = localStorage.getItem("managerPreferences");
      const currentPrefs = savedPrefs ? JSON.parse(savedPrefs) : { enable_sound: true };
      const isSoundEnabled = currentPrefs.enable_sound;

      if (msg.type === "business_day_status") {
        setBusinessDayData(msg.data); // Stores the object { business_day_id: 74, ... }
      }

      if (msg.type === "employee_online") {
        setEmployeeOnline(true);
      }

      if (msg.type === "employee_offline") {
        setEmployeeOnline(false);
      }

      if (msg.type === "employee_status") {
        setEmployeeOnline(msg.data.online);
      }

      /* LOW STOCK */
      if (msg.type === "low_stock") {
        setLowStockItems((prev) => {
          if (prev.includes(msg.data.name)) return prev;
          return [...prev, msg.data.name];
        });
        addNotification(`⚠ ${msg.data.name} low stock`);

        // 🎯 CHANGED: Uses fresh local storage variable instantly!
        if (isSoundEnabled) {
          if (lowStockSoundRef.current) {
            lowStockSoundRef.current.currentTime = 0;
            lowStockSoundRef.current.play().catch(() => {});
          }
        }
      }

      /* STOCK RESTORED */
      if (msg.type === "stock_restored") {
        setLowStockItems((prev) => prev.filter((item) => item !== msg.data.name));
        addNotification(`✅ ${msg.data.name} restored`);

        // 🎯 CHANGED: Uses fresh local storage variable instantly!
        if (isSoundEnabled) {
          if (refillStockSoundRef.current) {
            refillStockSoundRef.current.currentTime = 0;
            refillStockSoundRef.current.play().catch(() => {});
          }
        }
      }

      /* ORDER UPDATE */
      if (msg.type === "order_update") {
        // 🎯 CHANGED: Uses fresh local storage variable instantly!
        if (isSoundEnabled) {
          const soundRef = msg.data.status === "rejected" ? rejectSoundRef : acceptSoundRef;
          if (soundRef.current) {
            soundRef.current.currentTime = 0;
            soundRef.current.play().catch(() => {});
          }
        }

        setOrders((prev) => {
          const exists = prev.some((o) => String(o.id) === String(msg.data.id));

          if (msg.data.status === "rejected") {
            return prev.filter((o) => String(o.id) !== String(msg.data.id));
          }

          if (!exists) {
            return [...prev, { ...msg.data, items: msg.data.items || [] }];
          }

          return prev.map((o) =>
            String(o.id) === String(msg.data.id) ? { ...o, status: msg.data.status } : o
          );
        });

        refreshSummary().catch(e => console.error(e));
        refreshAnalytics().catch(e => console.error(e));

        addNotification(
          `Order ${msg.data.token_id} ${msg.data.status}`,
          msg.data.status === "rejected" ? "error" : msg.data.status === "accepted" ? "success" : "info"
        );
      }

      /* ORDER COMPLETED */
      if (msg.type === "order_completed") {
        // 🎯 CHANGED: Uses fresh local storage variable instantly!
        if (isSoundEnabled && completeSoundRef.current) {
          completeSoundRef.current.currentTime = 0;
          completeSoundRef.current.play().catch(() => {});
        }
        setOrders((prev) => prev.filter((o) => String(o.id) !== String(msg.data.id)));
        refreshSummary().catch(err => console.error("Summary refresh failed:", err));
        refreshTransactions().catch(err => console.error("Transactions refresh failed:", err));
        refreshAnalytics().catch(err => console.error("Analytics refresh failed:", err));
        addNotification(`Order ${msg.data.token_id} completed`);
      }
    };

    socket.onerror = (err) => {
      if (!isComponentMounted) return; 
      console.error("Socket error:", err);
      setIsConnected(false);
    };

    socket.onclose = () => {
      if (!isComponentMounted) return; 

      console.log("Disconnected ❌");
      setIsConnected(false);

      reconnectTimer = setTimeout(() => {
        console.log("Reconnecting...");
        connectWebSocket();
      }, 2000);
    };
  };

  connectWebSocket();

  return () => {
    isComponentMounted = false;
    if (reconnectTimer) clearTimeout(reconnectTimer);
    if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
      socket.close();
    }
  };
}, []);

/* =========================
   FETCH TRANSACTIONS
========================= */

const fetchTransactions =
  async () => {

    let url =
      `${import.meta.env.VITE_API_URL}/orders/transactions?`;

    if (filterToken.trim()) {

      url +=
        `token_id=${filterToken.trim()}&`;
    }

    if (
      filterPayment &&
      filterPayment !== "all"
    ) {

      url +=
        `payment_mode=${filterPayment}&`;
    }

    if (filterDate) {

      url +=
        `date=${filterDate}&`;
    }

    try {

      const res =
        await apiFetch(url, {}, "manager");

      const data =
        await res.json();

      setTransactions(data);

    } catch (err) {

      console.error(err);
    }
  };

/* =========================
   FETCH ANALYTICS
========================= */

const fetchAnalytics =
  async () => {

    try {

      const res =
        await apiFetch(
          `${import.meta.env.VITE_API_URL}/orders/analytics`,
          {},
          "manager"
        );

      const data =
        await res.json();

      setAnalytics(data);

    } catch (err) {

      console.error(err);
    }
  };


/* =========================================
   CREATE ORDER (KITCHEN MANAGER - OFFLINE READY)
========================================= */
const handleCreateOrder = async () => {
  if (cart.length === 0 || creatingOrder) return;

  if (!businessDay) {
    addNotification(
      "⚠️ Please open today's sales before creating an order.",
      "warning"
    );
    return;
  }

  setCreatingOrder(true);

  // Generate a completely unique tracking ID tag for the offline sync sequence
  const offlineUuid = `off_uuid_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

  // Construct base data dictionary matching backend expectations
  const orderPayload = {
    items: cart,
    payment_mode: paymentMode,
    offline_uuid: offlineUuid
  };

  // 🚨 NETWORK BOUNDARY CHECK: If the local browser flags are dark
  if (!navigator.onLine) {
    try {
      // 1. Save it securely to your browser's local IndexedDB ledger store
      await saveOfflineOrder(orderPayload);

      // 🔊 SOUND ONLY: Play audio confirmation for successful offline cache save
      if (settings?.enable_sound && acceptSoundRef?.current) {
        acceptSoundRef.current.currentTime = 0;
        acceptSoundRef.current.play().catch(err => console.error("Audio blocked:", err));
      }

      // 2. 🚀 OPTIMISTIC UPDATE: Push it directly to your UI active orders list layout
      setOrders((prev) => [
        ...prev,
        {
          id: `temp_${Date.now()}`, 
          ...orderPayload,
          isOfflinePending: true, 
          created_at: new Date().toISOString()
        }
      ]);

      addNotification("⚠️ Running Offline! Order queued and displayed on local kitchen boards.", "warning");

      // 3. Clear checkout UI state controls for the next ticket input
      setCart([]);
      setPaymentMode("cash");

    } catch (dbErr) {
      console.error("Kitchen offline database save failure:", dbErr);
      addNotification("❌ Failed to cache kitchen order locally.", "error");
    } finally {
      setCreatingOrder(false);
    }
    return; 
  }

  // 🟢 ONLINE ROUTE: Standard network execution path
  try {
    const res = await apiFetch(
      `${import.meta.env.VITE_API_URL}/orders`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(orderPayload)
      },
      "manager"
    );

    if (!res.ok) {
      addNotification("❌ Failed to process checkout.", "error");
      return;
    }

    const data = await res.json();

    // ✅ Add newly created verified order from backend to the active list instantly
    setOrders((prev) => [
      ...prev,
      {
        ...data,
        items: data.items || []
      }
    ]);



    printToken(data, () => {

      // 🔊 SOUND ONLY: Trigger success audio cue right when the print callback runs
      if (settings?.enable_sound && acceptSoundRef?.current) {
        acceptSoundRef.current.currentTime = 0;
        acceptSoundRef.current.play().catch(err => console.error("Audio blocked:", err));
      }

      addNotification("🎉 Kitchen Order Placed Successfully!", "success");
      setCart([]);
      setPaymentMode("cash");
      refreshTransactions(); // ✅ already implied
      refreshSummary();      // ✅ ADD THIS — updates summary page instantly
      refreshAnalytics();
      
    });

  } catch (err) {
    console.error("Online creation failed. Dropping back to offline cache layer...", err);
    
    // 📡 FALLBACK: If connection drops mid-flight right after clicking submit
    try {
      await saveOfflineOrder(orderPayload);
      
      // 🔊 SOUND ONLY: Play audio confirmation for successful fallback save
      if (settings?.enable_sound && acceptSoundRef?.current) {
        acceptSoundRef.current.currentTime = 0;
        acceptSoundRef.current.play().catch(err => console.error("Audio blocked:", err));
      }

      setOrders((prev) => [
        ...prev,
        {
          id: `temp_${Date.now()}`,
          ...orderPayload,
          isOfflinePending: true,
          created_at: new Date().toISOString()
        }
      ]);

      addNotification("📡 Connection dropped! Order safely secured offline.", "warning");
      setCart([]);
      setPaymentMode("cash");
    } catch (innerDbErr) {
      console.error("Critical storage failure:", innerDbErr);
      addNotification("❌ Connection dropped and local storage failed.", "error");
    }
  } finally {
    setCreatingOrder(false);
  }
};


const chartData =
  analytics?.top_items?.map((item) => ({
    name: item[0],
    sold: item[1],
  })) || [];

const paymentData = analytics
  ? [
      {
        name: "Cash",
        value: analytics.cash_sales,
      },
      {
        name: "Online",
        value: analytics.online_sales,
      },
    ]
  : [];

const COLORS = [
  "#0088FE",
  "#00C49F"
];

const handleLogoUpload =
  async (e) => {

    const file =
      e.target.files[0];

    if (!file) return;

    const formData =
      new FormData();

    formData.append(
      "file",
      file
    );

    try {

      const uploadRes =
        await apiFetch(
          `${import.meta.env.VITE_API_URL}/settings/upload-logo`,
          {
            method: "POST",
            body: formData
          },"manager"
        );

      const uploadData =
        await uploadRes.json();

      const updatedSettings = {
        ...settings,
        logo_url:
          uploadData.logo_url
      };

      setSettings(
        updatedSettings
      );

      // SAVE TO DATABASE
      await apiFetch(
        `${import.meta.env.VITE_API_URL}/settings`,
        {
          method: "PATCH",

          body: JSON.stringify(
            updatedSettings
          )
        },
        "manager"
      );

    } catch (err) {

      console.error(err);
    }
};



const handleSaveSettings = async () => {
  try {
    // 1. Commit the preference to localStorage exactly when the user clicks save
    const preferencesToSave = {
      enable_sound: settings.enable_sound
    };
    localStorage.setItem("managerPreferences", JSON.stringify(preferencesToSave));

    // 2. Fire the PATCH request to your backend for business info
    const res = await apiFetch(
      `${import.meta.env.VITE_API_URL}/settings`,
      {
        method: "PATCH",
        body: JSON.stringify(settings)
      },
      "manager"
    );

    if (!res.ok) return;

    const data = await res.json();

    // 3. Merge backend data, explicitly preserving the current sound state
    setSettings((prev) => ({
      ...prev,
      ...data,
      enable_sound: settings.enable_sound 
    }));

    addNotification("✅ Settings saved");
    setShowSettings(false);

  } catch (err) {
    console.error(err);
  }
};


const handleStartDay = async () => {
  setSummary({ total_sales: 0, cash_sales: 0, online_sales: 0, completed_orders: 0 });
  setOrders([]);
  setCart([]);

  try {
    const res = await apiFetch(
      `${import.meta.env.VITE_API_URL}/business-day/start`,
      { method: "POST" },
      "manager"
    );
    if (!res.ok) {
      addNotification("❌ Failed to start day", "error");
      return;
    }
    const data = await res.json();
    setBusinessDay(data);
    addNotification("✅ Business day started");
  } catch (err) {
    console.error(err);
    addNotification("❌ Failed to start day");
  }
};


const handleDeleteMenuItem = (itemId, itemName) => {
  setConfirmationModal({
    isOpen: true,
    title: "Delete Menu Item",
    message: `Are you sure you want to delete "${itemName}"? This action cannot be undone.`,
    isDangerous: true,
    confirmText: "Delete",
    onConfirm: async () => {
      setConfirmationModal((prev) => ({ ...prev, isOpen: false }));
      setIsSaving(itemId);
      try {
        const res = await apiFetch(
          `${import.meta.env.VITE_API_URL}/menu/${itemId}`,
          { method: "DELETE" },
          "manager"
        );
        if (res.ok) {
          setMenu((prev) => prev.filter((m) => m.id !== itemId));
          addNotification("🗑️ Menu item deleted successfully.", "success");
        } else {
          addNotification("❌ Failed to delete menu item.", "error");
        }
      } catch (err) {
        console.error("Delete menu item error:", err);
        addNotification("❌ Network error while deleting item.", "error");
      } finally {
        setIsSaving(null);
      }
    },
  });
};

const handleCloseDay = async () => {
  setConfirmationModal({
    isOpen: true,
    title: "Close Business Day",
    message: "Are you sure you want to close today's sales? This action cannot be undone.",
    isDangerous: true,
    confirmText: "Close Day",
    onConfirm: async () => {
      setConfirmationModal((prev) => ({ ...prev, isOpen: false }));
      try {
        const res = await apiFetch(
          `${import.meta.env.VITE_API_URL}/business-day/close`,
          { method: "PATCH" },
          "manager"
        );

        if (!res.ok) {
          addNotification("❌ Failed to close day", "error");
          return;
        }

        const data = await res.json();

        // 🚨 CRITICAL SWITCH POINT: Check if we just completed the 15 Working Days Milestone
        if (data.cycle_completed) {
          // 🏆 Trigger the massive 15-Day Master Dashboard Overlay Screen
          setMasterCycleSummary(data.cycle_summary);
          // 🎯 NEW: Automatically trigger the PDF report download for the 15-day cycle
          
          // 🎯 2. Save the final 15th day's summary data specifically for the individual download button
          setCloseDaySummary({
          totalRevenue: data.daily_summary.total_revenue,
          cashSales: data.daily_summary.cash_sales,
          onlineSales: data.daily_summary.online_sales,
          date: data.daily_summary.date
          });
          
          // This uses your existing utility function we just polished!
          downloadSalesReport(data.cycle_summary, "cycle", settings);
          addNotification("🎉 Milestone Reached! 15 Working Days Cycle Completed & Archived.", "success");
        } else {
          // 📊 Standard track: Show regular night-close summary modal
          setCloseDaySummary({
            totalRevenue: data.daily_summary.total_revenue,
            cashSales: data.daily_summary.cash_sales,
            onlineSales: data.daily_summary.online_sales,
            date: data.daily_summary.date
          });
          addNotification("🔒 Business day closed successfully.", "success");
        }

        // Lock out operational access controls until a new day opens tomorrow
        setBusinessDay(null);

      } catch (err) {
        console.error("Day close payload parsing failure:", err);
        addNotification("❌ Failed to finalize day close processes.", "error");
      }
    },
  });
};





// const runCountdownCalculation = (expiryDateString) => {
//   if (!expiryDateString) return;
  
//   const totalTimeDiff = new Date(expiryDateString) - new Date();
  
//   if (totalTimeDiff <= 0) {
//     setSubscriptionTimeLeft('Expired');
//     setIsExpiryCritical(true);
//     return;
//   }

//   const remainingDays = Math.floor(totalTimeDiff / (1000 * 60 * 60 * 24));
//   const remainingHours = Math.floor((totalTimeDiff / (1000 * 60 * 60)) % 24);

//   setIsExpiryCritical(remainingDays < 3);
//   setSubscriptionTimeLeft(`${remainingDays}d ${remainingHours}h remaining`);
// };


const submitPasswordChange = async (e) => {
  e.preventDefault();

  // 🛡️ Frontend Client-Side Verification Guard Check
  if (passwordPayload.new_password !== passwordPayload.confirm_password) {
    addNotification("❌ Error: New Password and Confirm Password fields do not match!");
    return;
  }

  if (passwordPayload.new_password.length < 6) {
    addNotification("❌ Security Guard: New password must be at least 6 characters long.");
    return;
  }

  try {
    setPasswordSubmitting(true);
    const response = await fetch("https://sknexus-production.up.railway.app/settings/change-password", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${localStorage.getItem("managerAccessToken")}`
      },
      body: JSON.stringify({
        current_password: passwordPayload.current_password,
        new_password: passwordPayload.new_password
      })
    });

    const result = await response.json();

    if (response.ok) {
      addNotification("🚀 Password changed successfully! Keep it safe.");
      // Reset form view and clean states
      setPasswordPayload({ current_password: "", new_password: "", confirm_password: "" });
      setShowPasswordForm(false);
    } else {
      addNotification(`❌ Modification Blocked: ${result.detail || "Verification failed"}`);
    }
  } catch (error) {
    console.error("Password trace submission block crash:", error);
    addNotification("❌ Server connection lost processing credentials pipeline.");
  } finally {
    setPasswordSubmitting(false);
  }
};


const handleDeleteEmployee = (id, employeeName) => {
  setConfirmationModal({
    isOpen: true,
    title: "Delete Employee",
    message: `Are you sure you want to delete ${employeeName || "this employee"}? This action cannot be undone.`,
    isDangerous: true,
    confirmText: "Delete",
    onConfirm: async () => {
      setConfirmationModal((prev) => ({ ...prev, isOpen: false }));

      try {
        const response = await apiFetch(
          `${import.meta.env.VITE_API_URL}/employees/${id}`,
          {
            method: "DELETE",
          },
          "manager"
        );

        if (response.ok) {
          setEmployees((prev) =>
            prev.filter((employee) => employee.id !== id)
          );
        } else {
          addNotification("❌ Failed to delete employee", "error");
        }
      } catch (error) {
        console.error("Delete error:", error);
      }
    },
  });
};

if (showEmployeeRegister) {
  return (
    <EmployeeRegister
      onRegisterSuccess={() => {
        fetchEmployees();
        setShowEmployeeRegister(false);
      }}
      onLoginClick={() => {
        setShowEmployeeRegister(false);
      }}
      onBackClick={() => {
        setShowEmployeeRegister(false);
      }}
    />
  );
}

// 1️⃣ Handle requesting a plan renewal recharge
const handleRechargeRequest = async () => {
  try {
    const res = await apiFetch(`${import.meta.env.VITE_API_URL}/settings/subscription-state`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "request_recharge" })
    }, "manager");
    
    if (res.ok) {
      // 🚀 Instantly transition local state to update the screen without reloading
      setSettings(prev => ({
        ...prev,
        subscription_status: "pending_renewal"
      }));
      addNotification("Recharge request successfully submitted to the admin! ✅");
    }
  } catch (err) {
    console.error("Recharge request execution crash:", err);
  }
};

// 2️⃣ Handle acknowledging an admin rejection notice
const handleResetDecline = async () => {
  try {
    const res = await apiFetch(`${import.meta.env.VITE_API_URL}/settings/subscription-state`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "acknowledge_decline" })
    }, "manager");
    
    if (res.ok) {
      // 🚀 Wipe the decline state data matrix locally to clear the alert banner view
      setSettings(prev => ({
        ...prev,
        subscription_status: "active",
        rejection_reason: ""
      }));
    }
  } catch (err) {
    console.error("Failed to process decline acknowledgement:", err);
  }
};


// Automatically extracts unique category values from current menu data array strings
const existingCategories = [...new Set(menu.map(item => item.category).filter(Boolean))];

return (
    <div className="manager-container manager-dashboard-layout">

      {/* ── MOBILE OVERLAY ── */}
    <div
      className={`sidebar-overlay ${sidebarOpen ? "overlay-visible" : ""}`}
      onClick={closeSidebar}
    />

    {/* ── MOBILE TOP BAR ── */}
    <div className="mobile-topbar" style={{ display: "none" }} 
         ref={(el) => { if (el) el.style.display = window.innerWidth <= 430 ? "flex" : "none"; }}>
      {settings?.logo_url ? (
        <img src={settings.logo_url} alt="logo" className="mobile-logo" />
      ) : (
        <span className="mobile-logo-placeholder">🍽️</span>
      )}
      <span className="mobile-restaurant-name">
        {settings?.restaurant_name || "Restaurant"}
      </span>
      <button
        className={`hamburger-btn ${sidebarOpen ? "is-open" : ""}`}
        onClick={() => setSidebarOpen(prev => !prev)}
        aria-label="Toggle menu"
      >
        <span className="hamburger-line" />
        <span className="hamburger-line" />
        <span className="hamburger-line" />
      </button>
    </div>

      
      {/* ========== SIDEBAR (Left Panel) ========== */}
      <aside className={`manager-sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
        <div className="sidebar-header">
          {settings?.logo_url ? (
            <img
              src={settings.logo_url}
              alt="logo"
              className="sidebar-logo"
            />
          ) : (
            <span className="sidebar-icon">🍽️</span>
          )}
          <h1>{settings?.restaurant_name || "Restaurant"} Manager</h1>
        </div>

<nav className="sidebar-nav">
          {/* ========== ORDERS TAB ========== */}
          <div
            className={`sidebar-link ${!showSubscription && !showAnalyticsView && !showTransactions && !showSummaryView && !showManageMenu && !showCreateMenu && !showSettings ? 'active' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              setShowTransactions(false);
              setShowSummaryView(false);
              setShowAnalyticsView(false);
              setShowManageMenu(false);
              setShowCreateMenu(false);
              setShowSettings(false);
              setShowSubscription(false);
              closeSidebar();
            }}
          >
            <span className="sidebar-icon">📝</span>
            <span>Orders</span>
          </div>

          {/* ========== ANALYTICS TAB ========== */}
          <div
            className={`sidebar-link ${showAnalyticsView ? 'active' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              setShowAnalyticsView(true);
              setShowTransactions(false);
              setShowSummaryView(false);
              setShowManageMenu(false);
              setShowCreateMenu(false);
              setShowSettings(false);
              setShowSubscription(false);
              closeSidebar();
            }}
          >
            <span className="sidebar-icon">📊</span>
            <span>Analytics</span>
          </div>

          {/* ========== TRANSACTIONS TAB ========== */}
          <div
            className={`sidebar-link ${showTransactions ? 'active' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              setShowTransactions(true);
              setShowSummaryView(false);
              setShowAnalyticsView(false);
              setShowManageMenu(false);
              setShowCreateMenu(false);
              setShowSettings(false);
              setShowSubscription(false);
              closeSidebar(); 
            }}
          >
            <span className="sidebar-icon">💳</span>
            <span>Transactions</span>
          </div>

          {/* ========== TODAY'S SUMMARY TAB ========== */}
          <div
            className={`sidebar-link ${showSummaryView ? 'active' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              setShowSummaryView(true);
              setShowTransactions(false);
              setShowAnalyticsView(false);
              setShowManageMenu(false);
              setShowCreateMenu(false);
              setShowSettings(false);
              setShowSubscription(false);
              closeSidebar();
            }}
          >
            <span className="sidebar-icon">📈</span>
            <span>Today's Summary</span>
          </div>

          {/* ========== MANAGE MENU TAB ========== */}
          <div
            className={`sidebar-link ${showManageMenu ? 'active' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              setShowManageMenu(true);
              setShowTransactions(false);
              setShowAnalyticsView(false);
              setShowSummaryView(false);
              setShowCreateMenu(false);
              setShowSettings(false);
              setShowSubscription(false);
              closeSidebar();
            }}
          >
            <span className="sidebar-icon">✏️</span>
            <span>Manage Menu</span>
          </div>

          {/* ========== ADD MENU ITEM TAB ========== */}
          <div
            className={`sidebar-link ${showCreateMenu ? 'active' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              setShowCreateMenu(true);
              setShowManageMenu(false);
              setShowTransactions(false);
              setShowAnalyticsView(false);
              setShowSummaryView(false);
              setShowSettings(false);
              setShowSubscription(false);
              closeSidebar();
            }}
          >
            <span className="sidebar-icon">➕</span>
            <span>Add Menu Item</span>
          </div>

          {/* ========== SUBSCRIPTION TAB ========== */}
          <div
            className={`sidebar-link ${showSubscription ? 'active' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              setShowSubscription(true);
              setShowSettings(false);
              setShowCreateMenu(false);
              setShowManageMenu(false);
              setShowTransactions(false);
              setShowAnalyticsView(false);
              setShowSummaryView(false);
              closeSidebar();
            }}
          >
            <span className="sidebar-icon">⏳</span>
            <span>Subscription</span>
          </div>

          {/* ========== SETTINGS TAB ========== */}
          <div
            className={`sidebar-link ${showSettings ? 'active' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              setShowSettings(true);
              setShowCreateMenu(false);
              setShowManageMenu(false);
              setShowTransactions(false);
              setShowAnalyticsView(false);
              setShowSummaryView(false);
              setShowSubscription(false);
              closeSidebar();
            }}
          >
            <span className="sidebar-icon">⚙️</span>
            <span>Settings</span>
          </div>
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-link" onClick={toggleDarkMode}>
            <span className="sidebar-icon">{isDarkMode ? "☀️" : "🌙"}</span>
            <span>{isDarkMode ? "Light Mode" : "Dark Mode"}</span>
          </div>

          <div
            className="sidebar-link logout-link"
            onClick={() => {
              clearManagerData();
              localStorage.removeItem("role");
              window.location.href = "/";
            }}
          >
            <span className="sidebar-icon">🚪</span>
            <span>Logout</span>
          </div>
        </div>
      </aside>


      {/* ========== MAIN CONTENT ========== */}
      <main className="manager-main">

        {/* ========== ANALYTICS PANEL ========== */}
        {showAnalyticsView && analytics && (
          <div className="analytics-container">
            <div className="main-header">
              <h1>📊 Analytics & Performance</h1>
            </div>
          {/* BUSINESS STATUS CARD */}
    <div className="status-card">
      <h3>Day Status</h3>
      {businessDay && businessDay.cycle_number ? (
        <p className="text-green-500 font-bold">
          Business day {businessDay.cycle_number} Active ✅
        </p>
      ) : (
        <p className="text-red-500 font-bold">
          Business Day Inactive ❌
        </p>
      )}
    </div>

            {/* Stat Cards */}
            <div className="grid grid-4">
              <motion.div
                className="stat-card primary"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <div className="stat-label">💰 Total Sales</div>
                <div className="stat-value">₹{analytics.total_sales}</div>
              </motion.div>

              <motion.div
                className="stat-card success"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <div className="stat-label">📦 Total Orders</div>
                <div className="stat-value">{analytics.total_orders}</div>
              </motion.div>

              <motion.div
                className="stat-card warning"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <div className="stat-label">💵 Cash Sales</div>
                <div className="stat-value">₹{analytics.cash_sales}</div>
              </motion.div>

              <motion.div
                className="stat-card danger"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7 }}
              >
                <div className="stat-label">💳 Online Sales</div>
                <div className="stat-value">₹{analytics.online_sales}</div>
              </motion.div>
            </div>

            {/* Charts */}
            <div className="grid grid-2">
              <div className="chart-container">
                <h3 className="chart-title">Payment Distribution</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={paymentData}
                      dataKey="value"
                      nameKey="name"
                      outerRadius={100}
                      label
                    >
                      {paymentData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="grid grid-2">
              <div className="chart-container">
                <h3 className="chart-title">Top Selling Items</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="sold" fill="#2563eb" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="chart-container">
                <h3 className="chart-title">Rush Hour Analytics</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analytics.rush_hours}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="orders" fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )} 

{/* ==========================================
          💳 2. TRANSACTIONS PANEL
      ========================================== */}
      {showTransactions && (
        <div className="card">
          <div className="card-header">
            <h2>💳 Previous Transactions</h2>
          </div>

          <div className="filter-group">
            <input
              className="form-input"
              placeholder="🔍 Search Token ID..."
              value={filterToken}
              onChange={(e) => setFilterToken(e.target.value)}
            />
            <select
              className="form-select"
              value={filterPayment}
              onChange={(e) => setFilterPayment(e.target.value)}
            >
              <option value="">All Payment Methods</option>
              <option value="cash">Cash</option>
              <option value="online">Online</option>
            </select>
            
            {/* Date Wrapper */}
            <div className="date-input-wrapper" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                className="form-input"
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                style={{ paddingRight: filterDate ? '30px' : '10px' }}
              />
              {filterDate && (
                <button
                  className="date-reset-btn"
                  onClick={() => { setFilterDate(""); fetchTransactions(); }}
                  title="Reset Date"
                >
                  ↺
                </button>
              )}
            </div>
            <button className="btn btn-primary" onClick={fetchTransactions}>
              Apply
            </button>
          </div>

          
          {/* ⚡ FIXED: Pointed to the running 'transactions' state pool updated on mount */}
          {(transactions || []).map((txn) => (
            <div key={txn.id || txn._id} className={`transaction-item ...`}>
              <div className="transaction-header">
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <span className="transaction-token">
                    Token #{txn.token_id}
                  </span>
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: "700",
                      color: "#4f46e5",
                      background: "#eff6ff",
                      padding: "2px 8px",
                      borderRadius: "6px",
                      width: "fit-content",
                      border: "1px solid #bfdbfe"
                    }}
                  >
                    🔄 Cycle #{txn.cycle_number || "N/A"}
                  </span>
                </div>

                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                  <span className={`status-badge ${txn.status}`}>
                    {txn.status}
                  </span>
                  <span className={`transaction-payment ${txn.payment_mode}`}>
                    {txn.payment_mode?.toLowerCase() === "cash" ? "💵" : "💳"}{" "}
                    {txn.payment_mode?.toUpperCase()}
                  </span>
                </div>
              </div>

              <div className="transaction-details">
                <div className="transaction-detail-row">
                  <div className="transaction-detail-label">Items</div>
                  <div className="transaction-detail-value">
                    {txn.items?.map((i) => `${i.name} x${i.quantity}`).join(", ")}
                  </div>
                </div>

                <div className="transaction-detail-row">
                  <div className="transaction-detail-label">Total Amount</div>
                  <div
                    className="transaction-detail-value"
                    style={{
                      color: txn.status === "rejected" ? "#dc2626" : "inherit",
                      textDecoration: txn.status === "rejected" ? "line-through" : "none",
                      fontWeight: "700"
                    }}
                  >
                    ₹{txn.total_price}
                  </div>
                </div>

                <div className="transaction-detail-row">
                  <div className="transaction-detail-label">Order Time</div>
                  <div className="transaction-detail-value">
                    {new Date(txn.created_at).toLocaleTimeString("en-GB", {
                      hour: "numeric",
                      minute: "2-digit",
                      hour12: true,
                    }).toLowerCase()}
                    {" • "}
                    {new Date(txn.created_at).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </div>
                </div>

                <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: "1px solid var(--border-color)" }}>
                  <button
                    className="btn btn-primary btn-sm"
                    style={{ width: "100%", fontSize: "13px" }}
                    onClick={() => downloadReceipt(txn)}
                  >
                    📥 Download Receipt
                  </button>
                </div>
              </div>
            </div>
          ))}

          <div style={{ marginTop: "20px" }}>
            <button className="btn btn-primary" onClick={downloadTransactionsPDF}>
              📥 Download Transactions PDF
            </button>
          </div>
        </div>
      )}
            
      
{/* ========== SUMMARY PANEL ========== */}
{showSummaryView && (
  <>
    {/* BUSINESS STATUS CARD */}
    <div className="status-card">
      <h3>Day Status</h3>
      {businessDay && businessDay.cycle_number ? (
        <p className="text-green-500 font-bold">
          Business day {businessDay.cycle_number} Active ✅
        </p>
      ) : (
        <p className="text-red-500 font-bold">
          Business Day Inactive ❌
        </p>
      )}
    </div>

    {/* SUMMARY PANEL */}
    <div className="summary-panel">
      <h2 className="summary-header">
        📊 Today's Summary
      </h2>
      
      <div className="summary-items">
        <div className="summary-item">
          <div className="summary-item-label">Total Revenue</div>
          <div className="summary-item-value">
            ₹{businessDay && businessDay.cycle_number ? (summary.total_sales || 0) : 0}
          </div>
        </div>

        <div className="summary-item">
          <div className="summary-item-label">Cash Received</div>
          <div className="summary-item-value">
            ₹{businessDay && businessDay.cycle_number ? (summary.cash_sales || 0) : 0}
          </div>
        </div>

        <div className="summary-item">
          <div className="summary-item-label">Online Payments</div>
          <div className="summary-item-value">
            ₹{businessDay && businessDay.cycle_number ? (summary.online_sales || 0) : 0}
          </div>
        </div>

        <div className="summary-item">
          <div className="summary-item-label">Total Orders</div>
          <div className="summary-item-value">
            {businessDay && businessDay.cycle_number ? (summary.completed_orders || 0) : 0}
          </div>
        </div>
      </div>

      {/* ACTION BUTTONS */}
      <div className="summary-actions">
        {!(businessDay && businessDay.cycle_number) ? (
          <button
            className="btn btn-success"
            onClick={handleStartDay}
          >
            ▶ Start Today
          </button>
        ) : (
          <button
            className="btn btn-danger"
            onClick={handleCloseDay} // 🎯 Make sure this function sets businessDay to null!
          >
            🔒 Close Today Sales
          </button>
        )}
      </div>
    </div>
  </>
)}

{/* ==========================================
            ✏️ 3. MANAGE MENU PANEL
        ========================================== */}
        {showManageMenu && (
          <div>
            <div className="main-header">
              <h1>✏️ Manage Menu Items</h1>
            </div>

            {/* Empty State Guard */}
            {(!menu || menu.length === 0) ? (
              <p style={{ color: "var(--text-secondary)" }}>
                No items found in your menu ledger.
              </p>
            ) : (
              /* Grouping logic executed inline cleanly via Object.entries */
              Object.entries(
                (menu || []).reduce((acc, item) => {
                  let cat = item.category ? item.category.trim() : "";
                  if (!cat) cat = "General Menu / Uncategorized";
                  if (!acc[cat]) acc[cat] = [];
                  acc[cat].push(item);
                  return acc;
                }, {})
              ).map(([categoryName, itemsList]) => (
                <div key={categoryName} className="category-block-section" style={{ marginBottom: "40px" }}>
                  
                  {/* Category Header Banner */}
                  <h2 style={{
                    fontSize: "22px",
                    fontWeight: "700",
                    color: "var(--text-primary, #1e293b)",
                    borderBottom: "2px solid var(--border-color, #e2e8f0)",
                    paddingBottom: "8px",
                    marginBottom: "20px",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px"
                  }}>
                    📁 {categoryName} 
                    <span style={{ fontSize: "14px", color: "var(--text-secondary)", fontWeight: "normal", textTransform: "none" }}>
                      ({itemsList.length} items)
                    </span>
                  </h2> 

                  {/* Menu Items Grid */}
                  <div className="grid grid-3">
                    {itemsList.map((item) => (
                      <div key={item.id} className="menu-item">
                        <img
                          src={`${item.image}`}
                          alt={item.name}
                          className="menu-item-image"
                          onError={(e) => { e.target.src = "https://via.placeholder.com/200?text=No+Image"; }}
                        />
                        
                        <div className="menu-item-content">
                          <h3 className="menu-item-name">{item.name}</h3>
                          <p className="menu-item-price">₹{item.price}</p>
                          <p className="menu-item-description">{item.description}</p>
                          
                          <span style={{
                            display: "inline-block",
                            padding: "3px 8px",
                            backgroundColor: "#f1f5f9",
                            borderRadius: "4px",
                            fontSize: "11px",
                            fontWeight: "600",
                            color: "#475569",
                            marginBottom: "12px"
                          }}>
                            🏷️ {item.category || "Uncategorized"}
                          </span>

                          {/* Standard View Actions */}
                          {editingItem !== item.id && (
                            <div className="menu-item-actions">
                              <button
                                className="btn btn-primary btn-sm"
                                disabled={isSaving !== null}
                                onClick={() => {
                                  setEditingItem(item.id);
                                  setEditName(item.name);
                                  setEditPrice(item.price);
                                  setEditDescription(item.description);
                                  setEditImage(item.image);
                                  setEditCategory(item.category || "");
                                }}
                              >
                                ✏️ Edit
                              </button>
                              <button className="btn btn-danger btn-sm" disabled={isSaving !== null} onClick={() => handleDeleteMenuItem(item.id, item.name)}>
                                🗑️ Delete
                              </button>
                            </div>
                          )}

                          {/* ========== EDIT INLINE CONTAINER BLOCK ========== */}
                          {editingItem === item.id && (
                            <div className="menu-edit-form" style={{ background: "#f8fafc", padding: "12px", borderRadius: "8px", border: "1px solid #cbd5e1", marginTop: "10px" }}>
                              <div className="form-group" style={{ marginBottom: "10px" }}>
                                <label style={{ fontSize: "12px", fontWeight: "600", color: "#475569", marginBottom: "4px", display: "block" }}>Item Name</label>
                                <input className="form-input" value={editName} disabled={isSaving === item.id} onChange={(e) => setEditName(e.target.value)} />
                              </div>

                              <div className="form-group" style={{ marginBottom: "10px" }}>
                                <label style={{ fontSize: "12px", fontWeight: "600", color: "#475569", marginBottom: "4px", display: "block" }}>Price (₹)</label>
                                <input className="form-input" value={editPrice} disabled={isSaving === item.id} onChange={(e) => setEditPrice(e.target.value)} type="number" />
                              </div>
                              
                              <div className="form-group" style={{ marginBottom: "10px" }}>
                                <label style={{ fontSize: "12px", fontWeight: "600", color: "#2563eb", marginBottom: "4px", display: "block" }}>Category Section</label>
                                <input className="form-input" style={{ borderColor: "#93c5fd" }} value={editCategory} disabled={isSaving === item.id} onChange={(e) => setEditCategory(e.target.value)} />
                              </div>

                              <div className="form-group" style={{ marginBottom: "12px" }}>
                                <label style={{ fontSize: "12px", fontWeight: "600", color: "#475569", marginBottom: "4px", display: "block" }}>Description</label>
                                <input className="form-input" value={editDescription} disabled={isSaving === item.id} onChange={(e) => setEditDescription(e.target.value)} />
                              </div>

                              <div className="form-group" style={{ marginBottom: "12px" }}>
                                <input
                                  type="file"
                                  accept="image/*"
                                  style={{ display: "none" }}
                                  id={`edit-image-${item.id}`}
                                  disabled={isSaving === item.id}
                                  onChange={(e) => {
                                    const file = e.target.files[0];
                                    setEditSelectedFile(file);
                                    if (file) setEditPreviewImage(URL.createObjectURL(file));
                                  }}
                                />
                                <label htmlFor={`edit-image-${item.id}`} className="btn btn-secondary btn-sm" style={{ display: "inline-flex", width: "100%", gap: "6px" }}>
                                  🖼️ {isSaving === item.id ? "Processing Media..." : "Change Item Image"}
                                </label>
                              </div>

                              {editPreviewImage && (
                                <div style={{ marginBottom: "12px" }}>
                                  <img src={editPreviewImage} alt="Preview" style={{ width: "100%", height: "100px", objectFit: "cover", borderRadius: "6px" }} />
                                </div>
                              )}

                              <div style={{ display: "flex", gap: "8px" }}>
                                <button
                                  className="btn btn-success btn-sm"
                                  style={{ flex: 1 }}
                                  disabled={isSaving === item.id}
                                  onClick={async () => {
                                    let imagePath = item.image;
                                    setIsSaving(item.id);

                                    if (editSelectedFile) {
                                      try {
                                        imagePath = await uploadDirectToCloudinary(editSelectedFile);
                                      } catch (error) {
                                        addNotification("❌ Image upload failed.", "error");
                                        setIsSaving(null);
                                        return;
                                      }
                                    }

                                    const updatedItem = {
                                      name: editName,
                                      price: Number(editPrice),
                                      description: editDescription,
                                      category: editCategory.trim(), 
                                      available: true,
                                      image: imagePath,
                                    };

                                    try {
                                      const res = await apiFetch(`${import.meta.env.VITE_API_URL}/menu/${item.id}`, {
                                        method: "PUT",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify(updatedItem),
                                      }, "manager");

                                      if (res.ok) {
                                        setMenu((prev) => prev.map((m) => m.id === item.id ? { ...m, ...updatedItem, id: item.id } : m));
                                        setEditingItem(null);
                                        setEditSelectedFile(null);
                                        setEditPreviewImage("");
                                        addNotification("✨ Menu item updated successfully!");
                                      }
                                    } catch (error) {
                                      console.error(error);
                                    } finally {
                                      setIsSaving(null);
                                    }
                                  }}
                                >
                                  {isSaving === item.id ? "⏳ Syncing..." : "✅ Save"}
                                </button>
                                <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} disabled={isSaving === item.id} onClick={() => { setEditingItem(null); setEditPreviewImage(""); }}>
                                  ✕ Cancel
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                </div>
              ))
            )}
          </div>
        )}


        {/* ========== CREATE MENU PANEL ========== */}
        {showCreateMenu && (
          <div>
            <div className="main-header">
              <h1>➕ Add New Menu Item</h1>
            </div>

            <div className="card">
              <div className="form-group">
                <label>Item Name *</label>
                <input
                  className="form-input"
                  placeholder="Enter item name"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                />
              </div>

              {/* 🎯 UPGRADED CATEGORY FIELD BLOCK INSERTER */}
<div className="form-group">
  <label>Item Category *</label>
  {!isCustomCategory ? (
    <select
      className="form-input"
      value={newItemCategory}
      onChange={(e) => {
        if (e.target.value === "__NEW__") {
          setIsCustomCategory(true);
          setNewItemCategory("");
        } else {
          setNewItemCategory(e.target.value);
        }
      }}
    >
      <option value="">-- Select a Category --</option>
      {existingCategories.map(cat => (
        <option key={cat} value={cat}>{cat}</option>
      ))}
      <option value="__NEW__" style={{ fontWeight: "bold", color: "#2563eb" }}>➕ Create New Category...</option>
    </select>
  ) : (
    /* 🛠️ Bulletproof layout wrapper */
    <div style={{ 
      display: "flex", 
      gap: "10px", 
      width: "100%", 
      alignItems: "center",
      marginTop: "5px"
    }}>
      <input
        type="text"
        placeholder="e.g., Biryani, Fast Food, Cool Drinks"
        value={customCategoryInput}
        onChange={(e) => setCustomCategoryInput(e.target.value)}
        /* 🚨 NO CLASSNAME HERE TO AVOID CSS CONFLICTS */
        style={{ 
          flex: 1,
          padding: "10px 12px",
          fontSize: "14px",
          color: "#000000",          // 👁️ Forces the text to be pure black so you can see what you type
          backgroundColor: "#ffffff",// ⚪ Forces background to be solid white
          border: "1px solid #cbd5e1",
          borderRadius: "6px",
          outline: "none",
          width: "100%",             // Safe inside flex due to stripping global style rules
          boxSizing: "border-box"
        }}
        autoFocus
      />
      <button
        type="button"
        onClick={() => {
          setIsCustomCategory(false);
          setCustomCategoryInput("");
        }}
        /* 🚨 NO CLASSNAME HERE TO STOP THE BUTTON FROM STRETCHING DUMB/BIG */
        style={{ 
          padding: "10px 16px",
          fontSize: "14px",
          backgroundColor: "#64748b", // Standard clean slate grey
          color: "#ffffff",
          border: "none",
          borderRadius: "6px",
          cursor: "pointer",
          whiteSpace: "nowrap",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          height: "40px"              // Matches the input size exactly
        }}
      >
        ✕ Cancel
      </button>
    </div>
  )}
</div>

              <div className="form-row">
                <div className="form-group">
                  <label>Price (₹) *</label>
                  <input
                    className="form-input"
                    type="number"
                    placeholder="0.00"
                    value={newItemPrice}
                    onChange={(e) => setNewItemPrice(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Description</label>
                <input
                  className="form-input"
                  placeholder="Enter item description"
                  value={newItemDescription}
                  onChange={(e) => setNewItemDescription(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Item Image</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    setSelectedFile(file);
                    if (file) {
                      setPreviewImage(URL.createObjectURL(file));
                    }
                    if (fileInputRef.current) {
                      fileInputRef.current.value = "";
                    }
                  }}
                  style={{ display: "none" }}
                  id="file-input"
                />
        <label
          htmlFor="file-input"
          className="btn btn-secondary"
          style={{ display: "inline-block", cursor: loading ? "not-allowed" : "pointer" }}
        >
          {loading ? "⏳ Uploading..." : "🖼️ Choose Image"}
        </label>
              </div>

              {previewImage && (
                <div style={{ marginBottom: "20px" }}>
                  <p style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "8px" }}>
                    Image Preview:
                  </p>
                  <img
                    src={previewImage}
                    alt="Preview"
                    style={{
                      width: "100%",
                      maxHeight: "200px",
                      objectFit: "cover",
                      borderRadius: "8px",
                      border: "2px solid var(--border-color)",
                    }}
                  />
                </div>
              )}

      <button
        className="btn btn-success"
        style={{ width: "100%", opacity: loading ? 0.7 : 1, cursor: loading ? "not-allowed" : "pointer" }}
        disabled={loading}
        onClick={async () => {
          const finalizedCategory = isCustomCategory 
            ? customCategoryInput.trim() 
            : newItemCategory;

          if (!finalizedCategory) {
            addNotification ("Please select a category or write a brand new custom heading name!");
            return;
          }

          if (!newItemName || !newItemPrice) {
            addNotification("Item Name and Price are required fields!");
            return;
          }

          let imagePath = "";
          setLoading(true);

          if (selectedFile) {
            try {
              imagePath = await uploadDirectToCloudinary(selectedFile);
              console.log("⚡ Cloudinary Secure URL Acquired directly:", imagePath);
            } catch (error) {
              addNotification("❌ Image upload to storage provider failed.", "error");
              setLoading(false);
              return;
            }
          }

          const newItem = {
            name: newItemName,
            price: Number(newItemPrice),
            description: newItemDescription,
            category: finalizedCategory, 
            image: imagePath,
            available: true,
          };

          console.log("🚀 Submitting lightweight text data to DB:", newItem);

          try {
            const res = await apiFetch(`${import.meta.env.VITE_API_URL}/menu`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(newItem)
            }, "manager");

            if (res.ok) {
              const data = await res.json();
              setMenu((prev) => [...prev, data]);

              setNewItemName("");
              setNewItemPrice("");
              setNewItemDescription("");
              setNewItemCategory("");
              setCustomCategoryInput("");
              setIsCustomCategory(false);
              setSelectedFile(null);
              setPreviewImage("");

              addNotification("✅ Item added successfully!", "success");
            } else {
              addNotification("❌ Database rejected item initialization request.", "error");
            }
          } catch (error) {
            console.error("Failed to add item to DB context layer:", error);
            addNotification("❌ Network layer communication crash.", "error");
          } finally {
            setLoading(false);
          }
        }}
      >
        {loading ? "⏳ Syncing Cloud Pointers..." : "✅ Add Item to Menu"}
      </button>
    </div>
  </div>
)}

        
        {/* ========== ORDER MANAGEMENT (DEFAULT VIEW) ========== */}
        {!showSubscription && !showAnalyticsView && !showTransactions && !showSummaryView && !showManageMenu && !showCreateMenu && !showSettings && (
          <>
            <div className="main-header">

  <div className="top-status-row">

    <div
      className={`status-pill ${
        isConnected
          ? "connected"
          : "offline"
      }`}
    >
      {isConnected
        ? "🟢 Connected"
        : "🔴 Offline"}
    </div>

    <div
      className={`status-pill ${
        employeeOnline
          ? "employee-online"
          : "employee-offline"
      }`}
    >
      {employeeOnline
        ? "👨‍🍳 Employee Active"
        : "👨‍🍳 Employee Offline"}
    </div>

  </div>

  <h1 className="page-title">
    📝 Create Order
  </h1>

</div>

            <div className="order-container">
              {/* Left: Menu Selection */}
              <div className="order-list-section">
                <div className="card">
                  <div className="card-title">🔍 Select Items</div>

                  <div style={{ position: "relative" }}>
                    <input
                      className="form-input"
                      placeholder="Search items..."
                      value={search}
                      onChange={(e) => {
                        setSearch(e.target.value);
                        setSelectedItem(null);
                        setShowDropdown(true);
                      }}
                    />

                    {showDropdown && search && (
                      <div className="dropdown-menu">
                        {filteredMenu.length === 0 ? (
                          <div style={{ padding: "16px", textAlign: "center", color: "var(--text-secondary)" }}>
                            No items found
                          </div>
                        ) : (
                          filteredMenu.map((item, index) => (
                            <div
                              key={index}
                              className="dropdown-item"
                              onClick={() => {
                                setSelectedItem(item);
                                setSearch(item.name);
                                setShowDropdown(false);
                              }}
                            >
                              <span className="dropdown-item-name">
                                {item.name}
                                {lowStockItems.includes(item.name) && (
                                  <span style={{ color: "var(--warning-color)" }}>⚠️</span>
                                )}
                                <span className="dropdown-item-price">₹{item.price}</span>
                              </span>
                              <span
                                className="dropdown-item-info"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedInfoItem(item);
                                }}
                              >
                                ℹ️
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>

                  <div className="form-group" style={{ marginTop: "16px" }}>
                    <label>Quantity</label>
                    <input
                      className="form-input"
                      type="number"
                      placeholder="0"
                      value={qty}
                      onFocus={() => setShowDropdown(false)}
                      onChange={(e) => setQty(e.target.value)}
                    />
                  </div>

                  <button
                    className="btn btn-primary"
                    style={{ width: "100%" }}
                    onClick={handleAddItem}
                  >
                    ➕ Add to Cart
                  </button>
                </div>
              </div>

              {/* Right: Cart & Checkout */}
              <div className="cart-section">
                <div className="card">
                  <div className="card-title">🛒 Order Cart</div>

                  {cart.length === 0 ? (
                    <p style={{ textAlign: "center", color: "var(--text-secondary)", padding: "20px 0" }}>
                      Your cart is empty
                    </p>
                  ) : (
                    <>
                      <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
                        {cart.map((item, index) => (
                          <div key={index} className="cart-item">
                            <div className="cart-item-info">
                              <div className="cart-item-name">{item.name}</div>
                              <div className="cart-item-price">₹{item.price} each</div>
                            </div>
                            <div className="cart-item-controls">
                              <div className="qty-control">
                                <button
                                  className="qty-btn"
                                  onClick={() =>
                                    handleQtyChange(index, item.quantity - 1)
                                  }
                                >
                                  −
                                </button>
                                <span className="qty-value">{item.quantity}</span>
                                <button
                                  className="qty-btn"
                                  onClick={() =>
                                    handleQtyChange(index, item.quantity + 1)
                                  }
                                >
                                  +
                                </button>
                              </div>
                              <div className="cart-item-total">
                                ₹{Number(item.price || 0) * Number(item.quantity || 0)}
                              </div>
                              <button
                                className="cart-remove"
                                onClick={() => handleRemoveItem(index)}
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="order-total">
                        <span className="order-total-label">Order Total:</span>
                        <span className="order-total-value">₹{total}</span>
                      </div>
                    </>
                  )}

                  <div className="payment-section">
                    <span className="payment-label">💳 Payment Method</span>
                    <div className="payment-options">
                      <label className="radio-option">
                        <input
                          type="radio"
                          value="cash"
                          checked={paymentMode === "cash"}
                          onChange={(e) => setPaymentMode(e.target.value)}
                        />
                        <span>💵 Cash</span>
                      </label>
                      <label className="radio-option">
                        <input
                          type="radio"
                          value="online"
                          checked={paymentMode === "online"}
                          onChange={(e) => setPaymentMode(e.target.value)}
                        />
                        <span>💳 Online</span>
                      </label>
                    </div>
                  </div>

                  <button
                    className="btn btn-success"
                    style={{ width: "100%" }}
                    disabled={cart.length === 0 || creatingOrder}
                    onClick={handleCreateOrder}
                  >
                    {
                      creatingOrder
                          ? "Creating..."
                          : "✅ Create Order"
                            }
                  </button>
                </div>
              </div>
            </div>

            {/* Active Orders */}
            <div style={{ marginTop: "40px" }}>
              <div className="main-header">
                <h2>📦 Active Orders</h2>
              </div>

              {/* Filter Section */}
             <div
  className="filters-row"
  style={{
    marginBottom: "24px",
    display: "flex",
    gap: "8px",
    alignItems: "center",
    flexWrap: "wrap"
  }}
>
                <button
                  className={`btn btn-sm ${filterOrderStatus === "all" ? "btn-primary" : "btn-secondary"}`}
                  onClick={() => setFilterOrderStatus("all")}
                  style={{ whiteSpace: "nowrap", flex: "0" }}
                >
                  All Orders
                </button>
                <button
                  className={`btn btn-sm ${filterOrderStatus === "pending" ? "btn-primary" : "btn-secondary"}`}
                  onClick={() => setFilterOrderStatus("pending")}
                  style={{ whiteSpace: "nowrap", flex: "0" }}
                >
                  ⏳ Pending
                </button>
                <button
                  className={`btn btn-sm ${filterOrderStatus === "accepted" ? "btn-primary" : "btn-secondary"}`}
                  onClick={() => setFilterOrderStatus("accepted")}
                  style={{ whiteSpace: "nowrap", flex: "0" }}
                >
                  ✅ Accepted
                </button>
                <input
                  className="form-input"
                  placeholder="🔍 Search Token..."
                  value={filterOrderToken}
                  onChange={(e) => setFilterOrderToken(e.target.value)}
                  style={{ padding: "8px 12px", fontSize: "13px", width: "180px" }}
                />
              </div>

              {filteredOrders.length === 0 ? (

  <div
    className="card"
    style={{
      textAlign: "center",
      padding: "50px"
    }}
  >

    <p
      style={{
        color: "var(--text-secondary)",
        fontSize: "16px",
        fontWeight: "500"
      }}
    >
      {orders.length === 0
        ? "No active orders"
        : "No orders match your filters"}
    </p>

  </div>

) : (

  <div className="grid grid-3">

    {filteredOrders.map((order) => (

      <div
        key={order.id}
        className="card"
        style={{
          borderRadius: "20px",
          padding: "20px",
          position: "relative",
          overflow: "hidden"
        }}
      >

        {/* HEADER */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: "18px"
          }}
        >

          <div>

            <h2
              style={{
                fontSize: "24px",
                fontWeight: "800",
                color: "var(--primary-color)",
                marginBottom: "6px"
              }}
            >
              {settings?.token_prefix || "TOK"}-
              {order.token_id}
            </h2>

            <p
              style={{
                fontSize: "13px",
                color: "var(--text-secondary)"
              }}
            >
              {order.items?.length || 0} item(s)
            </p>

          </div>

          <span
            style={{

              padding: "7px 14px",

              borderRadius: "999px",

              fontSize: "12px",

              fontWeight: "700",

              backgroundColor:

                order.status === "accepted"
                  ? "#dcfce7"
                  : "#fef3c7",

              color:

                order.status === "accepted"
                  ? "#166534"
                  : "#b45309"
            }}
          >

            {order.status === "accepted"
              ? "✅ Accepted"
              : "⏳ Pending"}

          </span>

        </div>

        {/* ITEMS */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            marginBottom: "18px"
          }}
        >

          {order.items?.map((item, index) => (

            <div
              key={index}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",

                background: "rgba(0,0,0,0.03)",

                padding: "10px 14px",

                borderRadius: "12px"
              }}
            >

              <div>

                <p
                  style={{
                    fontWeight: "600",
                    marginBottom: "3px",
                    fontFamily: "inherit"
                  }}
                >
                  {item.name}
                </p>

                <p
                  style={{
                    fontSize: "12px",
                    color: "var(--text-secondary)",
                    fontFamily: "inherit"
                  }}
                >
                  Qty: {item.quantity}
                </p>

              </div>

              <div
                style={{
                  fontWeight: "700",
                  color: "var(--primary-color)"
                }}
              >
                ₹
                {(
                  Number(item.price || 0)
                  *
                  Number(item.quantity || 0)
                ).toFixed(2)}
              </div>

            </div>

          ))}

        </div>

        {/* FOOTER */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: "10px"
          }}
        >

          {/* 🚀 FIXED PAYMENT MODE DISCRIMINATOR */}
<div
  style={{
    display: "flex",
    alignItems: "center",
    gap: "8px"
  }}
>
  <span
    style={{
      fontSize: "13px",
      fontWeight: "600",
      color: "var(--text-secondary)"
    }}
  >
    Payment:
  </span>

  <span
    style={{
      padding: "5px 10px",
      borderRadius: "10px",
      // ✅ .toLowerCase() safely handles uppercase string responses like "ONLINE"
      background:
        order.payment_mode?.toLowerCase() === "online"
          ? "#dbeafe"
          : "#f3f4f6",

      color:
        order.payment_mode?.toLowerCase() === "online"
          ? "#1d4ed8"
          : "#374151",

      fontSize: "12px",
      fontWeight: "700"
    }}
  >
    {order.payment_mode?.toLowerCase() === "online"
      ? "💳 Online"
      : "💵 Cash"}
  </span>
</div>

          {/* TOTAL */}
          <div
            style={{
              fontSize: "20px",
              fontWeight: "800",
              color: "var(--primary-color)"
            }}
          >
            ₹
            {Number(
              order.total_price || 0
            ).toFixed(2)}
          </div>

        </div>

        {/* WAITING TIME */}
        <div
          style={{
            marginTop: "18px",

            paddingTop: "14px",

            borderTop:
              "1px solid rgba(0,0,0,0.08)",

            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}
        >

          <span
            style={{
              fontSize: "13px",
              color: "#dc2626",
              fontWeight: "700"
            }}
          >
            🕒 Waiting:
            {" "}
            {getWaitingTime(
              order.created_at
            )}
          </span>

          <span
            style={{
              fontSize: "12px",
              color: "var(--text-secondary)"
            }}
          >
            #{order.id}
          </span>

        </div>

      </div>

    ))}

  </div>
)}
            </div>
          </>
        )}

        <ToastContainer notifications={notifications} />

{/* ========================================================
    MAIN CONTENT AREA: SUBSCRIPTION MANAGEMENT PANEL
======================================================== */}
{showSubscription && (
  <div className="subscription-panel-wrapper">
    <h2 className="subscription-main-title">
      🛡️ Subscription Management
    </h2>
    <p className="subscription-subtitle">
      Monitor your active registration duration lifecycle and extend your setup securely.
    </p>

    {/* ⚠️ HIGH VISIBILITY CONFLICT WARNING BOX */}
    <div className="subscription-warning-box">
      <p className="subscription-warning-text">
        ⚠️ NOTICE: Please recharge early to avoid automatic workspace lockout conflicts! Manual validation processing from the superadmin takes time. Your platform features remain entirely operational while approval is pending.
      </p>
    </div>

    {/* METRICS GRID: EXPIRY & COUNTDOWN */}
    <div className="subscription-metrics-grid">
      
      {/* Expiry Date Card */}
      <div className="subscription-meta-card">
        <span className="meta-card-label">Expiration Date</span>
        <h3 className="meta-card-value">
          {settings === null ? (
            <span className="meta-card-loading">Loading details...</span>
          ) : settings?.subscription_expires ? (
            new Date(settings.subscription_expires).toLocaleDateString('en-IN', { dateStyle: 'long' }) 
          ) : (
            "No active deadline log found"
          )}
        </h3>
      </div>

      {/* Countdown Card */}
      <SubscriptionCountdownCard expiryDate={settings?.subscription_expires} />
    </div>

    {/* DYNAMIC RECHARGE INTERFACE CONTAINER */}
    <div className="subscription-recharge-card">
      
      {/* 🔄 STATE A: DEFAULT ACTIVE / READY TO PAY */}
      {(settings?.subscription_status === "active" || !settings?.subscription_status) && (
        <div className="sub-state-container">
          <h3 className="sub-state-title">🔄 Extend Plan for 30 Days</h3>
          <p className="sub-state-desc">
            Click below to open manual payment gateway details and upload your receipt copy.
          </p>

          <div className="subscription-cost-badge">
            <span className="cost-badge-label">Renewal Cost</span>
            <span className="cost-badge-value">₹499</span>
          </div>

          <br />

          <button
            type="button"
            onClick={() => setShowRechargeModal(true)}
            className="btn-subscription-submit"
          >
            Make Payment ₹499
          </button>
        </div>
      )}

      {/* 🎉 STATE B: REQUEST PENDING APPROVAL */}
      {settings?.subscription_status === "pending_renewal" && (
        <div className="sub-state-container state-pending">
          <div className="sub-state-icon">⏳</div>
          <h3 className="sub-state-title-pending">
            Request Made to the Admin!
          </h3>
          <p className="sub-state-desc-pending">
            Your payment verification request has been safely logged. Your subscription expiry date will be automatically extended as soon as the superadmin approves the transaction.
          </p>
          
          {submittedUtr && (
            <span className="sub-utr-badge">
              UTR Reference: <strong className="sub-utr-value">{submittedUtr}</strong>
            </span>
          )}
        </div>
      )}

      {/* ❌ STATE C: ADMIN DECLINED RECHARGE */}
      {settings?.subscription_status === "declined" && (
        <div className="sub-state-container state-declined">
          <div className="sub-state-icon">❌</div>
          <h3 className="sub-state-title-declined">
            Recharge Request Declined
          </h3>
          
          <div className="subscription-rejection-box">
            <span className="rejection-box-label">Reason from Admin:</span>
            <p className="rejection-box-text">
              {settings?.rejection_reason || "The uploaded transaction receipt details could not be validated by our bank logs."}
            </p>
          </div>

          <button
            type="button"
            onClick={handleResetDecline}
            className="btn-subscription-decline-ack"
          >
            Acknowledge & Try Again
          </button>
        </div>
      )}

    </div>

    {/* Popup Modal stays untouched */}
    <ManualRechargeModal 
      isOpen={showRechargeModal} 
      onClose={() => setShowRechargeModal(false)} 
      onNotify={addNotification}
      onSuccess={async (utrValue) => {
        setSubmittedUtr(utrValue);
        setShowRechargeModal(false);
        await handleRechargeRequest(); 
      }}
    />
  </div>
)}

        {/* ========== SETTINGS PANEL ========== */}
        {showSettings && (
          <div className="settings-container">
            <div className="main-header">
              <h1>⚙️ Business Settings</h1>
            </div>

            <div className="settings-section">
              <div className="settings-card">
  <div className="settings-header">
    <h2>🏪 Business Information</h2>
  </div>

  <div className="settings-content">
    <div className="setting-group">
      <label className="setting-label">Business Name</label>
      <input
        className="setting-input"
        placeholder="SK Restaurants"
        value={settings.restaurant_name}
        onChange={(e) =>
          setSettings({
            ...settings,
            restaurant_name: e.target.value
          })
        }
      />
    </div>

    <div className="setting-group">
      <label className="setting-label">Address</label>
      <input
        className="setting-input"
        placeholder="Chintal, Hyderabad"
        value={settings.address}
        onChange={(e) =>
          setSettings({
            ...settings,
            address: e.target.value
          })
        }
      />
    </div>

    <div className="setting-group">
      <label className="setting-label">Phone</label>
      <input
        className="setting-input"
        placeholder="Phone"
        value={settings.phone}
        onChange={(e) =>
          setSettings({
            ...settings,
            phone: e.target.value
          })
        }
      />
    </div>

    <div className="setting-group">
      <label className="setting-label">GST Number</label>
      <input
        className="setting-input"
        placeholder="GST Number"
        value={settings.gst_number}
        onChange={(e) =>
          setSettings({
            ...settings,
            gst_number: e.target.value
          })
        }
      />
    </div>

    <div className="setting-group">
      <label className="setting-label">Token Prefix</label>
      <input
        className="setting-input"
        placeholder="TOK"
        value={settings.token_prefix}
        onChange={(e) =>
          setSettings({
            ...settings,
            token_prefix: e.target.value
          })
        }
      />
    </div>

    {/* 🚀 NEW SECTION: REGISTERED EMAIL ID (READ-ONLY) */}
    <div className="setting-group">
      <label className="setting-label">Registered Email ID</label>
      <input
        className="setting-input"
        type="email"
        readOnly // 🔒 Makes it non-editable
        disabled // 🛡️ Grays it out slightly to visually indicate it's locked
        value={settings.email || "Loading..."} 
      />
    </div>

    <div className="setting-group">
      <label className="setting-label">Logo</label>
      <input
        type="file"
        accept="image/*"
        onChange={handleLogoUpload}
      /> 
    </div>
    
    {settings?.logo_url && (
      <div style={{ marginTop: "10px" }}>
        <img
          src={settings.logo_url}
          alt="logo"
          style={{
            width: "100px",
            height: "100px",
            objectFit: "cover",
            borderRadius: "12px"
          }}
        />
        <p>Logo uploaded ✅</p>
      </div>
    )}

          {/* ACCOUNT SECURITY CARD */}
          <div className="security-accordion-card">
            <div className="security-card-header">
              <div className="security-header-info">
                <h4 className="security-card-title">Account Security Management</h4>
                <p className="security-card-subtitle">Update your secret authentication key details phrase.</p>
              </div>
              <button 
                type="button"
                onClick={() => setShowPasswordForm(!showPasswordForm)}
                className={`btn-security-toggle ${showPasswordForm ? 'active' : ''}`}
              >
                {showPasswordForm ? "Cancel Request" : "Modify Password"}
              </button>
            </div>

            {/* PASSWORD RE-AUTHENTICATION SUB-FORM */}
            {showPasswordForm && (
              <form onSubmit={submitPasswordChange} className="security-password-form">
                <div className="password-inputs-grid">
                  <div className="setting-group">
                    <label className="password-input-label">Current Password</label>
                    <input 
                      type="password" 
                      name="current_password"
                      required
                      value={passwordPayload.current_password}
                      onChange={handlePasswordInputChange}
                      placeholder="••••••••"
                      className="setting-input"
                    />
                  </div>

                  <div className="setting-group">
                    <label className="password-input-label">New Password</label>
                    <input 
                      type="password" 
                      name="new_password"
                      required
                      value={passwordPayload.new_password}
                      onChange={handlePasswordInputChange}
                      placeholder="Min 6 characters"
                      className="setting-input"
                    />
                  </div>

                  <div className="setting-group">
                    <label className="password-input-label">Confirm New Password</label>
                    <input 
                      type="password" 
                      name="confirm_password"
                      required
                      value={passwordPayload.confirm_password}
                      onChange={handlePasswordInputChange}
                      placeholder="Repeat new password"
                      className="setting-input"
                    />
                  </div>
                </div>

                <div className="password-form-actions">
                  <button 
                    type="submit" 
                    disabled={passwordSubmitting}
                    className="btn-password-save"
                  >
                    {passwordSubmitting ? "Encrypting Strings..." : "Save Secure Password"}
                  </button>
                </div>
        </form>
      )}
    </div>
  </div>
</div>

              <div className="settings-card">
                <div className="settings-header">
                  <h2>🔧 Preferences</h2>
                </div>

                <div className="settings-content">
                  <div className="setting-group checkbox">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={settings.enable_sound}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            enable_sound: e.target.checked
                          })
                        }
                      />
                      <span>🔊 Enable Sound Notifications</span>
                    </label>
                  </div>
                </div>
              </div>
<div className="settings-card">

  <div className="settings-header">
    <h2>Manage Employees</h2>
  </div>

  <div className="employee-list">

    {employees.length === 0 ? (

      <div className="empty-employees">
        No employees found
      </div>

    ) : (

      employees.map((employee) => (

        <div
          key={employee.id}
          className="employee-row"
        >

          {/* LEFT SIDE */}
          <div className="employee-left">

            <div className="employee-avatar">
              {employee.name?.charAt(0).toUpperCase()}
            </div>

            <div className="employee-meta">

              <div className="employee-name">
                {employee.name}
              </div>

              <div className="employee-email">
                {employee.email}
              </div>

            </div>

          </div>

          {/* RIGHT SIDE */}
          <button
            className="employee-delete-btn"
            onClick={() =>
              handleDeleteEmployee(employee.id, employee.name)
            }
          >
            Delete
          </button>

        </div>
      ))
    )}

  </div>

  {/* CREATE BUTTON BELOW */}
  <div className="employee-footer">

    <button
      className="btn btn-primary"
      onClick={() =>
        setShowEmployeeRegister(true)
      }
    >
      + Create Employee
    </button>

  </div>

</div>
              <div className="settings-actions">
                <button
                  className="btn btn-success btn-lg"
                  onClick={handleSaveSettings}
                >
                  💾 Save Settings
                </button>
              </div>
            </div>
          </div>
        )}

        
        {/* ========== INFO MODAL ========== */}
        {selectedInfoItem && (
          <div className="modal-overlay">
            <div className="modal-content">
              <button
                className="modal-close"
                onClick={() => setSelectedInfoItem(null)}
              >
                ✕
              </button>
              <img
                src={`${selectedInfoItem.image}`}
                alt={selectedInfoItem.name}
                className="modal-image"
                onError={(e) => {
                  e.target.src = "https://via.placeholder.com/400?text=No+Image";
                }}
              />
              <h2 className="modal-header">{selectedInfoItem.name}</h2>
              <p className="modal-description">{selectedInfoItem.description}</p>
              <p className="modal-price">₹{selectedInfoItem.price}</p>
            </div>
          </div>
        )}

  {/* =========================================
    🧾 STANDARD DAILY CLOSE MODAL SUMMARY
   ========================================= */}
         
        {closeDaySummary && (
  <div className="payment-modal-overlay" style={{ zIndex: 2000 }}>
    <div className="payment-modal" style={{ maxWidth: "420px", padding: "25px", position: "relative" }}>
      
      {/* ❌ Close Button */}
      <button 
        type="button"
        onClick={() => setCloseDaySummary(null)}
        style={{
          position: "absolute",
          top: "12px",
          right: "16px",
          background: "none",
          border: "none",
          fontSize: "24px",
          cursor: "pointer",
          color: "#64748b"
        }}
      >
        &times;
      </button>

      <div style={{ textAlign: "center", marginBottom: "20px" }}>
        <span style={{ fontSize: "40px" }}>🏁</span>
        <h2 style={{ marginTop: "10px", color: "#1e293b" }}>Day Closed Successfully</h2>
        <p style={{ fontSize: "14px", color: "#64748b" }}>Summary for: {closeDaySummary.date}</p>
      </div>

      {/* 📊 Sales Data Breakdown Grid */}
      <div style={{ background: "#f8fafc", borderRadius: "10px", padding: "15px", marginBottom: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px dashed #e2e8f0" }}>
          <span style={{ color: "#64748b", fontWeight: "500" }}>💵 Cash Sales:</span>
          <span style={{ fontWeight: "600", color: "#0f172a" }}>₹{closeDaySummary.cashSales}</span>
        </div>
        
        <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px dashed #e2e8f0" }}>
          <span style={{ color: "#64748b", fontWeight: "500" }}>📱 Online UPI Sales:</span>
          <span style={{ fontWeight: "600", color: "#0f172a" }}>₹{closeDaySummary.onlineSales}</span>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0 4px 0" }}>
          <span style={{ color: "#1e3a8a", fontWeight: "bold" }}>📈 Total Revenue:</span>
          <span style={{ fontWeight: "bold", color: "#1e40af", fontSize: "18px" }}>₹{closeDaySummary.totalRevenue}</span>
        </div>
      </div>

      {/* 📄 Action Buttons */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        <button
          type="button"
          onClick={() => downloadSalesReport(closeDaySummary, "day", settings)}
          style={{
            width: "100%",
            padding: "12px",
            backgroundColor: "#2563eb",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            fontWeight: "600",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px"
          }}
        >
          📥 Download Sales Report PDF
        </button>

        <button
          type="button"
          onClick={() => setCloseDaySummary(null)}
          style={{
            width: "100%",
            padding: "10px",
            backgroundColor: "#e2e8f0",
            color: "#475569",
            border: "none",
            borderRadius: "6px",
            fontWeight: "600",
            cursor: "pointer"
          }}
        >
          Close View
        </button>
      </div>

    </div>
  </div>
)}

      {masterCycleSummary && (
  <div className="payment-modal-overlay" style={{ zIndex: 2500, backgroundColor: "rgba(15, 23, 42, 0.85)" }}>
    <div className="payment-modal" style={{ maxWidth: "480px", padding: "30px", borderRadius: "16px", border: "2px solid #3b82f6", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)" }}>
      
      <div style={{ textAlign: "center", marginBottom: "25px" }}>
        <span style={{ fontSize: "50px", animation: "bounce 1s infinite" }}>🏆</span>
        <h2 style={{ marginTop: "12px", color: "#1e3a8a", fontSize: "24px", fontWeight: "800" }}>
          15-Day Cycle Completed!
        </h2>
        <p style={{ fontSize: "14px", color: "#64748b", marginTop: "4px" }}>
          Operational Window: <strong>{masterCycleSummary.startDate}</strong> to <strong>{masterCycleSummary.endDate}</strong>
        </p>
      </div>

      <p style={{ fontSize: "14px", color: "#475569", textAlign: "center", marginBottom: "20px" }}>
        Today marked the 15th closed business day. The active transaction desk charts have been packed up and reset to Day 1. Download your final immutable auditing document below.
      </p>

      {/* 📊 Consolidated 15-Day Summary Ledger Grid */}
      <div style={{ background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)", borderRadius: "12px", padding: "20px", marginBottom: "25px", border: "1px solid #e2e8f0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px dashed #cbd5e1" }}>
          <span style={{ color: "#475569", fontWeight: "600" }}>📦 Total Orders Processed:</span>
          <span style={{ fontWeight: "700", color: "#0f172a" }}>{masterCycleSummary.total_orders} Tickets</span>
        </div>
        
        <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px dashed #cbd5e1" }}>
          <span style={{ color: "#475569", fontWeight: "600" }}>💵 Total Cash Collected:</span>
          <span style={{ fontWeight: "700", color: "#16a34a" }}>₹{Number(masterCycleSummary.cash_sales).toLocaleString('en-IN')}</span>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px dashed #cbd5e1" }}>
          <span style={{ color: "#475569", fontWeight: "600" }}>📱 Total Online UPI Sales:</span>
          <span style={{ fontWeight: "700", color: "#2563eb" }}>₹{Number(masterCycleSummary.online_sales).toLocaleString('en-IN')}</span>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", padding: "14px 0 0 0" }}>
          <span style={{ color: "#1e293b", fontSize: "16px", fontWeight: "bold" }}>📈 Gross Cycle Revenue:</span>
          <span style={{ fontWeight: "900", color: "#1e40af", fontSize: "22px" }}>
            ₹{Number(masterCycleSummary.total_sales).toLocaleString('en-IN')}
          </span>
        </div>
      </div>

      {/* Action CTA Deck */}
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {/* 📅 BUTTON 1: Download Only the 15th Day's Sales Report */}
  <button
    className="btn btn-primary"
    onClick={() => {
      // Passes 'closeDaySummary' data with mode set to "day"
      downloadSalesReport(closeDaySummary, "day", settings);
    }}
  >
    📄 Download Today's Report (Day 15)
  </button>

        <button
          type="button"
          onClick={() => {
            // 🚀 Hits our global shared pdf utility function in 'cycle' format config layout!
            import("../../../utils/reports").then((mod) => {
              mod.downloadSalesReport(masterCycleSummary, "cycle", settings);
            });
          }}
          style={{
            width: "100%",
            padding: "14px",
            backgroundColor: "#2563eb",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            fontWeight: "700",
            fontSize: "15px",
            cursor: "pointer",
            boxShadow: "0 4px 6px -1px rgba(37, 99, 235, 0.2)"
          }}
        >
          📥 Download Final 15-Day Report PDF
        </button>

        <button
          type="button"
          onClick={() => setMasterCycleSummary(null)}
          style={{
            width: "100%",
            padding: "10px",
            backgroundColor: "#e2e8f0",
            color: "#475569",
            border: "none",
            borderRadius: "8px",
            fontWeight: "600",
            cursor: "pointer"
          }}
        >
          Acknowledge & Close View
        </button>
      </div>

    </div>
  </div>
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


/* ========================================================
   SUB-COMPONENT: REAL-TIME COUNTDOWN CALCULATION
   ======================================================== */
const SubscriptionCountdownCard = ({ expiryDate }) => {
  const [timeLeft, setTimeLeft] = useState('Calculating...');
  const [isCritical, setIsCritical] = useState(false);

  useEffect(() => {
    if (!expiryDate) return;

    const calculateTime = () => {
      const difference = new Date(expiryDate) - new Date();
      if (difference <= 0) {
        setTimeLeft('Expired');
        setIsCritical(true);
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);

      if (days < 3) setIsCritical(true);
      setTimeLeft(`${days} Days, ${hours} Hours`);
    };

    calculateTime();
    const interval = setInterval(calculateTime, 60000);
    return () => clearInterval(interval);
  }, [expiryDate]);

  return (
    <div style={{ 
      background: isCritical ? "#fff5f5" : "#f8fafc", 
      padding: "20px", 
      borderRadius: "10px", 
      border: isCritical ? "1px solid #feb2b2" : "1px solid #e2e8f0" 
    }}>
      <span style={{ fontSize: "12px", color: isCritical ? "#c53030" : "#64748b", textTransform: "uppercase", fontWeight: "700" }}>Time Remaining</span>
      <h3 style={{ fontSize: "20px", color: isCritical ? "#9b1c1c" : "#1e293b", margin: "8px 0 0 0", fontWeight: "800" }}>
        {timeLeft}
      </h3>
    </div>
  );
};

/* ========================================================
   SUB-COMPONENT: SCREENSHOT TRANSACTION UPLOADER
   ======================================================== */
const RechargeFormHandler = ({onNotify}) => {
  const [screenshot, setScreenshot] = useState(null);
  const [preview, setPreview] = useState('');
  const [loading, setLoading] = useState(false);

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (file) {
      setScreenshot(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const submitRecharge = async () => {
    if (!screenshot) {
      onNotify("Please upload your transaction screenshot first!");
      return;
    }
    setLoading(true);

    const formData = new FormData();
    formData.append("screenshot", screenshot);
    formData.append("duration_days", 30);

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/auth/recharge-subscription`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("managerAccessToken")}`
        },
        body: formData
      });

      if (res.ok) {
        onNotify("✨ Extension receipt dispatched successfully! Superadmin authorization pending.");
        setScreenshot(null);
        setPreview('');
      } else {
        onNotify("❌ Database submission rejected.");
      }
    } catch (err) {
      onNotify("❌ Error hitting backend transmission line.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "15px", alignItems: "center" }}>
      <input type="file" accept="image/*" onChange={handleFile} style={{ fontSize: "14px" }} />
      
      {preview && (
        <img src={preview} alt="Receipt preview" style={{ width: "100%", maxHeight: "200px", objectFit: "contain", borderRadius: "6px", border: "1px solid #cbd5e1" }} />
      )}

      <button
        onClick={submitRecharge}
        disabled={loading}
        style={{
          width: "100%", padding: "12px", background: "#10b981", color: "white",
          border: "none", borderRadius: "6px", fontWeight: "700", cursor: "pointer"
        }}
      >
        {loading ? "Uploading Proof..." : "🚀 Send Renewal Screenshot to Admin"}
      </button>
    </div>
  );
};


/* ========================================================
   SUB-COMPONENT: MANUAL RECHARGE PAYMENT MODAL WITH UTR
   ======================================================== */
const ManualRechargeModal = ({ isOpen, onClose, onSuccess, onNotify }) => {
  const [utr, setUtr] = useState('');
  const [screenshot, setScreenshot] = useState(null);
  const [preview, setPreview] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setScreenshot(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleReceiptSubmission = async () => {
    if (!utr.trim()) {
      onNotify("Please input your transaction reference UTR ID first!");
      return;
    }
    if (!screenshot) {
      onNotify("Please upload your payment screenshot file proof!");
      return;
    }
    
    setLoading(true);

    const formData = new FormData();
    formData.append("screenshot", screenshot);
    formData.append("utr_id", utr.trim()); // 🚀 Sent to backend
    formData.append("duration_days", 30);

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/auth/recharge-subscription`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("managerAccessToken")}`
        },
        body: formData
      });

      if (res.ok) {
        // Clear forms out cleanly
        setScreenshot(null);
        setPreview('');
        
        // Pass UTR up to main screen and trigger success panel change view
        onSuccess(utr.trim()); 
        onClose(); 
      } else {
        onNotify("❌ Database submission rejected by server infrastructure.");
      }
    } catch (err) {
      onNotify("❌ Critical runtime transmission fault handling backend data line.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
    }}>
      <div style={{
        background: '#ffffff', padding: '28px', borderRadius: '16px',
        maxWidth: '460px', width: '90%', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
          <h3 style={{ margin: 0, fontSize: '19px', fontWeight: '800', color: '#1e293b' }}>
            💳 Secure Manual Payment
          </h3>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: "22px", cursor: "pointer", color: "#94a3b8", lineHeight: "1" }}>×</button>
        </div>

        <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 16px 0', lineHeight: "1.5" }}>
          Scan the official merchant QR code and make a bank transfer of exactly <strong>₹499</strong>.
        </p>

        {/* MERCHANT GATEWAY BOX */}
        <div style={{ textAlign: "center", backgroundColor: "#f8fafc", padding: "12px", borderRadius: "12px", border: "1px solid #e2e8f0", marginBottom: "16px" }}>
          <div style={{ width: "140px", height: "140px", backgroundColor: "#cbd5e1", margin: "0 auto 8px auto", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", color: "#475569", fontSize: "12px" }}>
            [ MERCHANT QR IMAGE ]
          </div>
          <span style={{ fontSize: "12px", color: "#334155", fontWeight: "700" }}>UPI ID: business@upi</span>
        </div>

        {/* 🚀 NEW STEP: UTR INPUT TEXT AREA */}
        <div style={{ marginBottom: "16px" }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
            Reference UTR / Transaction ID (12 Digits)
          </label>
          <input 
            type="text" 
            placeholder="Enter 12-digit UTR identifier number" 
            value={utr}
            onChange={(e) => setUtr(e.target.value)}
            style={{ 
              width: "100%", padding: "10px", borderRadius: "6px", 
              border: "1px solid #cbd5e1", fontSize: "13px", boxSizing: "border-box" 
            }}
          />
        </div>

        {/* FILE UPLOADER GATES */}
        <div style={{ border: '2px dashed #cbd5e1', padding: '14px', borderRadius: '10px', marginBottom: '20px', textAlign: 'center' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px', cursor: 'pointer' }}>
            📸 Upload Payment Receipt Screenshot
          </label>
          <input type="file" accept="image/*" onChange={handleFileChange} style={{ fontSize: '12px', width: "100%" }} />
          
          {preview && (
            <img src={preview} alt="Receipt Preview" style={{ width: '100%', maxHeight: '100px', objectFit: 'contain', marginTop: '10px', borderRadius: '4px' }} />
          )}
        </div>

        {/* BUTTON SYSTEM */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={handleReceiptSubmission}
            disabled={loading}
            style={{
              flex: 1, padding: '12px', background: '#10b981', color: 'white',
              border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontSize: "14px"
            }}
          >
            {loading ? "Verifying Reference..." : "🚀 Submit Extension Proof"}
          </button>
          <button
            onClick={onClose}
            style={{
              padding: '12px 18px', background: '#f1f5f9', color: '#475569',
              border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', fontSize: "14px"
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};


export default KitchenManager;