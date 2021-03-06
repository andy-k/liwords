// The timer controller should be a mostly stand-alone state, for performance sake.
// This code is heavily based on the AGPL-licensed timer controller code
// for lichess (https://github.com/ornicar/lila)
// You rock Thibault

import { PlayerOrder } from './constants';
// import { GameState } from './reducers/game_reducer';
import { PlayState } from '../gen/macondo/api/proto/macondo/macondo_pb';

const positiveShowTenthsCutoff = 10000;
const negativeShowTenthsCutoff = -1000;

export type Seconds = number;
export type Centis = number;
export type Millis = number;

export interface ClockData {
  running: boolean;
  initial: Seconds;
  increment: Seconds;
  p1: Seconds; // index 0
  p2: Seconds; // index 1
  emerg: Seconds;
  showTenths: boolean;
  moretime: number;
}

export const millisToTimeStr = (
  ms: number,
  showTenths: boolean = true
): string => {
  const neg = ms < 0;
  // eslint-disable-next-line no-param-reassign
  const absms = Math.abs(ms);
  // const mins = Math.floor(ms / 60000);
  let secs;
  let secStr;
  let mins;
  if (
    ms > positiveShowTenthsCutoff ||
    ms < negativeShowTenthsCutoff ||
    !showTenths
  ) {
    let totalSecs;
    if (!neg) {
      totalSecs = Math.ceil(absms / 1000);
    } else {
      totalSecs = Math.floor(absms / 1000);
    }
    secs = totalSecs % 60;
    mins = Math.floor(totalSecs / 60);
    secStr = secs.toString().padStart(2, '0');
  } else {
    secs = absms / 1000;
    mins = Math.floor(secs / 60);
    secStr = secs.toFixed(1).padStart(4, '0');
  }
  const minStr = mins.toString().padStart(2, '0');
  return `${neg ? '-' : ''}${minStr}:${secStr}`;
};

export type Times = {
  p0: Millis;
  p1: Millis;
  activePlayer?: PlayerOrder; // the index of the player
  lastUpdate: Millis;
};

const minsToMillis = (m: number) => {
  return (m * 60000) as Millis;
};

export class ClockController {
  showTenths: (millis: Millis) => boolean;

  times: Times;

  private tickCallback?: number;

  onTimeout: (activePlayer: PlayerOrder) => void;

  onTick: (p: PlayerOrder, t: Millis) => void;

  maxOvertimeMinutes: number;

  constructor(
    ts: Times,
    onTimeout: (activePlayer: PlayerOrder) => void,
    onTick: (p: PlayerOrder, t: Millis) => void
  ) {
    // Show tenths after 10 seconds.
    this.showTenths = (time) =>
      time < positiveShowTenthsCutoff && time > negativeShowTenthsCutoff;

    this.times = { ...ts };
    this.onTimeout = onTimeout;
    this.onTick = onTick;
    this.setClock(PlayState.PLAYING, this.times);
    this.maxOvertimeMinutes = 0;
    console.log('in timer controller constructor', this.times);
  }

  setClock = (playState: number, ts: Times, delay: Centis = 0) => {
    const isClockRunning = playState !== PlayState.GAME_OVER;
    const delayMs = delay * 10;

    this.times = {
      ...ts,
      activePlayer: isClockRunning ? ts.activePlayer : undefined,
      lastUpdate: performance.now() + delayMs,
    };

    console.log('setClock', this.times);

    if (isClockRunning) {
      this.scheduleTick(this.times[this.times.activePlayer!], delayMs);
    }
  };

  setMaxOvertime = (maxOTMinutes: number | undefined) => {
    console.log('Set max overtime mins', maxOTMinutes);
    this.maxOvertimeMinutes = maxOTMinutes || 0;
  };

  stopClock = (): Millis | null => {
    console.log('stopClock');

    const { activePlayer } = this.times;
    if (activePlayer) {
      const curElapse = this.elapsed();
      this.times[activePlayer] = Math.max(
        -minsToMillis(this.maxOvertimeMinutes),
        this.times[activePlayer] - curElapse
      );
      this.times.activePlayer = undefined;
      return curElapse;
    }
    return null;
  };

  private scheduleTick = (time: Millis, extraDelay: Millis) => {
    if (this.tickCallback !== undefined) {
      clearTimeout(this.tickCallback);
    }
    this.tickCallback = window.setTimeout(
      this.tick,
      (time % (this.showTenths(time) ? 100 : 500)) + 1 + extraDelay
    );
  };

  // Should only be invoked by scheduleTick.
  private tick = (): void => {
    this.tickCallback = undefined;
    const { activePlayer } = this.times;

    if (activePlayer === undefined) {
      return;
    }

    const now = performance.now();
    const millis = Math.max(
      -minsToMillis(this.maxOvertimeMinutes),
      this.times[activePlayer] - this.elapsed(now)
    );
    this.onTick(activePlayer, millis);

    if (millis !== -minsToMillis(this.maxOvertimeMinutes)) {
      this.scheduleTick(millis, 0);
    } else {
      // we timed out.
      this.onTimeout(activePlayer);
    }
  };

  elapsed = (now = performance.now()) =>
    Math.max(
      -minsToMillis(this.maxOvertimeMinutes),
      now - this.times.lastUpdate
    );

  millisOf = (p: PlayerOrder): Millis =>
    this.times.activePlayer === p
      ? Math.max(
          -minsToMillis(this.maxOvertimeMinutes),
          this.times[p] - this.elapsed()
        )
      : this.times[p];
}
