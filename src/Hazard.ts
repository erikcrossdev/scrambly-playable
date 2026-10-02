import Phaser from 'phaser';
import { TrackObject, type TrackMovementConfig } from './TrackObject';
import platformSheet from './assets/sprites/platform.png';

const platformTextureKey = 'hazard-platform';
const platformWidth = 82;
const platformHeight = 80;
const platformScale = 0.5;

export abstract class Hazard extends TrackObject {
  private readonly container: Phaser.GameObjects.Container;

  static preload(scene: Phaser.Scene) {
   
   if (!scene.textures.exists(platformTextureKey)) {
     scene.load.spritesheet(platformTextureKey, platformSheet, {
       frameWidth: platformWidth,
       frameHeight: platformHeight,
     });
   }
  }


  constructor(
   scene: Phaser.Scene,
   spawnDistance: number,
   movementConfig: TrackMovementConfig,
   initialPhase?: number,
  ) {
   super(scene, spawnDistance, movementConfig, initialPhase);
   this.container = scene.add.container(0, 0).setDepth(2);

   this.container.add(scene.add.ellipse(
     0,
     platformHeight * 0.42 * platformScale,
     platformWidth * 0.82 * platformScale,
     14 * platformScale,
     0x100b1b,
     0.5,
   ));
   this.container.add(scene.add.sprite(0, 0, platformTextureKey, 0).setScale(platformScale));
  }

  protected setVisualTransform(x: number, y: number, scale: number) {
   this.container.setPosition(x, y).setScale(scale);
  }

  getCollisionBounds() {
   return new Phaser.Geom.Rectangle(
     this.x - (platformWidth * platformScale / 2) * this.scale,
     this.y - (platformHeight * platformScale / 2) * this.scale,
     platformWidth * platformScale * this.scale,
     platformHeight * platformScale * this.scale,
   );
  }

  destroy() {
   this.container.destroy();
  }
}

export class OscillatingHazard extends Hazard {
  static readonly movementConfig: TrackMovementConfig = {
    curve: Math.sin,
    range: 0.85,
    baseSpeed: 1.4,
    maxSpeedMultiplier: 1.3,
    accelerationZone: 0.2,
  };
  constructor(scene: Phaser.Scene, spawnDistance: number) {
    super(scene, spawnDistance, OscillatingHazard.movementConfig);
  }
}

export class CenterSweepHazard extends Hazard {
  static readonly movementConfig: TrackMovementConfig = {
    curve: Math.cos,
    range: 0.98, //0.72
    baseSpeed: 1.4,
    maxSpeedMultiplier: 1,
    accelerationZone: 0.2,
    speedCurve: (phase) => 1.225 + 0.575 * Math.sin(2 * phase),
  };

  constructor(scene: Phaser.Scene, spawnDistance: number, side: -1 | 1) {
    super(
      scene,
      spawnDistance,
      {
        ...CenterSweepHazard.movementConfig,
        curve: (phase) => side * Math.abs(CenterSweepHazard.movementConfig.curve(phase)),
      },
      0,
    );
  }
}
