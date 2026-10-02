import Phaser from 'phaser';
import { GameScene } from './GameScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'app',
  // Standard mobile base resolution (Portrait)
  width: 390,
  height: 844,
  scale: {
    mode: Phaser.Scale.FIT, // Scales the game to fit the screen while keeping aspect ratio
    autoCenter: Phaser.Scale.CENTER_BOTH, // Centers the game in the browser window
  },
  scene: [GameScene],
  physics: {
    default: 'arcade',
    arcade: {
      debug: false
    }
  }
};

new Phaser.Game(config);