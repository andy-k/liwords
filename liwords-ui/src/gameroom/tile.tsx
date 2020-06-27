import React from 'react';
import TentativeScore from './tentative_score';
import { Blank } from '../utils/cwgame/common';

const colors = require('../base.scss');

type TileStyle = {
  backgroundColor: string;
  outline: string;
  color: string;
  blankTextColor: string;
  strokeWidth: string;
};

const TILE_STYLES: { [name: string]: TileStyle } = {
  primary: {
    backgroundColor: colors.colorSecondary,
    outline: '#ffffff',
    color: '#ffffff',
    blankTextColor: '#11fefe',
    strokeWidth: '0px',
  },
  primaryJustPlayed: {
    backgroundColor: colors.colorSecondaryMedium,
    outline: '#ffffff',
    color: '#ffffff',
    blankTextColor: '#11fefe',
    strokeWidth: '0px',
  },
  primaryTentative: {
    backgroundColor: colors.colorSecondaryMedium,
    outline: '#4894D4',
    color: '#FFFFFF',
    blankTextColor: '#fe1111',
    strokeWidth: '0px',
  },
};

type TileLetterProps = {
  rune: string;
};

const TileLetter = (props: TileLetterProps) => {
  let { rune } = props;
  // if (rune.toUpperCase() !== rune) {
  //   rune = rune.toUpperCase();
  // }
  if (rune === Blank) {
    rune = ' ';
  }

  return <p className="rune">{rune}</p>;
};

type PointValueProps = {
  value: number;
};

const PointValue = (props: PointValueProps) => {
  if (!props.value) {
    return null;
  }
  return <p className="point-value">{props.value}</p>;
};

type TileProps = {
  lastPlayed: boolean;
  rune: string;
  value: number;
  scale?: boolean;
  tentative?: boolean;
  tentativeScore?: number;
  grabbable: boolean;
  onClick?: () => void;
};

const Tile = (props: TileProps) => {
  let tileStyle = TILE_STYLES.primary;
  if (props.lastPlayed) {
    tileStyle = TILE_STYLES.primaryJustPlayed;
  }
  if (props.tentative) {
    tileStyle = TILE_STYLES.primaryTentative;
  }

  return (
    <div
      className="tile"
      style={{ ...tileStyle, cursor: props.grabbable ? 'grab' : 'default' }}
      onClick={props.onClick ? props.onClick : () => {}}
    >
      <TileLetter rune={props.rune} />
      <PointValue value={props.value} />
      <TentativeScore score={props.tentativeScore} />
    </div>
  );
};

export default Tile;
