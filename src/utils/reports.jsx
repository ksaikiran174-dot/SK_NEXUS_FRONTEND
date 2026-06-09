import { jsPDF } from "jspdf";

// 🚀 Exported globally so any dashboard module can import and use it instantly!
export const downloadSalesReport = (reportData, mode = "day", settings = {}) => {
  if (!reportData) return;

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let y = 20;

  // --- HEADER SECTION ---
  doc.setFillColor(41, 128, 185); 
  doc.rect(0, 0, pageWidth, 45, "F"); 

  doc.setTextColor(255, 255, 255);
  
  // 🏢 Restaurant Name (Subheading size)
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(settings.restaurant_name?.toUpperCase() || "MY RESTAURANT", margin, 16);

  // 👑 Main Title (Big Heading - Upgraded to look clean & official)
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  const titleText = mode === "day" ? "DAILY BUSINESS SALES REPORT" : "PERIODIC ANALYTICS REPORT";
  doc.text(titleText, margin, 27);

  // 📅 Date Strings (Subheading size)
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  
  let dateSubheading = "";
  if (mode === "day") {
    dateSubheading = `Business Date: ${reportData.date || new Date().toLocaleDateString("en-IN")}`;
  } else {
    dateSubheading = `Sales Period: ${reportData.startDate || ''} to ${reportData.endDate || ''}`;
  }
  doc.text(dateSubheading, margin, 37);

  // --- SUMMARY CARDS ---
  y = 55;
  doc.setTextColor(40, 40, 40);
  // 🏷️ Section Heading (Big)
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Executive Summary", margin, y);
  
  y += 8;
  doc.setDrawColor(230);
  doc.setFillColor(248, 249, 250);
  doc.roundedRect(margin, y, pageWidth - (margin * 2), 45, 3, 3, "FD");

  // 📝 Card Labels (Regular/Less Important - Clean 9px)
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text("TOTAL REVENUE", margin + 10, y + 12);
  doc.text(mode === "day" ? "TRANSACTION STATUS" : "TOTAL ORDERS", margin + 80, y + 12);

  // 💰 Crucial Numbers (Big eye-catchers - 18px)
  doc.setFontSize(18);
  doc.setTextColor(41, 128, 185);
  const revenueAmt = reportData.totalRevenue ?? reportData.total_sales ?? 0;
  doc.text(`Rs. ${Number(revenueAmt).toLocaleString('en-IN')}`, margin + 10, y + 22);
  
  // 📊 Important Status Metric (13px)
  doc.setFontSize(13);
  const rightMetric = mode === "day" ? "COMPLETED" : `${reportData.total_orders || 0}`;
  doc.text(rightMetric, margin + 80, y + 22);

  // 📝 Sub-Card Labels (Regular/Less Important - Clean 9px)
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text("CASH PAYMENTS", margin + 10, y + 35);
  doc.text("ONLINE UPI PAYMENTS", margin + 80, y + 35);

  // 💵 Secondary Important Metrics (13px)
  doc.setFontSize(13);
  doc.setTextColor(40, 40, 40);
  const cashAmt = reportData.cashSales ?? reportData.cash_sales ?? 0;
  const onlineAmt = reportData.onlineSales ?? reportData.online_sales ?? 0;
  doc.text(`Rs. ${Number(cashAmt).toLocaleString('en-IN')}`, margin + 10, y + 42);
  doc.text(`Rs. ${Number(onlineAmt).toLocaleString('en-IN')}`, margin + 80, y + 42);

  // --- TOP SELLING ITEMS TABLE (Periodic / Cycle Mode) ---
  if (mode === "cycle" && reportData.top_items && reportData.top_items.length > 0) {
    y += 65;
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("Top 3 Performing Products", margin, y);

    y += 5;
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, y, pageWidth - (margin * 2), 10, "F");
    
    doc.setFontSize(11);
    doc.setTextColor(40, 40, 40);
    doc.text("Product Name", margin + 5, y + 7);
    doc.text("Quantity Sold", pageWidth - margin - 5, y + 7, { align: "right" });

    y += 10;
    
    // 🎯 Slice to exactly 3 items to keep it clean and focused
    reportData.top_items.slice(0, 3).forEach((item, index) => {
      if (index % 2 === 0) {
        doc.setFillColor(252, 252, 252);
        doc.rect(margin, y, pageWidth - (margin * 2), 8, "F");
      }

      doc.setFontSize(13);
      doc.setTextColor(60, 60, 60);
      
      // item[0] is Name, item[1] is Quantity
      doc.text(`${item[0]}`, margin + 5, y + 6);
      doc.text(`${item[1]}`, pageWidth - margin - 5, y + 6, { align: "right" });
      
      doc.setDrawColor(245);
      doc.line(margin, y + 8, pageWidth - margin, y + 8);
      y += 8;
    });
  } else if (mode === "day") {
    // --- SIGNATURE FOOTNOTE (Daily Mode Only) ---
    y += 65;
    doc.setFontSize(11);
    doc.setTextColor(120);
    doc.line(margin, y + 8, margin + 70, y + 8);
    doc.text("Verified by: Operational Manager Signature", margin, y + 15);
  }

  // --- GLOBAL FOOTER CONFIG ---
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `Confidential - ${settings.restaurant_name || 'Restaurant'} Internal Use Only`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: "center" }
    );
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin, doc.internal.pageSize.getHeight() - 10, { align: "right" });
  }

  // --- SAVE FILE ---
  const safeName = (settings.restaurant_name || "Restaurant").replace(/\s+/g, '_');
  const fileDate = mode === "day" ? (reportData.date || "DayClose") : `${reportData.startDate}_to_${reportData.endDate}`;
  doc.save(`${safeName}_Sales_${fileDate}.pdf`);
};
