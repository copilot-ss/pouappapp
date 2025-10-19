import { supabase } from '../lib/supabaseClient';

function normalizeProfileRow(row) {
  if (!row) return row;
  return {
    ...row,
    pet_type: row.pet_type ?? null,
    xp: typeof row.xp === 'number' ? row.xp : 0,
    equipped: row.equipped && typeof row.equipped === 'object' ? row.equipped : {},
    last_seen: row.last_seen ?? null,
  };
}

function isFriendVisitTableMissing(error) {
  if (!error) return false;
  const code = error.code || error.error_code || error.status;
  if (code === '42P01' || code === '42501' || code === '42703') return true;
  const message = typeof error.message === 'string' ? error.message : '';
  return message.includes('friend_visits');
}

async function selectProfileWithFallback(builder) {
  const columnsWithMeta = 'id, user_id, display_name, code, pet_type, xp, equipped, last_seen';
  let query = builder(supabase.from('profiles').select(columnsWithMeta));
  let { data, error } = await query;
  if (error && error.code === '42703') {
    query = builder(supabase.from('profiles').select('id, user_id, display_name, code'));
    ({ data, error } = await query);
    if (!error && data) {
      data = data.map(normalizeProfileRow);
    }
  }
  if (error) throw error;
  return (data || []).map(normalizeProfileRow);
}

export function cloudAvailable() {
  return !!supabase;
}

export async function getSession() {
  if (!cloudAvailable()) return null;
  try {
    const { data } = await supabase.auth.getSession();
    return data?.session || null;
  } catch (error) {
    const message = typeof error?.message === 'string' ? error.message : '';
    if (message.includes('Network request failed')) {
      return null;
    }
    throw error;
  }
}

export async function signInEmailPassword(email, password) {
  if (!cloudAvailable()) throw new Error('Cloud not configured');
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.session;
}

export async function signUpEmailPassword(email, password) {
  if (!cloudAvailable()) throw new Error('Cloud not configured');
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  return data.user;
}

export async function signOut() {
  if (!cloudAvailable()) return;
  await supabase.auth.signOut();
}

// Profiles
export async function getOrCreateProfile(displayName) {
  const session = await getSession();
  if (!session) throw new Error('not_authenticated');
  const uid = session.user.id;
  const rows = await selectProfileWithFallback((q) => q.eq('user_id', uid).limit(1));
  if (rows && rows.length > 0) return normalizeProfileRow(rows[0]);
  const code = await requestUniqueCode();
  const name = (displayName || '').trim();
  try {
    const { data, error } = await supabase
      .from('profiles')
      .insert({ user_id: uid, display_name: name || null, code })
      .select('id, user_id, display_name, code, pet_type, xp, equipped, last_seen')
      .single();
    if (error) throw error;
    return normalizeProfileRow(data);
  } catch (error) {
    if (error?.code === '42703') {
      await supabase.from('profiles').insert({ user_id: uid, display_name: name || null, code });
      const fallback = await selectProfileWithFallback((q) => q.eq('user_id', uid).limit(1));
      return fallback[0] ? normalizeProfileRow(fallback[0]) : null;
    }
    throw error;
  }
}

export async function updateDisplayName(name) {
  const session = await getSession();
  if (!session) throw new Error('not_authenticated');
  const uid = session.user.id;
  const trimmed = (name || '').trim();
  if (!trimmed) {
    const err = new Error('display_name_required');
    err.code = 'display_name_required';
    throw err;
  }
  const existingRows = await selectProfileWithFallback((q) => q.eq('user_id', uid).limit(1));
  const existing = existingRows && existingRows.length > 0 ? normalizeProfileRow(existingRows[0]) : null;
  if (!existing) {
    const err = new Error('profile_not_found');
    err.code = 'profile_not_found';
    throw err;
  }
  if (existing.display_name) {
    const current = String(existing.display_name).trim();
    if (current.length > 0) {
      const err = new Error('display_name_locked');
      err.code = 'display_name_locked';
      err.currentDisplayName = current;
      throw err;
    }
  }
  try {
    const { data, error } = await supabase
      .from('profiles')
      .update({ display_name: trimmed })
      .eq('user_id', uid)
      .select('id, user_id, display_name, code, pet_type, xp, equipped, last_seen')
      .single();
    if (error) throw error;
    return normalizeProfileRow(data);
  } catch (error) {
    if (error?.code === '42703') {
      await supabase
        .from('profiles')
        .update({ display_name: trimmed })
        .eq('user_id', uid);
      const rows = await selectProfileWithFallback((q) => q.eq('user_id', uid).limit(1));
      return rows[0] ? normalizeProfileRow(rows[0]) : null;
    }
    throw error;
  }
}

async function requestUniqueCode() {
  const { data, error } = await supabase.rpc('generate_unique_code');
  if (error) throw error;
  return data;
}

// Friends list and requests
export async function fetchFriends() {
  const session = await getSession();
  if (!session) throw new Error('not_authenticated');
  const uid = session.user.id;
  const { data, error } = await supabase
    .from('friends_view')
    .select('friend_id, friend_code, friend_name')
    .eq('user_id', uid)
    .order('friend_name', { ascending: true });
  if (error) throw error;
  const rows = data || [];
  if (rows.length === 0) return [];
  const friendIds = rows.map((row) => row.friend_id);
  let profiles = [];
  try {
    const { data: profileRows, error: profileErr } = await supabase
      .from('profiles')
      .select('user_id, display_name, pet_type, xp, equipped, last_seen')
      .in('user_id', friendIds);
    if (profileErr) throw profileErr;
    profiles = (profileRows || []).map(normalizeProfileRow);
  } catch (error) {
    if (error?.code === '42703') {
      const { data: profileRows } = await supabase
        .from('profiles')
        .select('user_id, display_name')
        .in('user_id', friendIds);
      profiles = (profileRows || []).map(normalizeProfileRow);
    } else {
      throw error;
    }
  }
  const profileMap = new Map(profiles.map((p) => [p.user_id, p]));
  return rows.map((row) => {
    const profile = profileMap.get(row.friend_id) || {};
    return {
      ...row,
      friend_name: profile.display_name || row.friend_name,
      friend_pet_type: profile.pet_type || null,
      friend_xp: typeof profile.xp === 'number' ? profile.xp : 0,
      friend_equipped: profile.equipped || {},
      friend_last_seen: profile.last_seen || null,
    };
  });
}

export async function fetchRequests() {
  const session = await getSession();
  if (!session) throw new Error('not_authenticated');
  const uid = session.user.id;
  const { data, error } = await supabase
    .from('friend_requests_view')
    .select('*')
    .eq('addressee_id', uid)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function sendFriendRequestByCode(code) {
  const session = await getSession();
  if (!session) throw new Error('not_authenticated');
  const norm = (code || '').toUpperCase().trim();
  if (!norm) throw new Error('invalid_code');
  const requesterId = session.user.id;
  const { data: target, error: findErr } = await supabase
    .from('profiles')
    .select('user_id')
    .eq('code', norm)
    .single();
  if (findErr) throw findErr;
  const targetId = target.user_id;
  if (targetId === requesterId) {
    throw new Error('cannot_request_self');
  }
  const { data, error: reqErr } = await supabase
    .from('friend_requests')
    .insert({ requester_id: requesterId, addressee_id: targetId, status: 'pending' })
    .select('id')
    .single();
  if (reqErr) throw reqErr;
  return data;
}

export async function acceptRequest(requestId) {
  const { data, error } = await supabase.rpc('accept_friend_request', { req_id: requestId });
  if (error) throw error;
  return data;
}

export async function declineRequest(requestId) {
  const { error } = await supabase
    .from('friend_requests')
    .update({ status: 'declined' })
    .eq('id', requestId);
  if (error) throw error;
}

export async function removeFriendship(friendId) {
  const session = await getSession();
  if (!session) throw new Error('not_authenticated');
  const { error } = await supabase.rpc('remove_friendship', { target_id: friendId });
  if (error) throw error;
}



export async function startFriendVisit(hostId, visitor = {}) {
  if (!cloudAvailable()) return;
  const session = await getSession();
  if (!session) throw new Error('not_authenticated');
  if (!hostId) throw new Error('invalid_host');
  const now = new Date().toISOString();
  const payload = {
    host_id: hostId,
    visitor_id: session.user.id,
    visitor_name: visitor?.name || null,
    visitor_pet_type: visitor?.petType || null,
    visitor_equipped: visitor?.equipped && typeof visitor.equipped === 'object' ? visitor.equipped : {},
    visitor_started_at: visitor?.startedAt || now,
    updated_at: now,
  };
  try {
    const { error } = await supabase.from('friend_visits').upsert(payload, { onConflict: 'host_id' });
    if (error) throw error;
  } catch (error) {
    if (isFriendVisitTableMissing(error)) return;
    throw error;
  }
}

export async function endFriendVisit(hostId) {
  if (!cloudAvailable()) return;
  if (!hostId) return;
  const session = await getSession();
  if (!session) throw new Error('not_authenticated');
  try {
    const { error } = await supabase
      .from('friend_visits')
      .delete()
      .eq('host_id', hostId)
      .eq('visitor_id', session.user.id);
    if (error) throw error;
  } catch (error) {
    if (isFriendVisitTableMissing(error)) return;
    throw error;
  }
}

export async function endFriendVisitAsHost(hostId) {
  if (!cloudAvailable()) return;
  const session = await getSession();
  if (!session) throw new Error('not_authenticated');
  const target = hostId || session.user.id;
  if (!target) return;
  try {
    const { error } = await supabase
      .from('friend_visits')
      .delete()
      .eq('host_id', target);
    if (error) throw error;
  } catch (error) {
    if (isFriendVisitTableMissing(error)) return;
    throw error;
  }
}

export async function fetchActiveVisitForHost(hostId) {
  if (!cloudAvailable()) return null;
  const baseSession = await getSession();
  if (!baseSession && !hostId) return null;
  const targetHost = hostId || baseSession?.user?.id;
  if (!targetHost) return null;
  try {
    const { data, error } = await supabase
      .from('friend_visits')
      .select('host_id, visitor_id, visitor_name, visitor_pet_type, visitor_equipped, visitor_started_at, updated_at')
      .eq('host_id', targetHost)
      .maybeSingle();
    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
  } catch (error) {
    if (isFriendVisitTableMissing(error)) return null;
    throw error;
  }
}

export function subscribeToFriendVisits(hostId, handler) {
  if (!cloudAvailable() || !hostId) return null;
  try {
    return supabase
      .channel(`friend-visits-${hostId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friend_visits', filter: `host_id=eq.${hostId}` }, (payload) => {
        handler?.(payload);
      })
      .subscribe();
  } catch (error) {
    const message = typeof error?.message === 'string' ? error.message : '';
    if (isFriendVisitTableMissing(error) || message.includes('Network request failed')) {
      return null;
    }
    throw error;
  }
}
