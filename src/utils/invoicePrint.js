function fmt(n) {
  if (n == null) return "0.00";
  return Number(n || 0)
    .toFixed(2)
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function fmtDate(dateStr) {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function filenameSafe(value) {
  return String(value || "invoice")
    .replace(/[^\w.-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function buildInvoicePrintHtml(invoice, garage = {}) {
  const customer = invoice.customerId || {};
  const vehicle = invoice.vehicleId || null;
  const garageName =
    garage.garageName || invoice.garageId?.garageName || "Garage";
  const garageAddr = garage.garageAddress || "";
  const garagePhone = garage.garageContactNumber || "";
  const garageGst = garage.gstNumber || "";
  const subTotal =
    (Number(invoice.servicesSubTotal) || 0) + (Number(invoice.partsSubTotal) || 0);
  const isPaid = invoice.paymentStatus === "paid";
  const isPartial = invoice.paymentStatus === "partial";
  const payChipColor = isPaid ? "#1D9E75" : isPartial ? "#BA7517" : "#E24B4A";
  const payChipBg = isPaid ? "#E1F5EE" : isPartial ? "#FFFBEB" : "#FEF2F2";
  const stampColor = isPaid ? "#1D9E75" : "#E24B4A";
  const stampText = isPaid ? "PAID" : "UNPAID";
  const payMode = escapeHtml(
    (invoice.paymentMode || "cash").replace(/_/g, " ").toUpperCase(),
  );
  const payStatus = escapeHtml((invoice.paymentStatus || "unpaid").toUpperCase());

  const logoHtml = garage.garageLogo
    ? `<img src="${escapeHtml(garage.garageLogo)}" class="logo" />`
    : `<div class="logo-fallback">${escapeHtml(garageName.charAt(0).toUpperCase())}</div>`;

  const serviceRows = (invoice.services || [])
    .map(
      (s, i) => `<div class="row ${i % 2 ? "alt" : ""}">
        <span class="name">${escapeHtml(s.name)}</span>
        <span class="qty">1</span>
        <span class="num">&#8377;${fmt(s.price ?? s.lineTotal)}</span>
        <span class="num">&#8377;${fmt(s.lineTotal)}</span>
      </div>`,
    )
    .join("");

  const partRows = (invoice.parts || [])
    .map(
      (p, i) => `<div class="row ${i % 2 ? "alt" : ""}">
        <span class="name">${escapeHtml(p.name)}</span>
        <span class="qty">${escapeHtml(p.quantity ?? 1)}</span>
        <span class="num">&#8377;${fmt(p.unitPrice)}</span>
        <span class="num">&#8377;${fmt(p.lineTotal)}</span>
      </div>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(invoice.invoiceNo || "Invoice")}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: #f0f2f5;
      color: #1a1a1a;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
      padding: 24px;
    }
    .stamp {
      position: fixed;
      top: 42%;
      right: 8%;
      transform: rotate(-28deg);
      font-size: 68px;
      font-weight: 900;
      letter-spacing: 6px;
      opacity: 0.07;
      border: 8px solid ${stampColor};
      border-radius: 10px;
      padding: 8px 20px;
      color: ${stampColor};
      z-index: 0;
      pointer-events: none;
    }
    .invoice-card {
      position: relative;
      z-index: 1;
      max-width: 720px;
      margin: 0 auto 16px;
      background: #fff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 20px rgba(0,0,0,0.10);
    }
    .invoice-title {
      padding: 12px;
      text-align: center;
      font-size: 18px;
      font-weight: 700;
      letter-spacing: 2px;
      border-bottom: 1px solid #e0e0e0;
    }
    .garage-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      padding: 16px;
      border-bottom: 1px solid #e0e0e0;
    }
    .logo, .logo-fallback {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      flex: 0 0 60px;
      object-fit: cover;
    }
    .logo-fallback {
      display: flex;
      align-items: center;
      justify-content: center;
      background: #1d9e75;
      color: #fff;
      font-size: 24px;
      font-weight: 800;
    }
    .garage-name { font-size: 13px; font-weight: 700; letter-spacing: 0.5px; text-align: right; }
    .garage-detail { font-size: 11px; color: #555; margin-top: 2px; text-align: right; }
    .band {
      display: flex;
      background: #bdd7ee;
      padding: 7px 10px;
      border-top: 1px solid #9dc3e6;
      border-bottom: 1px solid #9dc3e6;
    }
    .head { font-size: 10px; font-weight: 700; color: #1a3a5c; letter-spacing: 0.5px; }
    .info-row {
      display: flex;
      gap: 12px;
      padding: 10px;
      border-bottom: 1px solid #e8e8e8;
    }
    .info-name { font-size: 12px; font-weight: 600; margin-bottom: 2px; }
    .info-detail { font-size: 11px; color: #555; margin-top: 1px; }
    .info-amount { font-size: 13px; font-weight: 700; color: #1d9e75; margin-top: 4px; }
    .row {
      display: flex;
      padding: 7px 10px;
      border-bottom: 1px solid #f0f0f0;
    }
    .row.alt { background: #f8fbff; }
    .name { flex: 4; font-size: 11px; }
    .qty { flex: 1; font-size: 11px; text-align: center; }
    .num { flex: 2; font-size: 11px; text-align: right; }
    .subtotal-row {
      display: flex;
      padding: 7px 10px;
      border-top: 1px solid #b0b0b0;
      background: #f8f8f8;
    }
    .summary { padding: 8px 10px; }
    .summary-row { display: flex; justify-content: space-between; padding: 4px 0; }
    .summary-lbl { font-size: 11px; color: #555; }
    .summary-val { font-size: 11px; font-weight: 500; }
    .grand-row {
      display: flex;
      justify-content: space-between;
      padding-top: 8px;
      margin-top: 4px;
      border-top: 2px solid #1a1a1a;
    }
    .grand-lbl { font-size: 13px; font-weight: 700; }
    .grand-val { font-size: 15px; font-weight: 800; color: #1d9e75; }
    .chips { display: flex; flex-wrap: wrap; gap: 6px; padding: 12px 10px; border-top: 1px solid #e0e0e0; }
    .chip {
      display: inline-flex;
      padding: 4px 12px;
      border-radius: 999px;
      background: #f3f4f6;
      border: 1px solid #e5e7eb;
      font-size: 10px;
      font-weight: 600;
      color: #555;
    }
    .notes {
      margin: 0 10px 10px;
      background: #fffbeb;
      border-radius: 8px;
      padding: 10px 14px;
      border: 1px solid #fde68a;
    }
    .notes-label { font-size: 10px; font-weight: 700; color: #ba7517; margin-bottom: 4px; }
    .notes-text { font-size: 11px; color: #555; }
    .thank-you {
      text-align: center;
      padding: 14px;
      font-size: 11px;
      color: #6b7280;
      border-top: 1px solid #e0e0e0;
    }
    .thank-you b { color: #1d9e75; }
    .empty { padding: 20px; text-align: center; font-size: 13px; color: #9ca3af; }
    @media print {
      body { background: #fff; padding: 0; }
      .invoice-card { box-shadow: none; border-radius: 0; max-width: none; margin: 0; }
    }
  </style>
</head>
<body>
  <div class="stamp">${stampText}</div>
  <div class="invoice-card">
    <div class="invoice-title">INVOICE</div>
    <div class="garage-header">
      ${logoHtml}
      <div>
        <div class="garage-name">${escapeHtml(garageName.toUpperCase())}</div>
        ${garageAddr ? `<div class="garage-detail">${escapeHtml(garageAddr)}</div>` : ""}
        ${garagePhone ? `<div class="garage-detail">&#9742; ${escapeHtml(garagePhone)}</div>` : ""}
        ${garageGst ? `<div class="garage-detail">GST: ${escapeHtml(garageGst)}</div>` : ""}
      </div>
    </div>
    <div class="band">
      <span class="head" style="flex:2;">CUSTOMER</span>
      <span class="head" style="flex:2;">VEHICLE</span>
      <span class="head" style="flex:2;text-align:right;">ESTIMATE</span>
    </div>
    <div class="info-row">
      <div style="flex:2;">
        <div class="info-name">${escapeHtml(customer.fullName || "-")}</div>
        ${customer.phoneNo ? `<div class="info-detail">${escapeHtml(customer.phoneNo)}</div>` : ""}
        ${customer.emailId ? `<div class="info-detail">${escapeHtml(customer.emailId)}</div>` : ""}
      </div>
      <div style="flex:2;">
        ${
          vehicle
            ? `<div class="info-name">${escapeHtml(`${vehicle.vehicleBrand || ""} ${vehicle.vehicleModel || ""}`.trim())}</div>
               ${vehicle.vehicleRegisterNo ? `<div class="info-detail">${escapeHtml(vehicle.vehicleRegisterNo)}</div>` : ""}`
            : `<div class="info-detail">-</div>`
        }
      </div>
      <div style="flex:2;text-align:right;">
        <div class="info-detail">${fmtDate(invoice.createdAt)}</div>
        <div class="info-amount">&#8377;${fmt(invoice.totalAmount)}</div>
      </div>
    </div>
    ${
      (invoice.services || []).length
        ? `<div class="band">
            <span class="head" style="flex:4;">SERVICES</span>
            <span class="head" style="flex:1;text-align:center;">QTY</span>
            <span class="head" style="flex:2;text-align:right;">RATE</span>
            <span class="head" style="flex:2;text-align:right;">AMOUNT</span>
          </div>
          ${serviceRows}
          <div class="subtotal-row">
            <span style="flex:7;font-size:11px;font-weight:700;text-align:right;">Total :</span>
            <span style="flex:2;font-size:11px;font-weight:700;text-align:right;">&#8377;${fmt(invoice.servicesSubTotal)}</span>
          </div>`
        : ""
    }
    ${
      (invoice.parts || []).length
        ? `<div class="band" style="margin-top:8px;">
            <span class="head" style="flex:4;">PARTS</span>
            <span class="head" style="flex:1;text-align:center;">QTY</span>
            <span class="head" style="flex:2;text-align:right;">RATE</span>
            <span class="head" style="flex:2;text-align:right;">AMOUNT</span>
          </div>
          ${partRows}
          <div class="subtotal-row">
            <span style="flex:7;font-size:11px;font-weight:700;text-align:right;">Total :</span>
            <span style="flex:2;font-size:11px;font-weight:700;text-align:right;">&#8377;${fmt(invoice.partsSubTotal)}</span>
          </div>`
        : ""
    }
    ${!(invoice.services || []).length && !(invoice.parts || []).length ? `<div class="empty">No items</div>` : ""}
    <div class="band" style="margin-top:8px;"><span class="head">SUMMARY</span></div>
    <div class="summary">
      <div class="summary-row">
        <span class="summary-lbl">SUB TOTAL:</span>
        <span class="summary-val">&#8377;${fmt(subTotal)}</span>
      </div>
      ${
        (Number(invoice.taxAmount) || 0) > 0
          ? `<div class="summary-row"><span class="summary-lbl">TAX:</span><span class="summary-val">&#8377;${fmt(invoice.taxAmount)}</span></div>`
          : ""
      }
      ${
        (Number(invoice.discountAmount) || 0) > 0
          ? `<div class="summary-row"><span class="summary-lbl">DISCOUNT:</span><span class="summary-val" style="color:#e24b4a;">-&#8377;${fmt(invoice.discountAmount)}</span></div>`
          : ""
      }
      <div class="grand-row">
        <span class="grand-lbl">GRAND TOTAL:</span>
        <span class="grand-val">&#8377;${fmt(invoice.totalAmount)}</span>
      </div>
    </div>
    <div class="chips">
      <span class="chip">${payMode}</span>
      <span class="chip" style="background:${payChipBg};color:${payChipColor};border-color:${payChipColor};">${payStatus}</span>
    </div>
    ${
      invoice.notes
        ? `<div class="notes"><div class="notes-label">Notes</div><div class="notes-text">${escapeHtml(invoice.notes)}</div></div>`
        : ""
    }
    <div class="thank-you">
      <b>Invoice No: ${escapeHtml(invoice.invoiceNo || "-")} &nbsp;·&nbsp; Date: ${fmtDate(invoice.createdAt)}</b><br />
      Thank you for choosing <b>${escapeHtml(garageName)}</b>!
      ${garagePhone ? `For queries, contact us at <b>${escapeHtml(garagePhone)}</b>.` : ""}
    </div>
  </div>
  <script>
    window.addEventListener("load", () => {
      document.title = "${escapeHtml(filenameSafe(invoice.invoiceNo || "invoice"))}";
      setTimeout(() => window.print(), 250);
    });
  </script>
</body>
</html>`;
}

export function printInvoice(invoice, garage = {}, targetWindow = null) {
  const popup = targetWindow || window.open("", "_blank", "noopener,noreferrer");
  if (!popup) {
    throw new Error("Popup blocked. Please allow popups to download the invoice.");
  }
  popup.document.open();
  popup.document.write(buildInvoicePrintHtml(invoice, garage));
  popup.document.close();
}
