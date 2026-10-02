import Phaser from 'phaser';
import foxBack from './assets/sprites/foxBack.png';
import foxDefeated from './assets/sprites/fox_defeated.png';

export class RunnerPlayer {
  private static readonly animationKey = 'runner-run';
  private static readonly frameCount = 3;
  private static readonly frameWidth = 280 / RunnerPlayer.frameCount;
  private static readonly frameHeight = 128;
  private static readonly displayScale = 0.45;
  private readonly sprite: Phaser.GameObjects.Sprite;
  private isRunning = false;
  private hasStartedRunning = false;
  private isDefeated = false;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.sprite = scene.add.sprite(x, y, 'runner', '0')
      .setScale(RunnerPlayer.displayScale)
      .setDepth(0);
  }

  setPosition(x: number, y: number) {
    this.sprite.setPosition(x, y);
  }

   static preload(scene: Phaser.Scene) {
     if (!scene.textures.exists('runner')) {
       scene.load.image('runner', foxBack);
    }
     if (!scene.textures.exists('runner-defeated')) {
       scene.load.image('runner-defeated', foxDefeated);
     }
   }

   static createAnimation(scene: Phaser.Scene) {
     RunnerPlayer.createRunnerFrames(scene);

     if (!scene.anims.exists(RunnerPlayer.animationKey)) {
       scene.anims.create({
         key: RunnerPlayer.animationKey,
         frames: Array.from({ length: RunnerPlayer.frameCount }, (_, index) => ({
           key: 'runner',
           frame: String(index),
         })),
         frameRate: 8,
         repeat: -1,
       });
     }
   }

   private static createRunnerFrames(scene: Phaser.Scene) {
     const texture = scene.textures.get('runner');
     const frameWidth = texture.source[0].width / RunnerPlayer.frameCount;
     const frameHeight = texture.source[0].height;

     for (let index = 0; index < RunnerPlayer.frameCount; index += 1) {
       const x = Math.floor(index * frameWidth);
       const right = Math.floor((index + 1) * frameWidth);
       const frameName = String(index);
       if (!texture.has(frameName)) {
         texture.add(frameName, 0, x, 0, right - x, frameHeight);
       }
     }
   }

  getCollisionBounds() {
    const width = RunnerPlayer.frameWidth * RunnerPlayer.displayScale * 0.5;
    const height = RunnerPlayer.frameHeight * RunnerPlayer.displayScale * 0.7;
    return new Phaser.Geom.Rectangle(
      this.sprite.x - width / 2,
      this.sprite.y - height / 2,
      width,
      height,
    );
  }

  setRunning(running: boolean) {
    if (this.isDefeated) return;
    if (running === this.isRunning) return;

    this.isRunning = running;
    if (running) {
      if (this.hasStartedRunning) {
        this.sprite.anims.resume();
      } else {
        this.sprite.play(RunnerPlayer.animationKey);
        this.hasStartedRunning = true;
      }
    } else if (this.hasStartedRunning) {
      this.sprite.anims.pause();
    }
  }

  setDefeated() {
    if (this.isDefeated) return;

    this.isDefeated = true;
    this.isRunning = false;
    this.sprite.stop();
    this.sprite.setTexture('runner-defeated');
  }
}
