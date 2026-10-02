import Phaser from 'phaser';

export interface HazardMovementConfig {
  curve: (phase: number) => number;
  range: number;
  baseSpeed: number;
  maxSpeedMultiplier: number;
  accelerationZone: number;
}

const defaultMovementConfig: HazardMovementConfig = {
  curve: Math.sin,
  range: 0.72,
  baseSpeed: 1.9,
  maxSpeedMultiplier: 1.5,
  accelerationZone: 0.25,
};

export class Hazard {
  readonly spawnDistance: number;
  private readonly container: Phaser.GameObjects.Container;
  private readonly movementConfig: HazardMovementConfig;
  private phase: number;
  private progress = 0;
  private scale = 1;
  private x = 0;
  private y = 0;
  private width = 35;
  private height = 22;

  constructor(
    scene: Phaser.Scene,
    spawnDistance: number,
    movementConfig: HazardMovementConfig = defaultMovementConfig,
  ) {
    this.spawnDistance = spawnDistance;
    this.movementConfig = movementConfig;
    this.phase = Math.random() * Math.PI * 2;
    this.container = scene.add.container(0, 0);

    this.container.add(scene.add.ellipse(0, 18, 58, 16, 0x100b1b, 0.5));
    this.container.add(
      scene.add.rectangle(0, 0, this.width, this.height, 0xe85757)
        .setStrokeStyle(3, 0xffb1a2),
    );
    this.container.add(scene.add.text(0, 0, '↔', {
      fontSize: '28px',
      color: '#FFF6E8',
      fontStyle: 'bold',
    }).setOrigin(0.5));
  }

  update(distance: number, delta: number, width: number, height: number) {
    this.progress = 1 - (this.spawnDistance - distance) / 800;
    this.scale = 0.35 + Math.max(0, this.progress) * 0.75;

    const normalizedPosition = Phaser.Math.Clamp(this.movementConfig.curve(this.phase), -1, 1);
    const edgeStart = 1 - this.movementConfig.accelerationZone;
    const edgeProgress = Phaser.Math.Clamp(
      (Math.abs(normalizedPosition) - edgeStart) / this.movementConfig.accelerationZone,
      0,
      1,
    );
    const easedEdgeProgress = edgeProgress * edgeProgress * (3 - 2 * edgeProgress);
    const speedMultiplier = 1
      + (this.movementConfig.maxSpeedMultiplier - 1) * easedEdgeProgress;
    this.phase += (delta / 1000) * this.movementConfig.baseSpeed * speedMultiplier;

    const horizontalMovement = Phaser.Math.Clamp(this.movementConfig.curve(this.phase), -1, 1);
    this.x = width / 2 + horizontalMovement * width * 0.29 * this.movementConfig.range;
    this.y = height * 0.16 + (height * 0.76 - height * 0.16) * this.progress;

    this.container.setPosition(this.x, this.y);
    this.container.setScale(this.scale);

    return {
      passed: this.progress > 1.18,
    };
  }

  getCollisionBounds() {
    return new Phaser.Geom.Rectangle(
      this.x - (this.width/2) * this.scale,
      this.y - (this.height/2) * this.scale,
      this.width * this.scale,
      this.height * this.scale,
    );
  }

  destroy() {
    this.container.destroy();
  }
}
