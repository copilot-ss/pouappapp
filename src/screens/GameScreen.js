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
    selfSnapshot,
  } = controller;

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

      <StatusBar style="auto" />

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
        <View style={styles.visitOverlay} pointerEvents="auto">
          <View style={styles.visitCard}>
            <View style={styles.visitHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.visitTitle}>Zu Besuch bei {visitingFriend.name || 'Freund'}</Text>
                <Text style={styles.visitSubtitle}>
                  {`Level ${visitingFriendLevel ?? 0}`}
                  {visitingFriendSpecies ? ` - ${visitingFriendSpecies}` : ''}
                  {visitingFriend.code ? ` - Code ${visitingFriend.code}` : ''}
                </Text>
              </View>
              <Pressable style={styles.visitCloseBtn} onPress={handleEndVisit}>
                <Text style={styles.visitCloseText}>{String.fromCodePoint(0x2715)}</Text>
              </Pressable>
            </View>
            <View style={styles.visitPreview}>
              <OutfitPreview
                species={visitingFriend.petType || petType || 'seestern'}
                equipped={visitingFriend.equipped}
              />
            </View>
            <Pressable style={styles.visitActionBtn} onPress={handleEndVisit}>
              <Text style={styles.visitActionText}>Besuch beenden</Text>
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
              />
            </View>
            <Pressable style={styles.visitActionBtn} onPress={handleDismissIncomingVisit}>
              <Text style={styles.visitActionText}>Besuch beenden</Text>
            </Pressable>
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
});
