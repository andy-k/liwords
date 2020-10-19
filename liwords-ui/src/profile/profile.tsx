import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams, useLocation } from 'react-router-dom';
import { notification, Card, Table, Row, Col } from 'antd';
import axios, { AxiosError } from 'axios';
import { TopBar } from '../topbar/topbar';
import './profile.scss';
import { toAPIUrl } from '../api/api';
import {
  useLoginStateStoreContext,
  useResetStoreContext,
} from '../store/store';
import { GameMetadata, RecentGamesResponse } from '../gameroom/game_info';
import { GamesHistoryCard } from './games_history';
import { UsernameWithContext } from '../shared/usernameWithContext';

type ProfileResponse = {
  first_name: string;
  last_name: string;
  country_code: string;
  title: string;
  about: string;
  ratings_json: string;
  stats_json: string;
  user_id: string;
};

const errorCatcher = (e: AxiosError) => {
  if (e.response) {
    notification.warning({
      message: 'Fetch Error',
      description: e.response.data.msg,
      duration: 4,
    });
  }
};

type StatItem = {
  n: string; // name
  t: number; // total
  a: Array<number>; // averages
};

type Rating = {
  r: number;
  rd: number;
  v: number;
};

type ProfileRatings = { [variant: string]: Rating };

type RatingsProps = {
  ratings: ProfileRatings;
};

type ProfileStats = {
  [variant: string]: {
    i1: string; // us
    i2: string; // opp
    d1: { [key: string]: StatItem }; // us
    d2: { [key: string]: StatItem }; // opp
    n: Array<StatItem>; // notable
  };
};

type StatsProps = {
  stats: ProfileStats;
};

const variantToName = (variant: string) => {
  const arr = variant.split('.');
  // get rid of the middle element (classic) for now
  const timectrl = {
    ultrablitz: 'Ultra-Blitz!',
    blitz: 'Blitz',
    rapid: 'Rapid',
    regular: 'Regular',
  }[arr[2] as 'ultrablitz' | 'blitz' | 'rapid' | 'regular']; // cmon typescript

  return `${arr[0]} (${timectrl})`;
};

const RatingsCard = React.memo((props: RatingsProps) => {
  const variants = props.ratings ? Object.keys(props.ratings) : [];
  const dataSource = variants.map((v) => ({
    key: v,
    name: variantToName(v),
    rating: props.ratings[v].r.toFixed(2),
    deviation: props.ratings[v].rd.toFixed(2),
    volatility: props.ratings[v].v.toFixed(2),
  }));

  const columns = [
    {
      title: 'Variant',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Rating',
      dataIndex: 'rating',
      key: 'rating',
    },
    {
      title: 'Deviation',
      dataIndex: 'deviation',
      key: 'deviation',
    },
    {
      title: 'Volatility',
      dataIndex: 'volatility',
      key: 'volatility',
    },
  ];

  return (
    <Card title="Ratings">
      <Table
        pagination={{
          hideOnSinglePage: true,
        }}
        dataSource={dataSource}
        columns={columns}
      />
    </Card>
  );
});

const StatsCard = React.memo((props: StatsProps) => {
  const variants = props.stats ? Object.keys(props.stats) : [];

  const dataSource = variants.map((v) => ({
    key: v,
    name: variantToName(v),
    games: props.stats[v].d1.Games.t,
    wld: `${props.stats[v].d1.Wins.t}-${props.stats[v].d1.Losses.t}-${props.stats[v].d1.Draws.t}`,
    avgScore: (props.stats[v].d1.Score.t / props.stats[v].d1.Games.t).toFixed(
      2
    ),
    avgPerTurn: (props.stats[v].d1.Score.t / props.stats[v].d1.Turns.t).toFixed(
      2
    ),
    avgScoreAgainst: (
      props.stats[v].d2.Score.t / props.stats[v].d2.Games.t
    ).toFixed(2),
    bingosPerGame: (
      props.stats[v].d1.Bingos.t / props.stats[v].d1.Games.t
    ).toFixed(2),
  }));

  const columns = [
    {
      title: 'Variant',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Games',
      dataIndex: 'games',
      key: 'games',
    },
    {
      title: 'W-L-D',
      dataIndex: 'wld',
      key: 'wld',
    },
    {
      title: 'Avg Score',
      dataIndex: 'avgScore',
      key: 'avgScore',
    },
    {
      title: 'Avg Per Turn',
      dataIndex: 'avgPerTurn',
      key: 'avgPerTurn',
    },
    {
      title: 'Opp Avg Score',
      dataIndex: 'avgScoreAgainst',
      key: 'avgScoreAgainst',
    },
    {
      title: 'Bingos Per Game',
      dataIndex: 'bingosPerGame',
      key: 'bingosPerGame',
    },
  ];

  return (
    <Card title="Stats">
      <Table
        dataSource={dataSource}
        columns={columns}
        pagination={{
          hideOnSinglePage: true,
        }}
      />
    </Card>
  );
});

type Props = {};

const gamesPageSize = 10;

export const UserProfile = React.memo((props: Props) => {
  const stillMountedRef = React.useRef(true);
  React.useEffect(() => () => void (stillMountedRef.current = false), []);

  const { username } = useParams();
  const location = useLocation();
  // Show username's profile
  const [ratings, setRatings] = useState({});
  const [stats, setStats] = useState({});
  const [userID, setUserID] = useState('');
  const [recentGames, setRecentGames] = useState<Array<GameMetadata>>([]);
  const { loginState } = useLoginStateStoreContext();
  const { resetStore } = useResetStoreContext();
  const { username: viewer } = loginState;
  const [recentGamesOffset, setRecentGamesOffset] = useState(0);
  useEffect(() => {
    axios
      .post<ProfileResponse>(
        toAPIUrl('user_service.ProfileService', 'GetProfile'),
        {
          username,
        }
      )
      .then((resp) => {
        if (stillMountedRef.current) {
          setRatings(JSON.parse(resp.data.ratings_json).Data);
          setStats(JSON.parse(resp.data.stats_json).Data);
          setUserID(resp.data.user_id);
        }
      })
      .catch(errorCatcher);
  }, [username, location.pathname]);

  useEffect(() => {
    axios
      .post<RecentGamesResponse>(
        toAPIUrl('game_service.GameMetadataService', 'GetRecentGames'),
        {
          username,
          numGames: gamesPageSize,
          offset: recentGamesOffset,
        }
      )
      .then((resp) => {
        if (stillMountedRef.current) {
          setRecentGames(resp.data.game_info);
        }
      })
      .catch(errorCatcher);
  }, [username, recentGamesOffset]);

  const fetchPrev = useCallback(() => {
    if (stillMountedRef.current) {
      setRecentGamesOffset((recentGamesOffset) =>
        Math.max(recentGamesOffset - gamesPageSize, 0)
      );
    }
  }, []);
  const fetchNext = useCallback(() => {
    if (stillMountedRef.current) {
      setRecentGamesOffset(
        (recentGamesOffset) => recentGamesOffset + gamesPageSize
      );
    }
  }, []);

  return (
    <>
      <Row>
        <Col span={24}>
          <TopBar />
        </Col>
      </Row>

      <div className="profile">
        <header>
          <h3>
            {viewer !== username ? (
              <UsernameWithContext
                omitProfileLink
                username={username}
                userID={userID}
              />
            ) : (
              username
            )}
          </h3>
          {viewer === username ? (
            <Link to="/password/change" onClick={resetStore}>
              Change your password
            </Link>
          ) : null}
        </header>
        <RatingsCard ratings={ratings} />
        <GamesHistoryCard
          games={recentGames}
          username={username}
          userID={userID}
          fetchPrev={recentGamesOffset > 0 ? fetchPrev : undefined}
          fetchNext={recentGames.length < gamesPageSize ? undefined : fetchNext}
        />
        <StatsCard stats={stats} />
      </div>
    </>
  );
});
