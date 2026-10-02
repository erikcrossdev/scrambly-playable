import Phaser from 'phaser';
import type { PlayerScore, RecordRunResult } from './PlayerRecord';

export class RenderMessages {
  readonly ctaButton: Phaser.GameObjects.Rectangle;
  readonly muteButton: Phaser.GameObjects.Text;

  private readonly scene: Phaser.Scene;
  private readonly bestScoreCtaButton: Phaser.GameObjects.Rectangle;
  private readonly bestScoreCtaText: Phaser.GameObjects.Text;
  private readonly titleText: Phaser.GameObjects.Text;
  private readonly bestScoreText: Phaser.GameObjects.Text;
  private readonly distanceText: Phaser.GameObjects.Text;
  private readonly coinText: Phaser.GameObjects.Text;
  private readonly stateText: Phaser.GameObjects.Text;
  private readonly instructionText: Phaser.GameObjects.Text;
  private readonly ctaText: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const { width, height } = scene.scale;

    this.titleText = scene.add.text(width / 2, height * 0.01, 'SCRAMBLY TIMING', {
      fontSize: '24px',
      color: '#F58324',
      fontStyle: 'bold',
      letterSpacing: 2,
    }).setOrigin(0.5).setDepth(10);

    this.bestScoreText = scene.add.text(width / 2, height * 0.065, '', {
      fontSize: '14px',
      color: '#FFF6E8',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(10).setVisible(false);

    this.distanceText = scene.add.text(width / 2, height * 0.11, 'DISTANCE 0 m', {
      fontSize: '16px',
      color: '#C7B9D9',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(10);

    this.coinText = scene.add.text(width * 0.82, height * 0.11, 'COINS 0', {
      fontSize: '16px',
      color: '#FFD54A',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(10);

    this.muteButton = scene.add.text(width * 0.84, height * 0.035, 'SFX ON', {
      fontSize: '12px',
      color: '#FFF6E8',
      fontStyle: 'bold',
      backgroundColor: '#30254a',
      padding: { x: 7, y: 5 },
    }).setOrigin(0.5).setDepth(11).setInteractive({ useHandCursor: true });

    this.stateText = scene.add.text(width / 2, height * 0.83, 'TAP TO RUN', {
      fontSize: '23px',
      color: '#F58324',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(10);

    this.instructionText = scene.add.text(
      width / 2,
      height * 0.90,
      'Stop to time the moving hazards',
      { fontSize: '14px', color: '#FFF6E8' },
    ).setOrigin(0.5).setDepth(10);

    this.ctaButton = scene.add.rectangle(
      width / 2,
      height * 0.925,
      Math.min(220, width * 0.75),
      40,
      0xf58324,
    ).setInteractive({ useHandCursor: true }).setDepth(10);

    this.ctaText = scene.add.text(width / 2, height * 0.925, 'Explore Scrambly', {
      fontSize: '18px',
      color: '#FFF6E8',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(11);

    this.bestScoreCtaButton = scene.add.rectangle(
      width / 2,
      height / 2,
      Math.min(280, width * 0.8),
      58,
      0xf58324,
    ).setDepth(20).setInteractive({ useHandCursor: true }).setVisible(false);
    this.bestScoreCtaText = scene.add.text(width / 2, height / 2, 'NEW BEST! TAP TO CLAIM', {
      fontSize: '17px',
      color: '#FFF6E8',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(21).setVisible(false);
    this.bestScoreCtaButton.on('pointerdown', (_pointer: Phaser.Input.Pointer, _localX: number, _localY: number, event: Event) => {
      event.stopPropagation();
      console.log('CTA clicked — demo only');
    });
  }

  setDistance(distance: number) {
    this.distanceText.setText(`DISTANCE ${Math.floor(distance / 100)} m`);
  }

  setCoinCount(count: number) {
    this.coinText.setText(`COINS ${count}`);
  }

  setMuted(muted: boolean) {
    this.muteButton.setText(muted ? 'SFX OFF' : 'SFX ON');
  }

  setBestScore(score: PlayerScore | null) {
    if (score === null) {
      this.bestScoreText.setVisible(false);
      return;
    }
    this.bestScoreText
      .setText(`BEST  ${score.distance} m  •  ${score.coins} coins`)
      .setVisible(true);
  }

  showRunning() {
    this.stateText.setText('RUNNING — TAP TO STOP').setColor('#F58324');
    this.instructionText.setText('Watch the hazard, then tap to move');
  }

  showStopped() {
    this.stateText.setText('STOPPED — TAP TO RUN').setColor('#8BE0B2');
    this.instructionText.setText('Hazards keep moving while you wait');
  }

  showDefeated(recordResult: RecordRunResult) {
    this.stateText.setText('RUN ENDED').setColor('#FF7777');
    this.instructionText.setText('Tap or click to restart');
    this.bestScoreCtaButton.setVisible(recordResult.showBestScoreCta);
    this.bestScoreCtaText.setVisible(recordResult.showBestScoreCta);
  }

  isUiControlUnderPointer(currentlyOver: Phaser.GameObjects.GameObject[]) {
    return currentlyOver.includes(this.ctaButton)
      || currentlyOver.includes(this.muteButton)
      || currentlyOver.includes(this.bestScoreCtaButton);
  }

  layout() {
    const { width, height } = this.scene.scale;
    this.titleText.setPosition(width / 2, height * 0.035);
    this.muteButton.setPosition(width * 0.84, height * 0.035);
    this.bestScoreText.setPosition(width / 2, height * 0.075);
    this.distanceText.setPosition(width * 0.35, height * 0.13);
    this.coinText.setPosition(width * 0.78, height * 0.13);
    this.stateText.setPosition(width / 2, height * 0.88);
    this.instructionText.setPosition(width / 2, height * 0.90);
    this.ctaButton.setPosition(width / 2, height * 0.95)
      .setSize(Math.min(220, width * 0.75), 40);
    this.ctaText.setPosition(width / 2, height * 0.95);
    this.bestScoreCtaButton.setPosition(width / 2, height / 2)
      .setSize(Math.min(280, width * 0.8), 58);
    this.bestScoreCtaText.setPosition(width / 2, height / 2);
  }
}
