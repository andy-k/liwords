import React, { useCallback, useState, useEffect } from 'react';
import { Card } from 'antd';

import { TopBar } from '../topbar/topbar';
import {
  SeekRequest,
  GameRequest,
  MessageType,
  GameRules,
  RatingMode,
  MatchRequest,
  SoughtGameProcessEvent,
  ChatMessage,
} from '../gen/api/proto/realtime/realtime_pb';
import { encodeToSocketFmt } from '../utils/protobuf';
import { SoughtGame } from '../store/reducers/lobby_reducer';
import { ChallengeRuleMap } from '../gen/macondo/api/proto/macondo/macondo_pb';
import { GameLists } from './gameLists';
import { Chat } from '../chat/chat';
import {
  useChatStoreContext,
  useLoginStateStoreContext,
  usePresenceStoreContext,
} from '../store/store';
import './lobby.scss';

const sendSeek = (
  game: SoughtGame,
  sendSocketMsg: (msg: Uint8Array) => void
) => {
  const sr = new SeekRequest();
  const mr = new MatchRequest();
  const gr = new GameRequest();
  const rules = new GameRules();
  rules.setBoardLayoutName('CrosswordGame');
  rules.setLetterDistributionName('english');

  gr.setChallengeRule(
    game.challengeRule as ChallengeRuleMap[keyof ChallengeRuleMap]
  );
  gr.setLexicon(game.lexicon);
  gr.setInitialTimeSeconds(game.initialTimeSecs);
  gr.setMaxOvertimeMinutes(game.maxOvertimeMinutes);
  gr.setIncrementSeconds(game.incrementSecs);
  gr.setRules(rules);
  gr.setRatingMode(game.rated ? RatingMode.RATED : RatingMode.CASUAL);
  gr.setPlayerVsBot(game.playerVsBot);
  if (game.receiver.getDisplayName() === '' && game.playerVsBot === false) {
    sr.setGameRequest(gr);

    sendSocketMsg(
      encodeToSocketFmt(MessageType.SEEK_REQUEST, sr.serializeBinary())
    );
  } else {
    // We make it a match request if the receiver is non-empty, or if playerVsBot.
    mr.setGameRequest(gr);
    mr.setReceivingUser(game.receiver);
    sendSocketMsg(
      encodeToSocketFmt(MessageType.MATCH_REQUEST, mr.serializeBinary())
    );
  }
};

const sendAccept = (
  seekID: string,
  sendSocketMsg: (msg: Uint8Array) => void
) => {
  // Eventually use the ID.
  const sa = new SoughtGameProcessEvent();
  sa.setRequestId(seekID);
  sendSocketMsg(
    encodeToSocketFmt(
      MessageType.SOUGHT_GAME_PROCESS_EVENT,
      sa.serializeBinary()
    )
  );
};

type Props = {
  sendSocketMsg: (msg: Uint8Array) => void;
  DISCONNECT: () => void;
};

export const Lobby = (props: Props) => {
  const stillMountedRef = React.useRef(true);
  React.useEffect(() => () => void (stillMountedRef.current = false), []);

  const { sendSocketMsg } = props;
  const { chat } = useChatStoreContext();
  const { loginState } = useLoginStateStoreContext();
  const { presences } = usePresenceStoreContext();
  const { loggedIn, username, userID } = loginState;

  const [selectedGameTab, setSelectedGameTab] = useState(
    loggedIn ? 'PLAY' : 'WATCH'
  );

  useEffect(() => {
    if (stillMountedRef.current) {
      setSelectedGameTab(loggedIn ? 'PLAY' : 'WATCH');
    }
  }, [loggedIn]);

  const handleNewGame = useCallback(
    (seekID: string) => {
      sendAccept(seekID, sendSocketMsg);
    },
    [sendSocketMsg]
  );
  const onSeekSubmit = useCallback(
    (g: SoughtGame) => {
      sendSeek(g, sendSocketMsg);
    },
    [sendSocketMsg]
  );

  const sendChat = useCallback(
    (msg: string) => {
      const evt = new ChatMessage();
      evt.setMessage(msg);
      evt.setChannel('lobby.chat');
      sendSocketMsg(
        encodeToSocketFmt(MessageType.CHAT_MESSAGE, evt.serializeBinary())
      );
    },
    [sendSocketMsg]
  );

  const setSelectedGameTabIfStillMounted = useCallback((v) => {
    if (stillMountedRef.current) {
      setSelectedGameTab(v);
    }
  }, []);

  return (
    <>
      <TopBar />
      <div className="lobby">
        <div className="chat-area">
          <Chat
            chatEntities={chat}
            sendChat={sendChat}
            description="Lobby chat"
            peopleOnlineContext="Players"
            presences={presences}
            DISCONNECT={props.DISCONNECT}
          />
        </div>
        <GameLists
          loggedIn={loggedIn}
          userID={userID}
          username={username}
          newGame={handleNewGame}
          selectedGameTab={selectedGameTab}
          setSelectedGameTab={setSelectedGameTabIfStillMounted}
          onSeekSubmit={onSeekSubmit}
        />
        <div className="announcements">
          <Card>
            <h3>Woogles is live!</h3>
            <p>
              Welcome to our open beta. Sign up and play some games. We still
              have a lot of features and designs to build, but please{' '}
              <a className="link" href="https://discord.gg/5yCJjmW">
                join our Discord server
              </a>{' '}
              and let us know if you find any issues.
            </p>
            <br />
            <p>Thanks for Woogling!</p>
          </Card>
        </div>
      </div>
    </>
  );
};
