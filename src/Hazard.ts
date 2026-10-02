import Phaser from 'phaser';
import { TrackObject, type TrackMovementConfig } from './TrackObject';

const hazardWidth = 35;
const hazardHeight = 22;

export abstract class Hazard extends TrackObject {
  private readonly container: Phaser.GameObjects.Container;

  constructor(
  scene: Phaser.Scene,
  spawnDistance: number,
  movementConfig: TrackMovementConfig,
  initialPhase?: number,
  ) {
  super(spawnDistance, movementConfig, initialPhase);
  this.container = scene.add.container(0, 0).setDepth(2);

  this.container.add(scene.add.ellipse(0, 15, 48, 16, 0x100b1b, 0.5));
  this.container.add(
    scene.add.rectangle(0, 0, hazardWidth, hazardHeight, 0xff0000)
      .setStrokeStyle(3, 0xffb1a2),
  );
    this.container.add(scene.add.text(0, 0, '↔', {
      fontSize: '28px',
      color: '#FFF6E8',
      fontStyle: 'bold',
    }).setOrigin(0.5));
  }

  protected setVisualTransform(x: number, y: number, scale: number) {
    this.container.setPosition(x, y).setScale(scale);
  }

  getCollisionBounds() {
    return new Phaser.Geom.Rectangle(
      this.x - (hazardWidth / 2) * this.scale,
      this.y - (hazardHeight / 2) * this.scale,
      hazardWidth * this.scale,
      hazardHeight * this.scale,
    );
  }

  destroy() {
    this.container.destroy();
  }
}

export class OscillatingHazard extends Hazard {
  static readonly movementConfig: TrackMovementConfig = {
    curve: Math.sin,
    range: 0.72,
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
    range: 0.72,
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
