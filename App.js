import React from 'react';
import useGameController from './src/hooks/useGameController';
import GameScreen from './src/screens/GameScreen';

export default function App() {
  const controller = useGameController();
  return <GameScreen controller={controller} />;
}
