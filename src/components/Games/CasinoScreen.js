import React from 'react';
import { View, Text, Pressable, StyleSheet, TextInput, ScrollView } from 'react-native';

function clampBet(bet, coins) {
  const maxCoins = Math.max(0, Math.floor(coins));
  if (maxCoins === 0) return 0;
  const desired = Math.max(1, Math.floor(Number(bet) || 0));
  return Math.min(desired, maxCoins);
}

function Row({ children }) { return <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>{children}</View>; }

export default function CasinoScreen({ open, onClose, coins, onDeltaCoins }) {
  const [tab, setTab] = React.useState('coin'); // coin|dice|bj
  const [bet, setBet] = React.useState('10');

  React.useEffect(() => { if (!open) { setTab('coin'); setBet('10'); } }, [open]);
  if (!open) return null;

  const inc = (v) => setBet(String(clampBet((Number(bet) || 0) + v, coins)));
  const setMax = () => {
    const maxCoins = Math.max(0, Math.floor(coins));
    setBet(String(maxCoins === 0 ? 0 : Math.max(1, maxCoins)));
  };

  const useBet = () => clampBet(bet, coins);

  const Coinflip = () => {
    const [pick, setPick] = React.useState(null);
    const [msg, setMsg] = React.useState('');
    const play = () => {
      const b = useBet();
      if (!b) { setMsg('Kein Einsatz verfuegbar'); return; }
      if (!pick) { setMsg('Waehle Kopf oder Zahl'); return; }
      const flip = Math.random() < 0.5 ? 'kopf' : 'zahl';
      if (flip === pick) {
        onDeltaCoins && onDeltaCoins(b);
        setMsg(`Gewonnen! (${flip}) +${b}`);
      } else {
        onDeltaCoins && onDeltaCoins(-b);
        setMsg(`Verloren. (${flip}) -${b}`);
      }
    };
    return (
      <View style={styles.card}> 
        <Row>
          <Pressable style={[styles.toggle, pick==='kopf' && styles.toggleOn]} onPress={() => setPick('kopf')}><Text style={[styles.toggleText, pick==='kopf' && styles.toggleTextOn]}>Kopf</Text></Pressable>
          <Pressable style={[styles.toggle, pick==='zahl' && styles.toggleOn]} onPress={() => setPick('zahl')}><Text style={[styles.toggleText, pick==='zahl' && styles.toggleTextOn]}>Zahl</Text></Pressable>
        </Row>
        <BetControls bet={bet} setBet={setBet} inc={inc} setMax={setMax} coins={coins} />
        <Pressable style={styles.primaryBtn} onPress={play}><Text style={styles.primaryText}>Spielen</Text></Pressable>
        {!!msg && <Text style={styles.msg}>{msg}</Text>}
      </View>
    );
  };

  const Dice = () => {
    const [pick, setPick] = React.useState('even');
    const [msg, setMsg] = React.useState('');
    const play = () => {
      const b = useBet();
      if (!b) { setMsg('Kein Einsatz verfuegbar'); return; }
      const roll = 1 + Math.floor(Math.random() * 6);
      const win = (pick === 'even' && roll % 2 === 0) || (pick === 'odd' && roll % 2 === 1);
      if (win) { onDeltaCoins && onDeltaCoins(b); setMsg(`Wuerfel ${roll}: Gewonnen! +${b}`); }
      else { onDeltaCoins && onDeltaCoins(-b); setMsg(`Wuerfel ${roll}: Verloren -${b}`); }
    };
    return (
      <View style={styles.card}>
        <Row>
          <Pressable style={[styles.toggle, pick==='even' && styles.toggleOn]} onPress={() => setPick('even')}><Text style={[styles.toggleText, pick==='even' && styles.toggleTextOn]}>Gerade</Text></Pressable>
          <Pressable style={[styles.toggle, pick==='odd' && styles.toggleOn]} onPress={() => setPick('odd')}><Text style={[styles.toggleText, pick==='odd' && styles.toggleTextOn]}>Ungerade</Text></Pressable>
        </Row>
        <BetControls bet={bet} setBet={setBet} inc={inc} setMax={setMax} coins={coins} />
        <Pressable style={styles.primaryBtn} onPress={play}><Text style={styles.primaryText}>Spielen</Text></Pressable>
        {!!msg && <Text style={styles.msg}>{msg}</Text>}
      </View>
    );
  };

  const Blackjack = () => {
    const [player, setPlayer] = React.useState([]);
    const [dealer, setDealer] = React.useState([]);
    const [done, setDone] = React.useState(false);
    const [msg, setMsg] = React.useState('');
    const [activeBet, setActiveBet] = React.useState(0);

    const formatCard = (card) => {
      if (card === 11) return 'A';
      return String(Math.min(card, 10));
    };

    const value = (hand) => {
      let sum = 0; let aces = 0;
      for (const c of hand) {
        if (c === 11) { aces++; sum += 11; }
        else { sum += Math.min(c, 10); }
      }
      while (sum > 21 && aces > 0) { sum -= 10; aces--; }
      return sum;
    };
    const draw = () => {
      const deck = [2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 10, 11];
      return deck[Math.floor(Math.random() * deck.length)];
    };
    const start = () => {
      const b = useBet();
      if (!b) { setMsg('Kein Einsatz verfuegbar'); return; }
      setActiveBet(b);
      setMsg('');
      setDone(false);
      const p = [draw(), draw()];
      const d = [draw(), draw()];
      setPlayer(p);
      setDealer(d);
    };
    const hit = () => {
      if (done || player.length === 0) return;
      const p = [...player, draw()];
      setPlayer(p);
      if (value(p) > 21) stand(p);
    };
    const settle = (p, d) => {
      const ps = value(p);
      const ds = value(d);
      const wager = activeBet || 0;
      if (!wager) { setMsg('Kein Einsatz gesetzt'); return; }
      if (ps > 21) {
        onDeltaCoins && onDeltaCoins(-wager);
        setMsg('Bust (' + ps + ') - Verloren -' + wager);
      } else if (ds > 21 || ps > ds) {
        onDeltaCoins && onDeltaCoins(wager);
        setMsg('Gewonnen ' + ps + ' vs ' + ds + ' +' + wager);
      } else if (ps < ds) {
        onDeltaCoins && onDeltaCoins(-wager);
        setMsg('Verloren ' + ps + ' vs ' + ds + ' -' + wager);
      } else {
        setMsg('Unentschieden ' + ps);
      }
    };
    const stand = (p0) => {
      const p = p0 || player;
      if (p.length === 0 || done) return;
      let d = [...dealer];
      while (value(d) < 17) d.push(draw());
      setDealer(d);
      setDone(true);
      settle(p, d);
    };
    const reset = () => {
      setPlayer([]);
      setDealer([]);
      setDone(false);
      setMsg('');
      setActiveBet(0);
    };
    const formatHand = (cards) => cards.map(formatCard).join(' ');

    return (
      <View style={styles.card}>
        {player.length === 0 ? (
          <>
            <BetControls bet={bet} setBet={setBet} inc={inc} setMax={setMax} coins={coins} />
            <Pressable style={styles.primaryBtn} onPress={start}><Text style={styles.primaryText}>Start</Text></Pressable>
            {!!msg && <Text style={styles.msg}>{msg}</Text>}
          </>
        ) : (
          <>
            <Row><Text style={styles.label}>Dealer:</Text><Text style={styles.cards}>{formatHand(dealer)}</Text><Text>({value(dealer)})</Text></Row>
            <Row><Text style={styles.label}>Du:</Text><Text style={styles.cards}>{formatHand(player)}</Text><Text>({value(player)})</Text></Row>
            <Row><Text style={styles.label}>Einsatz:</Text><Text style={styles.cards}>{activeBet}</Text></Row>
            {!done ? (
              <Row>
                <Pressable style={styles.secondaryBtn} onPress={hit}><Text style={styles.secondaryText}>Hit</Text></Pressable>
                <Pressable style={styles.primaryBtn} onPress={() => stand()}><Text style={styles.primaryText}>Stand</Text></Pressable>
              </Row>
            ) : (
              <Row>
                <Pressable style={styles.primaryBtn} onPress={reset}><Text style={styles.primaryText}>Neue Runde</Text></Pressable>
              </Row>
            )}
            {!!msg && <Text style={styles.msg}>{msg}</Text>}
          </>
        )}
      </View>
    );
  };


  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>Gluecksspiel</Text>
        <Pressable onPress={onClose} hitSlop={12} style={styles.closeBtn}>
          <Text style={styles.closeX}>{String.fromCodePoint(0x2715)}</Text>
        </Pressable>
      </View>
      <View style={styles.tabs}>
        <Pressable style={[styles.tab, tab==='coin' && styles.tabOn]} onPress={() => setTab('coin')}><Text style={[styles.tabText, tab==='coin' && styles.tabTextOn]}>Coinflip</Text></Pressable>
        <Pressable style={[styles.tab, tab==='dice' && styles.tabOn]} onPress={() => setTab('dice')}><Text style={[styles.tabText, tab==='dice' && styles.tabTextOn]}>Dice</Text></Pressable>
        <Pressable style={[styles.tab, tab==='bj' && styles.tabOn]} onPress={() => setTab('bj')}><Text style={[styles.tabText, tab==='bj' && styles.tabTextOn]}>Blackjack</Text></Pressable>
      </View>
      <ScrollView contentContainerStyle={{ padding: 12, gap: 12 }}>
        <Row><Text style={styles.coins}>{String.fromCodePoint(0x1F4B0)} {coins} Coins</Text></Row>
        {tab==='coin' && <Coinflip />}
        {tab==='dice' && <Dice />}
        {tab==='bj' && <Blackjack />}
      </ScrollView>
    </View>
  );
}

function BetControls({ bet, setBet, inc, setMax, coins }) {
  return (
    <Row>
      <Pressable style={styles.stepBtn} onPress={() => inc(-10)}><Text style={styles.stepText}>-10</Text></Pressable>
      <Pressable style={styles.stepBtn} onPress={() => inc(-1)}><Text style={styles.stepText}>-1</Text></Pressable>
      <TextInput style={styles.betInput} keyboardType="numeric" value={String(bet)} onChangeText={setBet} />
      <Pressable style={styles.stepBtn} onPress={() => inc(1)}><Text style={styles.stepText}>+1</Text></Pressable>
      <Pressable style={styles.stepBtn} onPress={() => inc(10)}><Text style={styles.stepText}>+10</Text></Pressable>
      <Pressable style={styles.stepBtn} onPress={setMax}><Text style={styles.stepText}>MAX</Text></Pressable>
    </Row>
  );
}

const styles = StyleSheet.create({
  screen: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: '#FDF4FF', zIndex: 110, elevation: 12 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 24, paddingBottom: 16, backgroundColor: '#6D28D9', shadowColor: '#4C1D95', shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 6, borderBottomWidth: 0 },
  title: { fontSize: 18, fontWeight: '700', color: '#F8FAFC' },
  closeBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: '#7C3AED' },
  closeX: { fontSize: 24, color: '#F8FAFC', fontWeight: '800' },
  tabs: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 10 },
  tab: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: '#E0E7FF' },
  tabOn: { backgroundColor: '#7C3AED' },
  tabText: { fontSize: 14, fontWeight: '700', color: '#4338CA' },
  tabTextOn: { color: '#FFFFFF' },
  coins: { fontSize: 14, fontWeight: '800', color: '#5B21B6' },
  card: { borderWidth: 1, borderColor: '#DDD6FE', backgroundColor: '#F8FAFC', borderRadius: 16, padding: 16, gap: 12, shadowColor: '#6366F1', shadowOpacity: 0.15, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 4 },
  label: { fontSize: 14, fontWeight: '700', color: '#1E293B' },
  toggle: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999, borderWidth: 1, borderColor: '#DDD6FE', backgroundColor: '#EDE9FE' },
  toggleOn: { backgroundColor: '#7C3AED', borderColor: '#5B21B6' },
  toggleText: { color: '#5B21B6', fontWeight: '700' },
  toggleTextOn: { color: '#FFFFFF' },
  betInput: { width: 80, height: 40, borderWidth: 1, borderColor: '#C7D2FE', backgroundColor: '#FFFFFF', textAlign: 'center', borderRadius: 10, fontWeight: '700', color: '#0F172A' },
  stepBtn: { backgroundColor: '#BAE6FD', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  stepText: { fontWeight: '800', color: '#0C4A6E' },
  primaryBtn: { backgroundColor: '#F97316', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999, alignSelf: 'flex-start', shadowColor: '#EA580C', shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  primaryText: { color: '#FFFFFF', fontWeight: '800', letterSpacing: 0.3 },
  secondaryBtn: { backgroundColor: '#FDE68A', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999, borderWidth: 1, borderColor: '#F59E0B' },
  secondaryText: { color: '#92400E', fontWeight: '800' },
  msg: { color: '#7C3AED', fontWeight: '700' },
  cards: { fontWeight: '800', color: '#1E293B' },
});


