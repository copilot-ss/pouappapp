import { supabase } from '../lib/supabaseClient';
import { getSession } from './cloudFriends';

function cloudProgressAvailable() {
  return !!supabase;
}

export async function fetchCloudProgress() {
  if (!cloudProgressAvailable()) return null;
  const session = await getSession();
  if (!session) return null;
  try {
    const { data, error } = await supabase
      .from('user_progress')
      .select('user_id,hunger,fun,clean,energy,xp,coins,pet_type,inventory,equipped,is_sleeping,saved_at,updated_at')
      .eq('user_id', session.user.id)
      .maybeSingle();
    if (error && error.code !== 'PGRST116') {
      throw error;
    }
    return data || null;
  } catch (error) {
    const message = typeof error?.message === 'string' ? error.message : '';
    if (message.includes('Network request failed')) {
      return null;
    }
    throw error;
  }
}

export async function upsertCloudProgress(snapshot) {
  if (!cloudProgressAvailable()) return;
  const session = await getSession();
  if (!session) return;
  const payload = {
    user_id: session.user.id,
    hunger: Math.round(snapshot?.hunger ?? 80),
    fun: Math.round(snapshot?.fun ?? 80),
    clean: Math.round(snapshot?.clean ?? 80),
    energy: Math.round(snapshot?.energy ?? 80),
    xp: Math.round(snapshot?.xp ?? 0),
    coins: Math.round(snapshot?.coins ?? 0),
    pet_type: snapshot?.petType ?? null,
    inventory: snapshot?.inventory ?? {},
    equipped: snapshot?.equipped ?? {},
    is_sleeping: snapshot?.isSleeping ?? false,
    saved_at: snapshot?.savedAt ? new Date(snapshot.savedAt).toISOString() : new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  try {
    const { error } = await supabase
      .from('user_progress')
      .upsert(payload, { onConflict: 'user_id' });
    if (error) throw error;

    const { error: profileErr } = await supabase
      .from('profiles')
      .update({
        pet_type: payload.pet_type,
        xp: payload.xp,
        equipped: payload.equipped,
        last_seen: payload.updated_at,
      })
      .eq('user_id', session.user.id);
    if (profileErr && profileErr.code !== '42703') throw profileErr;
  } catch (error) {
    const message = typeof error?.message === 'string' ? error.message : '';
    if (message.includes('Network request failed')) {
      return;
    }
    throw error;
  }
}

