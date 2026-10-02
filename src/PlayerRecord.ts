export interface PlayerScore {
  distance: number;
  coins: number;
}

export interface RecordRunResult {
  score: PlayerScore | null;
  isNewBest: boolean;
}

const storageKey = 'scrambly-player-record';

function isPlayerScore(value: unknown): value is PlayerScore {
  if (typeof value !== 'object' || value === null) return false;

  const score = value as Record<string, unknown>;
  return Number.isInteger(score.distance)
    && Number(score.distance) >= 0
    && Number.isInteger(score.coins)
    && Number(score.coins) >= 0;
}

export class PlayerRecord {
  private bestScore: PlayerScore | null;

  constructor() {
    const cachedRecord = localStorage.getItem(storageKey);
    if (cachedRecord === null) {
      this.bestScore = null;
      return;
    }

    const parsedRecord: unknown = JSON.parse(cachedRecord);
    if (!isPlayerScore(parsedRecord)) {
      throw new Error(`Invalid player record stored under "${storageKey}".`);
    }
    this.bestScore = parsedRecord;
  }

  getBestScore() {
    return this.bestScore;
  }

  recordRun(score: PlayerScore) {
    const isFirstRecord = this.bestScore === null;
    const beatsBest = this.bestScore !== null
      && ((score.coins > this.bestScore.coins
      && score.distance < this.bestScore.distance ) || (score.coins < this.bestScore.coins));

    if (!isFirstRecord && !beatsBest) {
      return { score: this.bestScore, isNewBest: false };
    }

    localStorage.setItem(storageKey, JSON.stringify(score));
    this.bestScore = score;
    return { score: this.bestScore, isNewBest: true };
  }
}
