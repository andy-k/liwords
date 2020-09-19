import { useEffect, useState } from 'react';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import useWebSocket from 'react-use-websocket';
import { useLocation } from 'react-router-dom';
import { useStoreContext } from '../store/store';
import { onSocketMsg } from '../store/socket_handlers';
import { decodeToMsg } from '../utils/protobuf';
import { toAPIUrl } from '../api/api';

const getSocketURI = (): string => {
  const loc = window.location;
  let socketURI;
  if (loc.protocol === 'https:') {
    socketURI = 'wss:';
  } else {
    socketURI = 'ws:';
  }

  socketURI += `//${window.RUNTIME_CONFIGURATION.socketEndpoint}/ws`;

  return socketURI;
};

type TokenResponse = {
  token: string;
};

type DecodedToken = {
  unn: string;
  uid: string;
  a: boolean; // authed
};

export const useLiwordsSocket = () => {
  const socketUrl = getSocketURI();
  const store = useStoreContext();
  const location = useLocation();

  const [socketToken, setSocketToken] = useState('');
  const [username, setUsername] = useState('Anonymous');
  const [userID, setUserID] = useState('');
  const [loggedIn, setLoggedIn] = useState(false);
  const [connectedToSocket, setConnectedToSocket] = useState(false);
  const [justDisconnected, setJustDisconnected] = useState(false);

  useEffect(() => {
    if (connectedToSocket) {
      // Only call this function if we are not connected to the socket.
      // If we go from unconnected to connected, there is no need to call
      // it again. If we go from connected to unconnected, then we call it
      // to fetch a new token.
      return;
    }

    axios
      .post<TokenResponse>(
        toAPIUrl('user_service.AuthenticationService', 'GetSocketToken'),
        {},
        { withCredentials: true }
      )
      .then((resp) => {
        setSocketToken(resp.data.token);
        const decoded = jwt.decode(resp.data.token) as DecodedToken;
        setUsername(decoded.unn);
        setUserID(decoded.uid);
        setLoggedIn(decoded.a);
        console.log('Got token, setting state');
      })
      .catch((e) => {
        if (e.response) {
          window.console.log(e.response);
        }
      });
  }, [connectedToSocket]);

  const { sendMessage } = useWebSocket(
    `${socketUrl}?token=${socketToken}&path=${location.pathname}`,
    {
      onOpen: () => {
        console.log('connected to socket');
        setConnectedToSocket(true);
        setJustDisconnected(false);
      },
      onClose: () => {
        console.log('disconnected from socket :(');
        setConnectedToSocket(false);
        setJustDisconnected(true);
      },
      retryOnError: true,
      // Will attempt to reconnect on all close events, such as server shutting down
      shouldReconnect: (closeEvent) => true,
      onMessage: (event: MessageEvent) =>
        decodeToMsg(event.data, onSocketMsg(username, store)),
    },
    socketToken !== '' /* only connect if the socket token is not null */
  );

  return {
    sendMessage,
    userID,
    username,
    loggedIn,
    connectedToSocket,
    justDisconnected,
  };
};
