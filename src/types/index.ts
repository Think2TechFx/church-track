export type MemberRole = 'Member' | 'Pastor' | 'Minister' | 'Worker'

export type ServiceType = 'sunday' | 'tuesday' | 'thursday' | 'special'

export type Sex = 'Male' | 'Female' | 'Children'

export type MaritalStatus = 'Single' | 'Married' | 'Widowed'

export interface Member {
  id: string
  name: string
  phone: string
  sex: Sex
  role: MemberRole
  marital_status?: MaritalStatus
  date_of_birth?: string
  bible_nickname?: string
  active: boolean
  created_at: string
}

export interface Session {
  id: string
  type: ServiceType
  special_name?: string
  date: string
  preacher?: string
  male_count: number
  female_count: number
  children_count: number
  notes?: string
  parish_name?: string
  created_at: string
}

export interface Attendance {
  id: string
  session_id: string
  member_id: string
  checked_in_at: string
}

export interface Offering {
  id: string
  session_id: string
  // Sunday categories
  member_tithe: number
  ministers_tithe: number
  sunday_love_offering: number
  monthly_thanksgiving: number
  gospel_fund: number
  first_fruit: number
  children_offering: number
  house_fellowship: number
  first_born_redemption: number
  // Weekly
  crm: number
  // Additional
  mission: number
  sunday_school: number
  welfare: number
  pastors_welfare: number
  pastors_seed: number
  rebate_20: number
  admin: number
  special_project: number
  csr_run: number
  insurance: number
  others_1: number
  others_2: number
  others_3: number
  recorded_at: string
}