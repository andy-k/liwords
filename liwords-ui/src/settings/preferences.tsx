import React, { useCallback } from 'react';
import { useMountedState } from '../utils/mounted';
import { Col, Row, Select, Switch } from 'antd';
import { preferredSortOrder, setPreferredSortOrder } from '../store/constants';
import '../gameroom/scss/gameroom.scss';
import { TileLetter, PointValue } from '../gameroom/tile';
type Props = {};

const KNOWN_TILE_ORDERS = [
  {
    name: 'Alphabetical',
    value: '',
  },
  {
    name: 'Vowels first',
    value: 'AEIOU',
  },
  {
    name: 'Consonants first',
    value: 'BCDFGHJKLMNPQRSTVWXYZ',
  },
  {
    name: 'Descending points',
    value: 'QZJXKFHVWYBCMPDG',
  },
  {
    name: 'Blanks first',
    value: '?',
  },
];

const KNOWN_TILE_STYLES = [
  {
    name: 'default',
    value: '',
  },
  {
    name: 'Charcoal',
    value: 'charcoal',
  },
  {
    name: 'White',
    value: 'whitish',
  },
  {
    name: 'Mahogany',
    value: 'mahogany',
  },
  {
    name: 'Balsa',
    value: 'balsa',
  },
  {
    name: 'Brick',
    value: 'brick',
  },
  {
    name: 'Forest',
    value: 'forest',
  },
  {
    name: 'Teal',
    value: 'tealish',
  },
  {
    name: 'Pastel',
    value: 'pastel',
  },
  {
    name: 'Fuchsia',
    value: 'fuchsiaish',
  },
  {
    name: 'Blue',
    value: 'blueish',
  },
  {
    name: 'Metallic',
    value: 'metallic',
  },
];

export const Preferences = React.memo((props: Props) => {
  const { useState } = useMountedState();

  const [darkMode, setDarkMode] = useState(
    localStorage?.getItem('darkMode') === 'true'
  );
  const initalTileStyle = localStorage?.getItem('userTile') || 'default';

  const [userTile, setUserTile] = useState<string>(initalTileStyle);
  const toggleDarkMode = useCallback(() => {
    const useDarkMode = localStorage?.getItem('darkMode') !== 'true';
    localStorage.setItem('darkMode', useDarkMode ? 'true' : 'false');
    if (useDarkMode) {
      document?.body?.classList?.add('mode--dark');
      document?.body?.classList?.remove('mode--default');
    } else {
      document?.body?.classList?.add('mode--default');
      document?.body?.classList?.remove('mode--dark');
    }
    setDarkMode((x) => !x);
  }, []);

  const handleUserTileChange = useCallback((tileStyle: string) => {
    const classes = document?.body?.className
      .split(' ')
      .filter((c) => !c.includes('tile--'));
    document.body.className = classes.join(' ').trim();
    if (tileStyle !== 'default') {
      localStorage.setItem('userTile', tileStyle);
      document?.body?.classList?.add(`tile--${tileStyle}`);
    } else {
      localStorage.removeItem('userTile');
    }
    setUserTile(tileStyle);
  }, []);

  const [enableAllLexicons, setEnableAllLexicons] = useState(
    localStorage?.getItem('enableAllLexicons') === 'true'
  );
  const toggleEnableAllLexicons = useCallback(() => {
    const wantEnableAllLexicons =
      localStorage?.getItem('enableAllLexicons') !== 'true';
    localStorage.setItem(
      'enableAllLexicons',
      wantEnableAllLexicons ? 'true' : 'false'
    );
    setEnableAllLexicons((x) => !x);
  }, []);

  const [tileOrder, setTileOrder] = useState(preferredSortOrder ?? '');
  const handleTileOrderChange = useCallback((value) => {
    setTileOrder(value);
    setPreferredSortOrder(value);
  }, []);

  return (
    <div className="preferences">
      <h3>Preferences</h3>
      <div className="section-header">Display</div>
      <div className="toggle-section">
        <div className="title">Dark mode</div>
        <div>Use the dark version of the Woogles UI on Woogles.io</div>
        <Switch
          defaultChecked={darkMode}
          onChange={toggleDarkMode}
          className="dark-toggle"
        />
      </div>
      <div className="section-header">OMGWords settings</div>
      <Row>
        <Col span={12}>
          <div className="tile-order">Default tile order</div>
          <Select
            className="tile-order-select"
            size="large"
            defaultValue={tileOrder}
            onChange={handleTileOrderChange}
          >
            {KNOWN_TILE_ORDERS.map(({ name, value }) => (
              <Select.Option value={value} key={value}>
                {name}
              </Select.Option>
            ))}
            {KNOWN_TILE_ORDERS.some(({ value }) => value === tileOrder) || (
              <Select.Option value={tileOrder}>Custom</Select.Option>
            )}
          </Select>
          <div className="tile-order">Tile style</div>
          <div className="tile-selection">
            <Select
              className="tile-style-select"
              size="large"
              defaultValue={userTile}
              onChange={handleUserTileChange}
            >
              {KNOWN_TILE_STYLES.map(({ name, value }) => (
                <Select.Option value={value} key={value}>
                  {name}
                </Select.Option>
              ))}
            </Select>
            <div className="previewer">
              <div className={`tile-previewer tile--${userTile}`}>
                <div className="tile">
                  <TileLetter rune="W" />
                  <PointValue value={4} />
                </div>
                <div className="tile">
                  <TileLetter rune="O" />
                  <PointValue value={1} />
                </div>
                <div className="tile">
                  <TileLetter rune="O" />
                  <PointValue value={1} />
                </div>
                <div className="tile blank">
                  <TileLetter rune="G" />
                  <PointValue value={0} />
                </div>
                <div className="tile">
                  <TileLetter rune="L" />
                  <PointValue value={1} />
                </div>
                <div className="tile">
                  <TileLetter rune="E" />
                  <PointValue value={1} />
                </div>
                <div className="tile">
                  <TileLetter rune="S" />
                  <PointValue value={1} />
                </div>
              </div>
              <div className={`tile-previewer tile--${userTile}`}>
                <div className="tile last-played">
                  <TileLetter rune="O" />
                  <PointValue value={1} />
                </div>
                <div className="tile last-played blank">
                  <TileLetter rune="M" />
                  <PointValue value={0} />
                </div>
                <div className="tile last-played">
                  <TileLetter rune="G" />
                  <PointValue value={2} />
                </div>
              </div>
            </div>
          </div>
        </Col>
      </Row>
      <div className="section-header">Lexicons</div>
      <div className="toggle-section">
        <div>Enable all lexicons</div>
        <Switch
          defaultChecked={enableAllLexicons}
          onChange={toggleEnableAllLexicons}
          className="dark-toggle"
        />
      </div>
    </div>
  );
});
