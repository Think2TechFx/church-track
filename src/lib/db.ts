import { supabase } from './supabase'
import type { Member, Session, Attendance, Offering } from '../types'

// ─── MEMBERS ─────────────────────────────────────────
export async function getMembers() {
  const { data, error } = await supabase
    .from('members')
    .select('*')
    .order('name')
  if (error) throw error
  return data as Member[]
}

export async function addMember(member: Omit<Member, 'id' | 'created_at'>) {
  const { data, error } = await supabase
    .from('members')
    .insert(member)
    .select()
    .single()
  if (error) throw error
  return data as Member
}

export async function updateMember(id: string, updates: Partial<Member>) {
  const { data, error } = await supabase
    .from('members')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as Member
}

// ─── SESSIONS ─────────────────────────────────────────
export async function getSessions() {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .order('date', { ascending: false })
  if (error) throw error
  return data as Session[]
}

export async function addSession(session: Omit<Session, 'id' | 'created_at'>) {
  const { data, error } = await supabase
    .from('sessions')
    .insert(session)
    .select()
    .single()
  if (error) throw error
  return data as Session
}

// ─── ATTENDANCE ────────────────────────────────────────
export async function getAttendance(sessionId: string) {
  const { data, error } = await supabase
    .from('attendance')
    .select('*')
    .eq('session_id', sessionId)
  if (error) throw error
  return data as Attendance[]
}

export async function checkInMember(sessionId: string, memberId: string) {
  const { data, error } = await supabase
    .from('attendance')
    .insert({ session_id: sessionId, member_id: memberId })
    .select()
    .single()
  if (error) throw error
  return data as Attendance
}

export async function getMemberByPhone(phone: string) {
  const { data, error } = await supabase
    .from('members')
    .select('*')
    .eq('phone', phone)
    .maybeSingle()
  if (error) return null
  return data as Member
}

// ─── OFFERINGS ─────────────────────────────────────────
export async function getOffering(sessionId: string) {
  const { data, error } = await supabase
    .from('offerings')
    .select('*')
    .eq('session_id', sessionId)
    .maybeSingle()
  if (error) return null
  return data as Offering
}

export async function upsertOffering(offering: Omit<Offering, 'id' | 'recorded_at'>) {
  const { data, error } = await supabase
    .from('offerings')
    .upsert(offering, { onConflict: 'session_id' })
    .select()
    .single()
  if (error) throw error
  return data as Offering
}

export async function getTodaySession() {
  const now = new Date()
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('date', today)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) return null
  return data as Session
}

export async function getMemberByBibleNickname(nickname: string) {
  const { data, error } = await supabase
    .from('members')
    .select('*')
    .ilike('bible_nickname', nickname)
    .maybeSingle()
  if (error) return null
  if (!data) return null
  return data as Member
}