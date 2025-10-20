import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Background from '../components/Background';
import LevelHeader from '../components/LevelHeader';
import StatBar from '../components/StatBar';
import ActionDock from '../components/ActionDock';
import PetArea from '../components/PetArea';
import CoinsInline from '../components/CoinsInline';
import ShopButton from '../components/Shop/ShopButton';
import ShopScreen from '../components/Shop/ShopScreen';
import InventoryButton from '../components/Inventory/InventoryButton';
import InventoryScreen from '../components/Inventory/InventoryScreen';
import GameButton from '../components/Games/GameButton';
import GamesMenu from '../components/Games/GamesMenu';
import ReactionGameScreen from '../components/Games/ReactionGameScreen2';
import TapGameScreen from '../components/Games/TapGameScreen';
import CatchGameScreen from '../components/Games/CatchGameScreen';
import CasinoScreen from '../components/Games/CasinoScreen';
import FriendsButton from '../components/Friends/FriendsButton';
import FriendsScreen from '../components/Friends/FriendsScreen';
import PetSelectScreen from '../components/PetSelectScreen';
import SettingsScreen from '../components/Settings/SettingsScreen';
import OutfitPreview from '../components/OutfitPreview';
import ProfileScreen from '../components/Profile/ProfileScreen';
import { FEED_COST } from '../lib/constants';

const SOAP_ICON = require('../../assets/ui/soap.png');
const SOAP_ICON_SIZE = 36;

export default function GameScreen({ controller }) {
  const {
    hunger,
    fun,
    clean,
    energy,
    xp,
    coins,
    shopOpen,
    setShopOpen,
    inventoryOpen,
    setInventoryOpen,
    gameOpen,
    setGameOpen,
    gamesMenuOpen,
    setGamesMenuOpen,
    selectedGame,
    setSelectedGame,
    friendsOpen,
    setFriendsOpen,
    profileOpen,
    setProfileOpen,
    visitingFriend,
    incomingVisitor,
    ticTacToeOutgoing,
    ticTacToeIncoming,
    ticTacToeMatch,
    ticTacToeStatusByFriend,
    petType,
    petSelectOpen,
    setPetSelectOpen,
    settingsOpen,
    setSettingsOpen,
    soundOn,
    hapticsOn,
    isSleeping,
    isWashing,
    setPetAreaLayout,
    washBubbles,
    foodFlyers,
    soapDrag,
    emotion,
    petScale,
    toastOpacity,
    toastMessage,
    inventory,
    equipped,
    levelInfo,
    canAct,
    mood,
    visitingFriendLevel,
    visitingFriendSpecies,
    incomingVisitorSpecies,
    feed,
    toggleSleep,
    handleSoapDragStart,
    handleSoapDragMove,
    handleSoapDragEnd,
    handlePetAreaInteract,
    handleVisitFriend,
    handleFriendRemoved,
    handleInviteTicTacToe,
    handleCancelTicTacToeInvite,
    handleAcceptTicTacToeInvite,
    handleDeclineTicTacToeInvite,
    handleSubmitTicTacToeMove,
    handleDismissTicTacToeMatch,
    handleForfeitTicTacToeMatch,
    handleEndVisit,
    handleDismissIncomingVisit,
    handleShopPurchase,
    handleEquip,
    handleUnequip,
    handleGameReward,
    handleCasinoDelta,
    updateSettings,
    resetPet,
    selectPet,
    petAreaRef,
    mainRef,
    cloudUserId,
    selfSnapshot,
  } = controller;

  const outgoingInviteName = ticTacToeOutgoing?.opponentName || 'Freund';
  const incomingInviteName = ticTacToeIncoming?.hostName || 'Freund';
  const incomingInviteSymbol = ticTacToeIncoming?.opponentSymbol || 'O';
  const activeOpponentName = ticTacToeMatch
    ? cloudUserId && ticTacToeMatch.hostId === cloudUserId
      ? ticTacToeMatch.opponentName || 'Freund'
      : ticTacToeMatch.hostName || 'Freund'
    : null;
  const activeMySymbol = ticTacToeMatch
    ? cloudUserId && ticTacToeMatch.hostId === cloudUserId
      ? ticTacToeMatch.hostSymbol || 'X'
      : ticTacToeMatch.opponentSymbol || 'O'
    : null;
  const activeOpponentSymbol = ticTacToeMatch
    ? cloudUserId && ticTacToeMatch.hostId === cloudUserId
      ? ticTacToeMatch.opponentSymbol || 'O'
      : ticTacToeMatch.hostSymbol || 'X'
    : null;
  const matchBoard =
    ticTacToeMatch && Array.isArray(ticTacToeMatch.board) && ticTacToeMatch.board.length === 9
      ? ticTacToeMatch.board
      : Array(9).fill(null);
  const matchIsActive = ticTacToeMatch?.status === 'active';
  const matchFinished = ticTacToeMatch?.status === 'finished';
  const matchIsMyTurn = matchIsActive && ticTacToeMatch?.turn === cloudUserId;
  const matchWinner = ticTacToeMatch?.winner;
  const matchIsWinner = matchFinished && matchWinner && matchWinner === cloudUserId;
  const matchIsLoser = matchFinished && matchWinner && matchWinner !== cloudUserId;
  const matchIsDraw = matchFinished && !matchWinner;

  return (
    <View style={styles.container}>
      <Background />
      <View style={styles.header}>
        <LevelHeader levelInfo={levelInfo} onPress={() => setProfileOpen(true)} />
        <View style={styles.headerRight}>
          {!shopOpen && <CoinsInline coins={coins} />}
          <Pressable
            onPress={() => setSettingsOpen(true)}
            hitSlop={12}
            style={styles.headerSettingsBtn}
          >
            <Text style={styles.headerSettingsIcon}>{String.fromCodePoint(0x2699)}</Text>
          </Pressable>
        </View>
      </View>

      {!shopOpen && !inventoryOpen && !gameOpen && (
        <>
          <ShopButton onPress={() => setShopOpen(true)} />
          <InventoryButton onPress={() => setInventoryOpen(true)} />
          <GameButton onPress={() => setGamesMenuOpen(true)} />
          <FriendsButton onPress={() => setFriendsOpen(true)} />
        </>
      )}

      {!shopOpen && !inventoryOpen && !gameOpen && (
        <View style={styles.main} ref={mainRef}>
          <PetArea
            ref={petAreaRef}
            mood={mood}
            emotion={emotion}
            species={petType || 'seestern'}
            isSleeping={isSleeping}
            isWashing={isWashing}
            onLayout={(e) => setPetAreaLayout(e.nativeEvent.layout)}
            panHandlers={{}}
            washBubbles={washBubbles}
            toastOpacity={toastOpacity}
            toastMessage={toastMessage}
            petScale={petScale}
            foodFlyers={foodFlyers}
            equipped={equipped}
            visitor={
              incomingVisitor
                ? {
                    name: incomingVisitor.name,
                    petType: incomingVisitor.petType || 'seestern',
                    equipped: incomingVisitor.equipped || {},
                  }
                : null
            }
            onInteract={handlePetAreaInteract}
          />
          {soapDrag.active && (
            <View
              pointerEvents="none"
              style={[
                styles.soapGhost,
                { left: soapDrag.x - SOAP_ICON_SIZE / 2, top: soapDrag.y - SOAP_ICON_SIZE / 2 },
              ]}
            >
              <Image source={SOAP_ICON} style={styles.soapGhostImage} />
            </View>
          )}
        </View>
      )}

      {!shopOpen && !inventoryOpen && !gameOpen && (
        <View style={styles.stats} pointerEvents="box-none">
          <StatBar label={String.fromCodePoint(0x1f357)} value={hunger} color="#F59E0B" compact hideValue />
          <StatBar label={String.fromCodePoint(0x1f3ae)} value={fun} color="#34D399" compact hideValue />
          <StatBar label={String.fromCodePoint(0x1f9fc)} value={clean} color="#3B82F6" compact hideValue />
          <StatBar label={String.fromCodePoint(0x26a1)} value={energy} color="#8B5CF6" compact hideValue />
        </View>
      )}

      {!shopOpen && !inventoryOpen && !gameOpen && (
        <ActionDock
          isSleeping={isSleeping}
          isWashing={isWashing}
          canAct={canAct}
          feedDisabled={!canAct || hunger >= 100 || coins < FEED_COST}
          soapDisabled={isSleeping || clean >= 100}
          onFeed={feed}
          onToggleSleep={toggleSleep}
          onSoapDragStart={handleSoapDragStart}
          onSoapDragMove={handleSoapDragMove}
          onSoapDragEnd={handleSoapDragEnd}
        />
      )}

      <StatusBar style="light" hidden />

      <ShopScreen
        open={shopOpen}
        coins={coins}
        inventory={inventory}
        species={petType || 'seestern'}
        equipped={equipped}
        onClose={() => setShopOpen(false)}
        onBuy={handleShopPurchase}
        onEquip={handleEquip}
        onUnequip={handleUnequip}
        soundEnabled={soundOn}
      />
      <InventoryScreen
        open={inventoryOpen}
        inventory={inventory}
        equipped={equipped}
        species={petType || 'seestern'}
        onClose={() => setInventoryOpen(false)}
        onEquip={handleEquip}
        onUnequip={handleUnequip}
        soundEnabled={soundOn}
      />
      <SettingsScreen
        open={settingsOpen}
        sound={soundOn}
        haptics={hapticsOn}
        onChange={updateSettings}
        onResetPet={resetPet}
        onClose={() => setSettingsOpen(false)}
      />
      <PetSelectScreen
        open={petSelectOpen}
        onSelect={selectPet}
      />
      <FriendsScreen
        open={friendsOpen}
        onClose={() => setFriendsOpen(false)}
        onVisitFriend={handleVisitFriend}
        onFriendRemoved={handleFriendRemoved}
        onOpenProfile={() => setProfileOpen(true)}
        selfSnapshot={selfSnapshot}
        onInviteTicTacToe={handleInviteTicTacToe}
        ticTacToeStatusByFriend={ticTacToeStatusByFriend}
      />
      <ProfileScreen
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        levelInfo={levelInfo}
        xp={xp}
        coins={coins}
        petType={petType}
        selfSnapshot={selfSnapshot}
      />
      <GamesMenu
        open={gamesMenuOpen}
        onClose={() => setGamesMenuOpen(false)}
        onSelect={(key) => {
          setSelectedGame(key);
          setGamesMenuOpen(false);
          setGameOpen(true);
        }}
      />

      {visitingFriend && (
        <View style={styles.visitBannerWrap} pointerEvents="box-none">
          <View style={styles.visitBanner} pointerEvents="auto">
            <View style={styles.visitBannerInfo}>
              <Text style={styles.visitBannerTitle}>Zu Besuch bei {visitingFriend.name || 'Freund'}</Text>
              <Text style={styles.visitBannerSubtitle}>
                {`Level ${visitingFriendLevel ?? 0}`}
                {visitingFriendSpecies ? ` · ${visitingFriendSpecies}` : ''}
                {visitingFriend.code ? ` · Code ${visitingFriend.code}` : ''}
              </Text>
            </View>
            <View style={styles.visitBannerPreview}>
              <OutfitPreview
                species={visitingFriend.petType || petType || 'seestern'}
                equipped={visitingFriend.equipped}
                size={84}
              />
            </View>
            <Pressable style={styles.visitBannerClose} onPress={handleEndVisit} hitSlop={10}>
              <Text style={styles.visitBannerCloseText}>{String.fromCodePoint(0x2715)}</Text>
            </Pressable>
          </View>
        </View>
      )}

      {incomingVisitor && (
        <View style={styles.visitOverlay} pointerEvents="auto">
          <View style={styles.visitCard}>
            <View style={styles.visitHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.visitTitle}>{incomingVisitor.name || 'Freund'} besucht dich</Text>
                <Text style={styles.visitSubtitle}>
                  Besuch aktiv
                  {incomingVisitorSpecies ? ` - ${incomingVisitorSpecies}` : ''}
                </Text>
              </View>
              <Pressable style={styles.visitCloseBtn} onPress={handleDismissIncomingVisit}>
                <Text style={styles.visitCloseText}>{String.fromCodePoint(0x2715)}</Text>
              </Pressable>
            </View>
            <View style={styles.visitPreview}>
              <OutfitPreview
                species={incomingVisitor.petType || petType || 'seestern'}
                equipped={incomingVisitor.equipped || {}}
                size={240}
              />
            </View>
            <Pressable style={styles.visitActionBtn} onPress={handleDismissIncomingVisit}>
              <Text style={styles.visitActionText}>Besuch beenden</Text>
            </Pressable>
          </View>
        </View>
      )}

      {ticTacToeOutgoing && ticTacToeOutgoing.status === 'pending' && !ticTacToeMatch && (
        <View style={styles.gameInviteBannerWrap} pointerEvents="box-none">
          <View style={styles.gameInviteBanner}>
            <View style={{ flex: 1 }}>
              <Text style={styles.gameInviteBannerTitle}>Warte auf {outgoingInviteName}</Text>
              <Text style={styles.gameInviteBannerSubtitle}>TicTacToe-Anfrage gesendet.</Text>
            </View>
            <Pressable
              style={styles.gameInviteBannerCancel}
              onPress={handleCancelTicTacToeInvite}
              hitSlop={8}
            >
              <Text style={styles.gameInviteBannerCancelText}>Abbrechen</Text>
            </Pressable>
          </View>
        </View>
      )}

      {ticTacToeIncoming && ticTacToeIncoming.status === 'pending' && !ticTacToeMatch && (
        <View style={styles.gameInviteOverlay} pointerEvents="auto">
          <View style={styles.gameInviteCard}>
            <Text style={styles.gameInviteTitle}>{incomingInviteName} fordert dich zu TicTacToe heraus</Text>
            <Text style={styles.gameInviteSubtitle}>Du spielst als {incomingInviteSymbol}.</Text>
            <View style={styles.gameInviteActions}>
              <Pressable style={styles.gameInvitePrimaryBtn} onPress={handleAcceptTicTacToeInvite}>
                <Text style={styles.gameInvitePrimaryText}>Annehmen</Text>
              </Pressable>
              <Pressable style={styles.gameInviteSecondaryBtn} onPress={handleDeclineTicTacToeInvite}>
                <Text style={styles.gameInviteSecondaryText}>Ablehnen</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}

      {ticTacToeMatch && (
        <View style={styles.ticTacToeOverlay} pointerEvents="auto">
          <View style={styles.ticTacToeCard}>
            <View style={styles.ticTacToeHeader}>
              <Text style={styles.ticTacToeTitle}>
                TicTacToe vs. {activeOpponentName || 'Freund'}
              </Text>
              {matchFinished ? (
                <Pressable style={styles.ticTacToeCloseBtn} onPress={handleDismissTicTacToeMatch} hitSlop={8}>
                  <Text style={styles.ticTacToeCloseText}>{String.fromCodePoint(0x2715)}</Text>
                </Pressable>
              ) : null}
            </View>
            <Text style={styles.ticTacToeInfo}>
              {matchFinished
                ? matchIsWinner
                  ? 'Du hast gewonnen!'
                  : matchIsLoser
                    ? 'Du hast verloren.'
                    : 'Unentschieden.'
                : matchIsMyTurn
                  ? `Du bist dran (${activeMySymbol || '-'})`
                  : `${activeOpponentName || 'Freund'} ist dran (${activeOpponentSymbol || '-'})`}
            </Text>
            <View style={styles.ticTacToeBoard}>
              {matchBoard.map((cell, index) => {
                const noRight = (index + 1) % 3 === 0;
                const noBottom = index >= 6;
                const disabled = Boolean(cell) || !matchIsMyTurn || matchFinished;
                return (
                  <Pressable
                    key={index}
                    style={[
                      styles.ticTacToeCell,
                      noRight && styles.ticTacToeCellNoRight,
                      noBottom && styles.ticTacToeCellNoBottom,
                      disabled && styles.ticTacToeCellDisabled,
                    ]}
                    onPress={() => {
                      if (!disabled) {
                        handleSubmitTicTacToeMove(index);
                      }
                    }}
                    disabled={disabled}
                  >
                    <Text
                      style={[
                        styles.ticTacToeCellText,
                        cell === activeMySymbol && styles.ticTacToeCellTextMine,
                        cell && cell === activeOpponentSymbol && styles.ticTacToeCellTextOpponent,
                      ]}
                    >
                      {cell || ''}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={styles.ticTacToeSymbolsRow}>
              <Text style={styles.ticTacToeSymbolText}>Du: {activeMySymbol || '-'}</Text>
              <Text style={styles.ticTacToeSymbolText}>
                {activeOpponentName || 'Gegner'}: {activeOpponentSymbol || '-'}
              </Text>
            </View>
            {matchFinished ? (
              <Pressable style={styles.ticTacToePrimaryBtn} onPress={handleDismissTicTacToeMatch}>
                <Text style={styles.ticTacToePrimaryText}>Schliessen</Text>
              </Pressable>
            ) : (
              <>
                {ticTacToeMatch.hostId === cloudUserId ? (
                  <Pressable style={styles.ticTacToeSecondaryBtn} onPress={handleForfeitTicTacToeMatch}>
                    <Text style={styles.ticTacToeSecondaryText}>Spiel abbrechen</Text>
                  </Pressable>
                ) : null}
              </>
            )}
          </View>
        </View>
      )}

      {selectedGame === 'tap' && (
        <TapGameScreen
          open={gameOpen}
          onClose={() => setGameOpen(false)}
          hapticsEnabled={hapticsOn}
          onReward={(score) => handleGameReward('tap', score)}
        />
      )}
      {selectedGame === 'casino' && (
        <CasinoScreen
          open={gameOpen}
          onClose={() => setGameOpen(false)}
          coins={coins}
          onDeltaCoins={handleCasinoDelta}
        />
      )}
      {selectedGame === 'catch' && (
        <CatchGameScreen
          open={gameOpen}
          onClose={() => setGameOpen(false)}
          hapticsEnabled={hapticsOn}
          onReward={(score) => handleGameReward('catch', score)}
        />
      )}
      {selectedGame === 'reaction' && (
        <ReactionGameScreen
          open={gameOpen}
          onClose={() => setGameOpen(false)}
          hapticsEnabled={hapticsOn}
          onReward={(score) => handleGameReward('reaction', score)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8F8',
    paddingTop: 50,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  headerRight: { alignItems: 'flex-end', gap: 6 },
  headerSettingsBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  headerSettingsIcon: { fontSize: 18, color: '#111827', fontWeight: '800' },
  main: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 140,
    position: 'relative',
  },
  stats: {
    position: 'absolute',
    right: 11,
    bottom: 17,
    gap: 8,
    paddingHorizontal: 6,
    paddingVertical: 8,
    backgroundColor: '#D8B4FE',
    borderColor: '#E9D5FF',
    borderWidth: 1,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  soapGhost: {
    position: 'absolute',
    width: SOAP_ICON_SIZE,
    height: SOAP_ICON_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  soapGhostImage: {
    width: SOAP_ICON_SIZE,
    height: SOAP_ICON_SIZE,
    opacity: 0.75,
  },
  visitBannerWrap: {
    position: 'absolute',
    top: 24,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 30,
    elevation: 8,
    pointerEvents: 'box-none',
  },
  visitBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: 'rgba(15,23,42,0.94)',
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 12,
    marginHorizontal: 18,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.35)',
    shadowColor: '#0F172A',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  visitBannerInfo: { flex: 1, minWidth: 0 },
  visitBannerTitle: { fontSize: 16, fontWeight: '800', color: '#F8FAFC' },
  visitBannerSubtitle: { fontSize: 12, color: '#CBD5F5', marginTop: 2 },
  visitBannerPreview: {
    width: 84,
    height: 84,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  visitBannerClose: {
    width: 32,
    height: 32,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15,23,42,0.6)',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.45)',
  },
  visitBannerCloseText: { fontSize: 18, color: '#F8FAFC', fontWeight: '800' },
  visitOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15,23,42,0.55)',
    paddingHorizontal: 24,
  },
  visitCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    gap: 16,
    width: '100%',
    maxWidth: 360,
  },
  visitHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  visitTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  visitSubtitle: { fontSize: 14, color: '#334155', marginTop: 4 },
  visitCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1F2937',
  },
  visitCloseText: { fontSize: 18, fontWeight: '800', color: '#FFFFFF' },
  visitPreview: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  visitActionBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  visitActionText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  gameInviteBannerWrap: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 35,
    pointerEvents: 'box-none',
  },
  gameInviteBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(15,23,42,0.92)',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.4)',
    shadowColor: '#0F172A',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  gameInviteBannerTitle: { fontSize: 14, fontWeight: '700', color: '#F8FAFC' },
  gameInviteBannerSubtitle: { fontSize: 11, color: '#CBD5F5', marginTop: 2 },
  gameInviteBannerCancel: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#F8FAFC',
  },
  gameInviteBannerCancelText: { color: '#F8FAFC', fontWeight: '700', fontSize: 12 },
  gameInviteOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15,23,42,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    zIndex: 45,
  },
  gameInviteCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    gap: 14,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },
  gameInviteTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  gameInviteSubtitle: { fontSize: 13, color: '#475569' },
  gameInviteActions: { flexDirection: 'row', gap: 12 },
  gameInvitePrimaryBtn: {
    flex: 1,
    backgroundColor: '#2563EB',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  gameInvitePrimaryText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  gameInviteSecondaryBtn: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5F5',
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  gameInviteSecondaryText: { color: '#1F2937', fontSize: 14, fontWeight: '700' },
  ticTacToeOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15,23,42,0.68)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    zIndex: 60,
  },
  ticTacToeCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 22,
    gap: 16,
    shadowColor: '#000',
    shadowOpacity: 0.28,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
  },
  ticTacToeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ticTacToeTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  ticTacToeInfo: { fontSize: 13, color: '#475569' },
  ticTacToeBoard: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    overflow: 'hidden',
  },
  ticTacToeCell: {
    width: '33.3333%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  ticTacToeCellNoRight: { borderRightWidth: 0 },
  ticTacToeCellNoBottom: { borderBottomWidth: 0 },
  ticTacToeCellDisabled: { backgroundColor: '#E5E7EB' },
  ticTacToeCellText: { fontSize: 34, fontWeight: '800', color: '#0F172A' },
  ticTacToeCellTextMine: { color: '#2563EB' },
  ticTacToeCellTextOpponent: { color: '#DC2626' },
  ticTacToeSymbolsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ticTacToeSymbolText: { fontSize: 12, fontWeight: '700', color: '#1F2937' },
  ticTacToePrimaryBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  ticTacToePrimaryText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  ticTacToeSecondaryBtn: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#EF4444',
    paddingVertical: 10,
    alignItems: 'center',
  },
  ticTacToeSecondaryText: { color: '#B91C1C', fontSize: 13, fontWeight: '700' },
  ticTacToeCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111827',
  },
  ticTacToeCloseText: { color: '#F8FAFC', fontSize: 16, fontWeight: '800' },
});
