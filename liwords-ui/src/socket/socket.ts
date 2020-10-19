import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import useWebSocket from 'react-use-websocket';
import { useLocation } from 'react-router-dom';
import { useLoginStateStoreContext } from '../store/store';
import { useOnSocketMsg } from '../store/socket_handlers';
import { decodeToMsg } from '../utils/protobuf';
import { toAPIUrl } from '../api/api';
import { ActionType } from '../actions/actions';

const getSocketURI = (): string => {
  const loc = window.location;
  let protocol;
  if (loc.protocol === 'https:') {
    protocol = 'wss:';
  } else {
    protocol = 'ws:';
  }
  const host = window.RUNTIME_CONFIGURATION.socketEndpoint || loc.host;

  return `${protocol}//${host}/ws`;
};

type TokenResponse = {
  token: string;
  cid: string;
};

type DecodedToken = {
  unn: string;
  uid: string;
  a: boolean; // authed
};

export const LiwordsSocket = (props: {
  disconnect: boolean;
  setValues: (_: {
    sendMessage: (msg: Uint8Array) => void;
    justDisconnected: boolean;
  }) => void;
}): null => {
  const stillMountedRef = React.useRef(true);
  React.useEffect(() => () => void (stillMountedRef.current = false), []);

  const { disconnect, setValues } = props;
  const onSocketMsg = useOnSocketMsg();

  const socketUrl = getSocketURI();
  const loginStateStore = useLoginStateStoreContext();
  const location = useLocation();

  // const [socketToken, setSocketToken] = useState('');
  const [fullSocketUrl, setFullSocketUrl] = useState('');
  const [justDisconnected, setJustDisconnected] = useState(false);

  useEffect(() => {
    if (loginStateStore.loginState.connectedToSocket) {
      // Only call this function if we are not connected to the socket.
      // If we go from unconnected to connected, there is no need to call
      // it again. If we go from connected to unconnected, then we call it
      // to fetch a new token.
      console.log('already connected');
      return;
    }
    console.log('About to request token');

    axios
      .post<TokenResponse>(
        toAPIUrl('user_service.AuthenticationService', 'GetSocketToken'),
        {},
        { withCredentials: true }
      )
      .then((resp) => {
        const socketToken = resp.data.token;
        const { cid } = resp.data;

        if (stillMountedRef.current) {
          setFullSocketUrl(
            `${socketUrl}?${new URLSearchParams({
              token: socketToken,
              path: location.pathname,
              cid,
            })}`
          );
        }

        const decoded = jwt.decode(socketToken) as DecodedToken;
        loginStateStore.dispatchLoginState({
          actionType: ActionType.SetAuthentication,
          payload: {
            username: decoded.unn,
            userID: decoded.uid,
            loggedIn: decoded.a,
            connID: cid,
          },
        });
        console.log('Got token, setting state, and will try to connect...');
      })
      .catch((e) => {
        if (e.response) {
          window.console.log(e.response);
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loginStateStore.loginState.connectedToSocket]);

  const { sendMessage } = useWebSocket(
    useCallback(() => fullSocketUrl, [fullSocketUrl]),
    {
      onOpen: () => {
        console.log('connected to socket');
        loginStateStore.dispatchLoginState({
          actionType: ActionType.SetConnectedToSocket,
          payload: true,
        });
        if (stillMountedRef.current) {
          setJustDisconnected(false);
        }
      },
      onClose: () => {
        console.log('disconnected from socket :(');
        loginStateStore.dispatchLoginState({
          actionType: ActionType.SetConnectedToSocket,
          payload: false,
        });
        if (stillMountedRef.current) {
          setJustDisconnected(true);
        }
      },
      retryOnError: true,
      shouldReconnect: (closeEvent) => true,
      onMessage: (event: MessageEvent) => decodeToMsg(event.data, onSocketMsg),
    },
    !disconnect &&
      fullSocketUrl !== '' /* only connect if the socket token is not null */
  );

  const ret = useMemo(() => ({ sendMessage, justDisconnected }), [
    sendMessage,
    justDisconnected,
  ]);
  useEffect(() => {
    setValues(ret);
  }, [setValues, ret]);

  return null;
};
