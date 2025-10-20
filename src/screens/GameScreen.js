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
import styles from './GameScreen.styles';


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

  const outgoingInviteName = ticTacToeOutgoing?.opponentName || '';
  const incomingInviteName = ticTacToeIncoming?.hostName || '';
  const incomingInviteSymbol = ticTacToeIncoming?.opponentSymbol || 'O';
  const activeOpponentName = ticTacToeMatch
    ? cloudUserId && ticTacToeMatch.hostId === cloudUserId
      ? ticTacToeMatch.opponentName || ''
      : ticTacToeMatch.hostName || ''
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


      {!shopOpen && !inventoryOpen && !gameOpen && !ticTacToeMatch && (

        <>

          <ShopButton onPress={() => setShopOpen(true)} />

          <InventoryButton onPress={() => setInventoryOpen(true)} />

          <GameButton onPress={() => setGamesMenuOpen(true)} />

          <FriendsButton onPress={() => setFriendsOpen(true)} />

        </>

      )}


      {!shopOpen && !inventoryOpen && !gameOpen && !ticTacToeMatch && (

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


      {!shopOpen && !inventoryOpen && !gameOpen && !ticTacToeMatch && (

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
        onCancelTicTacToeInvite={handleCancelTicTacToeInvite}
        onAcceptTicTacToeInvite={handleAcceptTicTacToeInvite}
        onDeclineTicTacToeInvite={handleDeclineTicTacToeInvite}
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
              <Text style={styles.visitBannerTitle}>Zu Besuch bei {visitingFriend.name || ''}</Text>
              <Text style={styles.visitBannerSubtitle}>
                {`Level ${visitingFriendLevel ?? 0}`}
                {visitingFriendSpecies ? ` - ${visitingFriendSpecies}` : ''}
                {visitingFriend.code ? ` - Code ${visitingFriend.code}` : ''}
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
                <Text style={styles.visitTitle}>{incomingVisitor.name || ''} besucht dich</Text>
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
                TicTacToe vs. {activeOpponentName || ''}
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
                  ? `Du bist dran`
                  : ` ist dran`}
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
                      noBottom && styles.ticTacToeCellNoBottom
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

