import React, { useCallback, useEffect, useState } from 'react';
import { Route, Switch, useHistory } from 'react-router-dom';
import './App.scss';
import axios from 'axios';
import 'antd/dist/antd.css';

import { Table as GameTable } from './gameroom/table';
import { Lobby } from './lobby/lobby';
import {
  useExcludedPlayersStoreContext,
  useRedirGameStoreContext,
  useResetStoreContext,
} from './store/store';

import { LiwordsSocket } from './socket/socket';
import { About } from './about/about';
import { Register } from './lobby/register';
import { UserProfile } from './profile/profile';
import { PasswordChange } from './lobby/password_change';
import { PasswordReset } from './lobby/password_reset';
import { NewPassword } from './lobby/new_password';
import { toAPIUrl } from './api/api';

type Blocks = {
  user_ids: Array<string>;
};

const App = React.memo(() => {
  const stillMountedRef = React.useRef(true);
  React.useEffect(() => () => void (stillMountedRef.current = false), []);

  const { setExcludedPlayers } = useExcludedPlayersStoreContext();
  const { redirGame, setRedirGame } = useRedirGameStoreContext();
  const { resetStore } = useResetStoreContext();
  const [shouldDisconnect, setShouldDisconnect] = useState(false);

  const [liwordsSocketValues, setLiwordsSocketValues] = useState({
    sendMessage: (msg: Uint8Array) => {},
    justDisconnected: false,
  });
  const { sendMessage } = liwordsSocketValues;

  const history = useHistory();
  useEffect(() => {
    if (redirGame !== '') {
      if (stillMountedRef.current) {
        setRedirGame('');
      }
      resetStore();
      history.replace(`/game/${encodeURIComponent(redirGame)}`);
    }
  }, [history, redirGame, resetStore, setRedirGame]);

  const disconnectSocket = useCallback(() => {
    if (stillMountedRef.current) {
      setShouldDisconnect(true);
    }
    setTimeout(() => {
      // reconnect after 5 seconds.
      if (stillMountedRef.current) {
        setShouldDisconnect(false);
      }
    }, 5000);
  }, []);

  useEffect(() => {
    axios
      .post<Blocks>(
        toAPIUrl('user_service.SocializeService', 'GetFullBlocks'),
        {},
        { withCredentials: true }
      )
      .then((resp) => {
        if (stillMountedRef.current) {
          setExcludedPlayers(new Set<string>(resp.data.user_ids));
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setLiwordsSocketValuesIfStillMounted = useCallback((v) => {
    if (stillMountedRef.current) {
      setLiwordsSocketValues(v);
    }
  }, []);

  return (
    <div className="App">
      <LiwordsSocket
        disconnect={shouldDisconnect}
        setValues={setLiwordsSocketValuesIfStillMounted}
      />
      <Switch>
        <Route path="/" exact>
          <Lobby sendSocketMsg={sendMessage} DISCONNECT={disconnectSocket} />
        </Route>
        <Route path="/game/:gameID">
          {/* Table meaning a game table */}
          <GameTable sendSocketMsg={sendMessage} />
        </Route>
        <Route path="/about">
          <About />
        </Route>
        <Route path="/register">
          <Register />
        </Route>
        <Route path="/password/change">
          <PasswordChange />
        </Route>
        <Route path="/password/reset">
          <PasswordReset />
        </Route>

        <Route path="/password/new">
          <NewPassword />
        </Route>

        <Route path="/profile/:username">
          <UserProfile />
        </Route>
      </Switch>
    </div>
  );
});

export default App;
