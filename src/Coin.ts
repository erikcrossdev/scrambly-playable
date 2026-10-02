import Phaser from 'phaser';
import coinSprite from './assets/coin.png';

const textureKey = 'coin-sheet';
const animationKey = 'coin-spin';
const frameSize = 64;
const frameCount = 8;

export class Coin {
  private readonly sprite: Phaser.GameObjects.Sprite;
  readonly spawnDistance: number;

  constructor(scene: Phaser.Scene, spawnDistance: number) {
    this.spawnDistance = spawnDistance;
    this.sprite = scene.add.sprite(0, 0, textureKey, '0').setScale(0.65);
    this.sprite.play(animationKey);
  }

  static preload(scene: Phaser.Scene) {
    if (!scene.textures.exists(textureKey)) {
      scene.load.image(textureKey, coinSprite);
    }
  }

  static createAnimation(scene: Phaser.Scene) {
    const texture = scene.textures.get(textureKey);
    for (let index = 0; index < frameCount; index += 1) {
      const x = index * frameSize;
      const width = Math.min(frameSize, texture.source[0].width - x);
      if (!texture.has(String(index))) {
        texture.add(String(index), 0, x, 0, width, frameSize);
      }
    }

    if (!scene.anims.exists(animationKey)) {
      scene.anims.create({
        key: animationKey,
        frames: Array.from({ length: frameCount }, (_, index) => ({
          key: textureKey,
          frame: String(index),
        })),
        frameRate: 12,
        repeat: -1,
      });
    }
  }

  setPosition(x: number, y: number, scale: number) {
    this.sprite.setPosition(x, y).setScale(scale);
  }

  collect() {
    this.sprite.destroy();
  }
}
