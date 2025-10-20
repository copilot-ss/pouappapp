import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { ensureAccount, saveAccount } from '../../state/account';
import {
  cloudAvailable,
  getSession,
  signInEmailPassword,
  signUpEmailPassword,
  signOut,
  getOrCreateProfile,
  updateDisplayName,
} from '../../state/cloudFriends';
import { getSpecies } from '../../domain/species';

let Clipboard = null;
try {
  const mod = require('expo-clipboard');
  Clipboard = mod?.default ?? mod;
} catch (error) {
  if (__DEV__) {
    console.warn('expo-clipboard native module missing; copy disabled.', error);
  }
}

function formatCode(code) {
  if (!code) return '------';
  return String(code).toUpperCase();
}

export default function ProfileScreen({
  open,
  onClose,
  levelInfo,
  xp,
  coins,
  petType,
  selfSnapshot,
}) {
  const [cloud, setCloud] = React.useState(false);
  const [session, setSession] = React.useState(null);
  const [cloudProfile, setCloudProfile] = React.useState(null);
  const [account, setAccount] = React.useState(null);
  const [displayName, setDisplayName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [signupDisplayName, setSignupDisplayName] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [statusMessage, setStatusMessage] = React.useState(null);
  const [errorMessage, setErrorMessage] = React.useState(null);
  const [copyFeedback, setCopyFeedback] = React.useState(null);
  const copyResetRef = React.useRef(null);

  const species = petType ? getSpecies(petType) : null;
  const level = levelInfo?.level ?? 1;
  const activeFriendCode = cloud && cloudProfile?.code ? cloudProfile.code : account?.code;
  const formattedFriendCode = formatCode(activeFriendCode);
  const copyDisabled = !activeFriendCode || loading;
  const cloudDisplayNameLocked =
    cloud && session && Boolean(cloudProfile?.display_name && String(cloudProfile.display_name).trim().length > 0);
  const canEditDisplayName = !cloudDisplayNameLocked;

  const clearCopyTimeout = React.useCallback(() => {
    if (copyResetRef.current) {
      clearTimeout(copyResetRef.current);
      copyResetRef.current = null;
    }
  }, []);

  const showCopyMessage = React.useCallback(
    (message) => {
      clearCopyTimeout();
      setCopyFeedback(message);
      copyResetRef.current = setTimeout(() => {
        setCopyFeedback(null);
        copyResetRef.current = null;
      }, 1400);
    },
    [clearCopyTimeout],
  );

  React.useEffect(() => {
    return () => {
      clearCopyTimeout();
    };
  }, [clearCopyTimeout]);

  const loadProfile = React.useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    setStatusMessage(null);
    try {
      const offline = await ensureAccount();
      setAccount(offline);
      setDisplayName((prev) => (prev !== '' ? prev : offline?.name || ''));

      const enabled = cloudAvailable();
      setCloud(enabled);

      if (enabled) {
        const sess = await getSession();
        setSession(sess);

        if (sess) {
          setSignupDisplayName('');
          const profile = await getOrCreateProfile(offline?.name || '');
          setCloudProfile(profile);
          const nextName = profile?.display_name ?? offline?.name ?? '';
          setDisplayName(nextName);
          if ((offline?.name || '') !== nextName) {
            const updated = await saveAccount({ name: nextName });
            setAccount(updated);
          }
        } else {
          setCloudProfile(null);
        }
      } else {
        setSession(null);
        setCloudProfile(null);
      }
    } catch (error) {
      if (__DEV__) console.warn('loadProfile failed', error);
      setErrorMessage('Profil konnte nicht geladen werden.');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (!open) return;
    loadProfile();
  }, [loadProfile, open]);

  const applyCloudDisplayName = React.useCallback(
    async (name) => {
      const trimmed = (name || '').trim();
      const next = await updateDisplayName(trimmed);
      setCloudProfile(next);
      setDisplayName(next?.display_name ?? trimmed);
      const saved = await saveAccount({ name: trimmed });
      setAccount(saved);
      return next;
    },
    [setAccount, setCloudProfile, setDisplayName, updateDisplayName, saveAccount],
  );

  if (!open) return null;

  const handleSaveName = async () => {
    const trimmed = (displayName || '').trim();
    setStatusMessage(null);
    setErrorMessage(null);
    if (!trimmed && (!cloud || !session)) {
      setErrorMessage('Bitte Anzeigename eingeben.');
      return;
    }
    try {
      if (cloud && session) {
        if (cloudDisplayNameLocked) {
          setErrorMessage('Anzeigename wurde bereits festgelegt.');
          return;
        }
        if (!trimmed) {
          setErrorMessage('Bitte Anzeigename eingeben.');
          return;
        }
        setLoading(true);
        await applyCloudDisplayName(trimmed);
        setStatusMessage('Anzeigename festgelegt.');
      } else {
        const next = await saveAccount({ name: trimmed });
        setAccount(next);
        setStatusMessage('Name gespeichert (offline).');
      }
    } catch (error) {
      if (__DEV__) console.warn('save name failed', error);
      const message = (typeof error?.message === 'string' && error.message) || '';
      if (message === 'display_name_required' || trimmed === '') {
        setErrorMessage('Bitte Anzeigename eingeben.');
      } else if (message === 'display_name_locked') {
        setErrorMessage('Anzeigename wurde bereits festgelegt.');
      } else {
        setErrorMessage('Name konnte nicht gespeichert werden.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = async () => {
    if (!activeFriendCode) return;
    try {
      const clip = Clipboard;
      if (clip?.setStringAsync) {
        await clip.setStringAsync(String(activeFriendCode));
        showCopyMessage('Code kopiert!');
        return;
      }
      if (clip && typeof clip.setString === 'function') {
        clip.setString(String(activeFriendCode));
        showCopyMessage('Code kopiert!');
        return;
      }
      showCopyMessage('Zwischenablage nicht verfuegbar');
    } catch {
      showCopyMessage('Kopieren fehlgeschlagen');
    }
  };

  const handleSignIn = async () => {
    setLoading(true);
    setErrorMessage(null);
    setStatusMessage(null);
    try {
      await signInEmailPassword(email.trim(), password);
      setEmail('');
      setPassword('');
      await loadProfile();
      setStatusMessage('Erfolgreich angemeldet.');
    } catch (error) {
      const message = (typeof error?.message === 'string' && error.message) || '';
      if (__DEV__) console.warn('sign in failed', error);
      if (message.includes('Network request failed')) {
        setErrorMessage('Keine Verbindung. Bitte spaeter erneut versuchen.');
      } else {
        setErrorMessage('Anmeldung fehlgeschlagen.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    const trimmedDisplayName = signupDisplayName.trim();
    if (!trimmedDisplayName) {
      setErrorMessage('Bitte Anzeigename waehlen.');
      return;
    }
    setLoading(true);
    setErrorMessage(null);
    setStatusMessage(null);
    try {
      await signUpEmailPassword(email.trim(), password);
      setEmail('');
      setPassword('');
      await loadProfile();
      try {
        await applyCloudDisplayName(trimmedDisplayName);
        setSignupDisplayName('');
        setStatusMessage('Account erstellt. Anzeigename festgelegt.');
      } catch (error) {
        const message = (typeof error?.message === 'string' && error.message) || '';
        if (message === 'display_name_locked') {
          setErrorMessage('Anzeigename wurde bereits festgelegt.');
        } else if (message === 'display_name_required') {
          setErrorMessage('Bitte Anzeigename waehlen.');
        } else {
          if (__DEV__) console.warn('apply display name failed', error);
          setErrorMessage('Anzeigename konnte nicht gesetzt werden.');
        }
        return;
      }
    } catch (error) {
      const message = (typeof error?.message === 'string' && error.message) || '';
      if (__DEV__) console.warn('sign up failed', error);
      if (message.includes('Network request failed')) {
        setErrorMessage('Keine Verbindung. Bitte spaeter erneut versuchen.');
      } else {
        setErrorMessage('Registrierung fehlgeschlagen.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    setLoading(true);
    setErrorMessage(null);
    setStatusMessage(null);
    try {
      await signOut();
      await loadProfile();
      setStatusMessage('Abgemeldet.');
    } catch (error) {
      const message = (typeof error?.message === 'string' && error.message) || '';
      if (__DEV__) console.warn('sign out failed', error);
      if (message.includes('Network request failed')) {
        setErrorMessage('Abmelden nicht moeglich (offline).');
      } else {
        setErrorMessage('Abmelden fehlgeschlagen.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.screen} pointerEvents="auto">
      <View style={styles.header}>
        <Text style={styles.title}>Profil</Text>
        <Pressable onPress={onClose} hitSlop={12} style={styles.closeBtn}>
          <Text style={styles.closeX}>{String.fromCodePoint(0x2715)}</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {cloud && !session && (
          <View style={[styles.card, styles.cardAccent]}>
            <Text style={styles.sectionTitle}>Anmelden oder Registrieren</Text>
            <Text style={styles.label}>E-Mail</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              editable={!loading}
            />
            <Text style={styles.label}>Passwort</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              editable={!loading}
            />
            <Text style={styles.label}>Anzeigename (einmalig)</Text>
            <TextInput
              style={styles.input}
              placeholder="z.B. KalamarFan"
              value={signupDisplayName}
              onChangeText={setSignupDisplayName}
              editable={!loading}
              maxLength={26}
              autoCapitalize="words"
            />
            <Text style={styles.hintSmall}>Der Anzeigename wird bei der Registrierung festgelegt und kann nicht mehr geändert werden.</Text>
            <View style={styles.row}>
              <Pressable style={[styles.primaryBtn, loading && styles.disabledBtn]} onPress={handleSignIn} disabled={loading}>
                <Text style={styles.primaryBtnText}>Einloggen</Text>
              </Pressable>
              <Pressable style={[styles.secondaryBtn, loading && styles.disabledBtn]} onPress={handleSignUp} disabled={loading}>
                <Text style={styles.secondaryBtnText}>Registrieren</Text>
              </Pressable>
            </View>
            <Text style={styles.hint}>Melde dich an, um Freunde in der Cloud freizuschalten.</Text>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Spielstatus</Text>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Level</Text>
            <Text style={styles.statValue}>{level}</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Tier</Text>
            <Text style={styles.statValue}>{species ? species.name : petType || 'Unbekannt'}</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Coins</Text>
            <Text style={styles.statValue}>{coins ?? 0}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Anzeigename</Text>
          <TextInput
            style={[styles.input, !canEditDisplayName && styles.inputLocked]}
            placeholder={canEditDisplayName ? 'Dein Anzeigename' : 'Anzeigename festgelegt'}
            value={displayName}
            onChangeText={setDisplayName}
            editable={canEditDisplayName && !loading}
            selectTextOnFocus={canEditDisplayName}
            maxLength={26}
          />
          {canEditDisplayName ? (
            <Pressable
              style={[styles.primaryBtn, loading && styles.disabledBtn]}
              onPress={handleSaveName}
              disabled={loading}
            >
              <Text style={styles.primaryBtnText}>Speichern</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Freundescode</Text>
          <View style={styles.codeRow}>
            <Text style={styles.friendCode}>{formattedFriendCode}</Text>
            <Pressable
              style={[styles.copyBtn, (copyDisabled) && styles.disabledBtn]}
              onPress={handleCopyCode}
              disabled={copyDisabled}
            >
              <Text style={styles.copyBtnText}>Kopieren</Text>
            </Pressable>
          </View>
          {copyFeedback && <Text style={styles.statusSuccess}>{copyFeedback}</Text>}
          <Text style={styles.hint}>
            Teile den Code mit Freunden, damit sie dich finden koennen.
          </Text>
        </View>

        {statusMessage && <Text style={styles.statusSuccess}>{statusMessage}</Text>}
        {errorMessage && <Text style={styles.statusError}>{errorMessage}</Text>}
        {loading && <ActivityIndicator style={{ marginTop: 12 }} />}
        {cloud && session && (
          <Pressable
            style={[styles.secondaryBtn, loading && styles.disabledBtn, { alignSelf: 'center', marginTop: 24 }]}
            onPress={handleSignOut}
            disabled={loading}
          >
            <Text style={styles.secondaryBtnText}>Abmelden</Text>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    zIndex: 130,
    elevation: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 36,
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: { fontSize: 20, fontWeight: '800', color: '#111827' },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  closeX: { fontSize: 28, color: '#111827', fontWeight: '900' },
  content: { paddingHorizontal: 16, paddingBottom: 24, paddingTop: 12, gap: 14 },
  card: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  cardAccent: { borderColor: '#111827' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  label: { fontSize: 13, fontWeight: '700', color: '#374151' },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#111827',
  },
  inputLocked: {
    backgroundColor: '#E5E7EB',
    color: '#4B5563',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  primaryBtn: {
    backgroundColor: '#111827',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  primaryBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700', letterSpacing: 0.4 },
  secondaryBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#111827',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  secondaryBtnText: { color: '#111827', fontSize: 14, fontWeight: '800', letterSpacing: 0.4 },
  disabledBtn: { opacity: 0.5 },
  hint: { color: '#6B7280', fontSize: 12 },
  hintSmall: { color: '#6B7280', fontSize: 11, marginBottom: 4 },
  lockedNote: { color: '#6B7280', fontSize: 12, fontStyle: 'italic', marginTop: 6 },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statLabel: { fontSize: 14, fontWeight: '600', color: '#1F2937' },
  statValue: { fontSize: 14, fontWeight: '700', color: '#111827' },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  friendCode: { fontSize: 22, fontWeight: '800', letterSpacing: 2, color: '#111827' },
  copyBtn: {
    backgroundColor: '#1F2937',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  copyBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  statusSuccess: { color: '#10B981', fontSize: 12, fontWeight: '600' },
  statusError: { color: '#DC2626', fontSize: 12, fontWeight: '600' },
});
