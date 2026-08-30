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
          
          // 🚀 INCREASED RESOLUTION: Bumped from 600 to 1200 for crisp quality on large screens
          const MAX_WIDTH = 1200; 
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
          }, "image/jpeg", 0.85); // 🚀 HIGHER QUALITY: Bumped from 0.75 to 0.85 to remove blur and artifacts
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


function TableManager() {
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
  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false);

  const isProcessingRef = useRef(false);
  
  const [showSummaryView, setShowSummaryView] = useState(true);
  const [showAnalyticsView, setShowAnalyticsView] = useState(false);
  const [showTransactions, setShowTransactions] = useState(false);

  const [isAddingItem, setIsAddingItem] = useState(false);
  
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

const [isStartingDay, setIsStartingDay] = useState(false);
const [isClosingDay, setIsClosingDay] = useState(false);

  // State tracking for editing an item's category inline
  const [editCategory, setEditCategory] = useState("");
  const [isEditCustomCategory, setIsEditCustomCategory] = useState(false);
  const [editCustomCategoryInput, setEditCustomCategoryInput] = useState("");
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isBusinessDayActive, setIsBusinessDayActive] = useState(false);
  const [businessDayData, setBusinessDayData] = useState(null);
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
  const [selectedTable, setSelectedTable] = useState("");
  const [closeDaySummary, setCloseDaySummary] = useState(null); // Holds { totalRevenue, cashSales, onlineSales, date }
  const [masterCycleSummary, setMasterCycleSummary] = useState(null);
// Create an array for your tables (e.g., Table 1 to Table 10)
  const restaurantTables = Array.from({ length: 10 }, (_, i) => `Table ${i + 1}`);
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

  const [selectedTableNumber, setSelectedTableNumber] = useState("");
  const [tablesList, setTablesList] = useState([]);
  const [tables, setTables] = useState([]);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Helper: close sidebar (call this in every tab onClick)
  const closeSidebar = () => setSidebarOpen(false);

  const [isSaving, setIsSaving] = useState(null); // Track the ID of the row being saved
  const [menuSearchQuery, setMenuSearchQuery] = useState("");

  // Confirmation Modal States
  const [confirmationModal, setConfirmationModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    isDangerous: false,
    confirmText: "Confirm",
    onConfirm: null,
  });

  // Alert Modal State
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

  // Helper function to show modals
  const showModal = (title, message, type = "info", onConfirm = null, confirmText = "OK", showCancelButton = false) => {
    setModal({
      isOpen: true,
      title,
      message,
      type,
      onConfirm: onConfirm || (() => setModal(prev => ({ ...prev, isOpen: false }))),
      confirmText,
      cancelText: "OK",
      showCancelButton,
    });
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
  doc.text("Restaurant Transactions Report", 14, 20);

  // 🚀 DYNAMIC GST CHECKER FOR COMPLIANT ACCOUNTING LOGS
  const hasValidGst = settings?.gst_number && settings.gst_number.trim() !== "" && settings.gst_number !== "NOT_PROVIDED";

  const tableData = transactions.map((txn) => {
    const subtotal = Number(txn.total_price);
    
    if (hasValidGst) {
      const totalGst = subtotal * 0.05; // 5% Total Tax (CGST + SGST combined)
      const grandTotal = subtotal + totalGst;

      return [
        txn.token_id,
        txn.items.map((i) => `${i.name} x${i.quantity}`).join(", "),
        `Rs. ${subtotal.toFixed(2)}`,
        `Rs. ${totalGst.toFixed(2)}`,
        `Rs. ${grandTotal.toFixed(2)}`,
        txn.payment_mode?.toUpperCase() || "ONLINE",
        new Date(txn.created_at).toLocaleString("en-GB", {
          day: "numeric",
          month: "long",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        })
      ];
    } else {
      // Fallback if the restaurant does not use GST billing
      return [
        txn.token_id,
        txn.items.map((i) => `${i.name} x${i.quantity}`).join(", "),
        `Rs. ${subtotal.toFixed(2)}`,
        "Rs. 0.00",
        `Rs. ${subtotal.toFixed(2)}`,
        txn.payment_mode?.toUpperCase() || "ONLINE",
        new Date(txn.created_at).toLocaleString("en-GB", {
          day: "numeric",
          month: "long",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        })
      ];
    }
  });

  autoTable(doc, {
    startY: 30,
    head: [[
      "Token",
      "Items",
      "Subtotal",
      "GST (5%)",
      "Grand Total",
      "Payment",
      "Ordered Time"
    ]],
    body: tableData,
    theme: "striped",
    styles: { fontSize: 9 },
    // Giving extra width flexibility to items column since text strings can get long
    columnStyles: {
      1: { cellWidth: 50 } 
    }
  });

  doc.save("transactions-report.pdf");
};


const downloadReceipt = (transaction) => {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: [80, 200], 
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 7; 
  const rightBoundary = pageWidth - margin; 
  let y = 10;

  const centerText = (text, yPos, style = "normal", size = 10) => {
    doc.setFont("JetBrains Mono", style);
    doc.setFontSize(size);
    doc.text(text, pageWidth / 2, yPos, { align: "center" });
  };

  const drawDivider = (yPos) => {
    doc.setDrawColor(220); 
    doc.line(margin, yPos, rightBoundary, yPos);
  };

  // --- HEADER SECTION ---
  if (settings?.logo_url) {
    try {
      doc.addImage(settings.logo_url, "PNG", pageWidth / 2 - 8, y, 16, 16);
      y += 22; // Clean spacing down so image never crowds text
    } catch (e) { y += 0; }
  }

  centerText(settings.restaurant_name?.toUpperCase() || "BUSINESS NAME", y, "bold", 13);
  y += 6;
  
  if (settings.address) {
    centerText(settings.address, y, "normal", 8);
    y += 5;
  }
  
  // 🚀 THE DYNAMIC GST & PHONE COMBINATION STRIPPER (jsPDF)
  let contactLineItems = [];
  if (settings.phone && settings.phone.trim() !== "") {
    contactLineItems.push(`Tel: ${settings.phone}`);
  }
  // Check if gst_number exists, isn't empty, and isn't the fallback string
  const hasValidGst = settings?.gst_number && settings.gst_number.trim() !== "" && settings.gst_number !== "NOT_PROVIDED";
  if (hasValidGst) {
    contactLineItems.push(`GST: ${settings.gst_number}`);
  }

  if (contactLineItems.length > 0) {
    const contactTextString = contactLineItems.join(" | ");
    centerText(contactTextString, y, "normal", 8);
    y += 6;
  }

  y += 2;
  drawDivider(y);
  y += 6;

  // 📝 FORWARD GST MATHEMATICS (Base Price + 5% Extra Tax)
  const subtotal = Number(transaction.total_price); // Treat current total as base subtotal
  let cgst = 0;
  let sgst = 0;
  let grandTotal = subtotal;

  if (hasValidGst) {
    cgst = subtotal * 0.025; // 2.5% CGST
    sgst = subtotal * 0.025; // 2.5% SGST
    grandTotal = subtotal + cgst + sgst; // Base + Tax = Grand Total
  }

  // --- TRANSACTION INFO ---
  doc.setFontSize(9);
  doc.setFont("JetBrains Mono", "bold");
  doc.text(`${settings.token_prefix || "TOK"}-${transaction.token_id}`, margin, y);
  
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

  const colItemX = margin;                                      
  const colQtyCenter = margin + (rightBoundary - margin) / 2;    
  const colTotalRight = rightBoundary;                          

  // --- ITEMS TABLE HEADER ---
  doc.setFont("JetBrains Mono", "bold");
  doc.setFontSize(8);
  doc.text("ITEM", colItemX, y);
  doc.text("QTY", colQtyCenter, y, { align: "center" }); 
  doc.text("TOTAL", colTotalRight, y, { align: "right" });
  y += 5;

  // --- ITEMS LIST ---
  doc.setFont("JetBrains Mono", "normal");
  transaction.items.forEach((item) => {
    const safeNameWidth = (colQtyCenter - margin) - 6; 
    const splitName = doc.splitTextToSize(item.name, safeNameWidth); 
    
    doc.text(splitName, colItemX, y);
    doc.text(`${item.quantity}`, colQtyCenter, y, { align: "center" });
    doc.text(`Rs.${(item.price * item.quantity).toFixed(2)}`, colTotalRight, y, { align: "right" });
    
    y += (splitName.length * 4) + 1;
  });

  y += 2;
  drawDivider(y);
  y += 6;

  // --- 📊 SUMMARY & GST TAX BREAKDOWN SECTION ---
  if (hasValidGst) {
    doc.setFontSize(8);
    doc.setFont("JetBrains Mono", "normal");
    
    // Subtotal Row
    doc.text("Subtotal", margin, y);
    doc.text(`Rs.${subtotal.toFixed(2)}`, rightBoundary, y, { align: "right" });
    y += 4;
    
    // CGST Row
    doc.text("CGST (2.5%)", margin, y);
    doc.text(`Rs.${cgst.toFixed(2)}`, rightBoundary, y, { align: "right" });
    y += 4;
    
    // SGST Row
    doc.text("SGST (2.5%)", margin, y);
    doc.text(`Rs.${sgst.toFixed(2)}`, rightBoundary, y, { align: "right" });
    y += 5;

    drawDivider(y);
    y += 6;
  }

  // --- GRAND TOTAL ---
  doc.setFontSize(10);
  doc.setFont("JetBrains Mono", "bold");
  doc.text("GRAND TOTAL", margin, y);
  doc.setFontSize(11);
  doc.text(`Rs. ${grandTotal.toFixed(2)}`, rightBoundary, y, { align: "right" });
  y += 10;

  // --- FOOTER ---
  drawDivider(y);
  y += 6;
  
  // Cleaned up versatile business greeting text
  centerText("Thank You", y, "italic", 8);
  y += 5;
  centerText("Visit Again!", y, "normal", 8);
  
  y += 8;
  doc.setFontSize(7);
  centerText(`Receipt ID: ${transaction.id || transaction._id || 'N/A'}`, y, "normal", 7);

  doc.save(`Receipt-${transaction.token_id}.pdf`);
};

const printToken = (order, onComplete) => {
  const printWindow = window.open(
    "",
    "",
    "width=480,height=700,top=100,left=100,resizable=yes"
  );

  // 🚀 DYNAMIC GST INJECTION CHECKER FOR THERMAL RECEIPT
  const hasValidGst = settings?.gst_number && settings.gst_number.trim() !== "" && settings.gst_number !== "NOT_PROVIDED";

  // 📝 FORWARD GST MATHEMATICS (Base Price + 5% Extra Tax)
  const subtotal = Number(order.total_price); // Treat current total as base subtotal
  let cgst = 0;
  let sgst = 0;
  let grandTotal = subtotal;

  if (hasValidGst) {
    cgst = subtotal * 0.025; // 2.5% CGST
    sgst = subtotal * 0.025; // 2.5% SGST
    grandTotal = subtotal + cgst + sgst; // Base + Tax = Grand Total
  }

  // 💳 PAYMENT MODE — normalized to just "Cash" or "Online"
  // order.payment_mode comes straight from the Order model's payment_mode column.
  // Whatever gateway/method string is stored there (UPI, PhonePe, GPay, Card, etc.)
  // gets collapsed to "Online"; anything cash-like stays "Cash".
  const paymentModeDisplay =
    order?.payment_mode && order.payment_mode.toLowerCase().includes("cash")
      ? "Cash"
      : "Online";

  printWindow.document.write(`
<html>
<head>
  <title>Token Receipt</title>
  <style>
    @page {
      size: auto; 
      margin: 0mm;
    }
    @media print {
      html, body { background: #fff; margin: 0; padding: 0; }
      body { 
        width: 80mm; 
        margin: 0 auto; 
        /* 🚀 THE SPACER FIX */
        padding: 8mm 0 12mm 0; 
      }
    }
    body {
      font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      text-rendering: optimizeLegibility;
      width: 100%;
      max-width: 360px;
      margin: 0 auto;
      padding: 25px 14px 10px 14px; 
      color: #000;
      box-sizing: border-box;
      font-size: 13px;
      line-height: 1.35;
    }
    .center { text-align: center; }
    .restaurant-name { font-size: 22px; font-weight: 800; letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: 3px; }
    .details { font-size: 11.5px; font-weight: 500; line-height: 1.5; color: #222; }
    .divider { border-top: 1px dashed #000; margin: 12px 0; height: 0; }
    .token { font-family: 'Courier New', Courier, monospace; font-size: 40px; font-weight: 900; text-align: center; margin: 14px 0; padding: 6px; letter-spacing: 1px; }
    .row { display: flex; justify-content: space-between; align-items: baseline; gap: 10px; margin-bottom: 6px; font-weight: 600; }
    .gst-row { display: flex; justify-content: space-between; align-items: baseline; gap: 10px; margin-bottom: 3px; font-weight: 500; font-size: 12px; }
    .item-name { text-align: left; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .item-price { text-align: right; white-space: nowrap; flex-shrink: 0; }
    .total { font-size: 18px; font-weight: 900; margin-top: 6px; }
    .payment-row { display: flex; justify-content: space-between; font-size: 12px; font-weight: 600; margin-top: 4px; }
    .footer { text-align: center; font-size: 12px; font-weight: 600; margin-top: 16px; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="center">
    ${settings?.logo_url ? `<div><img id="receipt-logo" src="${settings.logo_url}" width="100" style="margin-bottom: 8px; display: inline-block;" /></div>` : ""}
    <div class="restaurant-name">${settings?.restaurant_name || "BUSINESS NAME"}</div>
    <div class="details">
      ${settings?.address ? `<div>${settings.address}</div>` : ""}
      <div>
        ${settings?.phone ? `<span>Phone: ${settings.phone}</span>` : ""}
        ${hasValidGst ? `${settings?.phone ? " | " : ""}<span>GSTIN: ${settings.gst_number}</span>` : ""}
      </div>
    </div>
  </div>

  <div class="divider"></div>

  <div class="token">
    <span>${settings?.token_prefix || "TOK"}-${order.token_id}</span>
  </div>

  <div class="divider"></div>

  ${order.items.map(item => `
    <div class="row" style="font-size: 12.5px;">
      <span class="item-name">${item.name} x${item.quantity} @ ${Number(item.price).toFixed(2)}</span>
      <span class="item-price">₹${(item.price * item.quantity).toFixed(2)}</span>
    </div>
  `).join("")}

  <div class="divider"></div>

  <!-- 📊 GST TAX BREAKDOWN SECTION -->
  ${hasValidGst ? `
    <div class="gst-row">
      <span>Subtotal</span>
      <span>₹${subtotal.toFixed(2)}</span>
    </div>
    <div class="gst-row">
      <span>CGST (2.5%)</span>
      <span>₹${cgst.toFixed(2)}</span>
    </div>
    <div class="gst-row">
      <span>SGST (2.5%)</span>
      <span>₹${sgst.toFixed(2)}</span>
    </div>
    <div class="divider"></div>
  ` : ""}

  <div class="row total">
    <span>GRAND TOTAL</span>
    <span>₹${grandTotal.toFixed(2)}</span>
  </div>

  <div class="divider"></div>

  <div class="payment-row">
    <span>Payment Mode:</span>
    <span>${paymentModeDisplay}</span>
  </div>

  <div class="footer">
    ${new Date(order.created_at).toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: "Asia/Kolkata"
    })}
    <br /><br />
    THANK YOU ❤️
  </div>

  <script>
    window.addEventListener('load', () => {
      const img = document.getElementById('receipt-logo');
      if (img && !img.complete) {
        img.onload = () => setTimeout(() => window.print(), 100);
        img.onerror = () => window.print();
      } else {
        window.print();
      }
    });
  </script>
</body>
</html>
`);

  printWindow.document.close();
  printWindow.focus();
  
  setTimeout(() => {
    if (typeof onComplete === "function") onComplete();
    if (typeof setCart === "function") setCart([]);
    if (typeof setCreatingOrder === "function") setCreatingOrder(false);
    printWindow.close();
  }, 1000); 
};


/* =========================================================================
    🚀 UNIFIED DASHBOARD MOUNT ENGINE (Perfect Sync & Clean Key Mapping)
========================================================================= */

const hasFetched = useRef(false);
const [isLoading, setIsLoading] = useState(true);

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
      setSummary({
        total_sales:      data.total_sales      ?? data.total_revenue  ?? 0,
        cash_sales:       data.cash_sales        ?? 0,
        online_sales:     data.online_sales      ?? 0,
        completed_orders: data.completed_orders  ?? data.total_orders  ?? 0,
        rejected_orders:  data.rejected_orders   ?? 0,
        average_order:    data.average_order     ?? 0,
      });
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
      if (Array.isArray(data.tables_list) && data.tables_list.length > 0) {
        setTablesList(data.tables_list);
      }
    }
  } catch (err) { console.error("Settings fetch failed:", err); }
};

useEffect(() => {
  const token = localStorage.getItem("managerAccessToken");
  if (!token) { window.location.href = "/"; return; }
  if (hasFetched.current) return;
  hasFetched.current = true;

  const loadAllDashboardData = async () => {
    try {
      setIsLoading(true);

      const [
        ordersRes, menuRes, lowStockRes, settingsRes,
        activeDayRes, summaryRes, employeeRes,
        transactionsRes, analyticsRes
      ] = await Promise.all([
        apiFetch(`${import.meta.env.VITE_API_URL}/orders`, {}, "manager").catch(e => e),
        apiFetch(`${import.meta.env.VITE_API_URL}/menu`, {}, "manager").catch(e => e),
        apiFetch(`${import.meta.env.VITE_API_URL}/low-stock`, {}, "manager").catch(e => e),
        apiFetch(`${import.meta.env.VITE_API_URL}/settings`, {}, "manager").catch(e => e),
        apiFetch(`${import.meta.env.VITE_API_URL}/business-day/active`, {}, "manager").catch(e => e),
        apiFetch(`${import.meta.env.VITE_API_URL}/business-day/summary`, {}, "manager").catch(e => e),
        apiFetch(`${import.meta.env.VITE_API_URL}/employees`, {}, "manager").catch(e => e),
        apiFetch(`${import.meta.env.VITE_API_URL}/orders/transactions`, {}, "manager").catch(e => e),
        apiFetch(`${import.meta.env.VITE_API_URL}/orders/analytics`, {}, "manager").catch(e => e),
      ]);

      if (ordersRes?.ok) {
        const d = await ordersRes.json();
        if (Array.isArray(d)) setOrders(d);
      }
      if (menuRes?.ok) {
        const d = await menuRes.json();
        if (Array.isArray(d)) setMenu(d);
      }
      if (lowStockRes?.ok) {
        const d = await lowStockRes.json();
        if (Array.isArray(d)) setLowStockItems(d.map(i => i.item_name || i));
      }
      if (settingsRes?.ok) {
        const d = await settingsRes.json();
        setSettings(prev => ({ ...prev, ...d }));
        setIsLoadingSettings(false);
        if (Array.isArray(d.tables_list) && d.tables_list.length > 0) {
          setTablesList(d.tables_list);
        } else {
          setTablesList(prev => prev.length > 0 ? prev : ["1","2","3","4","5"]);
        }
      }
      if (activeDayRes?.ok) {
        const d = await activeDayRes.json();
        setBusinessDay(d);
        setBusinessDayData(d);
      }
      if (summaryRes?.ok) {
        const d = await summaryRes.json();
        setSummary({
          total_sales:      d.total_sales      ?? d.total_revenue  ?? 0,
          cash_sales:       d.cash_sales        ?? 0,
          online_sales:     d.online_sales      ?? 0,
          completed_orders: d.completed_orders  ?? d.total_orders  ?? 0,
          rejected_orders:  d.rejected_orders   ?? 0,
          average_order:    d.average_order     ?? 0,
        });
      }
      if (employeeRes?.ok) {
        const d = await employeeRes.json();
        if (Array.isArray(d)) setEmployees(d);
      }
      if (transactionsRes?.ok) {
        const d = await transactionsRes.json();
        if (Array.isArray(d)) setTransactions(d);
      }
      if (analyticsRes?.ok) {
        const d = await analyticsRes.json();
        setAnalytics(d);
      }

    } catch (err) {
      console.error("❌ Critical Dashboard Boot Failure:", err);
    } finally {
      setIsLoading(false);
      setIsLoadingSettings(false);
    }
  };

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

  loadAllDashboardData();
}, []);

// Clock timer
useEffect(() => {
  const t = setInterval(() => setCurrentTime(Date.now()), 60000);
  return () => clearInterval(t);
}, []);

// Subscription countdown
useEffect(() => {
  const expiryDateString = settings?.subscription_expires;
  if (!expiryDateString) { setSubscriptionTimeLeft('No Active Plan'); return; }
  const calc = () => {
    const diff = new Date(expiryDateString) - new Date();
    if (diff <= 0) { setSubscriptionTimeLeft('Expired'); setIsExpiryCritical(true); return; }
    const days = Math.floor(diff / (1000*60*60*24));
    const hours = Math.floor((diff / (1000*60*60)) % 24);
    setIsExpiryCritical(days < 3);
    setSubscriptionTimeLeft(`${days}d ${hours}h remaining`);
  };
  calc();
  const t = setInterval(calc, 60000);
  return () => clearInterval(t);
}, [settings?.subscription_expires]);

// Background subscription sync
useEffect(() => {
  let id;
  if (settings?.subscription_status === "pending_renewal") {
    id = setInterval(() => loadSettings(), 5000);
  }
  return () => { if (id) clearInterval(id); };
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
        addNotification(`Order ${msg.data.token_id} completed `);
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
   CREATE ORDER (TABLE MANAGEMENT - STRICT ONLINE ONLY)
========================================= */
const handleCreateOrder = async () => {
  // 🚀 INTERNET STATUS CHECK: Kill execution instantly if offline
  if (!navigator.onLine) {
    addNotification("⚠️ Offline! Active internet connection is required to send orders to the kitchen.", "error");
    return;
  }

  // 1. INSTANT SYNCHRONOUS GUARD (Blocks multi-clicks in < 1ms)
  if (cart.length === 0 || creatingOrder || isProcessingRef.current) return;

  if (!businessDay) {
    addNotification("⚠️ Please open today's sales before creating an order.", "warning");
    return;
  }

  if (!selectedTableNumber) {
    addNotification("⚠️ Please select a table number before placing the order.", "warning");
    return;
  }

  // Set the locks immediately
  isProcessingRef.current = true;
  setCreatingOrder(true);

  const localTableBackup = selectedTableNumber;
  const localCartBackup = [...cart];
  const localPaymentModeBackup = paymentMode;

  // Clone payload instantly so it's safely detached from the UI state
  const orderPayload = {
    items: [...cart], 
    payment_mode: paymentMode, 
    status: "pending",
    table_number: selectedTableNumber
  };

  // ── 2. INSTANT UI CLEANUP (Takes < 5ms) ──
  // The user sees a totally fresh screen instantly!
  setCart([]);
  setSelectedTableNumber("");
  setPaymentMode("cash");
  setCreatingOrder(false); 
  
  // NOTE: We keep isProcessingRef.current = true in the background 
  // to silently block duplicate clicks while the network fetch finishes.

  // ── 3. ASYNC NETWORK BACKGROUND PROCESS ──
  try {
    const res = await apiFetch(
      `${import.meta.env.VITE_API_URL}/orders`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderPayload)
      },
      "manager"
    );

    if (!res.ok) throw new Error("Network drop or server issue");
    
    const data = await res.json();

    // Inject server data into background state array
    setOrders((prev) => [...prev, { ...data, items: data.items || [] }]);

    if (settings?.enable_sound && acceptSoundRef?.current) {
      acceptSoundRef.current.currentTime = 0;
      acceptSoundRef.current.play().catch(err => console.error("Audio blocked:", err));
    }

    addNotification(`🎉 Order sent to Kitchen for Table ${localTableBackup}!`, "success");

    printToken(data, () => {
      refreshTransactions(); 
      refreshSummary();      
      refreshAnalytics();
    });

  } catch (err) {
    console.error("Order submission failed, rolling back checkout UI state...", err);
    addNotification("❌ Failed to send order. Server unreachable. Please check your connection and try again.", "error");
    
    // 🚀 ROLLBACK: Bring everything back onto the checkout view so they don't lose typed data
    setCart(localCartBackup);
    setSelectedTableNumber(localTableBackup);
    setPaymentMode(localPaymentModeBackup);
  } finally {
    // 4. UNLOCK for the next order once background pipeline completes
    isProcessingRef.current = false;
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


const handleLogoUpload = async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const logoUrl = await uploadDirectToCloudinary(file);
    const updatedSettings = { ...settings, logo_url: logoUrl };
    setSettings(updatedSettings);
    await apiFetch(
      `${import.meta.env.VITE_API_URL}/settings`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedSettings)
      },
      "manager"
    );
    addNotification("✅ Logo updated successfully!", "success");
  } catch (err) {
    console.error(err);
    addNotification("❌ Logo upload failed.", "error");
  }
};

const handleSaveSettings = async () => {
  try {
    setIsUpdatingSettings(true);
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
  } finally {
    setIsUpdatingSettings(false);
  }
};


// ✅ Add optimistic reset before the API call
const handleStartDay = async () => {
  setSummary({ total_sales: 0, cash_sales: 0, online_sales: 0, completed_orders: 0 });
  setOrders([]);
  setCart([]);
  try {
    setIsStartingDay(true);
    const res = await apiFetch(`${import.meta.env.VITE_API_URL}/business-day/start`, { method: "POST" }, "manager");
    if (!res.ok) { addNotification("❌ Failed to start day", "error"); return; }
    const data = await res.json();
    setBusinessDay(data);
    setBusinessDayData(data);
    addNotification("✅ Business day started");
  } catch (err) {
    console.error(err);
    addNotification("❌ Failed to start day");
  } finally {
    setIsStartingDay(false);
  }
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
        setIsClosingDay(true);
        const res = await apiFetch(
          `${import.meta.env.VITE_API_URL}/business-day/close`,
          { method: "PATCH" },
          "manager"
        );

        if (!res.ok) {
          addNotification("❌ Failed to close day", "error");
          resetDailyOperationalState();
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
        setBusinessDayData(null);

      } catch (err) {
        console.error("Day close payload parsing failure:", err);
        addNotification("❌ Failed to finalize day close processes.", "error");
      } finally {
        setIsClosingDay(false);
      }
    },
  });
};


const fetchEmployees = async () => {

  try {

    const response = await apiFetch(
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

// ➕ Function to add a new table (sequential & autosaved)
const handleAddTable = async () => {
  let nextNum = 1;
  if (tablesList.length > 0) {
    const numericValues = tablesList.map(num => parseInt(num, 10)).filter(num => !isNaN(num));
    if (numericValues.length > 0) {
      nextNum = Math.max(...numericValues) + 1;
    } else {
      nextNum = tablesList.length + 1;
    }
  }
  
  // 🎯 Create the updated array explicitly first
  const updatedList = [...tablesList, String(nextNum)];
  
  // Update local state instantly
  setTablesList(updatedList);
  
  // 🚀 Pass the fresh array directly to the saver so it doesn't use old state!
  await saveTableConfig(updatedList);
};

// 🗑️ Function to remove a table (autosaved)
const handleRemoveTable = async (targetTable) => {
  // 🎯 Filter the array explicitly first
  const updatedList = tablesList.filter(t => t !== targetTable);
  
  // Update local state instantly
  setTablesList(updatedList);
  
  // 🚀 Pass it directly to the saver
  await saveTableConfig(updatedList);
};

// 💾 Shared function to save straight to your backend
const saveTableConfig = async (listToSave = tablesList) => {
  try {
    const token = localStorage.getItem("managerAccessToken");

    // 🎯 Use the specific endpoint you set up
    const res = await fetch(`${import.meta.env.VITE_API_URL}/settings/tables`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      // 🎯 FIX: Match BOTH 'tables' and 'tables_list' fields just in case your backend expects one over the other!
      body: JSON.stringify({ 
        tables: listToSave,
        tables_list: listToSave 
      }) 
    });

    const data = await res.json();

    if (res.ok) {
      addNotification("🎯 Floor layout configuration saved perfectly!", "success");
      
      // Sync up all frontend data representations
      // Checks backend responses for 'tables_list' or fallback fields
      const savedList = data.tables_list || data.tables || listToSave;
      setTablesList(savedList);
      
      if (typeof setSettings === 'function') {
        setSettings(prev => ({ ...prev, tables_list: savedList, tables: savedList }));
      }
    } else {
      addNotification("❌ Failed to commit updated table configurations.", "error");
    }
  } catch (err) {
    console.error("Error committing layout configurations:", err);
    addNotification("❌ Connection error while trying to reach server settings.", "error");
  }
};


const resetDailyOperationalState = () => {
  console.log("🧼 Performing Deep Billing System State Wipe...");
  
  // 1. Wipe current order and billing streams
  setOrders([]);
  
  // 2. Clear out cart, selections, and table targets
  setCart([]);
  setSelectedTableNumber("");
  
  // 3. Clear customer tokens or quick invoice states if you have them
  if (typeof setTokens === 'function') setTokens([]);
  if (typeof setSelectedOrder === 'function') setSelectedOrder(null);
  if (typeof setSelectedBill === 'function') setSelectedBill(null);

  // 4. Clear search bar queries or active filtering parameters
  if (typeof setSearchQuery === 'function') setSearchQuery("");
  if (typeof setFilterStatus === 'function') setFilterStatus("all");
  
  // 5. Reset summaries and financial trackers completely
  if (typeof setAnalytics === 'function') setAnalytics(null);
  if (typeof setDailySummary === 'function') setDailySummary(null);
  
  // 6. Lower processing blockers
  setCreatingOrder(false);
};



// Automatically extracts unique category values from current menu data array strings
const existingCategories = [...new Set(menu.map(item => item.category).filter(Boolean))];

  return (
    <div className="manager-container manager-dashboard-layout">

      {/* ── LOADING OVERLAY ── */}
    {isLoading && (
      <div className="loading-overlay">
        <div className="loading-spinner" />
        <span className="loading-text">Loading your dashboard...</span>
      </div>
    )}

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


      {/* ========== SIDEBAR ========== */}
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
          <h1>{settings.restaurant_name || "Restaurant"} Manager</h1>
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
              window.location.href = window.location.origin + "/";
              closeSidebar();
            }}
          >
            <span className="sidebar-icon">🚪</span>
            <span>Logout</span>
          </div>
        </div>
      </aside>

      {/* ========== MAIN CONTENT ========== */}
      <main className="manager-main content-display-window">

{/* ========== ANALYTICS PANEL ========== */}
{showAnalyticsView && analytics && (
  <div className="analytics-container" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
    
    <div className="main-header">
      <h1>📊 Analytics & Performance</h1>
    </div>

    {/* BUSINESS STATUS CARD */}
    <div className="status-card" style={{ margin: 0 }}>
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

    {/* 🎯 STAT CARDS - Uniform class layout */}
    <div className="grid grid-4" style={{ gap: '24px' }}>
      <motion.div className="stat-card primary" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="stat-label">💰 Total Sales</div>
        <div className="stat-value">₹{analytics.total_sales}</div>
      </motion.div>

      <motion.div className="stat-card success" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <div className="stat-label">📦 Total Orders</div>
        <div className="stat-value">{analytics.total_orders}</div>
      </motion.div>

      <motion.div className="stat-card warning" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
        <div className="stat-label">💵 Cash Sales</div>
        <div className="stat-value">₹{analytics.cash_sales}</div>
      </motion.div>

      <motion.div className="stat-card danger" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
        <div className="stat-label">💳 Online Sales</div>
        <div className="stat-value">₹{analytics.online_sales}</div>
      </motion.div>
    </div>

    {/* 🎯 ALL CHARTS UNIFIED - Using a single parent column wrapper to guarantee perfectly identical gaps */}
    <div className="analytics-charts-feed" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* 1. Payment Distribution */}
      <div className="chart-container" style={{ margin: 0 }}>
        <h3 className="chart-title">Payment Distribution</h3>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie data={paymentData} dataKey="value" nameKey="name" outerRadius={100} label>
              {paymentData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
      
      {/* 2. Top Selling Items */}
      <div className="chart-container" style={{ margin: 0 }}>
        <h3 className="chart-title">Top Selling Items</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={[...chartData].sort((a, b) => b.sold - a.sold).slice(0, 5)} layout="vertical" margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <XAxis type="number" />
            <YAxis dataKey="name" type="category" width={90} stroke="#64748b" fontSize={12} />
            <Tooltip />
            <Bar dataKey="sold" fill="#2563eb" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 3. Rush Hour Analytics */}
      <div className="chart-container" style={{ margin: 0 }}>
        <h3 className="chart-title">Rush Hour Analytics</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={[...analytics.rush_hours].sort((a, b) => b.orders - a.orders).slice(0, 5)} margin={{ top: 10, right: 0, left: -30, bottom: 0 }}>
            <XAxis dataKey="hour" angle={-45} textAnchor="end" height={60} interval={0} stroke="#64748b" fontSize={12} />
            <YAxis stroke="#64748b" fontSize={12} />
            <Tooltip />
            <Bar dataKey="orders" fill="#10b981" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

    </div>
  </div>
)}

        {/* ========== TRANSACTIONS PANEL ========== */}
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
              {/* NEW: Date Wrapper */}
  <div className="date-input-wrapper" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
    <input 
      className="form-input"
      type="date" 
      value={filterDate} 
      onChange={(e) => setFilterDate(e.target.value)} 
      style={{ paddingRight: filterDate ? '30px' : '10px' }} // Make space for the arrow if date is picked
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

            {transactions.map((txn) => (
  <div
    key={txn.id}
    className={`transaction-item ${
      txn.status === "rejected"
        ? "rejected-order"
        : ""
    }`}
  >
    <div className="transaction-header">
      {/* HEADER LEFT SIDE: TOKEN & CYCLE ID */}
      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        <span className="transaction-token">
          Token #{txn.token_id}
        </span>
        
        {/* 🚀 NEW BADGE: BUSINESS DAY CYCLE NUMBER */}
        <span 
          style={{
            fontSize: "11px",
            fontWeight: "700",
            color: "#4f46e5", // Indigo theme color
            background: "#eff6ff",
            padding: "2px 8px",
            borderRadius: "6px",
            width: "fit-content",
            border: "1px solid #bfdbfe"
          }}
        >
          🔄 Day #{txn.cycle_number || "N/A"}
        </span>
      </div>

      {/* HEADER RIGHT SIDE: STATUS & PAYMENT */}
      <div
        style={{
          display: "flex",
          gap: "10px",
          alignItems: "center"
        }}
      >
        <span
          className={`status-badge ${
            txn.status
          }`}
        >
          {txn.status}
        </span>

        <span
          className={`transaction-payment ${txn.payment_mode}`}
        >
          {txn.payment_mode?.toLowerCase() === "cash"
            ? "💵"
            : "💳"}{" "}
          {txn.payment_mode?.toUpperCase()}
        </span>
      </div>
    </div>

    <div className="transaction-details">
      <div className="transaction-detail-row">
        <div className="transaction-detail-label">
          Items
        </div>
        <div className="transaction-detail-value">
          {txn.items
            .map(
              (i) =>
                `${i.name} x${i.quantity}`
            )
            .join(", ")}
        </div>
      </div>

      <div className="transaction-detail-row">
        <div className="transaction-detail-label">
          Total Amount
        </div>
        <div
          className="transaction-detail-value"
          style={{
            color:
              txn.status === "rejected"
                ? "#dc2626"
                : "inherit",
            textDecoration:
              txn.status === "rejected"
                ? "line-through"
                : "none",
            fontWeight: "700"
          }}
        >
          ₹{txn.total_price}
        </div>
      </div>

      <div className="transaction-detail-row">
        <div className="transaction-detail-label">
          Order Time
        </div>
        <div className="transaction-detail-value">
          {new Date(
            txn.created_at
          ).toLocaleTimeString(
            "en-GB",
            {
              hour: "numeric",
              minute: "2-digit",
              hour12: true,
            }
          ).toLowerCase()}
          {" • "}
          {new Date(
            txn.created_at
          ).toLocaleDateString(
            "en-GB",
            {
              day: "numeric",
              month: "short",
              year: "numeric",
            }
          )}
        </div>
      </div>

      <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: "1px solid var(--border-color)" }}>
        <button
          className="btn btn-primary btn-sm download-receipt-btn"
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
      disabled={isStartingDay} /* 🚀 Prevents double-clicks */
    >
      {isStartingDay ? (
        <>⌛ Starting Day...</>
      ) : (
        <>▶ Start Today</>
      )}
    </button>
  ) : (
    <button 
      className="btn btn-danger" 
      onClick={handleCloseDay}
      disabled={isClosingDay} /* 🚀 Prevents double-clicks */
    >
      {isClosingDay ? (
        <>⏳ Closing Day...</>
      ) : (
        <>🔒 Close Today Sales</>
      )}
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
    <div className="main-header" style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "24px" }}>
      <h1 style={{ margin: 0 }}> Manage Menu Items</h1>
      
      {/* 🔍 REAL-TIME SEARCH BAR INPUT FIELD */}
      <div className="search-bar-wrapper" style={{ position: "relative", width: "100%", maxWidth: "400px" }}>
        <input
          type="text"
          placeholder="🔍 Search items by name, category or description..."
          value={menuSearchQuery || ""}
          onChange={(e) => setMenuSearchQuery(e.target.value)}
          style={{
            width: "100%",
            padding: "10px 14px",
            fontSize: "14px",
            borderRadius: "10px",
            border: "1px solid var(--border-color, #cbd5e1)",
            background: "var(--card-bg, #ffffff)",
            color: "var(--text-primary, #0f172a)",
            outline: "none",
            transition: "border-color 0.2s"
          }}
        />
        {menuSearchQuery && (
          <button 
            onClick={() => setMenuSearchQuery("")}
            style={{
              position: "absolute",
              right: "12px",
              top: "50%",
              transform: "translateY(-50%)",
              background: "none",
              border: "none",
              color: "var(--text-secondary, #64748b)",
              cursor: "pointer",
              fontSize: "14px"
            }}
          >
            ✕
          </button>
        )}
      </div>
    </div>

    {/* Empty State Guard */}
    {(!menu || menu.length === 0) ? (
      <p style={{ color: "var(--text-secondary)" }}>
        No items found in your menu ledger.
      </p>
    ) : (
      (() => {
        /* Filter list matches values instantly using lowcase evaluation strings */
        const filteredMenuItems = (menu || []).filter((item) => {
          const query = (menuSearchQuery || "").toLowerCase().trim();
          if (!query) return true; // Empty query returns all elements natively
          
          return (
            (item.name || "").toLowerCase().includes(query) ||
            (item.category || "").toLowerCase().includes(query) ||
            (item.description || "").toLowerCase().includes(query)
          );
        });

        if (filteredMenuItems.length === 0) {
          return (
            <p style={{ color: "var(--text-secondary)", fontStyle: "italic", marginTop: "20px" }}>
              No menu items match your search query details.
            </p>
          );
        }

        /* Grouping logic executed cleanly over the filtered array results */
        return Object.entries(
          filteredMenuItems.reduce((acc, item) => {
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
        ));
      })()
    )}
  </div>
)}

        {/* ========== CREATE MENU PANEL ========== */}
{showCreateMenu && (
  <div>
    <div className="main-header">
      <h1>➕ Add New Menu Item</h1>
    </div>

    <div className="card" style={{ opacity: isAddingItem ? 0.7 : 1, transition: "opacity 0.2s ease" }}>
      <div className="form-group">
        <label>Item Name *</label>
        <input
          className="form-input"
          placeholder="Enter item name"
          value={newItemName}
          disabled={isAddingItem}
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
            disabled={isAddingItem}
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
              disabled={isAddingItem}
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
              disabled={isAddingItem}
              onClick={() => {
                setIsCustomCategory(false);
                setCustomCategoryInput("");
              }}
              style={{ 
                padding: "10px 16px",
                fontSize: "14px",
                backgroundColor: isAddingItem ? "#cbd5e1" : "#64748b",
                color: "#ffffff",
                border: "none",
                borderRadius: "6px",
                cursor: isAddingItem ? "not-allowed" : "pointer",
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
            disabled={isAddingItem}
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
          disabled={isAddingItem}
          onChange={(e) => setNewItemDescription(e.target.value)}
        />
      </div>

      <div className="form-group">
        <label>Item Image</label>
        <input
          ref={fileInputRef}
          type="file"
          disabled={isAddingItem}
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
          style={{ 
            display: "inline-block",
            cursor: isAddingItem ? "not-allowed" : "pointer",
            opacity: isAddingItem ? 0.6 : 1
          }}
        >
          {selectedFile ? "🔄 Change Image" : "🖼️ Choose Image"}
        </label>
      </div>

      {previewImage && (
        <div style={{ marginBottom: "20px", opacity: isAddingItem ? 0.6 : 1 }}>
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
        style={{ 
          width: "100%", 
          cursor: isAddingItem ? "not-allowed" : "pointer",
          opacity: isAddingItem ? 0.7 : 1
        }}
        disabled={isAddingItem || !newItemName || !newItemPrice}
        onClick={async () => {
          if (isAddingItem) return;

          const finalizedCategory = isCustomCategory 
            ? customCategoryInput.trim() 
            : newItemCategory;

          if (!finalizedCategory) {
            addNotification("Please select a category or write a brand new custom heading name!", "error");
            return;
          }

          // ⏳ Activate Loading Lockout
          setIsAddingItem(true);
          let imagePath = "";

          if (selectedFile) {
            try {
              imagePath = await uploadDirectToCloudinary(selectedFile);
              console.log("⚡ Cloudinary Secure URL Acquired directly:", imagePath);
            } catch (error) {
              addNotification("❌ Image upload to storage provider failed.", "error");
              setIsAddingItem(false); // Drop loading safely on failure
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

          try {
            const res = await apiFetch(`${import.meta.env.VITE_API_URL}/menu`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(newItem)
            }, "manager");

            if (res.ok) {
              const data = await res.json();
              setMenu((prev) => [...prev, data]);

              // 🧼 Clear all fields and clean resets
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
              addNotification("❌ Failed to add item to database schema.", "error");
            }
          } catch (error) {
            console.error("Failed to add item:", error);
            addNotification("❌ Network communication error occurred.", "error");
          } finally {
            // 🔓 Release Loading Lockout
            setIsAddingItem(false);
          }
        }}
      >
        {isAddingItem ? "⏳ Uploading & Saving Item..." : "✅ Add Item to Menu"}
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
     Create Order
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
                    onClick={() => handleQtyChange(index, item.quantity - 1)}
                  >
                    −
                  </button>
                  <span className="qty-value">{item.quantity}</span>
                  <button
                    className="qty-btn"
                    onClick={() => handleQtyChange(index, item.quantity + 1)}
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

        <div className="order-total" style={{ marginBottom: "20px" }}>
          <span className="order-total-label">Order Total:</span>
          <span className="order-total-value">₹{total}</span>
        </div>
      </>
    )}

    {/* PAYMENT SECTION */}
    <div className="payment-section" style={{ marginBottom: "20px" }}>
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

    {/* 🎯 TABLE ASSIGNMENT SECTION (Spaced out & fully adaptive to the card layout) */}
    <div 
      className="table-assignment-group" 
      style={{ 
        display: "flex", 
        flexDirection: "column", 
        gap: "6px", 
        marginBottom: "24px" /* 👈 Generous breathing space before checkout button */
      }}
    >
      <label style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-secondary, #475569)" }}>
        🪑 Assign Table Location
      </label>
      <select
        value={selectedTableNumber}
        onChange={(e) => setSelectedTableNumber(e.target.value)}
        className="table-select"
      >
        <option value="">Select Table...</option>
        {Array.isArray(tablesList) && tablesList.map((tableNum) => (
          <option key={tableNum} value={tableNum}>
            Table {tableNum}
          </option>
        ))}
      </select>
    </div>

    {/* CHECKOUT BUTTON */}
    <button
      className="btn btn-success"
      style={{ width: "100%", padding: "12px", fontWeight: "600" }}
      /* ✅ COMBINED BOTH CONDITIONS INTO ONE CLEAN ATTR */
      disabled={cart.length === 0 || creatingOrder}
      onClick={handleCreateOrder}
    >
      {creatingOrder ? "Creating..." : "✅ Create Order"}
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
  <div className="card" style={{ textAlign: "center", padding: "50px" }}>
    <p style={{ color: "var(--text-secondary)", fontSize: "16px", fontWeight: "500" }}>
      {orders.length === 0 ? "No active orders" : "No orders match your filters"}
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
            marginBottom: "12px" /* Adjusted spacing slightly */
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
              {settings?.token_prefix || "TOK"}-{order.token_id}
            </h2>
            <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
              {order.items?.length || 0} item(s)
            </p>
          </div>

          <span
            style={{
              padding: "7px 14px",
              borderRadius: "999px",
              fontSize: "12px",
              fontWeight: "700",
              backgroundColor: order.status === "accepted" ? "#dcfce7" : "#fef3c7",
              color: order.status === "accepted" ? "#166534" : "#b45309"
            }}
          >
            {order.status === "accepted" ? "✅ Accepted" : "⏳ Pending"}
          </span>
        </div>

        {/* 🎯 UNIFIED TABLE NUMBER ROW (Lifted OUT of the loop, shows once per order card) */}
        <div 
          className="order-detail-row" 
          style={{ 
            marginBottom: "16px", 
            display: "flex", 
            alignItems: "center", 
            gap: "8px" 
          }}
        >
          <span className="order-detail-label" style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-secondary)" }}>
            Location:
          </span>
          <span 
            className="order-detail-value" 
            style={{ 
              fontWeight: "600",
              color: order.table_number ? "#1e40af" : "#4b5563",
              backgroundColor: order.table_number ? "#eff6ff" : "#f3f4f6",
              padding: "4px 10px",
              borderRadius: "6px",
              fontSize: "13px",
              display: "inline-flex",
              alignItems: "center"
            }}
          >
            {order.table_number ? `🍽️ Table ${order.table_number}` : "🛍️ Counter Sale"}
          </span>
        </div>

        {/* ITEMS MAP */}
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
                <p style={{ fontWeight: "600", marginBottom: "3px", fontFamily: "inherit" }}>
                  {item.name}
                </p>
                <p style={{ fontSize: "12px", color: "var(--text-secondary)", fontFamily: "inherit" }}>
                  Qty: {item.quantity}
                </p>
              </div>

              <div style={{ fontWeight: "700", color: "var(--primary-color)" }}>
                ₹{(Number(item.price || 0) * Number(item.quantity || 0)).toFixed(2)}
              </div>
              
              {/* ❌ Extraneous duplicate loop item block has been completely removed from here! */}
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
          {/* PAYMENT MODE */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-secondary)" }}>
              Payment:
            </span>
            <span
              style={{
                padding: "5px 10px",
                borderRadius: "10px",
                background: order.payment_mode?.toLowerCase() === "online" ? "#dbeafe" : "#f3f4f6",
                color: order.payment_mode?.toLowerCase() === "online" ? "#1d4ed8" : "#374151",
                fontSize: "12px",
                fontWeight: "700"
              }}
            >
              {order.payment_mode?.toLowerCase() === "online" ? "💳 Online" : "💵 Cash"}
            </span>
          </div>

          {/* TOTAL PRICE */}
          <div style={{ fontSize: "20px", fontWeight: "800", color: "var(--primary-color)" }}>
            ₹{Number(order.total_price || 0).toFixed(2)}
          </div>
        </div>

        {/* WAITING TIME */}
        <div
          style={{
            marginTop: "18px",
            paddingTop: "14px",
            borderTop: "1px solid rgba(0,0,0,0.08)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}
        >
          <span style={{ fontSize: "13px", color: "#dc2626", fontWeight: "700" }}>
            🕒 Waiting: {getWaitingTime(order.created_at)}
          </span>
          <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
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
        placeholder="1234567890"
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
        placeholder="GST123"
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
        className="setting-input setting-input-readonly"
        type="email"
        readOnly // 🔒 Makes it non-editable
        disabled // 🛡️ Grays it out slightly to visually indicate it's locked
        value={settings.email || "Loading..."} // Pulls email from your state tracking matrix
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


<div className="settings-card" >
  <div className="settings-header">
      <h2>🪑 Floor Plan Management</h2>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", margin: "20px 0" }}>
        {tablesList.map((tableNum) => (
          <div key={tableNum} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: "8px" }}>
            <span>Table {tableNum}</span>
            <button onClick={() => handleRemoveTable(tableNum)} style={{ color: "#ef4444", border: "none", background: "none", cursor: "pointer" }}>✕</button>
          </div>
        ))}
        <button onClick={() => handleAddTable()} style={{ padding: "8px 12px", border: "2px dashed #3b82f6", borderRadius: "8px", color: "#3b82f6", cursor: "pointer" }}>
          ➕ Add Table
        </button>
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
                  disabled={isUpdatingSettings} // 🛡️ Isolated protection
                  style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}
                >
                  {isUpdatingSettings ? (
                    <>
                      <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                      Saving...
                    </>
                  ) : (
                    <>💾 Save Settings</>
                  )}
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
          <span style={{ fontWeight: "700", color: "#0f172a" }}>{masterCycleSummary.total_orders} Order(s)</span>
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
          <span style={{ color: "#1e293b", fontSize: "16px", fontWeight: "bold" }}>📈 Gross Revenue:</span>
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

        <ToastContainer notifications={notifications} />

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
    <div className={`subscription-meta-card ${isCritical ? 'critical' : ''}`}>
      <span className="countdown-label">Time Remaining</span>
      <h3 className="countdown-value">{timeLeft}</h3>
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

  // Clean-up and close utility
  const handleModalClose = () => {
    setUtr('');
    setScreenshot(null);
    setPreview('');
    onClose();
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setScreenshot(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleReceiptSubmission = async () => {
    const cleanUtr = utr.trim();

    if (!cleanUtr) {
      onNotify("Please input your transaction reference UTR ID first!");
      return;
    }
    
    // Strict Length Check
    if (cleanUtr.length < 12 || cleanUtr.length > 22) {
      onNotify("⚠️ Transaction Reference UTR must be between 12 and 22 digits long!");
      return;
    }
    
    setLoading(true);

    const formData = new FormData();
    formData.append("utr_id", cleanUtr);
    formData.append("duration_days", 30);
    
    // Only attach screenshot if the user optionally chose to upload one
    if (screenshot) {
      formData.append("screenshot", screenshot);
    }

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/auth/recharge-subscription`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("managerAccessToken")}`
        },
        body: formData
      });

      if (res.ok) {
        setUtr('');
        setScreenshot(null);
        setPreview('');
        onSuccess(cleanUtr); 
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

  const isUtrInvalid = utr.trim().length > 0 && (utr.trim().length < 12 || utr.trim().length > 22);

  return (
    <div className="modal-overlay-backdrop">
      <div className="modal-content-card">
        <div className="modal-header-row">
          <h3 className="modal-card-heading">💳 Secure Manual Payment</h3>
          <button onClick={handleModalClose} className="modal-close-cross-btn">×</button>
        </div>

        <p className="modal-info-paragraph">
          Scan the official merchant QR code and make a bank transfer of exactly <strong>₹499</strong>.
        </p>

        {/* MERCHANT GATEWAY BOX */}
        <div className="merchant-gateway-box">
          <div className="merchant-qr-placeholder-img">
            <img 
              src="/qr_code.jpeg" 
              alt="QR Code" 
              className="payment-qr" 
            />
          </div>
          <span className="merchant-upi-text">UPI ID: 8464053060-2@ybl </span>
        </div>

        {/* UTR INPUT BLOCK */}
        <div className="input-group-field-block">
          <label className="input-field-label">
            Reference UTR / Transaction ID (12 to 22 Digits)
          </label>
          <input 
            type="text" 
            placeholder="Enter 12-22 digit UTR identifier" 
            minLength={12}
            maxLength={22}
            value={utr}
            onChange={(e) => setUtr(e.target.value)}
            className="text-input-field"
          />
          {isUtrInvalid && (
            <p style={{ color: "#ef4444", fontSize: "12px", marginTop: "5px", fontWeight: "600" }}>
              ⚠️ UTR must be between 12 and 22 digits long (Current: {utr.trim().length}).
            </p>
          )}
        </div>

        {/* FILE UPLOADER DRAWER (OPTIONAL) */}
        <div className="dashed-uploader-container">
          <label className="uploader-clickable-label">
            📸 Upload Payment Receipt Screenshot (Optional)
          </label>
          <input type="file" accept="image/*" onChange={handleFileChange} className="file-input-field" />
          
          {preview && (
            <img src={preview} alt="Receipt Preview" className="receipt-thumbnail-preview" />
          )}
        </div>

        {/* BUTTON GROUP ROW */}
        <div className="modal-btn-row-group">
          <button 
            onClick={handleReceiptSubmission} 
            disabled={loading || isUtrInvalid || !utr.trim()} 
            className="btn-modal-action-primary"
          >
            {loading ? "Verifying Reference..." : "🚀 Submit Extension Proof"}
          </button>
          <button onClick={handleModalClose} className="btn-modal-action-secondary">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default TableManager;




