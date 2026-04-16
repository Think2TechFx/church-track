import jsPDF from 'jspdf'
import 'jspdf-autotable'
import type { Session, Offering } from '../types'
import type { ChurchUser } from './auth'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export async function generateMonthlyReport(
  sessions: Session[],
  offeringsMap: Record<string, Offering>,
  attendanceMap: Record<string, { male: number; female: number; children: number }>,
  church: ChurchUser,
  month: number,
  year: number
) {
  const doc = new jsPDF()

  // Header
  doc.setFontSize(20)
  doc.text(`${church.parish_name} Monthly Report`, 20, 20)
  doc.setFontSize(12)
  doc.text(`${MONTHS[month]} ${year}`, 20, 30)
  doc.text(`Pastor: ${church.pastor_name}`, 20, 40)
  doc.text(`Head Usher: ${church.head_usher_name}`, 20, 50)

  let yPosition = 60

  // Services table
  const tableData = sessions.map(session => {
    const offering = offeringsMap[session.id]
    const attendance = attendanceMap[session.id] || { male: 0, female: 0, children: 0 }

    return [
      session.date,
      session.special_name || session.type,
      session.preacher || '',
      attendance.male,
      attendance.female,
      attendance.children,
      offering ? offering.member_tithe : 0,
      offering ? offering.ministers_tithe : 0,
      offering ? offering.sunday_love_offering : 0,
      offering ? offering.monthly_thanksgiving : 0,
      offering ? offering.gospel_fund : 0,
      offering ? offering.first_fruit : 0,
    ]
  })

  ;(doc as any).autoTable({
    head: [['Date', 'Service', 'Preacher', 'Male', 'Female', 'Children', 'Member Tithe', 'Ministers Tithe', 'Love Offering', 'Thanksgiving', 'Gospel Fund', 'First Fruit']],
    body: tableData,
    startY: yPosition,
  })

  // Totals
  const totalMale = sessions.reduce((sum, s) => sum + (attendanceMap[s.id]?.male || 0), 0)
  const totalFemale = sessions.reduce((sum, s) => sum + (attendanceMap[s.id]?.female || 0), 0)
  const totalChildren = sessions.reduce((sum, s) => sum + (attendanceMap[s.id]?.children || 0), 0)
  const totalTithe = sessions.reduce((sum, s) => sum + (offeringsMap[s.id]?.member_tithe || 0), 0)
  const totalMinistersTithe = sessions.reduce((sum, s) => sum + (offeringsMap[s.id]?.ministers_tithe || 0), 0)
  const totalLove = sessions.reduce((sum, s) => sum + (offeringsMap[s.id]?.sunday_love_offering || 0), 0)
  const totalThanksgiving = sessions.reduce((sum, s) => sum + (offeringsMap[s.id]?.monthly_thanksgiving || 0), 0)
  const totalGospel = sessions.reduce((sum, s) => sum + (offeringsMap[s.id]?.gospel_fund || 0), 0)
  const totalFirstFruit = sessions.reduce((sum, s) => sum + (offeringsMap[s.id]?.first_fruit || 0), 0)

  const totalOfferings = totalTithe + totalMinistersTithe + totalLove + totalThanksgiving + totalGospel + totalFirstFruit

  yPosition = (doc as any).lastAutoTable.finalY + 10

  doc.setFontSize(14)
  doc.text('Monthly Totals', 20, yPosition)
  yPosition += 10

  doc.setFontSize(10)
  doc.text(`Total Attendance - Male: ${totalMale}, Female: ${totalFemale}, Children: ${totalChildren}`, 20, yPosition)
  yPosition += 10
  doc.text(`Total Offerings: ₦${totalOfferings.toLocaleString()}`, 20, yPosition)
  yPosition += 10
  doc.text(`Member Tithe: ₦${totalTithe.toLocaleString()}`, 20, yPosition)
  yPosition += 10
  doc.text(`Ministers Tithe: ₦${totalMinistersTithe.toLocaleString()}`, 20, yPosition)
  yPosition += 10
  doc.text(`Love Offering: ₦${totalLove.toLocaleString()}`, 20, yPosition)
  yPosition += 10
  doc.text(`Monthly Thanksgiving: ₦${totalThanksgiving.toLocaleString()}`, 20, yPosition)
  yPosition += 10
  doc.text(`Gospel Fund: ₦${totalGospel.toLocaleString()}`, 20, yPosition)
  yPosition += 10
  doc.text(`First Fruit: ₦${totalFirstFruit.toLocaleString()}`, 20, yPosition)

  // Save the PDF
  doc.save(`Monthly_Report_${MONTHS[month]}_${year}.pdf`)
}