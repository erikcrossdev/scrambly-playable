import Phaser from 'phaser';
import coinSprite from './assets/coin.png';
import { TrackObject, type TrackMovementConfig } from './TrackObject';

const textureKey = 'coin-sheet';
const animationKey = 'coin-spin';
const frameSize = 64;
const frameCount = 8;

const coinHeight = 64;


export class Coin extends TrackObject {
  static readonly movementConfig: TrackMovementConfig = {
    curve: Math.sin,
    range: 0.72,
    baseSpeed: 0.9,
    maxSpeedMultiplier: 1.15,
    accelerationZone: 0.15,
  };

  private readonly sprite: Phaser.GameObjects.Sprite;

  constructor(
    scene: Phaser.Scene,
    spawnDistance: number,
    movementConfig: TrackMovementConfig = Coin.movementConfig,
  ) {
    super(spawnDistance, movementConfig);
    this.sprite = scene.add.sprite(0, 0, textureKey, '0').setScale(0.15).setDepth(1);
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

  protected setVisualTransform(x: number, y: number, scale: number) {
    this.sprite.setPosition(x, y).setScale(scale);
  }

 getCollisionBounds() {
     return new Phaser.Geom.Rectangle(
       this.x - (frameSize / 2) * this.scale,
       this.y - (coinHeight / 2) * this.scale,
       frameSize * this.scale,
       coinHeight * this.scale,
     );
   }

  collect() {
    this.sprite.destroy();
  }

  destroy() {
    this.sprite.destroy();
  }
}
