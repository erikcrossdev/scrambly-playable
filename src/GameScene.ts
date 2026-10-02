import Phaser from 'phaser';
import { CenterSweepHazard, Hazard, OscillatingHazard } from './Hazard';
import { RunnerPlayer } from './RunnerPlayer';
import { Coin } from './Coin';
import { RenderMessages } from './RenderMessages';
import { PlayerRecord } from './PlayerRecord';
import bestScoreSfx from './assets/SFX/bestScore.wav';
import coinsSfx from './assets/SFX/coins.wav';
import collisionSfx from './assets/SFX/colision.wav';
import gameOverSfx from './assets/SFX/GameOver.wav';

const soundKeys = {
  bestScore: 'best-score',
  coin: 'coin-collected',
  collision: 'hazard-collision',
  gameOver: 'game-over',
} as const;

type GameState = 'ready' | 'running' | 'stopped' | 'gameover';

export class GameScene extends Phaser.Scene {
  private state: GameState = 'ready';
  private distance = 0;
  private nextHazardDistance = 1000;
  private spawnPairedHazards = true;
  private nextCoinDistance = 900;
  private elapsed = 0;
  private hazards: Hazard[] = [];
  private coins: Coin[] = [];
  private coinCount = 0;
  private track!: Phaser.GameObjects.Graphics;
  private road!: Phaser.GameObjects.Rectangle;
  private runner!: RunnerPlayer;
  private messages!: RenderMessages;
  private playerRecord!: PlayerRecord;
  private destroyHeight = 50;
  private spawnCoinsDistance = 600;
  private spawnHazardsDistance = 600;
  private audioInteracted = false;
  private userMuted = false;
  private documentVisible = true;
  private windowFocused = true;
  private inactivePauseApplied = false;
  private discardNextDelta = false;

  constructor() {
    super({ key: 'GameScene' });
  }

  preload() {
    RunnerPlayer.preload(this);
    Coin.preload(this);
    Hazard.preload(this);
    this.load.audio(soundKeys.bestScore, bestScoreSfx);
    this.load.audio(soundKeys.coin, coinsSfx);
    this.load.audio(soundKeys.collision, collisionSfx);
    this.load.audio(soundKeys.gameOver, gameOverSfx);
  }

  create() {
    this.inactivePauseApplied = false;
    this.discardNextDelta = false;
    this.state = 'ready';
    this.distance = 0;
    this.nextHazardDistance = 1400;
    this.spawnPairedHazards = true;
    this.nextCoinDistance = 1400;
    this.elapsed = 0;
    this.hazards = [];
    this.coins = [];
    this.coinCount = 0;

    this.cameras.main.setBackgroundColor('#201338');
    this.sound.pauseOnBlur = false;
    this.documentVisible = document.visibilityState === 'visible';
    this.windowFocused = document.hasFocus();
    this.applyAudioState();

    RunnerPlayer.createAnimation(this);
    Coin.createAnimation(this);

    this.road = this.add.rectangle(0, 0, 0, 0, 0x30254a)
      .setStrokeStyle(4, 0x70588b)
      .setDepth(-3);
    this.track = this.add.graphics().setDepth(-2);
    this.drawTrack();

    this.playerRecord = new PlayerRecord();
    this.messages = new RenderMessages(this);
    this.messages.setBestScore(this.playerRecord.getBestScore());
    this.messages.setMuted(this.userMuted);

    this.runner = new RunnerPlayer(this, this.scale.width / 2, this.scale.height * 0.82);

    this.input.on('pointerdown', this.handlePointerAction, this);
    this.input.keyboard?.on('keydown-SPACE', this.handleAction, this);
    this.messages.ctaButton.on('pointerdown', (_pointer: Phaser.Input.Pointer, _localX: number, _localY: number, event: Event) => {
      event.stopPropagation();
      window.open('https://scrambly.io/', '_blank', 'noopener,noreferrer');
    });
    this.messages.muteButton.on('pointerdown', (_pointer: Phaser.Input.Pointer, _localX: number, _localY: number, event: Event) => {
      event.stopPropagation();
      this.toggleMute();
    });
    this.scale.on('resize', this.handleResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.handleShutdown, this);
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    window.addEventListener('blur', this.handleWindowBlur);
    window.addEventListener('focus', this.handleWindowFocus);

    this.spawnHazard(this.spawnHazardsDistance);
    this.spawnCoin(this.spawnCoinsDistance);
    this.refreshLayout();
    this.updatePageActivity();
  }

  update(_time: number, delta: number) {
    if (this.discardNextDelta) {
      this.discardNextDelta = false;
      return;
    }

    this.elapsed += delta / 1000;

    if (this.state === 'running') {
      this.distance += delta * 0.18;
      this.messages.setDistance(this.distance);

      while (this.distance >= this.nextHazardDistance) {
        this.spawnHazard(this.distance + this.spawnHazardsDistance, this.spawnPairedHazards);
        this.spawnPairedHazards = !this.spawnPairedHazards;
        this.nextHazardDistance += this.spawnHazardsDistance;
      }
      while (this.distance >= this.nextCoinDistance) {
        this.spawnCoin(this.distance + this.spawnCoinsDistance);
        this.nextCoinDistance += this.spawnCoinsDistance;
      }
    }

    const { width, height } = this.scale;
    const centerX = width / 2;
    const runnerBob = this.state === 'running' ? Math.sin(this.elapsed * 12) * 4 : 0;
    this.runner.setPosition(centerX, height * 0.77 + runnerBob);
    this.runner.setRunning(this.state === 'running');

    for (const hazard of [...this.hazards]) {
      const { passed } = hazard.update(this.distance, delta, width, height-this.destroyHeight);

      if (this.state === 'running' || this.state === 'stopped') {
        if (Phaser.Geom.Intersects.RectangleToRectangle(
          this.runner.getCollisionBounds(),
          hazard.getCollisionBounds(),
        )) {
          hazard.playCollisionParticles(0xffb1a2, 22);
          this.playSound(soundKeys.collision);
          this.endRun();
          break;
        }
      }

      if (passed) {
        hazard.destroy();
        this.hazards = this.hazards.filter((item) => item !== hazard);
      }
    }

    for (const coin of [...this.coins]) {
      const { passed } = coin.update(this.distance, delta, width, height-this.destroyHeight);

      if ((this.state === 'running' || this.state === 'stopped') && Phaser.Geom.Intersects.RectangleToRectangle(
        this.runner.getCollisionBounds(),
        coin.getCollisionBounds(),
      )) {
        coin.playCollisionParticles(0xffd84d, 18);
        this.playSound(soundKeys.coin);
        coin.collect();
        this.coinCount += 1;
        this.messages.setCoinCount(this.coinCount);
        this.coins = this.coins.filter((item) => item !== coin);
      } else if (passed) {
        coin.destroy();
        this.coins = this.coins.filter((item) => item !== coin);
      }
    }
  }

  private spawnHazard(spawnDistance: number, paired = false) {
    if (paired) {
      this.hazards.push(
        new CenterSweepHazard(this, spawnDistance, -1),
        new CenterSweepHazard(this, spawnDistance, 1),
      );
      return;
    }

    this.hazards.push(new OscillatingHazard(this, spawnDistance));
  }

  private spawnCoin(spawnDistance: number) {
    this.coins.push(new Coin(this, spawnDistance));
  }

  private handleAction() {
    this.enableAudioAfterInteraction();
    if (this.state === 'gameover') {
      this.scene.restart();
      return;
    }

    this.state = this.state === 'running' ? 'stopped' : 'running';
    this.updatePrompt();
  }

  private handlePointerAction(_pointer: Phaser.Input.Pointer, currentlyOver: Phaser.GameObjects.GameObject[]) {
    if (currentlyOver.includes(this.messages.ctaButton) || currentlyOver.includes(this.messages.muteButton)) return;
    this.enableAudioAfterInteraction();
    this.handleAction();
  }

  private endRun() {
    if (this.state === 'gameover') return;

    this.state = 'gameover';
    this.runner.setDefeated();
    const result = this.playerRecord.recordRun({
      distance: Math.floor(this.distance / 100),
      coins: this.coinCount,
    });
    if (result.isNewBest) this.playSound(soundKeys.bestScore);
    if (result.score) this.messages.setBestScore(result.score);
    this.playSound(soundKeys.gameOver);
    this.messages.showDefeated();
  }

  private enableAudioAfterInteraction() {
    if (this.audioInteracted) return;

    this.audioInteracted = true;
    this.applyAudioState();
  }

  private toggleMute() {
    this.enableAudioAfterInteraction();
    this.userMuted = !this.userMuted;
    this.messages.setMuted(this.userMuted);
    this.applyAudioState();
  }

  private playSound(key: string) {
    if (!this.audioInteracted || this.userMuted || !this.isPageActive() || this.sound.locked) return;
    this.sound.play(key);
  }

  private applyAudioState() {
    const muted = this.userMuted || !this.audioInteracted || !this.isPageActive();
    this.sound.mute = muted;

    if (muted) {
      this.sound.pauseAll();
    } else {
      this.sound.resumeAll();
    }
  }

  private isPageActive() {
    return this.documentVisible && this.windowFocused;
  }

  private handleVisibilityChange = () => {
    this.documentVisible = document.visibilityState === 'visible';
    this.updatePageActivity();
  };

  private handleWindowBlur = () => {
    this.windowFocused = false;
    this.updatePageActivity();
  };

  private handleWindowFocus = () => {
    this.windowFocused = true;
    this.updatePageActivity();
  };

  private updatePageActivity() {
    const active = this.isPageActive();
    this.applyAudioState();

    if (!active && !this.inactivePauseApplied) {
      this.inactivePauseApplied = true;
      this.scene.pause();
    } else if (active && this.inactivePauseApplied) {
      this.inactivePauseApplied = false;
      this.discardNextDelta = true;
      this.scene.resume();
    }
  }

  private updatePrompt() {
    if (this.state === 'running') {
      this.messages.showRunning();
      return;
    }
    this.messages.showStopped();
  }

  private drawTrack() {
    const { width, height } = this.scale;
    const roadWidth = width * 0.72;
    const roadHeight = height * 0.72;
    const roadCenterY = height * 0.5;
    const trackTop = height * 0.14;
    const trackBottom = height * 0.86;
    this.road.setPosition(width / 2, roadCenterY).setSize(roadWidth, roadHeight);
    this.track.clear();
    this.track.lineStyle(2, 0x70588b, 0.65);
    this.track.lineBetween(width / 2, trackTop, width / 2, trackBottom);
    this.track.lineStyle(2, 0x57436f, 0.8);
    this.track.lineBetween(width / 2 - roadWidth * 0.25, trackTop, width / 2 - roadWidth * 0.25, trackBottom);
    this.track.lineBetween(width / 2 + roadWidth * 0.25, trackTop, width / 2 + roadWidth * 0.25, trackBottom);
  }

  private refreshLayout() {
    this.messages.layout();
  }

  private handleResize() {
    this.drawTrack();
    this.refreshLayout();
  }

  private handleShutdown() {
    this.input.off('pointerdown', this.handlePointerAction, this);
    this.input.keyboard?.off('keydown-SPACE', this.handleAction, this);
    this.scale.off('resize', this.handleResize, this);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    window.removeEventListener('blur', this.handleWindowBlur);
    window.removeEventListener('focus', this.handleWindowFocus);
    this.applyAudioState();
  }
}
