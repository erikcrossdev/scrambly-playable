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
  private static readonly impactParticleTexture = 'impact-particle';
  readonly spawnDistance: number;
  protected progress = 0;
  protected scale = 1;
  protected x = 0;
  protected y = 0;

  private readonly movementConfig: TrackMovementConfig;
  private readonly scene: Phaser.Scene;
  private phase: number;

  protected constructor(
    scene: Phaser.Scene,
    spawnDistance: number,
    movementConfig: TrackMovementConfig,
    initialPhase = Math.random() * Math.PI * 2,
  ) {
    this.scene = scene;
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
    this.setVisualTransform(this.x, this.y, this.scale, this.getFogTint());

    return { passed: this.progress > 1.18 };
  }

  protected getFogTint() {
    const brightness = Math.round(
      Phaser.Math.Linear(119, 255, Phaser.Math.Clamp(this.progress, 0, 1)),
    );
    return (brightness << 16) | (brightness << 8) | brightness;
  }

  playCollisionParticles(tint: number, quantity: number) {
    if (!this.scene.textures.exists(TrackObject.impactParticleTexture)) {
      const graphics = this.scene.make.graphics({ x: 0, y: 0 }, false);
      graphics.fillStyle(0xffffff);
      graphics.fillCircle(4, 4, 4);
      graphics.generateTexture(TrackObject.impactParticleTexture, 8, 8);
      graphics.destroy();
    }

    const bounds = this.getCollisionBounds();
    const emitter = this.scene.add.particles(
      bounds.centerX,
      bounds.centerY,
      TrackObject.impactParticleTexture,
      {
        emitting: false,
        lifespan: { min: 300, max: 550 },
        speed: { min: 55, max: 155 },
        angle: { min: 0, max: 360 },
        scale: { start: 0.7, end: 0 },
        alpha: { start: 1, end: 0 },
        tint,
        quantity,
      },
    ).setDepth(3);

    emitter.explode(quantity);
    this.scene.time.delayedCall(600, () => emitter.destroy());
  }

  protected abstract setVisualTransform(x: number, y: number, scale: number, tint: number): void;

  abstract getCollisionBounds(): Phaser.Geom.Rectangle;

  abstract destroy(): void;
}
