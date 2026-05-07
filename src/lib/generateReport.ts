import jsPDF from 'jspdf';
import type { Session, Offering } from '../types';
import type { ChurchUser } from './auth';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const REMITTANCE_STRUCTURE = [
  { label: 'MEMBERS TITHE', key: 'member_tithe', national: 0.58, province: 0, area: 0, zone: 0, parish: 0.42 },
  { label: 'MINISTERS TITHE', key: 'ministers_tithe', national: 0.62, province: 0, area: 0, zone: 0, parish: 0.38 },
  { label: 'THANKSGIVING', key: 'monthly_thanksgiving', national: 0.70, province: 0.05, area: 0.05, zone: 0, parish: 0.19 },
  { label: 'SUNDAY LOVE OFFERING', key: 'sunday_love_offering', national: 0.20, province: 0, area: 0.10, zone: 0, parish: 0.70 },
  { label: 'CRM OFFERING', key: 'crm', national: 0.60, province: 0, area: 0, zone: 0, parish: 0.40 },
  { label: 'GOSPEL FUND', key: 'gospel_fund', national: 0.25, province: 0, area: 0, zone: 0, parish: 0.75 },
  { label: 'FIRST FRUIT', key: 'first_fruit', national: 0.90, province: 0, area: 0, zone: 0, parish: 0.10 },
  { label: 'MISSION', key: 'mission', national: 1.00, province: 0, area: 0, zone: 0, parish: 0 },
  { label: 'SUNDAY SCHOOL', key: 'sunday_school', national: 0.50, province: 0, area: 0, zone: 0, parish: 0.50 },
  { label: 'CHILDREN OFFERING', key: 'children_offering', national: 0.35, province: 0, area: 0, zone: 0, parish: 0.65 },
  { label: 'HOUSE FELLOWSHIP', key: 'house_fellowship', national: 0.40, province: 0, area: 0, zone: 0, parish: 0.60 },
  { label: 'WELFARE', key: 'welfare', national: 0.25, province: 0, area: 0, zone: 0, parish: 0.75 },
  { label: "PASTOR'S WELFARE", key: 'pastors_welfare', national: 0, province: 0, area: 0, zone: 0, parish: 0 },
  { label: "PASTOR'S SEED (1% THANKS)", key: 'pastors_seed', national: 0.01, province: 0, area: 0, zone: 0, parish: 0 },
  { label: 'FIRST BORN REDEMPTION', key: 'first_born_redemption', national: 1.00, province: 0, area: 0, zone: 0, parish: 0 },
  { label: '20% REBATE', key: 'rebate_20', national: 0, province: 0, area: 0, zone: 0, parish: 0 },
  { label: 'ADMIN', key: 'admin', national: 0, province: 0, area: 0, zone: 0, parish: 0 },
  { label: 'SPECIAL PROJECT', key: 'special_project', national: 0, province: 0, area: 0, zone: 0, parish: 0 },
  { label: 'CSR / RUN', key: 'csr_run', national: 0, province: 0, area: 0, zone: 0, parish: 0 },
  { label: 'INSURANCE', key: 'insurance', national: 0, province: 0, area: 0, zone: 0, parish: 0 },
  { label: 'OTHERS 1', key: 'others_1', national: 0, province: 0, area: 0, zone: 0, parish: 0 },
  { label: 'OTHERS 2', key: 'others_2', national: 0, province: 0, area: 0, zone: 0, parish: 0 },
];

// Helper: Format Numbers
function n(val: number): string {
  if (val === 0) return '-';
  return val.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Helper: Format Percentages
function p(val: number): string {
  if (val === 0) return '';
  return `${(val * 100).toFixed(0)}%`;
}

function getWeekNumber(date: Date): number {
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
  return Math.ceil((date.getDate() + firstDay.getDay()) / 7);
}

function drawTable(
  doc: jsPDF,
  headers: string[],
  rows: string[][],
  startY: number,
  colWidths: number[],
  marginLeft: number = 10,
  rowHeight: number = 6,
  headerBg: [number, number, number] = [0, 100, 0],
  fontSize: number = 7
): number {
  const pageHeight = doc.internal.pageSize.getHeight()
  let y = startY

  doc.setFontSize(fontSize)
  doc.setLineWidth(0.1)

  // ── STEP 1: Draw ALL background rectangles first ──
  // Header backgrounds
  let x = marginLeft
  headers.forEach((_, i) => {
    doc.setFillColor(headerBg[0], headerBg[1], headerBg[2])
    doc.setDrawColor(headerBg[0], headerBg[1], headerBg[2])
    doc.rect(x, y, colWidths[i], rowHeight, 'F')
    x += colWidths[i]
  })

  // Row backgrounds
  let rowY = y + rowHeight
  rows.forEach((_, rowIdx) => {
    if (rowY + rowHeight > pageHeight - 15) return
    const isLastRow = rowIdx === rows.length - 1
    if (isLastRow) {
      doc.setFillColor(200, 230, 200)
    } else if (rowIdx % 2 === 0) {
      doc.setFillColor(248, 255, 248)
    } else {
      doc.setFillColor(255, 255, 255)
    }
    doc.setDrawColor(200, 200, 200)
    x = marginLeft
    colWidths.forEach((w) => {
      doc.rect(x, rowY, w, rowHeight, 'F')
      x += w
    })
    rowY += rowHeight
  })

  // ── STEP 2: Draw borders on top ──
  doc.setDrawColor(180, 180, 180)
  doc.setLineWidth(0.1)
  let borderY = y
  // Header border
  x = marginLeft
  headers.forEach((_, i) => {
    doc.rect(x, borderY, colWidths[i], rowHeight, 'D')
    x += colWidths[i]
  })
  borderY += rowHeight
  // Row borders
  rows.forEach((_, rowIdx) => {
    if (borderY + rowHeight > pageHeight - 15) return
    x = marginLeft
    colWidths.forEach((w) => {
      doc.rect(x, borderY, w, rowHeight, 'D')
      x += w
    })
    borderY += rowHeight
    rowIdx // suppress unused warning
  })

  // ── STEP 3: Draw ALL text on top last ──
  // Header text
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  x = marginLeft
  headers.forEach((h, i) => {
    doc.text(h, x + colWidths[i] / 2, y + rowHeight - 1.5, { align: 'center' })
    x += colWidths[i]
  })

  // Row text
  let textY = y + rowHeight
  rows.forEach((row, rowIdx) => {
    if (textY + rowHeight > pageHeight - 15) return
    const isLastRow = rowIdx === rows.length - 1
    doc.setFont('helvetica', isLastRow ? 'bold' : 'normal')
    doc.setTextColor(0, 0, 0)
    x = marginLeft
    row.forEach((cell, i) => {
      if (cell && cell.trim() !== '') {
        const isRight = i > 0
        const textX = isRight ? x + colWidths[i] - 1 : x + 1.5
        doc.text(cell, textX, textY + rowHeight - 1.5, { align: isRight ? 'right' : 'left' })
      }
      x += colWidths[i]
    })
    textY += rowHeight
  })

  doc.setTextColor(0, 0, 0)
  return textY
}

export async function generateMonthlyReport(
  allSessions: Session[],
  offerings: Record<string, Offering>,
  attendance: Record<string, { male: number; female: number; children: number }>,
  church: ChurchUser,
  month: number,
  year: number
) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const monthName = MONTHS[month];
  const marginLeft = 10;

  const monthSessions = allSessions
    .filter(s => {
      const d = new Date(s.date);
      return d.getMonth() === month && d.getFullYear() === year;
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const drawPageHeader = (title: string) => {
    doc.setFillColor(0, 128, 0);
    doc.rect(0, 0, pageWidth, 30, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12).setFont('helvetica', 'bold');
    doc.text('THE REDEEMED CHRISTIAN CHURCH OF GOD', pageWidth / 2, 8, { align: 'center' });
    doc.setFontSize(9).setFont('helvetica', 'normal');
    doc.text(`${church.province_hq?.toUpperCase() || ''} — ${church.regional_hq?.toUpperCase() || ''}`, pageWidth / 2, 14, { align: 'center' });
    doc.text(title, pageWidth / 2, 19, { align: 'center' });
    doc.text(`PARISH: ${church.parish_name?.toUpperCase()} | AREA: ${church.area_hq?.toUpperCase() || ''} | ZONE: ${church.zonal_hq?.toUpperCase() || ''}`, pageWidth / 2, 25, { align: 'center' });
    doc.setTextColor(0, 0, 0);
  };

  // --- PAGE 1: ATTENDANCE ---
  drawPageHeader(`ATTENDANCE REPORT — ${monthName.toUpperCase()} ${year}`);
  let yPos = 35;

  const weekMap: Record<number, Session[]> = {};
  monthSessions.forEach(s => {
    const w = getWeekNumber(new Date(s.date));
    if (!weekMap[w]) weekMap[w] = [];
    weekMap[w].push(s);
  });

  const serviceNames: Record<string, string> = { sunday: 'Sunday Service', tuesday: 'Digging Deep', thursday: 'Faith Clinic', special: 'Special Program' };
  const attHeaders = ['SERVICE', 'DATE', 'PREACHER', 'MALES', 'FEMALES', 'CHILDREN', 'TOTAL'];
  const attColWidths = [60, 30, 65, 25, 25, 25, 25];

  for (const [weekNum, weekSessions] of Object.entries(weekMap)) {
    if (yPos > pageHeight - 40) {
      doc.addPage();
      drawPageHeader(`ATTENDANCE REPORT — ${monthName.toUpperCase()} ${year}`);
      yPos = 35;
    }

    doc.setFont('helvetica', 'bold').setFontSize(8).text(`WEEK ${weekNum}`, marginLeft, yPos);
    yPos += 3;

    const attRows = weekSessions.map(s => {
      const att = attendance[s.id] || { male: 0, female: 0, children: 0 };
      return [
        s.type === 'special' ? (s.special_name || 'Special') : serviceNames[s.type] || s.type,
        s.date,
        s.preacher || '—',
        att.male.toString(),
        att.female.toString(),
        att.children.toString(),
        (att.male + att.female + att.children).toString(),
      ];
    });

    yPos = drawTable(doc, attHeaders, attRows, yPos, attColWidths, marginLeft) + 5;
  }

  // --- PAGE 2: REMITTANCE ---
  doc.addPage();
  drawPageHeader(`PARISH REMITTANCE SUMMARY — ${monthName.toUpperCase()} ${year}`);
  yPos = 35;

  const totals: Record<string, number> = {};
  monthSessions.forEach(s => {
    const off = offerings[s.id];
    if (off) {
      REMITTANCE_STRUCTURE.forEach(f => {
        totals[f.key] = (totals[f.key] || 0) + Number((off as any)[f.key] || 0);
      });
    }
  });

  const remHeaders = ['CATEGORY', 'GROSS', 'NAT%', 'NATIONAL', 'PRV%', 'PROVINCE', 'AREA%', 'AREA', 'ZON%', 'ZONE', 'PAR%', 'PARISH', 'TOTAL'];
  const remColWidths = [50, 20, 12, 20, 12, 20, 12, 20, 12, 20, 12, 20, 25];

  let gNat = 0, gPrv = 0, gArea = 0, gZone = 0, gPar = 0, gTotal = 0;

  const remRows = REMITTANCE_STRUCTURE.map(item => {
    const val = totals[item.key] || 0;
    const nVal = val * item.national;
    const pVal = val * item.province;
    const aVal = val * item.area;
    const zVal = val * item.zone;
    const rVal = val * item.parish;

    gNat += nVal; gPrv += pVal; gArea += aVal; gZone += zVal; gPar += rVal; gTotal += val;

    return [item.label, n(val), p(item.national), n(nVal), p(item.province), n(pVal), p(item.area), n(aVal), p(item.zone), n(zVal), p(item.parish), n(rVal), n(val)];
  });

  remRows.push(['TOTALS', n(gTotal), '', n(gNat), '', n(gPrv), '', n(gArea), '', n(gZone), '', n(gPar), n(gTotal)]);

  yPos = drawTable(doc, remHeaders, remRows, yPos, remColWidths, marginLeft, 5, [0, 80, 0], 6.5);

  // Signatures
  yPos += 20;
  doc.setFontSize(8).setFont('helvetica', 'bold');
  doc.line(marginLeft, yPos, marginLeft + 60, yPos);
  doc.text("PARISH PASTOR'S SIG", marginLeft, yPos + 5);
  
  doc.line(pageWidth - 70, yPos, pageWidth - marginLeft, yPos);
  doc.text("PARISH TREASURER'S SIG", pageWidth - 70, yPos + 5);

  // Footer & Save
  const pageCount = doc.internal.pages.length - 1;
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7).setTextColor(150);
    doc.text(`Generated by CLOCK IT! | ${church.parish_name} | Page ${i} of ${pageCount}`, pageWidth / 2, pageHeight - 5, { align: 'center' });
  }

  doc.save(`${church.parish_name}-Report-${monthName}-${year}.pdf`);
}
