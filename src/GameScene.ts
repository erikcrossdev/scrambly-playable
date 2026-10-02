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
  private road!: Phaser.GameObjects.Graphics;
  private trackTiles!: Phaser.GameObjects.Graphics;
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

    this.road = this.add.graphics().setDepth(-3);
    this.trackTiles = this.add.graphics().setDepth(-2);
    this.track = this.add.graphics().setDepth(-1);
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
      this.drawTrack();

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
    if (this.messages.isUiControlUnderPointer(currentlyOver)) return;
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
    if (result.showBestScoreCta) this.playSound(soundKeys.bestScore);
    if (result.score) this.messages.setBestScore(result.score);
    this.playSound(soundKeys.gameOver);
    this.messages.showDefeated(result);
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
    const centerX = width / 2;
    const trackTop = height * 0.14;
    const trackBottom = height * 0.86;
    const topHalfWidth = width * 0.08;
    const bottomHalfWidth = width * 0.36;
    const rowCount = 12;
    const columnCount = 8;
    const rowScroll = (this.distance / 120) % 1;

    const rowY = (row: number) => {
      const perspective = Phaser.Math.Clamp(row, 0, 1);
      return trackTop + (perspective ** 1.6) * (trackBottom - trackTop);
    };
    const rowHalfWidth = (row: number) => topHalfWidth
      + (bottomHalfWidth - topHalfWidth) * Phaser.Math.Clamp(row, 0, 1);
    const pointAt = (row: number, column: number) => {
      const halfWidth = rowHalfWidth(row);
      return {
        x: centerX - halfWidth + (2 * halfWidth * column) / columnCount,
        y: rowY(row),
      };
    };

    this.road.clear();
    this.road.fillStyle(0x30254a, 1);
    this.road.beginPath();
    this.road.moveTo(centerX - topHalfWidth, trackTop);
    this.road.lineTo(centerX + topHalfWidth, trackTop);
    this.road.lineTo(centerX + bottomHalfWidth, trackBottom);
    this.road.lineTo(centerX - bottomHalfWidth, trackBottom);
    this.road.closePath();
    this.road.fillPath();
    this.road.lineStyle(4, 0x70588b, 1);
    this.road.strokePath();

    this.trackTiles.clear();
    for (let worldRow = -1; worldRow <= rowCount; worldRow += 1) {
      const unclippedTop = (worldRow + rowScroll) / rowCount;
      const unclippedBottom = (worldRow + 1 + rowScroll) / rowCount;
      if (unclippedBottom <= 0 || unclippedTop >= 1) continue;
      const top = Phaser.Math.Clamp(unclippedTop, 0, 1);
      const bottom = Phaser.Math.Clamp(unclippedBottom, 0, 1);

      for (let column = 0; column < columnCount; column += 1) {
        const topLeft = pointAt(top, column);
        const topRight = pointAt(top, column + 1);
        const bottomRight = pointAt(bottom, column + 1);
        const bottomLeft = pointAt(bottom, column);
        const color = (worldRow + column + 1) % 2 === 0 ? 0x40345c : 0x35294f;
        this.trackTiles.fillStyle(color, 0.88);
        this.trackTiles.beginPath();
        this.trackTiles.moveTo(topLeft.x, topLeft.y);
        this.trackTiles.lineTo(topRight.x, topRight.y);
        this.trackTiles.lineTo(bottomRight.x, bottomRight.y);
        this.trackTiles.lineTo(bottomLeft.x, bottomLeft.y);
        this.trackTiles.closePath();
        this.trackTiles.fillPath();
      }
    }

    this.track.clear();
    this.track.lineStyle(2, 0x70588b, 0.85);
    this.track.lineBetween(width / 2, trackTop, width / 2, trackBottom);
    this.track.lineStyle(2, 0x57436f, 0.8);
    this.track.lineBetween(centerX - topHalfWidth * 0.5, trackTop, centerX - bottomHalfWidth * 0.5, trackBottom);
    this.track.lineBetween(centerX + topHalfWidth * 0.5, trackTop, centerX + bottomHalfWidth * 0.5, trackBottom);
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
