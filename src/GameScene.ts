import Phaser from 'phaser';
import { Hazard } from './Hazard';
import { RunnerPlayer } from './RunnerPlayer';
import { Coin } from './Coin';


type GameState = 'ready' | 'running' | 'stopped' | 'gameover';

export class GameScene extends Phaser.Scene {
  private state: GameState = 'ready';
  private distance = 0;
  private nextHazardDistance = 1000;
  private nextCoinDistance = 900;
  private elapsed = 0;
  private hazards: Hazard[] = [];
  private coins: Coin[] = [];
  private coinCount = 0;
  private track!: Phaser.GameObjects.Graphics;
  private road!: Phaser.GameObjects.Rectangle;
  private runner!: RunnerPlayer;
  private titleText!: Phaser.GameObjects.Text;
  private distanceText!: Phaser.GameObjects.Text;
  private coinText!: Phaser.GameObjects.Text;
  private stateText!: Phaser.GameObjects.Text;
  private instructionText!: Phaser.GameObjects.Text;
  private ctaButton!: Phaser.GameObjects.Rectangle;
  private ctaText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'GameScene' });
  }

  preload() {
    RunnerPlayer.preload(this);
    Coin.preload(this);
  }

  create() {
    this.state = 'ready';
    this.distance = 0;
    this.nextHazardDistance = 1400;
    this.nextCoinDistance = 900;
    this.elapsed = 0;
    this.hazards = [];
    this.coins = [];
    this.coinCount = 0;

    this.cameras.main.setBackgroundColor('#201338');

    RunnerPlayer.createAnimation(this);
    Coin.createAnimation(this);

    this.track = this.add.graphics();
    this.drawTrack();

    this.titleText = this.add.text(this.scale.width / 2, this.scale.height * 0.015, 'SCRAMBLY TIMING', {
      fontSize: '24px',
      color: '#FFF6E8',
      fontStyle: 'bold',
      letterSpacing: 2,
    }).setOrigin(0.5);

    this.distanceText = this.add.text(this.scale.width / 2, this.scale.height * 0.11, 'DISTANCE 0 m', {
      fontSize: '16px',
      color: '#C7B9D9',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.coinText = this.add.text(this.scale.width * 0.82, this.scale.height * 0.11, 'COINS 0', {
      fontSize: '16px',
      color: '#FFD54A',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.runner = new RunnerPlayer(this, this.scale.width / 2, this.scale.height * 0.82);
    this.stateText = this.add.text(this.scale.width / 2, this.scale.height * 0.83, 'TAP TO RUN', {
      fontSize: '23px',
      color: '#F58324',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.instructionText = this.add.text(
      this.scale.width / 2,
      this.scale.height * 0.90,
      'Stop to time the moving hazards',
      { fontSize: '14px', color: '#FFF6E8' },
    ).setOrigin(0.5);

    this.ctaButton = this.add.rectangle(
      this.scale.width / 2,
      this.scale.height * 0.925,
      Math.min(220, this.scale.width * 0.75),
      40,
      0xf58324,
    ).setInteractive({ useHandCursor: true });
    this.ctaText = this.add.text(this.scale.width / 2, this.scale.height * 0.925, 'Explore Scrambly', {
      fontSize: '18px',
      color: '#FFF6E8',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(1);

    this.input.on('pointerdown', this.handlePointerAction, this);
    this.input.keyboard?.on('keydown-SPACE', this.handleAction, this);
    this.ctaButton.on('pointerdown', (_pointer: Phaser.Input.Pointer, _localX: number, _localY: number, event: Event) => {
      event.stopPropagation();
      console.log('CTA clicked — demo only');
      alert('CTA clicked — demo only');
    });
    this.scale.on('resize', this.handleResize, this);

    this.spawnHazard(600);
    this.spawnCoin(550);
    this.refreshLayout();
  }

  update(_time: number, delta: number) {
    this.elapsed += delta / 1000;

    if (this.state === 'running') {
      this.distance += delta * 0.18;
      this.distanceText.setText(`DISTANCE ${Math.floor(this.distance / 100)} m`);

      while (this.distance >= this.nextHazardDistance) {
        this.spawnHazard(this.distance + 650);
        this.nextHazardDistance += 1400;
      }
      while (this.distance >= this.nextCoinDistance) {
        this.spawnCoin(this.distance + 650);
        this.nextCoinDistance += 520;
      }
    }

    const { width, height } = this.scale;
    const centerX = width / 2;
    const runnerBob = this.state === 'running' ? Math.sin(this.elapsed * 12) * 4 : 0;
    this.runner.setPosition(centerX, height * 0.77 + runnerBob);
    this.runner.setRunning(this.state === 'running');

    for (const hazard of [...this.hazards]) {
      const { passed } = hazard.update(this.distance, delta, width, height);

      if (this.state === 'running') {
        if (Phaser.Geom.Intersects.RectangleToRectangle(
          this.runner.getCollisionBounds(),
          hazard.getCollisionBounds(),
        )) {
          this.endRun();
        }
      }

      if (passed) {
        hazard.destroy();
        this.hazards = this.hazards.filter((item) => item !== hazard);
      }
    }

    for (const coin of [...this.coins]) {
      const progress = 1 - (coin.spawnDistance - this.distance) / 800;
      const scale = (0.25 + Math.max(0, progress) * 0.65) * 0.65;
      const y = height * 0.16 + (height * 0.76 - height * 0.16) * progress;
      coin.setPosition(centerX, y, scale);

      if (this.state === 'running' && progress >= 0.9 && progress <= 1.08) {
        coin.collect();
        this.coinCount += 1;
        this.coinText.setText(`COINS ${this.coinCount}`);
        this.coins = this.coins.filter((item) => item !== coin);
      } else if (progress > 1.08) {
        coin.collect();
        this.coins = this.coins.filter((item) => item !== coin);
      }
    }
  }

  private spawnHazard(spawnDistance: number) {
    this.hazards.push(new Hazard(this, spawnDistance));
  }

  private spawnCoin(spawnDistance: number) {
    this.coins.push(new Coin(this, spawnDistance));
  }

  private handleAction() {
    if (this.state === 'gameover') {
      this.scene.restart();
      return;
    }

    this.state = this.state === 'running' ? 'stopped' : 'running';
    this.updatePrompt();
  }

  private handlePointerAction(_pointer: Phaser.Input.Pointer, currentlyOver: Phaser.GameObjects.GameObject[]) {
    if (currentlyOver.includes(this.ctaButton)) return;
    this.handleAction();
  }

  private endRun() {
    this.state = 'gameover';
    this.stateText.setText('RUN ENDED').setColor('#FF7777');
    this.instructionText.setText('Tap anywhere to try again');
  }

  private updatePrompt() {
    if (this.state === 'running') {
      this.stateText.setText('RUNNING — TAP TO STOP').setColor('#F58324');
      this.instructionText.setText('Watch the hazard, then tap to move');
      return;
    }
    this.stateText.setText('STOPPED — TAP TO RUN').setColor('#8BE0B2');
    this.instructionText.setText('Hazards keep moving while you wait');
  }

  private drawTrack() {
    const { width, height } = this.scale;
    const roadWidth = width * 0.72;
    const roadHeight = height * 0.72;
    const roadCenterY = height * 0.5;
    const trackTop = height * 0.14;
    const trackBottom = height * 0.86;
    if (!this.road) {
      this.road = this.add.rectangle(0, 0, 0, 0, 0x30254a).setStrokeStyle(4, 0x70588b).setDepth(-1);
    }
    this.road.setPosition(width / 2, roadCenterY).setSize(roadWidth, roadHeight);
    this.track.clear();
    this.track.lineStyle(2, 0x70588b, 0.65);
    this.track.lineBetween(width / 2, trackTop, width / 2, trackBottom);
    this.track.lineStyle(2, 0x57436f, 0.8);
    this.track.lineBetween(width / 2 - roadWidth * 0.25, trackTop, width / 2 - roadWidth * 0.25, trackBottom);
    this.track.lineBetween(width / 2 + roadWidth * 0.25, trackTop, width / 2 + roadWidth * 0.25, trackBottom);
  }

  private refreshLayout() {
    const { width, height } = this.scale;
    this.titleText.setPosition(width / 2, height * 0.075);
    this.distanceText.setPosition(width * 0.35, height * 0.13);
    this.coinText.setPosition(width * 0.78, height * 0.13);
    this.stateText.setPosition(width / 2, height * 0.88);
    this.instructionText.setPosition(width / 2, height * 0.93);
    this.ctaButton.setPosition(width / 2, height * 0.985)
      .setSize(Math.min(220, width * 0.75), 40);
    this.ctaText.setPosition(width / 2, height * 0.995);
  }

  private handleResize() {
    this.drawTrack();
    this.refreshLayout();
  }
}
