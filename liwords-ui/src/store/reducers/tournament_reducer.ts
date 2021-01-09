import { Action, ActionType } from '../../actions/actions';
import {
  GameEndReasonMap,
  TournamentGameResultMap,
} from '../../gen/api/proto/realtime/realtime_pb';

type tourneytypes = 'STANDARD' | 'CLUB' | 'CLUB_SESSION';
type valueof<T> = T[keyof T];

type tournamentGameResult = valueof<TournamentGameResultMap>;
type gameEndReason = valueof<GameEndReasonMap>;

export type TournamentMetadata = {
  name: string;
  description: string;
  directors: Array<string>;
  slug: string;
  id: string;
  type: tourneytypes;
  divisions: Array<string>;
};

type TournamentGame = {
  scores: Array<number>;
  results: Array<tournamentGameResult>;
  game_end_reason: gameEndReason;
};

type SinglePairing = {
  players: Array<string>;
  outcomes: Array<tournamentGameResult>;
  readyStates: Array<string>;
  games: Array<TournamentGame>;
};

type Division = {
  tournamentID: string;
  divisionID: string;
  players: Array<string>;
  // Add TournamentControls here.
  roundInfo: { [roundUserKey: string]: SinglePairing };
  currentRound: number;
  // Add Standings here
};

export type TournamentState = {
  metadata: TournamentMetadata;
  // standings, pairings, etc. more stuff here to come.
  started: boolean;
  // Note: currentRound is zero-indexed
  divisions: { [name: string]: Division };
};

export const defaultTournamentState = {
  metadata: {
    name: '',
    description: '',
    directors: new Array<string>(),
    slug: '',
    id: '',
    type: 'STANDARD' as tourneytypes,
    divisions: new Array<string>(),
  },
  started: false,
  divisions: {},
};

export enum TourneyStatus {
  PRETOURNEY = 'PRETOURNEY',
  ROUND_BYE = 'ROUND_BYE',
  ROUND_OPEN = 'ROUND_OPEN',
  ROUND_GAME_FINISHED = 'ROUND_GAME_FINISHED',
  ROUND_READY = 'ROUND_READY', // waiting for your opponent
  ROUND_OPPONENT_WAITING = 'ROUND_OPPONENT_WAITING',
  ROUND_LATE = 'ROUND_LATE', // expect this to override opponent waiting
  ROUND_GAME_ACTIVE = 'ROUND_GAME_ACTIVE',
  ROUND_FORFEIT = 'ROUND_FORFEIT',
  POSTTOURNEY = 'POSTTOURNEY',
}

export type CompetitorState = {
  isRegistered: boolean;
  division?: string;
  status?: TourneyStatus;
  currentRound: number; // Should be the 1 based user facing round
};

export const defaultCompetitorState = {
  isRegistered: false,
  currentRound: 0,
};

export function TournamentReducer(
  state: TournamentState,
  action: Action
): TournamentState {
  switch (action.actionType) {
    case ActionType.SetTourneyMetadata:
      const metadata = action.payload as TournamentMetadata;
      return {
        ...state,
        metadata,
      };
  }
  throw new Error(`unhandled action type ${action.actionType}`);
}
