import Phaser from 'phaser';

export interface TrackMovementConfig {
  curve: (phase: number) => number;
  range: number;
  baseSpeed: number;
  maxSpeedMultiplier: number;
  accelerationZone: number;
  speedCurve?: (phase: number, position: number) => number;
  scaleCurve?: (progress: number) => number;
}

export abstract class TrackObject {
  readonly spawnDistance: number;
  protected progress = 0;
  protected scale = 1;
  protected x = 0;
  protected y = 0;

  private readonly movementConfig: TrackMovementConfig;
  private phase: number;

  protected constructor(
    spawnDistance: number,
    movementConfig: TrackMovementConfig,
    initialPhase = Math.random() * Math.PI * 2,
  ) {
    this.spawnDistance = spawnDistance;
    this.movementConfig = movementConfig;
    this.phase = initialPhase;
  }

  update(distance: number, delta: number, width: number, height: number) {
    this.progress = 1 - (this.spawnDistance - distance) / 800;
    this.scale = this.movementConfig.scaleCurve
      ? this.movementConfig.scaleCurve(this.progress)
      : 0.35 + Math.max(0, this.progress) * 0.75;

    const normalizedPosition = Phaser.Math.Clamp(this.movementConfig.curve(this.phase), -1, 1);
    const edgeStart = 1 - this.movementConfig.accelerationZone;
    const edgeProgress = Phaser.Math.Clamp(
      (Math.abs(normalizedPosition) - edgeStart) / this.movementConfig.accelerationZone,
      0,
      1,
    );
    const easedEdgeProgress = edgeProgress * edgeProgress * (3 - 2 * edgeProgress);
    const edgeSpeedMultiplier = 1
      + (this.movementConfig.maxSpeedMultiplier - 1) * easedEdgeProgress;
    const speedMultiplier = this.movementConfig.speedCurve
      ? this.movementConfig.speedCurve(this.phase, normalizedPosition)
      : edgeSpeedMultiplier;
    this.phase += (delta / 1000) * this.movementConfig.baseSpeed * speedMultiplier;

    const horizontalMovement = Phaser.Math.Clamp(this.movementConfig.curve(this.phase), -1, 1);
    this.x = width / 2 + horizontalMovement * width * 0.29 * this.movementConfig.range;
    this.y = height * 0.16 + (height * 0.76 - height * 0.16) * this.progress;
    this.setVisualTransform(this.x, this.y, this.scale);

    return { passed: this.progress > 1.18 };
  }

  protected abstract setVisualTransform(x: number, y: number, scale: number): void;

  abstract getCollisionBounds(): Phaser.Geom.Rectangle;

  abstract destroy(): void;
}
