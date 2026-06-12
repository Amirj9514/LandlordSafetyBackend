const PDFDocument = require('pdfkit');
const { formatServiceDetailsText } = require('./lineItemDetails');

const COLORS = {
  ink: '#0f172a',
  muted: '#6b7280',
  border: '#e5eaf3',
  panel: '#f3f7ff',
  panelHeader: '#e8f0ff',
  header: '#0f172b',
  accent: '#2563eb',
  success: '#12b76a',
  warning: '#f59e0b',
  white: '#ffffff',
};

const PAGE = {
  margin: 8,
  padding: 14,
  radius: 10,
  headerHeight: 66,
  footerHeight: 76,
};

const TIME_SLOT_LABELS = {
  morning: 'Morning (8AM - 12PM)',
  afternoon: 'Afternoon (12PM - 5PM)',
};

const STATUS_LABELS = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const PAYMENT_BADGES = {
  paid: { label: 'PAID', color: COLORS.success },
  unpaid: { label: 'UNPAID', color: COLORS.warning },
};

const formatCurrency = (value) => `GBP ${Number(value || 0).toFixed(2)}`;

const formatDate = (value, { month = 'short' } = {}) => {
  if (!value) return '-';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month,
    year: 'numeric',
  }).format(date);
};

const formatTimeSlot = (value) => TIME_SLOT_LABELS[value] || value || '-';

const formatStatus = (value) => STATUS_LABELS[value] || value || '-';

const formatVatLabel = (subtotal, vat) => {
  if (!subtotal || !vat) return 'VAT (0%)';
  const rate = Math.round((Number(vat) / Number(subtotal)) * 100);
  if (!Number.isFinite(rate)) return 'VAT';
  return `VAT (${rate}%)`;
};

const getPageBounds = (doc) => ({
  x: PAGE.margin,
  y: PAGE.margin,
  width: doc.page.width - PAGE.margin * 2,
  height: doc.page.height - PAGE.margin * 2,
});

const drawPageChrome = (doc) => {
  const bounds = getPageBounds(doc);

  doc
    .roundedRect(bounds.x, bounds.y, bounds.width, bounds.height, PAGE.radius)
    .fillAndStroke(COLORS.white, COLORS.border);

  doc
    .roundedRect(bounds.x, bounds.y, bounds.width, PAGE.headerHeight, PAGE.radius)
    .fill(COLORS.header);

  doc
    .rect(bounds.x, bounds.y + PAGE.headerHeight - PAGE.radius, bounds.width, PAGE.radius + 2)
    .fill(COLORS.header);

  return bounds;
};

const drawHeader = (doc, bounds, data) => {
  const leftX = bounds.x + PAGE.padding;
  const rightWidth = 200;
  const rightX = bounds.x + bounds.width - PAGE.padding - rightWidth;
  const headerTop = bounds.y + 14;
  const badge = PAYMENT_BADGES[data.paymentStatus] || PAYMENT_BADGES.unpaid;
  const badgeWidth = 38;
  const badgeHeight = 14;

  doc.fillColor(COLORS.white).font('Helvetica-Bold').fontSize(20).text('Landlord Safety', leftX, headerTop);
  doc
    .fillColor('#9da8bc')
    .font('Helvetica')
    .fontSize(7)
    .text(
      'Professional compliance certificates and\nmaintenance for residential property managers.',
      leftX,
      headerTop + 22
    );

  doc.roundedRect(rightX + rightWidth - badgeWidth, headerTop - 2, badgeWidth, badgeHeight, 7).fill(badge.color);
  doc
    .fillColor(COLORS.white)
    .font('Helvetica-Bold')
    .fontSize(6)
    .text(badge.label, rightX + rightWidth - badgeWidth, headerTop + 2.5, {
      width: badgeWidth,
      align: 'center',
    });

  doc
    .fillColor(COLORS.white)
    .font('Helvetica-Bold')
    .fontSize(11)
    .text(`Invoice: ${data.reference}`, rightX, headerTop + 20, {
      width: rightWidth,
      align: 'right',
    });
  doc
    .fillColor('#9da8bc')
    .font('Helvetica')
    .fontSize(7)
    .text(`Issued: ${formatDate(data.generatedAt)}`, rightX, headerTop + 34, {
      width: rightWidth,
      align: 'right',
    });
};

const drawInfoLabel = (doc, text, x, y) => {
  doc.fillColor(COLORS.muted).font('Helvetica-Bold').fontSize(5.8).text(text.toUpperCase(), x, y);
};

const drawInfoValue = (doc, text, x, y, options = {}) => {
  doc.fillColor(COLORS.ink).font('Helvetica').fontSize(8.5).text(text || '-', x, y, options);
};

const drawDetailsCards = (doc, bounds, data) => {
  const gap = 12;
  const top = bounds.y + PAGE.headerHeight + 16;
  const cardHeight = 84;
  const cardWidth = (bounds.width - PAGE.padding * 2 - gap) / 2;
  const leftX = bounds.x + PAGE.padding;
  const rightX = leftX + cardWidth + gap;

  doc.roundedRect(leftX, top, cardWidth, cardHeight, 6).fill(COLORS.panel);
  doc.roundedRect(rightX, top, cardWidth, cardHeight, 6).fill(COLORS.panel);

  drawInfoLabel(doc, 'Bill To', leftX + 12, top + 10);
  doc.fillColor(COLORS.ink).font('Helvetica-Bold').fontSize(9.5).text(data.customerName || '-', leftX + 12, top + 24);

  const billToLines = [data.email, data.phone]
    .concat(data.appointmentAddress ? String(data.appointmentAddress).split(/\r?\n|,\s*/).filter(Boolean) : [])
    .concat(data.postcode || [])
    .filter(Boolean);

  drawInfoValue(doc, billToLines.join('\n'), leftX + 12, top + 38, { width: cardWidth - 24 });

  drawInfoLabel(doc, 'Booking Details', rightX + 12, top + 10);
  drawInfoLabel(doc, 'Booking Ref', rightX + 12, top + 28);
  doc.fillColor(COLORS.ink).font('Helvetica-Bold').fontSize(10).text(data.bookingReference || '-', rightX + 12, top + 38);

  drawInfoLabel(doc, 'Status', rightX + cardWidth / 2 + 6, top + 28);
  doc
    .fillColor(COLORS.accent)
    .font('Helvetica-Bold')
    .fontSize(10)
    .text(formatStatus(data.bookingStatus), rightX + cardWidth / 2 + 6, top + 38);

  drawInfoLabel(doc, 'Preferred Date', rightX + 12, top + 56);
  doc
    .fillColor(COLORS.ink)
    .font('Helvetica-Bold')
    .fontSize(9)
    .text(formatDate(data.preferredDate), rightX + 12, top + 66);

  drawInfoLabel(doc, 'Preferred Slot', rightX + cardWidth / 2 + 6, top + 56);
  doc
    .fillColor(COLORS.ink)
    .font('Helvetica-Bold')
    .fontSize(8.5)
    .text(formatTimeSlot(data.preferredTimeSlot), rightX + cardWidth / 2 + 6, top + 66, {
      width: cardWidth / 2 - 18,
    });

  return top + cardHeight + 14;
};

const drawTableHeader = (doc, x, y, columnXs, widths) => {
  doc.roundedRect(x, y, widths.total, 16, 4).fill(COLORS.panelHeader);

  doc.fillColor(COLORS.ink).font('Helvetica-Bold').fontSize(6.2);
  doc.text('DESCRIPTION & SERVICE', columnXs.description, y + 4, { width: widths.description });
  doc.text('QTY', columnXs.qty, y + 4, { width: widths.qty, align: 'center' });
  doc.text('UNIT PRICE', columnXs.unitPrice, y + 4, { width: widths.unitPrice, align: 'right' });
  doc.text('TOTAL', columnXs.total, y + 4, { width: widths.totalAmount, align: 'right' });

  return y + 22;
};

const getLineSubtitle = (line) => {
  const parts = [];
  if (line.subDescription) parts.push(line.subDescription);
  else if (line.serviceName) parts.push(line.serviceName);

  const selectionText = formatServiceDetailsText(line.serviceDetails);
  if (selectionText && !parts.includes(selectionText)) {
    parts.push(selectionText);
  }

  return parts.join(' — ');
};

const drawTableRows = (doc, x, startY, data, bounds) => {
  const totalWidth = bounds.width - PAGE.padding * 2;
  const widths = {
    total: totalWidth,
    description: totalWidth - 44 - 96 - 96,
    qty: 44,
    unitPrice: 96,
    totalAmount: 96,
  };
  const columnXs = {
    description: x + 8,
    qty: x + widths.description,
    unitPrice: x + widths.description + widths.qty,
    total: x + widths.description + widths.qty + widths.unitPrice,
  };
  const rowLimitY = bounds.y + bounds.height - PAGE.footerHeight - 90;
  let y = drawTableHeader(doc, x, startY, columnXs, widths);

  for (const line of data.lineItems) {
    const subtitle = getLineSubtitle(line);
    const descriptionHeight = doc.heightOfString(line.description || '-', {
      width: widths.description - 16,
      align: 'left',
    });
    const subtitleHeight = subtitle
      ? doc.heightOfString(subtitle, {
          width: widths.description - 16,
          align: 'left',
        })
      : 0;
    const rowHeight = Math.max(28, descriptionHeight + subtitleHeight + 14);

    if (y + rowHeight > rowLimitY) {
      doc.addPage({ size: 'A4', margin: 0 });
      const nextBounds = drawPageChrome(doc);
      y = drawTableHeader(doc, nextBounds.x + PAGE.padding, nextBounds.y + PAGE.padding, columnXs, widths);
    }

    doc.moveTo(x, y + rowHeight).lineTo(x + widths.total, y + rowHeight).strokeColor(COLORS.border).lineWidth(1).stroke();

    doc.fillColor(COLORS.ink).font('Helvetica-Bold').fontSize(8.2).text(line.description || '-', columnXs.description, y + 6, {
      width: widths.description - 16,
    });

    if (subtitle) {
      doc.fillColor(COLORS.muted).font('Helvetica').fontSize(6.6).text(subtitle, columnXs.description, y + 18, {
        width: widths.description - 16,
      });
    }

    doc.fillColor(COLORS.ink).font('Helvetica').fontSize(8.2).text(String(line.quantity || 1), columnXs.qty, y + 8, {
      width: widths.qty,
      align: 'center',
    });
    doc.text(formatCurrency(line.unitPrice), columnXs.unitPrice, y + 8, {
      width: widths.unitPrice - 10,
      align: 'right',
    });
    doc.font('Helvetica-Bold').text(formatCurrency(line.total), columnXs.total, y + 8, {
      width: widths.totalAmount - 10,
      align: 'right',
    });

    y += rowHeight;
  }

  return y;
};

const drawTotals = (doc, bounds, data, y) => {
  const footerTop = bounds.y + bounds.height - PAGE.footerHeight;
  const totalsY = Math.min(Math.max(y + 10, footerTop - 118), footerTop - 118);
  const blockWidth = 190;
  const blockX = bounds.x + bounds.width - PAGE.padding - blockWidth;
  const labelX = blockX - 72;
  const totalBoxY = totalsY + 48;

  doc.fillColor(COLORS.ink).font('Helvetica').fontSize(9);
  doc.text('Subtotal', labelX, totalsY + 4, { width: 70, align: 'right' });
  doc.font('Helvetica-Bold').text(formatCurrency(data.subtotal), blockX, totalsY + 4, {
    width: blockWidth - 10,
    align: 'right',
  });

  doc.font('Helvetica').text(formatVatLabel(data.subtotal, data.vat), labelX, totalsY + 28, {
    width: 70,
    align: 'right',
  });
  doc.font('Helvetica-Bold').text(formatCurrency(data.vat), blockX, totalsY + 28, {
    width: blockWidth - 10,
    align: 'right',
  });

  doc.roundedRect(blockX, totalBoxY, blockWidth, 30, 4).fill(COLORS.panelHeader);
  doc.fillColor(COLORS.ink).font('Helvetica').fontSize(10).text('Total Amount', blockX + 8, totalBoxY + 10);
  doc.font('Helvetica-Bold').text(formatCurrency(data.total), blockX, totalBoxY + 10, {
    width: blockWidth - 10,
    align: 'right',
  });
};

const drawFooter = (doc, bounds, data) => {
  const footerTop = bounds.y + bounds.height - PAGE.footerHeight;

  doc.moveTo(bounds.x, footerTop).lineTo(bounds.x + bounds.width, footerTop).strokeColor(COLORS.border).lineWidth(1).stroke();

  doc.fillColor(COLORS.muted).font('Helvetica').fontSize(6.4).text(
    `© ${new Date(data.generatedAt).getFullYear()} ProBlock Management Suite. All rights reserved.`,
    bounds.x + PAGE.padding,
    footerTop + 14
  );
  doc.text('Privacy Policy    Terms of Service', bounds.x + bounds.width - 150 - PAGE.padding, footerTop + 14, {
    width: 150,
    align: 'right',
  });

  doc.fillColor(COLORS.ink).font('Helvetica-Bold').fontSize(7).text(
    'PAYMENT INFORMATION',
    bounds.x,
    footerTop + 42
  );
  doc.fillColor(COLORS.muted).font('Helvetica-Oblique').fontSize(7).text(
    data.paymentStatus === 'paid'
      ? `Please quote invoice number ${data.reference} when making enquiries. This invoice was automatically paid via the registered payment method.`
      : `Please quote invoice number ${data.reference} when making enquiries. Payment is due according to the registered booking terms.`,
    bounds.x,
    footerTop + 54,
    { width: bounds.width }
  );
};

const generateInvoicePdf = async (data) =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 0 });
    const chunks = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const bounds = drawPageChrome(doc);
    drawHeader(doc, bounds, data);
    const rowsStartY = drawDetailsCards(doc, bounds, data);
    const rowsEndY = drawTableRows(doc, bounds.x + PAGE.padding, rowsStartY, data, bounds);
    drawTotals(doc, bounds, data, rowsEndY);
    drawFooter(doc, bounds, data);

    doc.end();
  });

module.exports = {
  generateInvoicePdf,
};
