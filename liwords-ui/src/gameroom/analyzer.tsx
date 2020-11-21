import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import { Button, Card } from 'antd';
import { BulbOutlined } from '@ant-design/icons';
import {
  useExaminableGameContextStoreContext,
  useTentativeTileContext,
} from '../store/store';
import { getMacondo } from '../wasm/loader';
import { useMountedState } from '../utils/mounted';
import { RedoOutlined } from '@ant-design/icons/lib';
import { EmptySpace, EphemeralTile } from '../utils/cwgame/common';
import { Unrace } from '../utils/unrace';

type AnalyzerProps = {
  includeCard?: boolean;
  style?: React.CSSProperties;
};

// See analyzer/analyzer.go JsonMove.
type JsonMove = {
  Action: string;
  Row: number; // int
  Column: number; // int
  Vertical: boolean;
  DisplayCoordinates: string;
  Tiles: string;
  Leave: string;
  Equity: number; // float64
  Score: number; // int
};

type AnalyzerMove = {
  displayMove: string;
  coordinates: string;
  leave: string;
  score: number;
  equity: string;
  row: number;
  col: number;
  vertical: boolean;
  tiles: string;
  isExchange: boolean;
};

export const analyzerMoveFromJsonMove = (
  move: JsonMove,
  dim: number,
  letters: string
): AnalyzerMove => {
  let displayMove = '';
  let isExchange = false;
  switch (move.Action) {
    case 'Play': {
      let r = move.Row;
      let c = move.Column;
      let inParen = false;
      for (const t of move.Tiles) {
        if (t === '.') {
          if (!inParen) {
            displayMove += '(';
            inParen = true;
          }
          displayMove += letters[r * dim + c];
        } else {
          if (inParen) {
            displayMove += ')';
            inParen = false;
          }
          displayMove += t;
        }
        if (move.Vertical) ++r;
        else ++c;
      }
      if (inParen) displayMove += ')';
      break;
    }
    case 'Exchange': {
      displayMove = `Exch. ${move.Tiles}`;
      isExchange = true;
      break;
    }
    case 'Pass': {
      displayMove = `Pass`;
      break;
    }
    default: {
      break;
    }
  }
  return {
    displayMove,
    coordinates: move.DisplayCoordinates,
    leave: move.Leave,
    vertical: move.Vertical,
    col: move.Column,
    row: move.Row,
    score: move.Score,
    equity: move.Equity.toFixed(2),
    tiles: move.Tiles,
    isExchange,
  };
};

const AnalyzerContext = React.createContext<{
  cachedMoves: Array<AnalyzerMove> | null | undefined;
  examinerLoading: boolean;
  requestAnalysis: () => void;
  showMovesForTurn: number;
  setShowMovesForTurn: (a: number) => void;
}>({
  cachedMoves: null,
  examinerLoading: false,
  requestAnalysis: () => {},
  showMovesForTurn: -1,
  setShowMovesForTurn: (a: number) => {},
});

export const AnalyzerContextProvider = ({
  children,
  lexicon,
}: {
  children: React.ReactNode;
  lexicon: string;
}) => {
  const { useState } = useMountedState();

  const analyzerIds = useRef<Array<number | undefined>>([]);
  const [movesCache, setMovesCache] = useState<
    Array<Array<AnalyzerMove> | null | undefined>
  >([]);
  const [showMovesForTurn, setShowMovesForTurn] = useState(-1);
  const [unrace, setUnrace] = useState(new Unrace());

  const {
    gameContext: examinableGameContext,
  } = useExaminableGameContextStoreContext();

  const disposeOfAnalyzers = useCallback(async () => {
    const ar = analyzerIds.current;
    let macondo;
    for (const idx in ar) {
      const analyzerId = ar[idx];
      if (analyzerId != null) {
        if (macondo == null) {
          macondo = await getMacondo(lexicon);
        }
        await macondo.delAnalyzer(analyzerId);
      }
      delete ar[idx];
    }
    ar.length = 0;
  }, [lexicon]);

  const examinerId = useRef(0);
  useEffect(() => {
    examinerId.current = (examinerId.current + 1) | 0;
    disposeOfAnalyzers();
    setMovesCache([]);
    setUnrace(new Unrace());
  }, [examinableGameContext.gameID, disposeOfAnalyzers]);

  useEffect(() => {
    return () => {
      disposeOfAnalyzers();
    };
  }, [disposeOfAnalyzers]);

  const analyzerIdForTurn = useCallback(
    async (turn) => {
      const examinerIdAtStart = examinerId.current;
      let analyzerId = analyzerIds.current[turn];
      if (analyzerId != null) return analyzerId;
      const macondo = await getMacondo(lexicon);
      if (examinerIdAtStart !== examinerId.current) {
        throw new Error('context invalidated');
      }
      analyzerId = await macondo.newAnalyzer();
      let keepTheAnalyzer = false;
      try {
        if (examinerIdAtStart !== examinerId.current) {
          throw new Error('context invalidated');
        }
        if (analyzerIds.current[turn] != null)
          return analyzerIds.current[turn]!;
        analyzerIds.current[turn] = analyzerId;
        keepTheAnalyzer = true;
        return analyzerId;
      } finally {
        if (!keepTheAnalyzer) {
          await macondo.delAnalyzer(analyzerId);
        }
      }
    },
    [lexicon]
  );

  const requestAnalysis = useCallback(() => {
    const examinerIdAtStart = examinerId.current;
    const turn = examinableGameContext.turns.length;
    // null = loading. undefined = not yet requested.
    if (movesCache[turn] !== undefined) return;
    setMovesCache((oldMovesCache) => {
      const ret = [...oldMovesCache];
      ret[turn] = null;
      return ret;
    });

    unrace.run(async () => {
      const {
        board: { dim, letters },
        onturn,
        players,
      } = examinableGameContext;

      const boardObj = {
        size: dim,
        rack: players[onturn].currentRack,
        board: Array.from(new Array(dim), (_, row) =>
          letters.substr(row * dim, dim)
        ),
        lexicon,
      };

      const macondo = await getMacondo(lexicon);
      if (examinerIdAtStart !== examinerId.current) return;

      const boardStr = JSON.stringify(boardObj);
      let movesStr;
      try {
        movesStr = await macondo.analyzerAnalyze(
          await analyzerIdForTurn(turn),
          boardStr
        );
      } catch (e) {
        console.error('macondo error', e);
        setMovesCache((oldMovesCache) => {
          const ret = [...oldMovesCache];
          ret[turn] = undefined;
          return ret;
        });
        return;
      }
      if (examinerIdAtStart !== examinerId.current) return;
      const movesObj = JSON.parse(movesStr) as Array<JsonMove>;

      const formattedMoves = movesObj.map((move) =>
        analyzerMoveFromJsonMove(move, dim, letters)
      );
      setMovesCache((oldMovesCache) => {
        const ret = [...oldMovesCache];
        ret[turn] = formattedMoves;
        return ret;
      });
    });
  }, [analyzerIdForTurn, examinableGameContext, lexicon, movesCache, unrace]);

  const cachedMoves = movesCache[examinableGameContext.turns.length];
  const examinerLoading = cachedMoves === null;
  const contextValue = useMemo(
    () => ({
      cachedMoves,
      examinerLoading,
      requestAnalysis,
      showMovesForTurn,
      setShowMovesForTurn,
    }),
    [
      cachedMoves,
      examinerLoading,
      requestAnalysis,
      showMovesForTurn,
      setShowMovesForTurn,
    ]
  );

  return <AnalyzerContext.Provider value={contextValue} children={children} />;
};

export const Analyzer = React.memo((props: AnalyzerProps) => {
  const {
    cachedMoves,
    examinerLoading,
    requestAnalysis,
    showMovesForTurn,
    setShowMovesForTurn,
  } = useContext(AnalyzerContext);

  const {
    gameContext: examinableGameContext,
  } = useExaminableGameContextStoreContext();
  const {
    setDisplayedRack,
    setPlacedTiles,
    setPlacedTilesTempScore,
  } = useTentativeTileContext();

  const placeMove = useCallback(
    (move) => {
      const {
        board: { dim, letters },
      } = examinableGameContext;
      let newPlacedTiles = new Set<EphemeralTile>();
      let row = move.row;
      let col = move.col;
      let vertical = move.vertical;
      if (move.isExchange) {
        row = 0;
        col = 0;
        vertical = false;
      }
      for (const t of move.tiles) {
        if (move.isExchange) {
          while (letters[row * dim + col] !== EmptySpace) {
            ++col;
            if (col >= dim) {
              ++row;
              if (row >= dim) {
                // Cannot happen with the standard number of tiles and squares.
                row = dim - 1;
                col = dim - 1;
                break;
              }
              col = 0;
            }
          }
        }
        if (t !== '.') {
          newPlacedTiles.add({
            row,
            col,
            letter: t,
          });
        }
        if (vertical) ++row;
        else ++col;
      }
      setDisplayedRack(move.leave);
      setPlacedTiles(newPlacedTiles);
      setPlacedTilesTempScore(move.score);
    },
    [
      examinableGameContext,
      setDisplayedRack,
      setPlacedTiles,
      setPlacedTilesTempScore,
    ]
  );

  const handleExaminer = useCallback(() => {
    setShowMovesForTurn(examinableGameContext.turns.length);
    requestAnalysis();
  }, [
    examinableGameContext.turns.length,
    requestAnalysis,
    setShowMovesForTurn,
  ]);

  // When at the last move, examineStoreContext.examinedTurn === Infinity.
  // To also detect new moves, we use examinableGameContext.turns.length.
  useEffect(() => {
    setShowMovesForTurn(-1);
  }, [examinableGameContext.turns.length, setShowMovesForTurn]);

  const showMoves = showMovesForTurn === examinableGameContext.turns.length;
  const moves = useMemo(() => (showMoves ? cachedMoves : null), [
    showMoves,
    cachedMoves,
  ]);

  const renderAnalyzerMoves = useMemo(
    () =>
      moves?.map((m: AnalyzerMove, idx) => (
        <tr
          key={idx}
          onClick={() => {
            placeMove(m);
          }}
        >
          <td className="move-coords">{m.coordinates}</td>
          <td className="move">{m.displayMove}</td>
          <td className="move-score">{m.score}</td>
          <td className="move-leave">{m.leave}</td>
          <td className="move-equity">{m.equity}</td>
        </tr>
      )) ?? null,
    [moves, placeMove]
  );

  const analyzerContainer = (
    <div className="analyzer-container">
      {!examinerLoading ? (
        <div className="suggestions" style={props.style}>
          <table>
            <tbody>{renderAnalyzerMoves}</tbody>
          </table>
        </div>
      ) : (
        <div className="suggestions" style={props.style}>
          <RedoOutlined spin />
        </div>
      )}
      {!props.includeCard ? (
        <Button
          shape="circle"
          icon={<BulbOutlined />}
          type="primary"
          onClick={handleExaminer}
          disabled={examinerLoading}
        />
      ) : null}
    </div>
  );
  if (props.includeCard) {
    return (
      <Card
        title="Analyzer"
        className="analyzer-card"
        extra={
          <Button
            shape="circle"
            icon={<BulbOutlined />}
            type="primary"
            onClick={handleExaminer}
            disabled={examinerLoading}
          />
        }
      >
        {analyzerContainer}
      </Card>
    );
  }
  return analyzerContainer;
});
