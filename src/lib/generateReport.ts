import jsPDF from 'jspdf'
import type { Session, Offering } from '../types'
import type { ChurchUser } from './auth'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

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
  { label: "PASTOR'S SEED (1% THANKSGIVING)", key: 'pastors_seed', national: 0.01, province: 0, area: 0, zone: 0, parish: 0 },
  { label: 'FIRST BORN REDEMPTION', key: 'first_born_redemption', national: 1.00, province: 0, area: 0, zone: 0, parish: 0 },
  { label: '20% REBATE', key: 'rebate_20', national: 0, province: 0, area: 0, zone: 0, parish: 0 },
  { label: 'ADMIN', key: 'admin', national: 0, province: 0, area: 0, zone: 0, parish: 0 },
  { label: 'SPECIAL PROJECT', key: 'special_project', national: 0, province: 0, area: 0, zone: 0, parish: 0 },
  { label: 'CSR / RUN', key: 'csr_run', national: 0, province: 0, area: 0, zone: 0, parish: 0 },
  { label: 'INSURANCE', key: 'insurance', national: 0, province: 0, area: 0, zone: 0, parish: 0 },
  { label: 'OTHERS', key: 'others_1', national: 0, province: 0, area: 0, zone: 0, parish: 0 },
  { label: 'OTHERS', key: 'others_2', national: 0, province: 0, area: 0, zone: 0, parish: 0 },
  { label: 'OTHERS', key: 'others_3', national: 0, province: 0, area: 0, zone: 0, parish: 0 },
]

function n(val: number): string {
  if (!val || val === 0) return ''
  return val.toLocaleString('en-NG', { minimumFractionDigits: 2 })
}

function p(val: number): string {
  if (!val || val === 0) return ''
  return `${(val * 100).toFixed(0)}%`
}

function getWeekNumber(date: Date): number {
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1)
  return Math.ceil((date.getDate() + firstDay.getDay()) / 7)
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

  doc.setFillColor(headerBg[0], headerBg[1], headerBg[2])
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  let x = marginLeft
  headers.forEach((h, i) => {
    doc.rect(x, y, colWidths[i], rowHeight, 'F')
    doc.text(h, x + colWidths[i] / 2, y + rowHeight - 1.5, { align: 'center' })
    x += colWidths[i]
  })
  y += rowHeight

  doc.setTextColor(0, 0, 0)
  doc.setFont('helvetica', 'normal')
  rows.forEach((row, rowIdx) => {
    if (y + rowHeight > pageHeight - 15) return

    if (rowIdx === rows.length - 1) {
      doc.setFillColor(200, 230, 200)
      doc.setFont('helvetica', 'bold')
    } else if (rowIdx % 2 === 0) {
      doc.setFillColor(248, 255, 248)
    } else {
      doc.setFillColor(255, 255, 255)
    }

    x = marginLeft
    row.forEach((cell, i) => {
      doc.rect(x, y, colWidths[i], rowHeight, 'FD')
      const isRight = i > 0
      const textX = isRight ? x + colWidths[i] - 1 : x + 1.5
      doc.text(cell || '', textX, y + rowHeight - 1.5, { align: isRight ? 'right' : 'left' })
      x += colWidths[i]
    })
    doc.setFont('helvetica', 'normal')
    y += rowHeight
  })

  return y
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
  const marginLeft = 10

  const monthSessions = allSessions
    .filter((s) => {
      const d = new Date(s.date)
      return d.getMonth() === month && d.getFullYear() === year
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  function drawPageHeader(title: string) {
    doc.setFillColor(0, 128, 0)
    doc.rect(0, 0, pageWidth, 30, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('THE REDEEMED CHRISTIAN CHURCH OF GOD', pageWidth / 2, 8, { align: 'center' })
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text(
      `${church.province_hq?.toUpperCase() || ''} — ${church.regional_hq?.toUpperCase() || ''}`,
      pageWidth / 2, 14, { align: 'center' }
    )
    doc.text(title, pageWidth / 2, 19, { align: 'center' })
    doc.text(
      `PARISH: ${church.parish_name?.toUpperCase()}     AREA: ${church.area_hq?.toUpperCase() || ''}     ZONE: ${church.zonal_hq?.toUpperCase() || ''}`,
      pageWidth / 2, 25, { align: 'center' }
    )
    doc.setTextColor(0, 0, 0)
  }

  drawPageHeader(`ATTENDANCE REPORT — ${monthName.toUpperCase()} ${year}`)
  let yPos = 34

  const weekMap: Record<number, Session[]> = {}
  monthSessions.forEach((s) => {
    const w = getWeekNumber(new Date(s.date))
    if (!weekMap[w]) weekMap[w] = []
    weekMap[w].push(s)
  })

  const serviceOrder = ['tuesday', 'thursday', 'sunday', 'special']
  const serviceNames: Record<string, string> = {
    sunday: 'Sunday Service',
    tuesday: 'Digging Deep',
    thursday: 'Faith Clinic',
    special: 'Special Program',
  }

  const attColWidths = [55, 28, 55, 22, 22, 22, 22]
  const attHeaders = ['SERVICE', 'DATE', 'PREACHER', 'MALES', 'FEMALES', 'CHILDREN', 'TOTAL']

  for (const [weekNum, weekSessions] of Object.entries(weekMap)) {
    if (yPos > pageHeight - 40) {
      doc.addPage()
      drawPageHeader(`ATTENDANCE REPORT — ${monthName.toUpperCase()} ${year}`)
      yPos = 34
    }

    const dates = weekSessions.map(s => new Date(s.date))
    const minD = new Date(Math.min(...dates.map(d => d.getTime())))
    const maxD = new Date(Math.max(...dates.map(d => d.getTime())))

    doc.setFillColor(220, 245, 220)
    doc.rect(marginLeft, yPos, pageWidth - marginLeft * 2, 6, 'F')
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(0, 100, 0)
    doc.text(
      `WEEK ${weekNum}  (${minD.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })} - ${maxD.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })})`,
      marginLeft + 2, yPos + 4
    )
    doc.setTextColor(0, 0, 0)
    yPos += 7

    const sorted = [...weekSessions].sort(
      (a, b) => serviceOrder.indexOf(a.type) - serviceOrder.indexOf(b.type)
    )

    const attRows = sorted.map(s => {
      const att = attendance[s.id] || { male: 0, female: 0, children: 0 }
      const total = att.male + att.female + att.children
      return [
        s.type === 'special' ? (s.special_name || 'Special') : serviceNames[s.type] || s.type,
        s.date,
        s.preacher || '—',
        att.male.toString(),
        att.female.toString(),
        att.children.toString(),
        total.toString(),
      ]
    })

    yPos = drawTable(doc, attHeaders, attRows, yPos, attColWidths, marginLeft, 6, [40, 40, 40], 7)
    yPos += 4
  }

  doc.addPage()
  drawPageHeader(`PARISH REMITTANCE SUMMARY FOR THE MONTH OF ${monthName.toUpperCase()} ${year}`)
  yPos = 34

  const combined: Record<string, number> = {}
  for (const s of monthSessions) {
    const off = offerings[s.id]
    if (!off) continue
    for (const f of REMITTANCE_STRUCTURE) {
      combined[f.key] = (combined[f.key] || 0) + Number((off as any)[f.key] || 0)
    }
  }

  const remColWidths = [50, 18, 12, 18, 12, 18, 12, 18, 12, 18, 12, 18, 18]
  const remHeaders = ['CATEGORY', 'TOTAL', 'NAT%', 'NATIONAL', 'PRV%', 'PROVINCE', 'AREA%', 'AREA', 'ZON%', 'ZONE', 'PAR%', 'PARISH', 'TOTAL']

  let totNat = 0, totPrv = 0, totArea = 0, totZone = 0, totPar = 0, totGrand = 0

  const remRows: string[][] = REMITTANCE_STRUCTURE.map(item => {
    const total = combined[item.key] || 0
    const nat = total * item.national
    const prv = total * item.province
    const area = total * item.area
    const zone = total * item.zone
    const par = total * item.parish
    totNat += nat
    totPrv += prv
    totArea += area
    totZone += zone
    totPar += par
    totGrand += total
    return [
      item.label,
      n(total),
      p(item.national),
      n(nat),
      p(item.province),
      n(prv),
      p(item.area),
      n(area),
      p(item.zone),
      n(zone),
      p(item.parish),
      n(par),
      n(total),
    ]
  })

  remRows.push([
    'TOTAL',
    n(totGrand),
    '',
    n(totNat),
    '',
    n(totPrv),
    '',
    n(totArea),
    '',
    n(totZone),
    '',
    n(totPar),
    n(totGrand),
  ])

  yPos = drawTable(doc, remHeaders, remRows, yPos, remColWidths, marginLeft, 5.5, [0, 100, 0], 6.5)
  yPos += 15

  if (yPos > pageHeight - 35) {
    doc.addPage()
    yPos = 20
  }

  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.text('DISTRIBUTION:', 60, yPos)
  doc.setFont('helvetica', 'normal')
  doc.text('1. One copy to accompany Parish Remittance to the Area', 90, yPos)
  doc.text('2. One copy to be retained by the Parish', 90, yPos + 5)
  yPos += 20

  doc.line(10, yPos, 80, yPos)
  doc.setFontSize(8)
  doc.text("PARISH PASTOR'S", 10, yPos + 4)
  doc.text('SIGNATURE & DATE', 10, yPos + 8)
  doc.line(pageWidth - 80, yPos, pageWidth - 10, yPos)
  doc.text("PARISH TREASURER'S", pageWidth - 80, yPos + 4)
  doc.text('SIGNATURE & DATE', pageWidth - 80, yPos + 8)

  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(6.5)
    doc.setTextColor(150, 150, 150)
    doc.text(
      `CLOCK IT! Church Management System  |  ${church.parish_name}  |  Generated: ${new Date().toLocaleString('en-NG')}  |  Page ${i} of ${pageCount}`,
      pageWidth / 2,
      pageHeight - 4,
      { align: 'center' }
    )
    doc.setTextColor(0, 0, 0)
  }

  doc.save(`${church.parish_name}-Remittance-${monthName}-${year}.pdf`)
}