import { useEffect, useState } from "react";
import { createSocket } from "../../../services/socket";
import { useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import html2canvas from "html2canvas";
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


function BillingManager() {
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
  const [showTransactions, setShowTransactions] = useState(false);
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
  const [isSaving, setIsSaving] = useState(null); // Track the ID of the row being saved
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
 
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [subscriptionTimeLeft, setSubscriptionTimeLeft] = useState('');
  const [isExpiryCritical, setIsExpiryCritical] = useState(false);
  const [showRechargeModal, setShowRechargeModal] = useState(false);
  const [rechargePending, setRechargePending] = useState(false); // 👈 Tracks if a request was submitted
  const [submittedUtr, setSubmittedUtr] = useState('');

  // State tracking for editing an item's category inline
  const [editCategory, setEditCategory] = useState("");
  const [isEditCustomCategory, setIsEditCustomCategory] = useState(false);
  const [editCustomCategoryInput, setEditCustomCategoryInput] = useState("");
  const [
  currentTime,
  setCurrentTime
] = useState(Date.now());
  const [settings, setSettings] =
  useState({
    restaurant_name: "",
    address: "",
    phone: "",
    gst_number: "",
    token_prefix: "TOK",
    enable_sound: true,
    enable_low_stock_alert: true,

    subscription_expires: "",
    payment_status: ""
  });
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

// --- PERFECT COUPLING ALIGNMENT ANCHORS ---
  const colItemX = margin;                                       // Absolute left edge
  const colQtyCenter = margin + (rightBoundary - margin) / 2;    // 🎯 Mathematical dead center
  const colTotalRight = rightBoundary;                           // Absolute right edge

  // --- ITEMS TABLE HEADER ---
  doc.setFont("JetBrains Mono", "bold");
  doc.setFontSize(8);
  doc.text("ITEM", colItemX, y);
  
  // 🎯 align: "center" places the text exactly split in half over the coordinate
  doc.text("QTY", colQtyCenter, y, { align: "center" }); 
  doc.text("TOTAL", colTotalRight, y, { align: "right" });
  y += 5;

  // --- ITEMS LIST ---
  doc.setFont("JetBrains Mono", "normal");
  transaction.items.forEach((item) => {
    
    // Safety room calculation: prevents the item name from bleeding past the center column
    const safeNameWidth = (colQtyCenter - margin) - 6; 
    const splitName = doc.splitTextToSize(item.name, safeNameWidth); 
    
    // Print item name
    doc.text(splitName, colItemX, y);
    
    // 🎯 Print quantity exactly matching center anchor line
    doc.text(`${item.quantity}`, colQtyCenter, y, { align: "center" });
    
    // Print total price flush right
    doc.text(`Rs.${(item.price * item.quantity).toFixed(2)}`, colTotalRight, y, { align: "right" });
    
    // Advance Y coordinate cleanly based on multi-line split name layout heights
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
  doc.text(`Rs. ${Number(transaction.total_price).toFixed(2)}`, rightBoundary, y, { align: "right" });
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


const printToken = (order) => {
  return new Promise((resolve) => {
    // 🎯 Increased default window width so Chrome shows options cleanly
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
      .no-print { display: none !important; }
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
    .token {
      font-size: 36px;
      font-weight: bold;
      text-align: center;
      margin: 12px 0;
      padding: 5px;
      background: #f3f4f6;
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
    
    // 🎯 Delay the print trigger slightly so text receipt renders first
    setTimeout(() => {
      
      // 🚀 THE PROFESSIONAL MONITOR FIX:
      // We attach a listener to the child popup window. The exact second they click 
      // Print or Cancel, this event triggers, destroys the window, and resolves the Promise.
      printWindow.onafterprint = () => {
        printWindow.close();
        resolve(true); // 🔓 Tells handleCreateOrder that printing is completely finished!
      };

      // Open print prompt
      printWindow.print();
      
      // Fallback fallback for specific old iOS browsers where onafterprint acts lazy
      setTimeout(() => {
        if (!printWindow.closed) {
          printWindow.close();
          resolve(true);
        }
      }, 2000);

    }, 400); 
  });
};

/* =========================================================================
   🚀 1. CLEAN UNIFIED DASHBOARD MOUNT ENGINE (Runs EXACTLY ONCE on Mount)
========================================================================= */
const hasFetched = useRef(false);
const [isLoading, setIsLoading] = useState(true); // Master loading spinner state

useEffect(() => {
  const token = localStorage.getItem("managerAccessToken");

  // Redirect if no token is found
  if (!token) {
    window.location.href = "/";
    return;
  }

  // Prevent React StrictMode double-mounting from execution duplication
  if (hasFetched.current) return;
  hasFetched.current = true;

  const loadAllDashboardData = async () => {
    try {
      setIsLoading(true); // Start the full screen loader instantly
      console.log("🔥 Firing single-batch parallel dashboard engine...");

      // Fire EVERY single primary network layout endpoint simultaneously
      const [
        ordersRes, 
        menuRes, 
        lowStockRes, 
        settingsRes, 
        activeDayRes, 
        summaryRes
      ] = await Promise.all([
        apiFetch(`${import.meta.env.VITE_API_URL}/orders`, {}, "manager"),
        apiFetch(`${import.meta.env.VITE_API_URL}/menu`, {}, "manager"),
        apiFetch(`${import.meta.env.VITE_API_URL}/low-stock`, {}, "manager"),
        apiFetch(`${import.meta.env.VITE_API_URL}/settings`, {}, "manager"),
        apiFetch(`${import.meta.env.VITE_API_URL}/business-day/active`, {}, "manager"),
        apiFetch(`${import.meta.env.VITE_API_URL}/business-day/summary`, {}, "manager")
      ]);

      if (ordersRes.ok) {
  const ordersData = await ordersRes.json();
  if (Array.isArray(ordersData)) setTransactions(ordersData); // ⚡ Syncs straight to your view array!
}

      if (menuRes.ok) {
        const menuData = await menuRes.json();
        if (Array.isArray(menuData)) {
          setMenu(menuData);
          setMenu?.(menuData); // Safely sets alternative hook names if any
        }
      }

      if (lowStockRes.ok) {
        const lowStockData = await lowStockRes.json();
        if (Array.isArray(lowStockData)) {
          setLowStockItems(lowStockData.map((item) => item.item_name || item));
        }
      }

      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        setSettings(prev => ({ ...prev, ...settingsData }));
      }

      if (activeDayRes.ok) {
        const activeDayData = await activeDayRes.json();
        setBusinessDay(activeDayData);
      }

      if (summaryRes.ok) {
        const summaryData = await summaryRes.json();
        setSummary(summaryData);
      }

    } catch (error) {
      console.error("❌ Critical Dashboard Boot Failure:", error);
    } finally {
      setIsLoading(false); // Drop loader only when all states are fully operational
    }
  };

  // Initialize System Audio Clips Safely
  const loadAudio = (path) => {
    const audio = new Audio(path);
    audio.preload = "auto";
    audio.load();
    return audio;
  };

  refillStockSoundRef.current = loadAudio("/sounds/for_lowStockRefillment.wav");
  lowStockSoundRef.current = loadAudio("/sounds/for_lowStockAlert.wav");
  acceptSoundRef.current = loadAudio("/sounds/for_acceptance.wav");
  completeSoundRef.current = loadAudio("/sounds/for_completion.wav");
  rejectSoundRef.current = loadAudio("/sounds/for_rejection.wav");

  // Fire master pipeline execution
  loadAllDashboardData();
}, []); 


/* =========================================================================
   ⏰ 2. SUBSCRIPTION EXPIRY ENGINE (Listens directly to incoming data keys)
========================================================================= */
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

    if (remainingDays < 3) {
      setIsExpiryCritical(true);
    } else {
      setIsExpiryCritical(false);
    }

    setSubscriptionTimeLeft(`${remainingDays}d ${remainingHours}h remaining`);
  };

  // Run immediately once data arrives from the master loader pool
  calculateRemainingDays();

  // Tick calculation down every minute smoothly
  const timerInterval = setInterval(calculateRemainingDays, 60000); 
  return () => clearInterval(timerInterval);
}, [settings?.subscription_expires]);


/* =========================================================================
   🕵️ 3. REAL-TIME BACKGROUND APPROVAL SYNC TIMER
========================================================================= */
useEffect(() => {
  // Only runs background background synchronization IF status explicitly demands it
  if (settings?.subscription_status !== "pending_renewal") return;

  console.log("🕵️ Background active sync checking for renewal authentication states...");

  const syncInterval = setInterval(async () => {
    try {
      const res = await apiFetch(`${import.meta.env.VITE_API_URL}/settings`, {}, "manager");
      if (res.ok) {
        const data = await res.json();
        setSettings(prev => ({ ...prev, ...data }));
      }
    } catch (err) {
      console.error("Background validation sync failed:", err);
    }
  }, 5000);

  return () => clearInterval(syncInterval);
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
   WEBSOCKET
========================= */

useEffect(() => {
  const token = localStorage.getItem("managerAccessToken");

  if (!token) return;

  let socket = null;
  let reconnectTimer = null;

  const connectWebSocket = () => {
    socket = createSocket("manager");

    if (!socket) return;

    socket.onopen = () => {
      console.log("Connected ✅");
      setIsConnected(true);
    };

    socket.onmessage = (event) => {
      const msg = JSON.parse(event.data);

      console.log("WS:", msg);

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
      if (msg.type === "low_stock" && settings.enable_low_stock_alert) {
        if (lowStockSoundRef.current) {
          lowStockSoundRef.current.currentTime = 0;
          lowStockSoundRef.current.play().catch(console.error);
        }

        setLowStockItems((prev) => {
          if (prev.includes(msg.data.name)) {
            return prev;
          }
          return [...prev, msg.data.name];
        });

        addNotification(`⚠ ${msg.data.name} low stock`);
      }

      /* STOCK RESTORED */
      if (msg.type === "stock_restored" && settings.enable_low_stock_alert) {
        if (refillStockSoundRef.current) {
          refillStockSoundRef.current.currentTime = 0;
          refillStockSoundRef.current.play().catch(console.error);
        }

        setLowStockItems((prev) =>
          prev.filter((item) => item !== msg.data.name)
        );

        addNotification(`✅ ${msg.data.name} restored`);
      }

      /* ORDER UPDATE */
      if (msg.type === "order_update") {
        // 🔊 SOUND ONLY
        if (settings.enable_sound) {
          if (msg.data.status === "rejected") {
            rejectSoundRef.current.currentTime = 0;
            rejectSoundRef.current.play().catch(console.error);
          } else {
            acceptSoundRef.current.currentTime = 0;
            acceptSoundRef.current.play().catch(console.error);
          }
        }

        // ✅ SAFE REALTIME STATE UPDATE
        setOrders((prev) => {
          const exists = prev.some((o) => String(o.id) === String(msg.data.id));

          // ❌ REMOVE REJECTED
          if (msg.data.status === "rejected") {
            return prev.filter((o) => String(o.id) !== String(msg.data.id));
          }

          // ➕ ADD IF MISSING
          if (!exists) {
            return [
              ...prev,
              {
                ...msg.data,
                items: msg.data.items || []
              }
            ];
          }

          // 🔄 UPDATE EXISTING
          return prev.map((o) =>
            String(o.id) === String(msg.data.id)
              ? { ...o, status: msg.data.status }
              : o
          );
        });

        addNotification(
          `Order ${msg.data.token_id} ${msg.data.status}`,
          msg.data.status === "rejected"
            ? "error"
            : msg.data.status === "accepted"
              ? "success"
              : "info"
        );
      }

      /* ORDER COMPLETED */
      if (msg.type === "order_completed") {
        // 🔊 SOUND ONLY
        if (settings.enable_sound) {
          completeSoundRef.current.currentTime = 0;
          completeSoundRef.current.play().catch(console.error);
        }

        // ✅ ALWAYS REMOVE
        setOrders((prev) =>
          prev.filter((o) => String(o.id) !== String(msg.data.id))
        );

        addNotification(`Order ${msg.data.token_id} completed ✅`);
      }
    };

    socket.onerror = (err) => {
      console.error("Socket error:", err);
      setIsConnected(false);
    };

    socket.onclose = () => {
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
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
    }

    if (
      socket &&
      (socket.readyState === WebSocket.OPEN ||
        socket.readyState === WebSocket.CONNECTING)
    ) {
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
   CREATE ORDER (OFFLINE-READY & CLEAN STORAGE)
========================================= */

const handleCreateOrder = async () => {
  if (cart.length === 0 || creatingOrder) return;

  if (!businessDay) {
    addNotification("⚠️ Please open today's sales before creating an order.", "warning");
    return;
  }

  setCreatingOrder(true); // ⏳ Locks the UI button instantly

  // Generate a distinct, completely unique ID tag for this local snapshot instance
  const offlineUuid = `off_uuid_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

  // Construct your clean base data object matching your backend model expectations
  const orderPayload = {
    items: cart,
    payment_mode: paymentMode,
    status: "completed",
    offline_uuid: offlineUuid // 👈 Sent down so Python can block sync double-submits later
  };

  // 🚨 NETWORK BOUNDARY CHECK: If the local browser flags are dark
  if (!navigator.onLine) {
    try {
      // Save it directly into our browser's IndexedDB ledger store
      await saveOfflineOrder(orderPayload);
      
      // 🔊 SOUND ONLY: Audio confirmation for successful local storage caching
      if (settings?.enable_sound && acceptSoundRef?.current) {
        acceptSoundRef.current.currentTime = 0;
        acceptSoundRef.current.play().catch(err => console.error("Audio blocked:", err));
      }

      addNotification("⚠️ Running Offline! Order cached locally and added to background sync queue.", "warning");
      
      // Clear your frontend operational view layouts instantly so the next customer can checkout
      setCart([]);
      setPaymentMode("cash");
      
    } catch (dbErr) {
      console.error("Local browser storage write error:", dbErr);
      addNotification("❌ Failed to cache order locally.", "error");
    } finally {
      setCreatingOrder(false); // No artificial delay needed for offline caching
    }
    return; // Exit out early! Do not let execution hit the network apiFetch loop below
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
      setCreatingOrder(false); 
      return;
    }

    const data = await res.json();
    
    // 🖨️ STEP 1: Open print window and pause code execution!
    // React halts right here while the user interacts with the Print dialog.
    await printToken(data); 
    
    // 🔊 SOUND ONLY: Audio confirmation plays right along with the layout completion notification
    if (settings?.enable_sound && acceptSoundRef?.current) {
      acceptSoundRef.current.currentTime = 0;
      acceptSoundRef.current.play().catch(err => console.error("Audio blocked:", err));
    }

    // 🎉 STEP 2: The print dialog was closed! Now show the completion toast
    addNotification("🎉 Order Completed Successfully!", "success");

    // 🎯 STEP 3: Instantly reset cart and refresh transaction list rows
    setCart([]);
    setPaymentMode("cash");
    
    if (typeof fetchTransactions === "function") {
      fetchTransactions(); 
    }
    
    // Unlock checkout instantly for the next customer
    setCreatingOrder(false); 

  } catch (err) {
    console.error("Billing Checkout Online Error. Falling back to offline save...", err);
    
    // 📡 FALLBACK: If the internet drops right in the split-second after clicking checkout
    try {
      await saveOfflineOrder(orderPayload);

      // 🔊 SOUND ONLY: Inform operator that the checkout layout step processed successfully into storage
      if (settings?.enable_sound && acceptSoundRef?.current) {
        acceptSoundRef.current.currentTime = 0;
        acceptSoundRef.current.play().catch(err => console.error("Audio blocked:", err));
      }

      addNotification("📡 Network dropped mid-flight! Order securely saved offline.", "warning");
      setCart([]);
      setPaymentMode("cash");
    } catch (innerDbErr) {
      console.error("Critical fallback storage failure:", innerDbErr);
      addNotification("❌ Connection error and local storage failure.", "error");
    } finally {
      setCreatingOrder(false);
    }
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


const handleSaveSettings =
  async () => {

    try {

      const res =
        await apiFetch(
          `${import.meta.env.VITE_API_URL}/settings`,
          {
            method: "PATCH",

            body: JSON.stringify(
              settings
            )
          },
          "manager"
        );

      if (!res.ok) return;

      const data =
        await res.json();

      setSettings(prev => ({
  ...prev,
  ...data
}));

      addNotification(
        "✅ Settings saved"
      );

      setShowSettings(false);

    } catch (err) {

      console.error(err);
    }
};


const handleStartDay = async () => {
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

    // 🎯 THE MAGIC RESET: Zero out the summary object instantly
    // This clears the dashboard values while keeping your analytics page safe
    setSummary({
      total_sales: 0,
      cash_sales: 0,
      online_sales: 0,
      completed_orders: 0
    });

    // Clear the active orders list so the dashboard is empty for the new shift
    setOrders([]);
    setCart([]);

    // 2. Update the business day state (this flips the button from 'Start' to 'Close')
    setBusinessDay(data);

    addNotification("✅ Business day started.", "success");

  } catch (err) {
    console.error(err);
    addNotification("❌ Failed to start day", "error");
  }
};


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





const fetchEmployees = async () => {

  try {

    const response = await fetch(
      `${import.meta.env.VITE_API_URL}/employees`,
      {
        headers: {
          Authorization:
            `Bearer ${localStorage.getItem("managerAccessToken")}`,
        },
      }
    );

    const data = await response.json();

    setEmployees(data);

  } catch (err) {

    console.error(err);
  }
};



const runCountdownCalculation = (expiryDateString) => {
  if (!expiryDateString) return;
  
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


const submitPasswordChange = async (e) => {
  e.preventDefault();

  // 🛡️ Frontend Client-Side Verification Guard Check
  if (passwordPayload.new_password !== passwordPayload.confirm_password) {
    alert("❌ Error: New Password and Confirm Password fields do not match!");
    return;
  }

  if (passwordPayload.new_password.length < 6) {
    alert("❌ Security Guard: New password must be at least 6 characters long.");
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
      alert("🚀 Password changed successfully! Keep it safe.");
      // Reset form view and clean states
      setPasswordPayload({ current_password: "", new_password: "", confirm_password: "" });
      setShowPasswordForm(false);
    } else {
      alert(`❌ Modification Blocked: ${result.detail || "Verification failed"}`);
    }
  } catch (error) {
    console.error("Password trace submission block crash:", error);
    alert("❌ Server connection lost processing credentials pipeline.");
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


// ⚡ Paste this inside your manager billing component macro block:

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
      alert("Recharge request successfully submitted to the admin! ✅");
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



const handleTabChange = (tabName) => {
  setActiveTab(tabName);
  
  // 🎯 RE-FETCH ON ROUTE RETURN: If the user goes back to dashboard/billing, reload current details
  if (tabName === "dashboard" || tabName === "billing") {
    apiFetch(`${import.meta.env.VITE_API_URL}/orders`, {}, "manager")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setOrders(data);
      })
      .catch(console.error);
  }
};


// Automatically extracts unique category values from current menu data array strings
const existingCategories = [...new Set(menu.map(item => item.category).filter(Boolean))];

return (
    <div className="manager-container manager-dashboard-layout">
      
      {/* ========== SIDEBAR (Left Panel) ========== */}
      <aside className="manager-sidebar">
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
          <div
            className={`sidebar-link ${!showSubscription && !analytics && !showTransactions && !summary && !showManageMenu && !showCreateMenu && !showSettings ? 'active' : ''}`}
            onClick={() => {
              setShowTransactions(false);
              setSummary(null);
              setAnalytics(null);
              setShowManageMenu(false);
              setShowCreateMenu(false);
              setShowSettings(false);
              setShowSubscription(false);
            }}
          >
            <span className="sidebar-icon">📝</span>
            <span>Orders</span>
          </div>

          <div
            className={`sidebar-link ${analytics ? 'active' : ''}`}
            onClick={async () => {
              setShowTransactions(false);
              setSummary(null);
              setShowManageMenu(false);
              setShowCreateMenu(false);
              setShowSettings(false);
              setShowSubscription(false);
            }}
          >
            <span className="sidebar-icon">📊</span>
            <span>Analytics</span>
          </div>

          <div
            className={`sidebar-link ${showTransactions ? 'active' : ''}`}
            onClick={async () => {
              setShowTransactions(true);
              setSummary(null);
              setAnalytics(null);
              setShowManageMenu(false);
              setShowCreateMenu(false);
              setShowSettings(false);
              setShowSubscription(false);
            }}
          >
            <span className="sidebar-icon">💳</span>
            <span>Transactions</span>
          </div>

          <div
            className={`sidebar-link ${summary ? 'active' : ''}`}
            onClick={async () => {   
              setShowTransactions(false);
              setAnalytics(null);
              setShowManageMenu(false);
              setShowCreateMenu(false);
              setShowSettings(false);
              setShowSubscription(false);
            }}
          >
            <span className="sidebar-icon">📈</span>
            <span>Today's Summary</span>
          </div>

          <div
            className={`sidebar-link ${showManageMenu ? 'active' : ''}`}
            onClick={() => {
              setShowManageMenu(true);
              setShowTransactions(false);
              setAnalytics(null);
              setSummary(null);
              setShowCreateMenu(false);
              setShowSettings(false);
              setShowSubscription(false);
            }}
          >
            <span className="sidebar-icon">✏️</span>
            <span>Manage Menu</span>
          </div>

          <div
            className={`sidebar-link ${showCreateMenu ? 'active' : ''}`}
            onClick={() => {
              setShowCreateMenu(true);
              setShowManageMenu(false);
              setShowTransactions(false);
              setAnalytics(null);
              setSummary(null);
              setShowSettings(false);
              setShowSubscription(false);
            }}
          >
            <span className="sidebar-icon">➕</span>
            <span>Add Menu Item</span>
          </div>

          {/* Dedicated Subscription Tab */}
          <div
            className={`sidebar-link ${showSubscription ? 'active' : ''}`}
            onClick={() => {
              setShowSubscription(true);
              setShowSettings(false);
              setShowCreateMenu(false);
              setShowManageMenu(false);
              setShowTransactions(false);
              setAnalytics(null);
              setSummary(null);
            }}
          >
            <span className="sidebar-icon">⏳</span>
            <span>Subscription</span>
          </div>

          <div
            className={`sidebar-link ${showSettings ? 'active' : ''}`}
            onClick={() => {
              setShowSettings(true);
              setShowCreateMenu(false);
              setShowManageMenu(false);
              setShowTransactions(false);
              setAnalytics(null);
              setSummary(null);
              setShowSubscription(false);
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
              window.location.href = "/login";
            }}
          >
            <span className="sidebar-icon">🚪</span>
            <span>Logout</span>
          </div>
        </div>
      </aside>

      {/* ========== MAIN CONTENT WINDOW (Right Panel) ========== */}
      <main className="manager-main content-display-window">
        {/* ==========================================
            📊 1. SUMMARY PANEL (Instant Load Condition)
        ========================================== */}
        {summary && (
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

            {/* SUMMARY ITEMS LEDGER */}
            <div className="summary-panel">
              <h2 className="summary-header">📊 Today's Summary</h2>
              
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
                  <button className="btn btn-success" onClick={handleStartDay}>
                    ▶ Start Today
                  </button>
                ) : (
                  <button className="btn btn-danger" onClick={handleCloseDay}>
                    🔒 Close Today Sales
                  </button>
                )}
              </div>
            </div>
          </>
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
            <div
              key={txn.id}
              className={`transaction-item ${txn.status === "rejected" ? "rejected-order" : ""}`}
            >
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
                  if (!acc[cat]) acc[acc[cat] = []];
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
                              <button className="btn btn-danger btn-sm" disabled={isSaving !== null} onClick={() => { /* Delete handler */ }}>
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

{/* ========== ANALYTICS PANEL ========== */}
{analytics && (
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

    {/* Charts Section */}
    <div className="grid grid-2">
      {/* 🎯 TARGET 1: Payment Pie Chart Component Wrapper */}
      <div id="payment-pie-chart" className="chart-container" style={{ background: '#ffffff', padding: '15px', borderRadius: '8px' }}>
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
      {/* 🎯 TARGET 2: Top Selling Items Bar Chart Component Wrapper */}
      <div id="sales-trend-bar-chart" className="chart-container" style={{ background: '#ffffff', padding: '15px', borderRadius: '8px' }}>
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

      {/* Rush Hour Box wrapper remains untouched */}
      <div className="chart-container" style={{ background: '#ffffff', padding: '15px', borderRadius: '8px' }}>
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
          disabled={loading}
          onChange={(e) => setNewItemName(e.target.value)}
        />
      </div>

      {/* 🎯 CATEGORY FIELD BLOCK INSERTER */}
      <div className="form-group">
        <label>Item Category *</label>
        {!isCustomCategory ? (
          <select
            className="form-input"
            value={newItemCategory}
            disabled={loading}
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
              disabled={loading}
              onChange={(e) => setCustomCategoryInput(e.target.value)}
              style={{ 
                flex: 1,
                padding: "10px 12px",
                fontSize: "14px",
                color: "#000000",
                backgroundColor: "#ffffff",
                border: "1px solid #cbd5e1",
                borderRadius: "6px",
                outline: "none",
                width: "100%",
                boxSizing: "border-box"
              }}
              autoFocus
            />
            <button
              type="button"
              disabled={loading}
              onClick={() => {
                setIsCustomCategory(false);
                setCustomCategoryInput("");
              }}
              style={{ 
                padding: "10px 16px",
                fontSize: "14px",
                backgroundColor: "#64748b",
                color: "#ffffff",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                whiteSpace: "nowrap",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                height: "40px"
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
            disabled={loading}
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
          disabled={loading}
          onChange={(e) => setNewItemDescription(e.target.value)}
        />
      </div>

      <div className="form-group">
        <label>Item Image</label>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          disabled={loading}
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
            alert("Please select a category or write a brand new custom heading name!");
            return;
          }

          if (!newItemName || !newItemPrice) {
            alert("Item Name and Price are required fields!");
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
        {!showSubscription && !analytics && !showTransactions && !summary && !showManageMenu && !showCreateMenu && !showSettings && (
          <>
            <div className="main-header">

  <div className="top-status-row">

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
                    disabled={cart.length === 0}
                    disabled={creatingOrder}
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

          </>
        )}

        <ToastContainer notifications={notifications} />


 {/* ========================================================
    MAIN CONTENT AREA: SUBSCRIPTION MANAGEMENT PANEL
    ======================================================== */}
{showSubscription && (
  <div style={{ padding: "30px", maxWidth: "800px", margin: "0 auto" }}>
    <h2 style={{ fontSize: "24px", fontWeight: "700", marginBottom: "6px", color: "#1e293b" }}>
      🛡️ Subscription Management
    </h2>
    <p style={{ color: "#64748b", marginBottom: "24px", fontSize: "14px" }}>
      Monitor your active registration duration lifecycle and extend your setup securely.
    </p>

    {/* ⚠️ HIGH VISIBILITY CONFLICT WARNING BOX */}
    <div style={{
      backgroundColor: '#fffbeb', borderLeft: '4px solid #f59e0b',
      padding: '16px', borderRadius: '6px', marginBottom: '24px'
    }}>
      <p style={{ margin: '0', fontSize: '13px', lineHeight: '1.6', color: '#b45309', fontWeight: '600' }}>
        ⚠️ NOTICE: Please recharge early to avoid automatic workspace lockout conflicts! Manual validation processing from the superadmin takes time. Your platform features remain entirely operational while approval is pending.
      </p>
    </div>

    {/* METRICS GRID: EXPIRY & COUNTDOWN */}
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "30px" }}>
      
      {/* Expiry Date Card */}
      <div style={{ background: "#f8fafc", padding: "20px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
        <span style={{ fontSize: "12px", color: "#64748b", textTransform: "uppercase", fontWeight: "700" }}>Expiration Date</span>
        <h3 style={{ fontSize: "20px", color: "#1e293b", margin: "8px 0 0 0", fontWeight: "800" }}>
          {settings === null ? (
            <span style={{ color: "#94a3b8", fontSize: "16px", fontWeight: "500" }}>Loading details...</span>
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
    <div style={{ background: "#ffffff", padding: "24px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
      
      {/* 🔄 STATE A: DEFAULT ACTIVE / READY TO PAY */}
      {(settings?.subscription_status === "active" || !settings?.subscription_status) && (
        <div style={{ textAlign: "center" }}>
          <h3 style={{ margin: "0 0 6px 0", fontSize: "18px", fontWeight: "700" }}>🔄 Extend Plan for 30 Days</h3>
          <p style={{ fontSize: "13px", color: "#64748b", margin: "0 0 20px 0" }}>
            Click below to open manual payment gateway details and upload your receipt copy.
          </p>

          <div style={{ backgroundColor: '#f1f5f9', padding: '14px', borderRadius: '8px', display: 'inline-block', width: '100%', maxWidth: '300px', marginBottom: '20px' }}>
            <span style={{ fontSize: '11px', color: '#64748b', display: 'block', fontWeight: "700", textTransform: 'uppercase' }}>Renewal Cost</span>
            <span style={{ fontSize: '24px', fontWeight: '800', color: '#2563eb' }}>₹499</span>
          </div>

          <br />

          <button
            type="button"
            onClick={() => setShowRechargeModal(true)}
            style={{
              background: "#2563eb", color: "#ffffff", border: "none",
              padding: "12px 30px", borderRadius: "8px", fontWeight: "700",
              fontSize: "16px", cursor: "pointer", transition: "all 0.2s"
            }}
            onMouseOver={(e) => e.target.style.background = "#1d4ed8"}
            onMouseOut={(e) => e.target.style.background = "#2563eb"}
          >
            Make Payment ₹499
          </button>
        </div>
      )}

      {/* 🎉 STATE B: REQUEST PENDING APPROVAL (Persists across page refreshes!) */}
      {settings?.subscription_status === "pending_renewal" && (
        <div style={{ 
          textAlign: "center", 
          padding: "12px 0",
          display: "flex",
          flexDirection: "column",
          alignItems: "center"
        }}>
          <div style={{ fontSize: "40px", marginBottom: "12px" }}>⏳</div>
          <h3 style={{ margin: "0 0 8px 0", fontSize: "19px", fontWeight: "700", color: "#d97706" }}>
            Request Made to the Admin!
          </h3>
          <p style={{ 
            fontSize: "14px", 
            color: "#475569", 
            maxWidth: "480px", 
            margin: "0 0 14px 0", 
            lineHeight: "1.6",
            fontWeight: "500" 
          }}>
            Your payment verification request has been safely logged. Your subscription expiry date will be automatically extended as soon as the superadmin approves the transaction.
          </p>
          
          {submittedUtr && (
            <span style={{ fontSize: "12px", background: "#f1f5f9", padding: "6px 14px", borderRadius: "20px", color: "#475569", fontWeight: "600", border: "1px solid #e2e8f0" }}>
              UTR Reference: <strong style={{ color: "#1e293b" }}>{submittedUtr}</strong>
            </span>
          )}
        </div>
      )}

      {/* ❌ STATE C: ADMIN DECLINED RECHARGE (Shows precise reason & acknowledgment reset) */}
      {settings?.subscription_status === "declined" && (
        <div style={{ 
          textAlign: "center", 
          padding: "12px 0",
          display: "flex",
          flexDirection: "column",
          alignItems: "center"
        }}>
          <div style={{ fontSize: "40px", marginBottom: "12px" }}>❌</div>
          <h3 style={{ margin: "0 0 8px 0", fontSize: "19px", fontWeight: "700", color: "#dc2626" }}>
            Recharge Request Declined
          </h3>
          
          <div style={{
            background: "#fef2f2", borderLeft: "4px solid #dc2626",
            padding: "12px 18px", borderRadius: "8px", margin: "10px 0 20px 0",
            maxWidth: "500px", textAlign: "left"
          }}>
            <span style={{ fontSize: "12px", fontWeight: "700", color: "#991b1b", display: "block", textTransform: "uppercase", marginBottom: "4px" }}>
              Reason from Admin:
            </span>
            <p style={{ margin: 0, fontSize: "13px", color: "#b91c1c", lineHeight: "1.5", fontWeight: "500" }}>
              {settings?.rejection_reason || "The uploaded transaction receipt details could not be validated by our bank logs."}
            </p>
          </div>

          <button
            type="button"
            onClick={handleResetDecline} // Hits PUT /subscription-state with action: "acknowledge_decline"
            style={{
              background: "#dc2626", color: "#ffffff", border: "none",
              padding: "10px 24px", borderRadius: "8px", fontWeight: "700",
              fontSize: "14px", cursor: "pointer", transition: "all 0.2s"
            }}
            onMouseOver={(e) => e.target.style.background = "#b91c1c"}
            onMouseOut={(e) => e.target.style.background = "#dc2626"}
          >
            Acknowledge & Try Again
          </button>
        </div>
      )}

    </div>

    {/* ========================================================
        INJECTED POPUP MANUAL PAYMENT MODAL OVERLAY
        ======================================================== */}
    <ManualRechargeModal 
      isOpen={showRechargeModal} 
      onClose={() => setShowRechargeModal(false)} 
      onSuccess={async (utrValue) => {
        setSubmittedUtr(utrValue);
        setShowRechargeModal(false);
        
        // 🚀 Trigger our single backend PUT handler to save the status persistent in DB
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
        placeholder="Address"
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
        value={settings.email || ""} // Pulls email from your state tracking matrix
        style={{ 
          background: "#f1f5f9", 
          cursor: "not-allowed", 
          color: "#64748b",
          fontWeight: "500"
        }}
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

    {/* PASSWORD CHANGING UTILITY ACCORDION CARD */}
    <div style={{ marginTop: "30px", padding: "20px", border: "1px solid #e2e8f0", borderRadius: "8px", background: "#fff" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h4 style={{ margin: 0, fontSize: "16px", color: "#1e293b", fontWeight: "700" }}>Account Security Management</h4>
          <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "#64748b" }}>Update your secret authentication key details phrase.</p>
        </div>
        <button 
          type="button"
          onClick={() => setShowPasswordForm(!showPasswordForm)}
          style={{ padding: "8px 16px", background: showPasswordForm ? "#64748b" : "#4f46e5", color: "#fff", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "600" }}
        >
          {showPasswordForm ? "Cancel Request" : "Modify Password"}
        </button>
      </div>

      {/* CONDITIONAL COMPONENT SLIDE VIEW ENGINE */}
      {showPasswordForm && (
        <form onSubmit={submitPasswordChange} style={{ marginTop: "20px", borderTop: "1px dashed #e2e8f0", paddingTop: "20px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "15px", marginBottom: "15px" }}>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#475569", marginBottom: "5px", textTransform: "uppercase" }}>Current Password</label>
              <input 
                type="password" 
                name="current_password"
                required
                value={passwordPayload.current_password}
                onChange={handlePasswordInputChange}
                placeholder="••••••••"
                style={{ width: "100%", padding: "10px", borderRadius: "5px", border: "1px solid #cbd5e1" }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#475569", marginBottom: "5px", textTransform: "uppercase" }}>New Password</label>
              <input 
                type="password" 
                name="new_password"
                required
                value={passwordPayload.new_password}
                onChange={handlePasswordInputChange}
                placeholder="Min 6 characters"
                style={{ width: "100%", padding: "10px", borderRadius: "5px", border: "1px solid #cbd5e1" }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#475569", marginBottom: "5px", textTransform: "uppercase" }}>Confirm New Password</label>
              <input 
                type="password" 
                name="confirm_password"
                required
                value={passwordPayload.confirm_password}
                onChange={handlePasswordInputChange}
                placeholder="Repeat new password"
                style={{ width: "100%", padding: "10px", borderRadius: "5px", border: "1px solid #cbd5e1" }}
              />
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button 
              type="submit" 
              disabled={passwordSubmitting}
              style={{ padding: "10px 24px", background: "#22c55e", color: "#fff", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "700" }}
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



      {/* ========== GLOBAL CONFIRMATION MODAL ========== */}
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
const RechargeFormHandler = () => {
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
      alert("Please upload your transaction screenshot first!");
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
        alert("✨ Extension receipt dispatched successfully! Superadmin authorization pending.");
        setScreenshot(null);
        setPreview('');
      } else {
        alert("❌ Database submission rejected.");
      }
    } catch (err) {
      alert("❌ Error hitting backend transmission line.");
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
const ManualRechargeModal = ({ isOpen, onClose, onSuccess }) => {
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
      alert("Please input your transaction reference UTR ID first!");
      return;
    }
    if (!screenshot) {
      alert("Please upload your payment screenshot file proof!");
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
        alert("❌ Database submission rejected by server infrastructure.");
      }
    } catch (err) {
      alert("❌ Critical runtime transmission fault handling backend data line.");
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

export default BillingManager;




