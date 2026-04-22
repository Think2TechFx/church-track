import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { Session, Offering } from '../types'
import type { ChurchUser } from './auth'

const SERVICE_LABELS: Record<string, string> = {
  sunday: 'Sunday Service',
  tuesday: 'Digging Deep',
  thursday: 'Faith Clinic',
  special: 'Special Program',
}

const SUNDAY_FIELDS = [
  { key: 'member_tithe', label: 'Member Tithe', remittance: 0.58 },
  { key: 'ministers_tithe', label: 'Ministers Tithe', remittance: 0.62 },
  { key: 'sunday_love_offering', label: 'Sunday Love Offering', remittance: 0.30 },
  { key: 'monthly_thanksgiving', label: 'Monthly Thanksgiving', remittance: 0.70 },
  { key: 'gospel_fund', label: 'Gospel Fund', remittance: 0.25 },
  { key: 'first_fruit', label: 'First Fruit', remittance: 0.90 },
  { key: 'children_offering', label: 'Children Offering', remittance: 0.30 },
  { key: 'first_born_redemption', label: 'First Born Redemption', remittance: 1.00 },
  { key: 'house_fellowship', label: 'House Fellowship', remittance: 1.00 },
]

const WEEKLY_FIELDS = [
  { key: 'crm', label: 'CRM Offering', remittance: 0.60 },
]

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function fmt(n: number): string {
  return 'N' + n.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
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
  const monthName = MONTHS[month]

  // Filter sessions for selected month
  const monthSessions = allSessions
    .filter((s) => {
      const d = new Date(s.date)
      return d.getMonth() === month && d.getFullYear() === year
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  const regularSessions = monthSessions.filter((s) => s.type !== 'special')
  const specialSessions = monthSessions.filter((s) => s.type === 'special')

  // ─── PAGE HEADER FUNCTION ──────────────────────────
  function drawPageHeader() {
    doc.setFillColor(0, 128, 0)
    doc.rect(0, 0, pageWidth, 28, 'F')

    doc.setTextColor(255, 255, 255)
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('CLOCK IT! — Monthly Financial & Attendance Report', pageWidth / 2, 9, { align: 'center' })

    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text(
      `${church.parish_name}  |  Zone: ${church.zonal_hq}  |  ${church.province_hq}`,
      pageWidth / 2, 16, { align: 'center' }
    )
    doc.text(
      `Pastor-in-Charge: ${church.pastor_name}  |  Period: ${monthName} ${year}`,
      pageWidth / 2, 22, { align: 'center' }
    )
    doc.setTextColor(0, 0, 0)
  }

  drawPageHeader()
  let yPos = 34

  let grandTotalCollected = 0
  let grandTotalRemitted = 0

  // ─── GROUP BY WEEK ─────────────────────────────────
  const weekMap: Record<number, Session[]> = {}
  regularSessions.forEach((s) => {
    const w = getWeekNumber(new Date(s.date))
    if (!weekMap[w]) weekMap[w] = []
    weekMap[w].push(s)
  })

  // ─── RENDER EACH WEEK ──────────────────────────────
  for (const [weekNum, weekSessions] of Object.entries(weekMap)) {
    const dates = weekSessions.map((s) => new Date(s.date))
    const minD = new Date(Math.min(...dates.map((d) => d.getTime())))
    const maxD = new Date(Math.max(...dates.map((d) => d.getTime())))

    const weekLabel = `WEEK ${weekNum}  (${minD.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })} - ${maxD.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })})`

    if (yPos > 175) {
      doc.addPage()
      drawPageHeader()
      yPos = 34
    }

    // Week header bar
    doc.setFillColor(230, 255, 230)
    doc.setDrawColor(0, 128, 0)
    doc.rect(10, yPos, pageWidth - 20, 7, 'FD')
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(0, 100, 0)
    doc.text(weekLabel, 14, yPos + 5)
    doc.setTextColor(0, 0, 0)
    yPos += 9

    // Sort: tuesday → thursday → sunday
    const order = ['tuesday', 'thursday', 'sunday']
    const sorted = [...weekSessions].sort(
      (a, b) => order.indexOf(a.type) - order.indexOf(b.type)
    )

    for (const session of sorted) {
      if (yPos > 175) {
        doc.addPage()
        drawPageHeader()
        yPos = 34
      }

      const offering = offerings[session.id]
      const att = attendance[session.id] || { male: 0, female: 0, children: 0 }
      const totalAtt = att.male + att.female + att.children
      const isSunday = session.type === 'sunday'
      const fields = isSunday ? SUNDAY_FIELDS : WEEKLY_FIELDS

      // Service header
      const colors: Record<string, number[]> = {
        sunday: [184, 134, 11],
        tuesday: [0, 71, 171],
        thursday: [75, 0, 130],
      }
      const c = colors[session.type] || [80, 80, 80]
      doc.setFillColor(c[0], c[1], c[2])
      doc.rect(10, yPos, pageWidth - 20, 7, 'F')
      doc.setFontSize(8.5)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(255, 255, 255)
      doc.text(
        `${SERVICE_LABELS[session.type]}  |  Date: ${session.date}  |  Preacher: ${session.preacher || 'N/A'}  |  Attendance: ${totalAtt}  (Male: ${att.male}  Female: ${att.female}  Children: ${att.children})`,
        14, yPos + 5
      )
      doc.setTextColor(0, 0, 0)
      yPos += 8

      if (!offering) {
        doc.setFontSize(8)
        doc.setFont('helvetica', 'italic')
        doc.setTextColor(150, 150, 150)
        doc.text('No offering data recorded for this service.', 14, yPos + 4)
        doc.setTextColor(0, 0, 0)
        yPos += 8
        continue
      }

      // Build rows
      const rows: string[][] = []
      let sessionCollected = 0
      let sessionRemitted = 0

      fields.forEach((field) => {
        const amt = Number((offering as any)[field.key] || 0)
        const remit = amt * field.remittance
        const retain = amt - remit
        sessionCollected += amt
        sessionRemitted += remit
        rows.push([
          field.label,
          `${(field.remittance * 100).toFixed(0)}%`,
          fmt(amt),
          fmt(remit),
          fmt(retain),
        ])
      })

      grandTotalCollected += sessionCollected
      grandTotalRemitted += sessionRemitted

      autoTable(doc, {
        startY: yPos,
        head: [['Offering Category', 'Remit %', 'Amount Collected', 'Amount to Remit', 'Amount Retained']],
        body: rows,
        foot: [[
          'SESSION TOTAL',
          '',
          fmt(sessionCollected),
          fmt(sessionRemitted),
          fmt(sessionCollected - sessionRemitted),
        ]],
        margin: { left: 10, right: 10 },
        styles: {
          fontSize: 7.5,
          cellPadding: 1.8,
          lineColor: [200, 200, 200],
          lineWidth: 0.1,
        },
        headStyles: {
          fillColor: [40, 40, 40],
          textColor: 255,
          fontStyle: 'bold',
          fontSize: 7.5,
        },
        footStyles: {
          fillColor: [240, 240, 240],
          textColor: [0, 0, 0],
          fontStyle: 'bold',
          fontSize: 7.5,
        },
        alternateRowStyles: { fillColor: [250, 250, 250] },
        columnStyles: {
          0: { cellWidth: 65 },
          1: { cellWidth: 22, halign: 'center' },
          2: { cellWidth: 50, halign: 'right' },
          3: { cellWidth: 50, halign: 'right' },
          4: { cellWidth: 50, halign: 'right' },
        },
        didDrawPage: () => {
          drawPageHeader()
          yPos = 34
        },
      })

      yPos = (doc as any).lastAutoTable.finalY + 5
    }

    yPos += 3
  }

  // ─── SPECIAL PROGRAMS ──────────────────────────────
  if (specialSessions.length > 0) {
    if (yPos > 170) {
      doc.addPage()
      drawPageHeader()
      yPos = 34
    }

    doc.setFillColor(0, 120, 0)
    doc.rect(10, yPos, pageWidth - 20, 7, 'F')
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(255, 255, 255)
    doc.text('SPECIAL PROGRAMS', 14, yPos + 5)
    doc.setTextColor(0, 0, 0)
    yPos += 9

    for (const session of specialSessions) {
      if (yPos > 175) {
        doc.addPage()
        drawPageHeader()
        yPos = 34
      }

      const offering = offerings[session.id]
      const att = attendance[session.id] || { male: 0, female: 0, children: 0 }
      const totalAtt = att.male + att.female + att.children

      doc.setFillColor(0, 160, 0)
      doc.rect(10, yPos, pageWidth - 20, 7, 'F')
      doc.setFontSize(8.5)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(255, 255, 255)
      doc.text(
        `${session.special_name || 'Special Program'}  |  Date: ${session.date}  |  Preacher: ${session.preacher || 'N/A'}  |  Attendance: ${totalAtt}  (M:${att.male} F:${att.female} C:${att.children})`,
        14, yPos + 5
      )
      doc.setTextColor(0, 0, 0)
      yPos += 8

      if (!offering) {
        doc.setFontSize(8)
        doc.setFont('helvetica', 'italic')
        doc.setTextColor(150, 150, 150)
        doc.text('No offering data recorded.', 14, yPos + 4)
        doc.setTextColor(0, 0, 0)
        yPos += 8
        continue
      }

      const rows: string[][] = []
      let sessionCollected = 0
      let sessionRemitted = 0

      WEEKLY_FIELDS.forEach((field) => {
        const amt = Number((offering as any)[field.key] || 0)
        const remit = amt * field.remittance
        sessionCollected += amt
        sessionRemitted += remit
        rows.push([field.label, `${(field.remittance * 100).toFixed(0)}%`, fmt(amt), fmt(remit), fmt(amt - remit)])
      })

      grandTotalCollected += sessionCollected
      grandTotalRemitted += sessionRemitted

      autoTable(doc, {
        startY: yPos,
        head: [['Offering Category', 'Remit %', 'Amount Collected', 'Amount to Remit', 'Amount Retained']],
        body: rows,
        foot: [['SESSION TOTAL', '', fmt(sessionCollected), fmt(sessionRemitted), fmt(sessionCollected - sessionRemitted)]],
        margin: { left: 10, right: 10 },
        styles: { fontSize: 7.5, cellPadding: 1.8 },
        headStyles: { fillColor: [40, 40, 40], textColor: 255, fontStyle: 'bold' },
        footStyles: { fillColor: [240, 240, 240], fontStyle: 'bold' },
        columnStyles: {
          0: { cellWidth: 65 },
          1: { cellWidth: 22, halign: 'center' },
          2: { cellWidth: 50, halign: 'right' },
          3: { cellWidth: 50, halign: 'right' },
          4: { cellWidth: 50, halign: 'right' },
        },
      })
      yPos = (doc as any).lastAutoTable.finalY + 5
    }
  }

  // ─── MONTHLY SUMMARY ───────────────────────────────
  if (yPos > 170) {
    doc.addPage()
    drawPageHeader()
    yPos = 34
  }

  doc.setFillColor(0, 80, 0)
  doc.rect(10, yPos, pageWidth - 20, 7, 'F')
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  doc.text('MONTHLY FINANCIAL SUMMARY', 14, yPos + 5)
  doc.setTextColor(0, 0, 0)
  yPos += 9

  autoTable(doc, {
    startY: yPos,
    head: [['Description', 'Amount']],
    body: [
      ['Total Amount Collected', fmt(grandTotalCollected)],
      ['Total Amount to Remit', fmt(grandTotalRemitted)],
      ['Total Amount Retained by Parish', fmt(grandTotalCollected - grandTotalRemitted)],
    ],
    margin: { left: 10, right: 10 },
    styles: { fontSize: 10, cellPadding: 3 },
    headStyles: { fillColor: [0, 100, 0], textColor: 255, fontStyle: 'bold' },
    bodyStyles: { fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 120 },
      1: { cellWidth: 80, halign: 'right' },
    },
  })

  // ─── FOOTER ON ALL PAGES ───────────────────────────
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(7)
    doc.setTextColor(150, 150, 150)
    doc.text(
      `CLOCK IT!  |  ${church.parish_name}  |  Generated: ${new Date().toLocaleString('en-NG')}  |  Page ${i} of ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 5,
      { align: 'center' }
    )
  }

  doc.save(`${church.parish_name}-${monthName}-${year}-Report.pdf`)
}