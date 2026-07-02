import { jsPDF } from 'jspdf';

export interface PDFExportOptions {
  location: string;
  startLocation: string;
  duration: number;
  numPeople: number;
  travelStyle: string;
  travelDate?: string;
  itineraryText: string;
  structured?: any;
  language?: string;
}

let devanagariFontCache: { regular: string; bold: string } | null = null;

async function loadDevanagariFonts(): Promise<{ regular: string; bold: string } | null> {
  if (devanagariFontCache) {
    return devanagariFontCache;
  }

  const fontUrls = {
    regular: "https://raw.githubusercontent.com/google/fonts/main/ofl/notosansdevanagari/NotoSansDevanagari-Regular.ttf",
    bold: "https://raw.githubusercontent.com/google/fonts/main/ofl/notosansdevanagari/NotoSansDevanagari-Bold.ttf"
  };

  try {
    const fetchWithTimeout = async (url: string, timeoutMs = 6000) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (!response.ok) throw new Error(`HTTP error ${response.status}`);
        return response;
      } catch (e) {
        clearTimeout(timeoutId);
        throw e;
      }
    };

    const [regRes, boldRes] = await Promise.all([
      fetchWithTimeout(fontUrls.regular),
      fetchWithTimeout(fontUrls.bold)
    ]);

    const [regBuf, boldBuf] = await Promise.all([
      regRes.arrayBuffer(),
      boldRes.arrayBuffer()
    ]);

    const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
      let binary = '';
      const bytes = new Uint8Array(buffer);
      const len = bytes.byteLength;
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      return window.btoa(binary);
    };

    devanagariFontCache = {
      regular: arrayBufferToBase64(regBuf),
      bold: arrayBufferToBase64(boldBuf)
    };

    return devanagariFontCache;
  } catch (err) {
    console.error("Failed to load Devanagari fonts from primary CDN:", err);
    
    // Attempt fallback to Poppins
    try {
      const fallbackUrls = {
        regular: "https://raw.githubusercontent.com/google/fonts/main/ofl/poppins/Poppins-Regular.ttf",
        bold: "https://raw.githubusercontent.com/google/fonts/main/ofl/poppins/Poppins-Bold.ttf"
      };
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      
      const [regRes, boldRes] = await Promise.all([
        fetch(fallbackUrls.regular, { signal: controller.signal }),
        fetch(fallbackUrls.bold, { signal: controller.signal })
      ]);
      
      clearTimeout(timeoutId);
      
      if (regRes.ok && boldRes.ok) {
        const [regBuf, boldBuf] = await Promise.all([
          regRes.arrayBuffer(),
          boldRes.arrayBuffer()
        ]);
        
        const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
          let binary = '';
          const bytes = new Uint8Array(buffer);
          const len = bytes.byteLength;
          for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          return window.btoa(binary);
        };
        
        devanagariFontCache = {
          regular: arrayBufferToBase64(regBuf),
          bold: arrayBufferToBase64(boldBuf)
        };
        return devanagariFontCache;
      }
    } catch (fallbackErr) {
      console.error("Fallback font loading also failed:", fallbackErr);
    }
    
    return null;
  }
}

export async function exportItineraryToPDF(options: PDFExportOptions) {
  const {
    location,
    startLocation,
    duration,
    numPeople,
    travelStyle,
    travelDate = "Upcoming",
    itineraryText,
    structured,
    language = "english"
  } = options;

  // Language check
  const isMarathi = language?.toLowerCase().startsWith("mr") || language?.toLowerCase().includes("marathi");
  const isHindi = language?.toLowerCase().startsWith("hi") || language?.toLowerCase().includes("hindi");
  const needsDevanagari = isMarathi || isHindi || /[\u0900-\u097F]/.test(itineraryText) || (structured && JSON.stringify(structured).match(/[\u0900-\u097F]/));

  // Show a beautiful compilation loader overlay
  const loadingOverlay = document.createElement('div');
  loadingOverlay.className = 'fixed inset-0 z-[100000] flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm transition-all duration-300';
  loadingOverlay.style.opacity = '0';
  
  let loadingText = "Compiling travel itinerary PDF...";
  let subText = "Preparing high-quality layout and matching regional styles...";
  if (isMarathi) {
    loadingText = "तुमची सुंदर ट्रॅव्हल पीडीएफ तयार होत आहे...";
    subText = "मराठी भाषेसाठी फॉन्ट लोड होत आहेत, कृपया काही सेकंद थांबा...";
  } else if (isHindi) {
    loadingText = "आपकी सुंदर ट्रैवल पीडीएफ तैयार हो रही है...";
    subText = "हिंदी भाषा के लिए फॉन्ट लोड हो रहे हैं, कृपया कुछ सेकंड प्रतीक्षा करें...";
  }

  loadingOverlay.innerHTML = `
    <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 shadow-2xl flex flex-col items-center text-center max-w-sm w-full mx-4 border border-slate-100 dark:border-slate-800" style="font-family: system-ui, sans-serif;">
      <div class="w-12 h-12 border-4 border-blue-800 border-t-transparent rounded-full animate-spin mb-4"></div>
      <p class="font-bold text-slate-800 dark:text-slate-100 text-base leading-snug">${loadingText}</p>
      <p class="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed max-w-[240px]">${subText}</p>
    </div>
  `;
  document.body.appendChild(loadingOverlay);
  setTimeout(() => { loadingOverlay.style.opacity = '1'; }, 10);

  let hasDevanagariFont = false;
  try {
    if (needsDevanagari) {
      const fonts = await loadDevanagariFonts();
      if (fonts) {
        hasDevanagariFont = true;
      }
    }
  } catch (err) {
    console.warn("Could not load Devanagari fonts:", err);
  }

  const removeLoading = () => {
    loadingOverlay.style.opacity = '0';
    setTimeout(() => {
      if (document.body.contains(loadingOverlay)) {
        document.body.removeChild(loadingOverlay);
      }
    }, 300);
  };

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  if (hasDevanagariFont && devanagariFontCache) {
    try {
      doc.addFileToVFS("NotoSansDevanagari-Regular.ttf", devanagariFontCache.regular);
      doc.addFont("NotoSansDevanagari-Regular.ttf", "NotoSansDevanagari", "normal");
      
      doc.addFileToVFS("NotoSansDevanagari-Bold.ttf", devanagariFontCache.bold);
      doc.addFont("NotoSansDevanagari-Bold.ttf", "NotoSansDevanagari", "bold");
      
      // Override doc.setFont on this instance so helvetica maps to NotoSansDevanagari
      const originalSetFont = doc.setFont;
      doc.setFont = function(fontNameParam: string, style?: string, ...args: any[]) {
        const targetFont = fontNameParam === 'helvetica' ? "NotoSansDevanagari" : fontNameParam;
        return originalSetFont.call(this, targetFont, style, ...args);
      };
      
      // Set initial font
      doc.setFont("NotoSansDevanagari", "normal");
    } catch (fontAddErr) {
      console.error("Failed to register Devanagari fonts to jsPDF:", fontAddErr);
      hasDevanagariFont = false;
    }
  }

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 15;
  const contentWidth = pageWidth - 2 * margin; // 180mm
  let currentY = 15;

  // Helper to sanitize text from emojis, rupee symbols, and unsupported Unicode
  function sanitize(text: string | null | undefined): string {
    if (!text) return "";
    let s = String(text)
      .replace(/₹/g, "Rs. ")
      .replace(/[\u20B9]/g, "Rs. ")
      // Replace curly quotes & dashes
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/[\u2013\u2014]/g, '-')
      // Strip emojis
      .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, "");

    if (!hasDevanagariFont) {
      // Keep only printable ASCII & basic Latin-1 characters for Helvetica
      s = s.replace(/[^\x1F-\x7F]/g, "");
    }
    return s.trim();
  }

  // Ensure text has some fallback to avoid blank sections
  function clean(text: string | null | undefined, fallback = ""): string {
    const s = sanitize(text);
    return s || fallback;
  }

  // Helper to check space and add a page if needed
  function checkSpace(heightNeeded: number) {
    if (currentY + heightNeeded > pageHeight - margin - 15) { // Leave 15mm at bottom for footer
      doc.addPage();
      currentY = margin + 15; // Extra top margin for subpage header
      drawSubpageHeader();
    }
  }

  function drawFooter() {
    const totalPages = doc.internal.pages.length - 1; // getNumberOfPages()
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184); // slate-400
      
      // Bottom line
      doc.setDrawColor(241, 245, 249); // slate-100
      doc.setLineWidth(0.5);
      doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);

      // Footer text
      doc.text("TRAVOLOR  Your AI-Curated Swadesh Travel Co-Pilot", margin, pageHeight - 8);
      doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 8, { align: 'right' });
    }
  }

  function drawSubpageHeader() {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(30, 144, 255); // Sky blue
    doc.text("TRAVOLOR AI TRAVEL CO-PILOT", margin, margin + 5);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`Itinerary: ${clean(startLocation)} to ${clean(location)}`, pageWidth - margin, margin + 5, { align: 'right' });
    
    // Line under subpage header
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.setLineWidth(0.5);
    doc.line(margin, margin + 8, pageWidth - margin, margin + 8);
  }

  // 1. BRAND HEADER BAND ON FIRST PAGE
  doc.setFillColor(0, 0, 128); // #000080 Navy
  doc.rect(margin, currentY, contentWidth, 18, 'F');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text("TRAVOLOR", margin + 6, currentY + 11);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(173, 216, 230); // light blue
  doc.text("YOUR AI-CURATED SWADESH CO-PILOT", pageWidth - margin - 6, currentY + 11, { align: 'right' });
  
  currentY += 24;

  // 2. MAIN TITLE
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(0, 0, 128);
  doc.text(clean(location, "Destination Plan"), margin, currentY);
  currentY += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text(`Comprehensive End-to-End Travel Route & Activity Schedule`, margin, currentY);
  currentY += 10;

  // 3. TRIP METADATA CARD (GRID-LIKE LAYOUT)
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(0.5);
  doc.rect(margin, currentY, contentWidth, 24, 'FD');

  const colW = contentWidth / 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184); // label color

  doc.text("STARTING POINT", margin + 6, currentY + 6);
  doc.text("DURATION", margin + colW + 6, currentY + 6);
  doc.text("TRAVELERS", margin + 2 * colW + 6, currentY + 6);
  doc.text("TRAVEL STYLE", margin + 3 * colW + 6, currentY + 6);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42); // slate-900

  doc.text(clean(startLocation, "Mumbai"), margin + 6, currentY + 14);
  doc.text(`${duration} Days`, margin + colW + 6, currentY + 14);
  doc.text(`${numPeople} Person(s)`, margin + 2 * colW + 6, currentY + 14);
  doc.text(clean(travelStyle.toUpperCase(), "STANDARD"), margin + 3 * colW + 6, currentY + 14);

  // Small date indicator
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`Travel Date: ${travelDate}`, margin + 6, currentY + 20);

  currentY += 32;

  // If structured itinerary exists, extract budget and details. Otherwise, use text fallback.
  if (structured) {
    // 4. BUDGET DASHBOARD (TABLE)
    checkSpace(60);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 128);
    doc.text("Financial Estimate & Budget Plan", margin, currentY);
    currentY += 6;

    // Budget Table Background
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);

    const b = structured.budgetDashboard || {};
    const totalCost = b.grandTotal || (
      (b.hotel || 0) + 
      (b.food || 0) + 
      (b.fuel || 0) + 
      (b.shopping || 0) + 
      (b.activities || 0) + 
      (b.transport || 0) + 
      (b.emergency || 0)
    ) || structured.hero?.totalCost || (duration * 5000 * numPeople);

    const budgetItems = [
      { label: "Hotel Lodging & Accommodation", val: b.hotel || (duration * 2000) },
      { label: "Food & Dining Expenses", val: b.food || (duration * 800 * numPeople) },
      { label: "Transit Fare / Fuel & Highway Tolls", val: b.fuel || 1500 },
      { label: "Local Sightseeing Transportation", val: b.transport || (duration * 1000) },
      { label: "Activity Entry Tickets & Guides", val: b.activities || (duration * 500) },
      { label: "Shopping & Souvenirs Allowance", val: b.shopping || (numPeople * 1000) },
      { label: "Emergency Buffer Fund (8% Recommended)", val: b.emergency || Math.round(totalCost * 0.08) }
    ];

    // Table Header
    doc.setFillColor(241, 245, 249); // slate-100
    doc.rect(margin, currentY, contentWidth, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);
    doc.text("Expense Category", margin + 4, currentY + 5.5);
    doc.text("Estimated Cost (INR)", pageWidth - margin - 4, currentY + 5.5, { align: 'right' });
    currentY += 8;

    // Table Rows
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);

    budgetItems.forEach((item, index) => {
      // Row zebra stripe
      if (index % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, currentY, contentWidth, 7, 'F');
      }
      doc.text(item.label, margin + 4, currentY + 4.5);
      doc.text(`Rs. ${Math.round(item.val).toLocaleString('en-IN')}`, pageWidth - margin - 4, currentY + 4.5, { align: 'right' });
      currentY += 7;
    });

    // Total Highlight Row
    doc.setFillColor(236, 253, 245); // emerald-50
    doc.rect(margin, currentY, contentWidth, 9, 'F');
    doc.setDrawColor(16, 185, 129); // emerald-500
    doc.setLineWidth(0.5);
    doc.line(margin, currentY, pageWidth - margin, currentY);
    doc.line(margin, currentY + 9, pageWidth - margin, currentY + 9);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(6, 95, 70); // emerald-800
    doc.text("Grand Total Estimated Cost (Full Group)", margin + 4, currentY + 6);
    doc.text(`Rs. ${Math.round(totalCost).toLocaleString('en-IN')}`, pageWidth - margin - 4, currentY + 6, { align: 'right' });
    
    currentY += 15;

    // Weather Summary section if available
    if (structured.hero?.weather) {
      checkSpace(30);
      doc.setFillColor(254, 243, 199); // amber-100
      doc.setDrawColor(245, 158, 11); // amber-500
      doc.setLineWidth(0.5);
      doc.rect(margin, currentY, contentWidth, 18, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(146, 64, 14); // amber-800
      doc.text(`Live Travel Weather Advisory: ${clean(structured.hero.weather.temp)} (${clean(structured.hero.weather.condition)})`, margin + 4, currentY + 5.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(180, 83, 9);
      
      const adviceLines = doc.splitTextToSize(clean(structured.hero.weather.advice || "Enjoy clear skies and pack light cottons."), contentWidth - 8);
      let adviceY = currentY + 10;
      adviceLines.forEach((l: string) => {
        doc.text(l, margin + 4, adviceY);
        adviceY += 4;
      });
      currentY += 24;
    }

    // 5. DAY-BY-DAY DETAILS
    checkSpace(30);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 128);
    doc.text("Day-by-Day Travel Schedule", margin, currentY);
    currentY += 8;

    // Day 0 Transit
    if (structured.day0) {
      checkSpace(40);
      doc.setFillColor(241, 245, 249);
      doc.rect(margin, currentY, contentWidth, 7, 'F');
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(30, 41, 59);
      doc.text("Day 0: Outbound Transit & Departure Journey", margin + 4, currentY + 4.8);
      currentY += 10;

      const items0 = [
        `Route Path: ${clean(structured.day0.route || `${startLocation} to ${location}`)}`,
        `Departure recommended: ${clean(structured.day0.departureTime, "06:00 AM")} | Distance: ${clean(structured.day0.distance)} | Driving: ${clean(structured.day0.drivingTime)}`,
        `Transit stops suggestion: Breakfast - ${clean(structured.day0.breakfastStop)} | Lunch - ${clean(structured.day0.lunchStop)}`,
        `Accommodation lodging check-in: ${clean(structured.day0.hotelCheckIn)}`,
        `Dinner suggestion: ${clean(structured.day0.dinner)}`
      ];

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(51, 65, 85);
      items0.forEach((text) => {
        const lines = doc.splitTextToSize(text, contentWidth - 6);
        lines.forEach((line: string) => {
          checkSpace(5);
          doc.text("• " + line, margin + 4, currentY);
          currentY += 4.5;
        });
      });
      currentY += 4;
    }

    // Standard Days
    if (structured.days && Array.isArray(structured.days)) {
      structured.days.forEach((day: any) => {
        checkSpace(40);
        
        // Day Banner
        doc.setFillColor(0, 0, 128); // Deep Blue Banner
        doc.rect(margin, currentY, contentWidth, 7.5, 'F');
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9.5);
        doc.setTextColor(255, 255, 255);
        doc.text(`DAY ${day.dayNum}: ${clean(day.title, "Sightseeing Plan")}`, margin + 4, currentY + 5);
        currentY += 11;

        // Morning
        if (day.morning) {
          checkSpace(25);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(9);
          doc.setTextColor(30, 144, 255); // Sky Blue
          doc.text("Morning Activity & Sights", margin + 2, currentY);
          currentY += 4.5;

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8.5);
          doc.setTextColor(15, 23, 42);
          doc.text(`Place: ${clean(day.morning.place?.name || "Sightseeing attraction")}`, margin + 4, currentY);
          currentY += 4;

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          doc.setTextColor(71, 85, 105);
          
          const details = [
            `Timings: ${clean(day.morning.place?.opening)} - ${clean(day.morning.place?.closing)} | Entry Fee: ${clean(day.morning.place?.fee)}`,
            `Transit navigation: ${clean(day.morning.place?.navigation)} | Washrooms: ${clean(day.morning.place?.washroom, "Available")}`,
            `Recommended breakfast: ${clean(day.morning.breakfast, "Local local breakfast stall")}`,
            `Signature photography spot: ${clean(day.morning.place?.photoSpot || "Main entrance view")}`,
            `Travolor Sightseeing Tip: ${clean(day.morning.place?.aiTips || "Reach early to avoid queues.")}`
          ];

          details.forEach((det) => {
            const lines = doc.splitTextToSize(det, contentWidth - 8);
            lines.forEach((l: string) => {
              checkSpace(4.5);
              doc.text("  - " + l, margin + 4, currentY);
              currentY += 4;
            });
          });
          currentY += 2.5;
        }

        // Afternoon
        if (day.afternoon) {
          checkSpace(25);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(9);
          doc.setTextColor(30, 144, 255); // Sky Blue
          doc.text("Afternoon Activity & Lunch", margin + 2, currentY);
          currentY += 4.5;

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8.5);
          doc.setTextColor(15, 23, 42);
          doc.text(`Place: ${clean(day.afternoon.place?.name || "Sightseeing attraction")}`, margin + 4, currentY);
          currentY += 4;

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          doc.setTextColor(71, 85, 105);
          
          const details = [
            `Timings: ${clean(day.afternoon.place?.opening)} - ${clean(day.afternoon.place?.closing)} | Entry Fee: ${clean(day.afternoon.place?.fee)}`,
            `Lunch Suggestion: ${clean(day.afternoon.lunch, "Authentic regional lunch outlet")}`,
            `Local Souvenirs / Markets: ${clean(day.afternoon.shopping || "Main traditional bazaar near center")}`,
            `Travolor Sightseeing Tip: ${clean(day.afternoon.place?.aiTips || "Stay hydrated during afternoon hours.")}`
          ];

          details.forEach((det) => {
            const lines = doc.splitTextToSize(det, contentWidth - 8);
            lines.forEach((l: string) => {
              checkSpace(4.5);
              doc.text("  - " + l, margin + 4, currentY);
              currentY += 4;
            });
          });
          currentY += 2.5;
        }

        // Evening
        if (day.evening) {
          checkSpace(20);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(9);
          doc.setTextColor(30, 144, 255); // Sky Blue
          doc.text("Evening & Sunset Experience", margin + 2, currentY);
          currentY += 4.5;

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          doc.setTextColor(71, 85, 105);
          
          const details = [
            `Sunset Spot: ${clean(day.evening.sunsetPoint || "Scenic Overlook Point")}`,
            `Street Food snacks to try: ${clean(day.evening.streetFood || "Famous regional snacks and beverages")}`,
            `Night vibe / walk: ${clean(day.evening.nightWalk || "Stroll around nicely illuminated city markets")}`
          ];

          details.forEach((det) => {
            const lines = doc.splitTextToSize(det, contentWidth - 8);
            lines.forEach((l: string) => {
              checkSpace(4.5);
              doc.text("  - " + l, margin + 4, currentY);
              currentY += 4;
            });
          });
          currentY += 4;
        }
      });
    }

    // Last Day Checkout
    if (structured.lastDay) {
      checkSpace(35);
      doc.setFillColor(241, 245, 249);
      doc.rect(margin, currentY, contentWidth, 7.5, 'F');
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(30, 41, 59);
      doc.text(`DAY ${duration}: Stay Checkout & Return Home Journey`, margin + 4, currentY + 5);
      currentY += 10;

      const details = [
        `Hotel Lodging Checkout: ${clean(structured.lastDay.hotelCheckout)}`,
        `Last-Minute Shopping & Souvenirs: ${clean(structured.lastDay.shopping)}`,
        `Midday regional Lunch: ${clean(structured.lastDay.lunch)}`,
        `Return transit pathway: ${clean(structured.lastDay.returnJourney)}`,
        `Arrival City: Reach back at ${clean(structured.lastDay.arrival || startLocation)} around ${clean(structured.lastDay.reachHome || "evening")}`
      ];

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(51, 65, 85);
      details.forEach((det) => {
        const lines = doc.splitTextToSize(det, contentWidth - 6);
        lines.forEach((l: string) => {
          checkSpace(5);
          doc.text("• " + l, margin + 4, currentY);
          currentY += 4.5;
        });
      });
    }

    // Pre-Trip Checklist & Emergency Helpline
    if (structured.checklist || structured.emergencyContacts) {
      checkSpace(45);
      doc.setFillColor(254, 242, 242); // rose-50
      doc.setDrawColor(251, 113, 133); // rose-400
      doc.setLineWidth(0.3);
      doc.rect(margin, currentY, contentWidth, 30, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(159, 18, 57); // rose-900
      doc.text("Pre-Trip Preparations & Helpdesk Info", margin + 4, currentY + 5.5);
      currentY += 10;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(190, 24, 74);

      if (structured.checklist && Array.isArray(structured.checklist)) {
        const items = structured.checklist.slice(0, 3).map((item: any) => clean(item.item || item));
        doc.text("Packing Prep: " + items.join(" | "), margin + 4, currentY);
        currentY += 5;
      } else {
        doc.text("Packing Prep: Carry physical IDs, booking vouchers, and comfortable outfits.", margin + 4, currentY);
        currentY += 5;
      }

      if (structured.emergencyContacts) {
        const ec = structured.emergencyContacts;
        doc.text(`Emergency Contacts: Tourist Help - ${clean(ec.touristHelpline || "1363")} | Hospital - ${clean(ec.hospitalNearHotel || "102")} | Police - ${clean(ec.policeStation || "100")}`, margin + 4, currentY);
        currentY += 5;
      }
    }

  } else {
    // FALLBACK IF STRUCTURED ITINERARY DOES NOT EXIST (RAW TEXT PARSING)
    checkSpace(30);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 128);
    doc.text("Travel Itinerary & Activity Breakdown", margin, currentY);
    currentY += 8;

    // Simple Markdown to PDF lines splitting
    const rawParagraphs = itineraryText.split("\n");
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(51, 65, 85);

    rawParagraphs.forEach((paragraph) => {
      const trimmed = paragraph.trim();
      if (!trimmed) return;

      if (trimmed.startsWith("###") || trimmed.startsWith("##") || trimmed.startsWith("#")) {
        // Heading
        const headingText = trimmed.replace(/^#+\s*/, "");
        checkSpace(12);
        currentY += 3;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10.5);
        doc.setTextColor(0, 0, 128);
        doc.text(clean(headingText), margin, currentY);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(51, 65, 85);
        currentY += 6;
      } else if (trimmed.startsWith("-") || trimmed.startsWith("*")) {
        // List item
        const listText = trimmed.replace(/^[-*]\s*/, "");
        const lines = doc.splitTextToSize(clean(listText), contentWidth - 6);
        lines.forEach((line: string) => {
          checkSpace(5);
          doc.text("• " + line, margin + 4, currentY);
          currentY += 4.5;
        });
        currentY += 1.5;
      } else {
        // Plain paragraph
        const lines = doc.splitTextToSize(clean(trimmed), contentWidth);
        lines.forEach((line: string) => {
          checkSpace(5);
          doc.text(line, margin, currentY);
          currentY += 4.5;
        });
        currentY += 2.5;
      }
    });
  }

  // Generate page numbers / footer vectors on all pages
  drawFooter();

  // Create Blob URL for failsafe download & viewing
  const safeFilename = `itinerary-${clean(location, "travel").toLowerCase().replace(/[^a-z0-9]/g, "-")}.pdf`;
  let blobUrl = "";
  try {
    const blob = doc.output('blob');
    blobUrl = URL.createObjectURL(blob);
  } catch (err) {
    console.error("Failed to generate PDF Blob:", err);
    removeLoading();
    doc.save(safeFilename);
    return;
  }

  removeLoading();

  // Localized texts
  let title = "PDF Export Assistant";
  let subtitle = "Travolor swadesh travel co-pilot";
  let promptText = `Your beautifully formatted travel itinerary PDF for <strong>${clean(location)}</strong> is compiled!`;
  let alertTitle = "Iframe / Mobile App Alert:";
  let alertDesc = "If you are using a mobile device or the preview mode, some browsers block automatic downloads. Please use <strong>\"Open in New Tab\"</strong> if the download button does not respond.";
  let btnDlText = "Direct Download";
  let btnTabText = "Open in New Tab";
  let btnCloseText = "Dismiss";

  if (isMarathi) {
    title = "PDF डाऊनलोड असिस्टंट";
    subtitle = "ट्रॅव्होलर स्वदेश ट्रॅव्हल को-पायलट";
    promptText = `तुमची <strong>${clean(location)}</strong> ची सुंदर ट्रॅव्हल टूर पीडीएफ तयार आहे!`;
    alertTitle = "महत्त्वाची सूचना (Mobile & Browser Users):";
    alertDesc = "जर थेट डाऊनलोड बटण काम करत नसेल (मोबाईल किंवा प्रिव्ह्यू आयफ्रेममुळे), तर कृपया <strong>\"नवीन टॅबमध्ये उघडा\" (Open in New Tab)</strong> वर क्लिक करा. तिथे तुम्ही सहज सेव्ह करू शकता.";
    btnDlText = "थेट डाऊनलोड करा";
    btnTabText = "नवीन टॅबमध्ये उघडा (Open in New Tab)";
    btnCloseText = "रद्द करा / बंद करा";
  } else if (isHindi) {
    title = "PDF डाउनलोड असिस्टेंट";
    subtitle = "ट्रैवलर स्वदेश ट्रैवल को-पायलट";
    promptText = `आपकी <strong>${clean(location)}</strong> की सुंदर ट्रैवल टूर पीडीएफ तैयार है!`;
    alertTitle = "महत्वपूर्ण सूचना (Mobile & Browser Users):";
    alertDesc = "यदि मोबाइल या आईफ्रेम प्रतिबंधों के कारण डाउनलोड शुरू नहीं होता है, तो कृपया <strong>\"नए टैब में खोलें\" (Open in New Tab)</strong> पर क्लिक करें और वहां से सेव करें।";
    btnDlText = "सीधे डाउनलोड करें";
    btnTabText = "नए टैब में खोलें (Open in New Tab)";
    btnCloseText = "रद्द करें / बंद करें";
  }

  // Create backdrop container
  const backdrop = document.createElement('div');
  backdrop.id = 'travolor-pdf-modal';
  backdrop.className = 'fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-all duration-300';
  backdrop.style.opacity = '0';

  // Modal Card HTML
  backdrop.innerHTML = `
    <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl border border-slate-100 dark:border-slate-800 text-left relative transform scale-95 opacity-0 transition-all duration-300" id="travolor-pdf-card" style="font-family: system-ui, -apple-system, sans-serif;">
      <!-- Close icon button top right -->
      <button id="btn-close-pdf-x" class="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>

      <!-- Icon & Header -->
      <div class="flex items-center gap-4 mb-5">
        <div class="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center text-[#000080] dark:text-blue-400 shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>
        </div>
        <div>
          <h3 class="text-lg font-bold text-slate-900 dark:text-white leading-tight">${title}</h3>
          <p class="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 font-bold tracking-wider uppercase">${subtitle}</p>
        </div>
      </div>

      <!-- Description -->
      <div class="space-y-3 mb-6 text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
        <p>${promptText}</p>
        <div class="p-4 bg-amber-50 dark:bg-amber-950/20 rounded-2xl text-xs text-amber-800 dark:text-amber-300 border border-amber-100/70 dark:border-amber-900/30 flex items-start gap-2.5">
          <svg class="shrink-0 mt-0.5 text-amber-600 dark:text-amber-500" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          <div>
            <p class="font-bold mb-0.5 text-amber-900 dark:text-amber-200">${alertTitle}</p>
            <p class="opacity-95 leading-normal text-amber-800/90 dark:text-amber-300/90">${alertDesc}</p>
          </div>
        </div>
      </div>

      <!-- Buttons Grid -->
      <div class="space-y-3">
        <button id="btn-direct-dl" class="w-full bg-[#000080] hover:bg-[#000080]/90 text-white font-bold py-3.5 px-5 rounded-2xl shadow-sm hover:shadow-md active:scale-[0.98] transition-all text-sm flex items-center justify-center gap-2.5 cursor-pointer">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          ${btnDlText}
        </button>
        
        <button id="btn-new-tab" class="w-full bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-950/60 text-[#000080] dark:text-blue-300 font-bold py-3.5 px-5 rounded-2xl active:scale-[0.98] transition-all text-sm flex items-center justify-center gap-2.5 cursor-pointer border border-blue-100/50 dark:border-blue-900/20">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>
          ${btnTabText}
        </button>

        <button id="btn-close-pdf" class="w-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-300 font-bold py-3 px-4 rounded-2xl transition-all text-xs cursor-pointer">
          ${btnCloseText}
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(backdrop);

  // Trigger animations
  setTimeout(() => {
    backdrop.style.opacity = '1';
    const card = document.getElementById('travolor-pdf-card');
    if (card) {
      card.style.transform = 'scale(1)';
      card.style.opacity = '1';
    }
  }, 50);

  // Function to remove modal
  const destroyModal = () => {
    const card = document.getElementById('travolor-pdf-card');
    if (card) {
      card.style.transform = 'scale(0.95)';
      card.style.opacity = '0';
    }
    backdrop.style.opacity = '0';
    setTimeout(() => {
      if (document.body.contains(backdrop)) {
        document.body.removeChild(backdrop);
      }
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    }, 300);
  };

  // Add click listeners
  document.getElementById('btn-close-pdf')?.addEventListener('click', destroyModal);
  document.getElementById('btn-close-pdf-x')?.addEventListener('click', destroyModal);
  
  // Close on backdrop click (outside card)
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) {
      destroyModal();
    }
  });

  // Direct download
  document.getElementById('btn-direct-dl')?.addEventListener('click', () => {
    try {
      // Create hidden download link
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = safeFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error("Direct download failed, falling back to doc.save:", e);
      doc.save(safeFilename);
    }
  });

  // Open in new tab
  document.getElementById('btn-new-tab')?.addEventListener('click', () => {
    window.open(blobUrl, '_blank');
  });
}
