import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { Session, Offering } from '../types'
import type { ChurchUser } from './auth'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

// Remittance structure matching the official RCCG format
const REMITTANCE_STRUCTURE = [
  {
    label: 'MEMBERS TITHE',
    key: 'member_tithe',
    national: 0.58, province: 0, area: 0, zone: 0, parish: 0.42,
  },
  {
    label: 'MINISTERS TITHE',
    key: 'ministers_tithe',
    national: 0.62, province: 0, area: 0, zone: 0, parish: 0.38,
  },
  {
    label: 'THANKSGIVING',
    key: 'monthly_thanksgiving',
    national: 0.70, province: 0.05, area: 0.05, zone: 0, parish: 0.19,
  },
  {
    label: 'SUNDAY LOVE OFFERING',
    key: 'sunday_love_offering',
    national: 0.20, province: 0, area: 0.10, zone: 0, parish: 0.70,
  },
  {
    label: 'CRM OFFERING',
    key: 'crm',
    national: 0.60, province: 0, area: 0, zone: 0, parish: 0.40,
  },
  {
    label: 'GOSPEL FUND',
    key: 'gospel_fund',
    national: 0.25, province: 0, area: 0, zone: 0, parish: 0.75,
  },
  {
    label: 'FIRST FRUIT',
    key: 'first_fruit',
    national: 0.90, province: 0, area: 0, zone: 0, parish: 0.10,
  },
  {
    label: 'MISSION',
    key: 'mission',
    national: 1.00, province: 0, area: 0, zone: 0, parish: 0,
  },
  {
    label: 'SUNDAY SCHOOL',
    key: 'sunday_school',
    national: 0.50, province: 0, area: 0, zone: 0, parish: 0.50,
  },
  {
    label: 'CHILDREN OFFERING',
    key: 'children_offering',
    national: 0.35, province: 0, area: 0, zone: 0, parish: 0.65,
  },
  {
    label: 'HOUSE FELLOWSHIP',
    key: 'house_fellowship',
    national: 0.40, province: 0, area: 0, zone: 0, parish: 0.60,
  },
  {
    label: 'WELFARE',
    key: 'welfare',
    national: 0.25, province: 0, area: 0, zone: 0, parish: 0.75,
  },
  {
    label: "PASTOR'S WELFARE",
    key: 'pastors_welfare',
    national: 0, province: 0, area: 0, zone: 0, parish: 0,
  },
  {
    label: "PASTOR'S SEED (1% THANKSGIVING)",
    key: 'pastors_seed',
    national: 0.01, province: 0, area: 0, zone: 0, parish: 0,
  },
  {
    label: 'FIRST BORN REDEMPTION',
    key: 'first_born_redemption',
    national: 1.00, province: 0, area: 0, zone: 0, parish: 0,
  },
  {
    label: '20% REBATE',
    key: 'rebate_20',
    national: 0, province: 0, area: 0, zone: 0, parish: 0,
  },
  {
    label: 'ADMIN',
    key: 'admin',
    national: 0, province: 0, area: 0, zone: 0, parish: 0,
  },
  {
    label: 'SPECIAL PROJECT',
    key: 'special_project',
    national: 0, province: 0, area: 0, zone: 0, parish: 0,
  },
  {
    label: 'CSR / RUN',
    key: 'csr_run',
    national: 0, province: 0, area: 0, zone: 0, parish: 0,
  },
  {
    label: 'INSURANCE',
    key: 'insurance',
    national: 0, province: 0, area: 0, zone: 0, parish: 0,
  },
  {
    label: 'OTHERS',
    key: 'others_1',
    national: 0, province: 0, area: 0, zone: 0, parish: 0,
  },
  {
    label: 'OTHERS',
    key: 'others_2',
    national: 0, province: 0, area: 0, zone: 0, parish: 0,
  },
  {
    label: 'OTHERS',
    key: 'others_3',
    national: 0, province: 0, area: 0, zone: 0, parish: 0,
  },
]

function fmt(n: number): string {
  if (n === 0) return ''
  return n.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function pct(n: number): string {
  if (n === 0) return ''
  return `${(n * 100).toFixed(0)}%`
}

function getWeekNumber(date: Date): number {
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1)
  return Math.ceil((date.getDate() + firstDay.getDay()) / 7)
}

export async function generateMonthlyReport(
  allSessions: Session[],
  offerings: Record<string, Offering>,
  attendance: Record<string, { male: number; female: number; children: number }>,
  church: ChurchUser,
  month: number,
  year: number
) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const monthName = MONTHS[month]

  const monthSessions = allSessions
    .filter((s) => {
      const d = new Date(s.date)
      return d.getMonth() === month && d.getFullYear() === year
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  // ─── ATTENDANCE SECTION FIRST ─────────────────────
  function drawPageHeader(title: string) {
    // RCCG Green header bar
    doc.setFillColor(0, 128, 0)
    doc.rect(0, 0, pageWidth, 30, 'F')

    doc.setTextColor(255, 255, 255)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text(
      'THE REDEEMED CHRISTIAN CHURCH OF GOD',
      pageWidth / 2, 8, { align: 'center' }
    )
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text(
      `${church.province_hq?.toUpperCase() || 'PROVINCE'} — ${church.regional_hq?.toUpperCase() || 'REGION'}`,
      pageWidth / 2, 14, { align: 'center' }
    )
    doc.text(title, pageWidth / 2, 20, { align: 'center' })
    doc.text(
      `PARISH: ${church.parish_name?.toUpperCase()}     AREA: ${church.area_hq?.toUpperCase() || ''}     ZONE: ${church.zonal_hq?.toUpperCase() || ''}`,
      pageWidth / 2, 26, { align: 'center' }
    )
    doc.setTextColor(0, 0, 0)
  }

  // ─── PAGE 1: ATTENDANCE REPORT ─────────────────────
  drawPageHeader(`ATTENDANCE REPORT — ${monthName.toUpperCase()} ${year}`)

  let yPos = 35

  // Group sessions by week
  const weekMap: Record<number, Session[]> = {}
  monthSessions.forEach((s) => {
    const w = getWeekNumber(new Date(s.date))
    if (!weekMap[w]) weekMap[w] = []
    weekMap[w].push(s)
  })

  const serviceOrder = ['tuesday', 'thursday', 'sunday', 'special']

  for (const [weekNum, weekSessions] of Object.entries(weekMap)) {
    if (yPos > pageHeight - 40) {
      doc.addPage()
      drawPageHeader(`ATTENDANCE REPORT — ${monthName.toUpperCase()} ${year}`)
      yPos = 35
    }

    const dates = weekSessions.map(s => new Date(s.date))
    const minD = new Date(Math.min(...dates.map(d => d.getTime())))
    const maxD = new Date(Math.max(...dates.map(d => d.getTime())))

    // Week header
    doc.setFillColor(230, 255, 230)
    doc.setDrawColor(0, 128, 0)
    doc.rect(10, yPos, pageWidth - 20, 6, 'FD')
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(0, 100, 0)
    doc.text(
      `WEEK ${weekNum}  (${minD.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })} - ${maxD.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })})`,
      14, yPos + 4.5
    )
    doc.setTextColor(0, 0, 0)
    yPos += 8

    const sorted = [...weekSessions].sort(
      (a, b) => serviceOrder.indexOf(a.type) - serviceOrder.indexOf(b.type)
    )

    const attRows = sorted.map(session => {
      const att = attendance[session.id] || { male: 0, female: 0, children: 0 }
      const total = att.male + att.female + att.children
      const label = session.type === 'special'
        ? session.special_name || 'Special Program'
        : { sunday: 'Sunday Service', tuesday: 'Digging Deep', thursday: 'Faith Clinic' }[session.type] || session.type
      return [
        label,
        session.date,
        session.preacher || '—',
        att.male.toString(),
        att.female.toString(),
        att.children.toString(),
        total.toString(),
      ]
    })

    autoTable(doc, {
      startY: yPos,
      head: [['Service', 'Date', 'Preacher', 'Males', 'Females', 'Children', 'Total']],
      body: attRows,
      margin: { left: 10, right: 10 },
      styles: { fontSize: 7.5, cellPadding: 1.5 },
      headStyles: { fillColor: [40, 40, 40], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 255, 248] },
      columnStyles: {
        0: { cellWidth: 50 },
        1: { cellWidth: 28 },
        2: { cellWidth: 50 },
        3: { cellWidth: 22, halign: 'center' },
        4: { cellWidth: 22, halign: 'center' },
        5: { cellWidth: 22, halign: 'center' },
        6: { cellWidth: 22, halign: 'center', fontStyle: 'bold' },
      },
    })
    yPos = (doc as any).lastAutoTable.finalY + 5
  }

  // ─── PAGE 2+: REMITTANCE REPORT ────────────────────
  doc.addPage()
  drawPageHeader(`PARISH REMITTANCE SUMMARY FOR THE MONTH OF ${monthName.toUpperCase()} ${year}`)
  yPos = 35

  // Combine all offerings for the month
  const combinedOffering: Record<string, number> = {}
  for (const session of monthSessions) {
    const off = offerings[session.id]
    if (!off) continue
    for (const field of REMITTANCE_STRUCTURE) {
      const val = Number((off as any)[field.key] || 0)
      combinedOffering[field.key] = (combinedOffering[field.key] || 0) + val
    }
  }

  // Build remittance table rows
  const remittanceRows: string[][] = []
  let totalNational = 0
  let totalProvince = 0
  let totalArea = 0
  let totalZone = 0
  let totalParish = 0
  let grandTotal = 0

  for (const item of REMITTANCE_STRUCTURE) {
    const total = combinedOffering[item.key] || 0
    const national = total * item.national
    const province = total * item.province
    const area = total * item.area
    const zone = total * item.zone
    const parish = total * item.parish

    totalNational += national
    totalProvince += province
    totalArea += area
    totalZone += zone
    totalParish += parish
    grandTotal += total

    remittanceRows.push([
      item.label,
      fmt(total),
      pct(item.national),
      fmt(national),
      pct(item.province),
      fmt(province),
      pct(item.area),
      fmt(area),
      pct(item.zone),
      fmt(zone),
      pct(item.parish),
      fmt(parish),
      fmt(total),
    ])
  }

  // Add totals row
  remittanceRows.push([
    'TOTAL',
    fmt(grandTotal),
    '',
    fmt(totalNational),
    '',
    fmt(totalProvince),
    '',
    fmt(totalArea),
    '',
    fmt(totalZone),
    '',
    fmt(totalParish),
    fmt(grandTotal),
  ])

  autoTable(doc, {
    startY: yPos,
    head: [
      [
        { content: 'CATEGORY', rowSpan: 2 },
        { content: 'TOTAL', rowSpan: 2 },
        { content: 'NATIONAL / REGION', colSpan: 2 },
        { content: 'PROVINCE', colSpan: 2 },
        { content: 'AREA', colSpan: 2 },
        { content: 'ZONE', colSpan: 2 },
        { content: 'PARISH', colSpan: 2 },
        { content: 'TOTAL', rowSpan: 2 },
      ],
      ['%', 'AMT', '%', 'AMT', '%', 'AMT', '%', 'AMT', '%', 'AMT'],
    ],
    body: remittanceRows,
    margin: { left: 10, right: 10 },
    styles: {
      fontSize: 6.5,
      cellPadding: 1.5,
      lineColor: [0, 0, 0],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [0, 128, 0],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 6.5,
      halign: 'center',
    },
    bodyStyles: {
      halign: 'right',
    },
    columnStyles: {
      0: { cellWidth: 48, halign: 'left', fontStyle: 'bold' },
      1: { cellWidth: 20 },
      2: { cellWidth: 12, halign: 'center' },
      3: { cellWidth: 20 },
      4: { cellWidth: 12, halign: 'center' },
      5: { cellWidth: 20 },
      6: { cellWidth: 12, halign: 'center' },
      7: { cellWidth: 20 },
      8: { cellWidth: 12, halign: 'center' },
      9: { cellWidth: 20 },
      10: { cellWidth: 12, halign: 'center' },
      11: { cellWidth: 20 },
      12: { cellWidth: 20 },
    },
    didParseCell: (data) => {
      // Style the TOTAL row
      if (data.row.index === remittanceRows.length - 1) {
        data.cell.styles.fillColor = [200, 230, 200]
        data.cell.styles.fontStyle = 'bold'
      }
    },
  })

  yPos = (doc as any).lastAutoTable.finalY + 15

  // ─── SIGNATURES ────────────────────────────────────
  if (yPos > pageHeight - 40) {
    doc.addPage()
    yPos = 20
  }

  // Distribution note
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.text('DISTRIBUTION:', 60, yPos)
  doc.setFont('helvetica', 'normal')
  doc.text('1. One copy to accompany Parish Remittance to the Area', 90, yPos)
  doc.text('2. One copy to be retained by the Parish', 90, yPos + 5)

  yPos += 20

  // Signature lines
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)

  // Left signature
  doc.line(10, yPos, 80, yPos)
  doc.text("PARISH PASTOR'S", 10, yPos + 4)
  doc.text('SIGNATURE & DATE', 10, yPos + 8)

  // Right signature
  doc.line(pageWidth - 80, yPos, pageWidth - 10, yPos)
  doc.text("PARISH TREASURER'S", pageWidth - 80, yPos + 4)
  doc.text('SIGNATURE & DATE', pageWidth - 80, yPos + 8)

  // ─── FOOTER ON ALL PAGES ───────────────────────────
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(6.5)
    doc.setTextColor(150, 150, 150)
    doc.text(
      `CLOCK IT! Church Management System  |  ${church.parish_name}  |  Generated: ${new Date().toLocaleString('en-NG')}  |  Page ${i} of ${pageCount}`,
      pageWidth / 2,
      pageHeight - 5,
      { align: 'center' }
    )
    doc.setTextColor(0, 0, 0)
  }

  doc.save(`${church.parish_name}-Remittance-${monthName}-${year}.pdf`)
}