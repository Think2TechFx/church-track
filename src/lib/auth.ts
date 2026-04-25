import { supabase } from './supabase'

export interface ChurchUser {
  id: string
  parish_name: string
  pastor_name: string
  pastor_email: string
  head_usher_name: string
  head_usher_email: string
  zonal_hq: string
  province_hq: string
  regional_hq: string
  area_hq: string
  country: string
  state: string
  church_type: 'parish' | 'area' | 'zonal' | 'provincial' | 'regional' | 'national'
  verified: boolean
}

export async function registerChurch(data: {
  country: string
  state: string
  church_type: string
  parish_name: string
  area_hq: string
  zonal_hq: string
  province_hq: string
  regional_hq: string
  pastor_name: string
  pastor_email: string
  head_usher_name: string
  head_usher_email: string
  password: string
}) {
  const password_hash = btoa(data.password)

  const { data: church, error } = await supabase
    .from('churches')
    .insert({
      country: data.country,
      state: data.state,
      church_type: data.church_type,
      parish_name: data.parish_name,
      area_hq: data.area_hq,
      zonal_hq: data.zonal_hq,
      province_hq: data.province_hq,
      regional_hq: data.regional_hq,
      pastor_name: data.pastor_name,
      pastor_email: data.pastor_email,
      head_usher_name: data.head_usher_name,
      head_usher_email: data.head_usher_email,
      password_hash,
      verified: true,
    })
    .select()
    .single()

  if (error) throw error
  return church
}

export async function loginChurch(email: string, password: string) {
  const password_hash = btoa(password)

  const { data: church, error } = await supabase
    .from('churches')
    .select('*')
    .eq('pastor_email', email)
    .eq('password_hash', password_hash)
    .maybeSingle()

  if (error || !church) return null
  return church as ChurchUser
}

export function saveSession(church: ChurchUser) {
  localStorage.setItem('church_session', JSON.stringify(church))
}

export function getSession(): ChurchUser | null {
  const raw = localStorage.getItem('church_session')
  if (!raw) return null
  try {
    return JSON.parse(raw) as ChurchUser
  } catch {
    return null
  }
}

export function clearSession() {
  localStorage.removeItem('church_session')
}