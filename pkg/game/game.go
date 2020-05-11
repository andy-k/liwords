// Package game should know nothing about protocols or databases.
// It is mostly a pass-through interface to a Macondo game,
// but also implements a timer and other related logic.
// This is a use-case in the clean architecture hierarchy.
package game

import (
	"context"
	"errors"

	macondopb "github.com/domino14/macondo/gen/api/proto/macondo"

	"github.com/domino14/crosswords/pkg/config"
	"github.com/domino14/crosswords/pkg/entity"
	pb "github.com/domino14/crosswords/rpc/api/proto"
	"github.com/domino14/macondo/board"
	"github.com/domino14/macondo/game"
)

const (
	CrosswordGame string = "CrosswordGame"
)

var (
	errGameNotActive = errors.New("game is not currently active")
	errNotOnTurn     = errors.New("player not on turn")
)

// GameStore is an interface for getting a full game.
type GameStore interface {
	Get(ctx context.Context, id string) (*entity.Game, error)
	Set(context.Context, *entity.Game) error
}

// type Game interface {
// }

// StartNewGame instantiates a game and starts the timer.
func StartNewGame(ctx context.Context, gameStore GameStore, cfg *config.Config,
	players []*macondopb.PlayerInfo, req *pb.GameRequest,
	eventChan chan<- *entity.EventWrapper) (string, error) {

	var bd []string
	switch req.Rules.BoardLayoutName {
	case CrosswordGame:
		bd = board.CrosswordGameBoard
	default:
		return "", errors.New("unsupported board layout")
	}

	rules, err := game.NewGameRules(&cfg.MacondoConfig, bd,
		req.Lexicon, req.Rules.LetterDistributionName)

	if err != nil {
		return "", err
	}
	g, err := game.NewGame(rules, players)
	if err != nil {
		return "", err
	}
	// StartGame sets a new history Uid and actually starts the game.
	g.StartGame()
	entGame := entity.NewGame(g, req)
	if err = gameStore.Set(ctx, entGame); err != nil {
		return "", err
	}
	gameID := g.History().Uid
	if err = entGame.RegisterChangeHook(eventChan); err != nil {
		return "", err
	}
	entGame.SendChange(entity.WrapEvent(entGame.HistoryRefresherEvent()))

	return gameID, nil
}

func PlayMove(ctx context.Context, gameStore GameStore, player string,
	uge *pb.UserGameplayEvent) error {

	entGame, err := gameStore.Get(ctx, uge.GameId)
	if err != nil {
		return err
	}
	if !entGame.Game.Playing() {
		return errGameNotActive
	}
	onTurn := entGame.Game.PlayerOnTurn()

	// Ensure that it is actually the correct player's turn
	if entGame.Game.NickOnTurn() != player {
		return errNotOnTurn
	}

	m := game.MoveFromEvent(uge.Event, entGame.Game.Alphabet(), entGame.Game.Board())

	// Don't back up the move, but add to history
	err = entGame.Game.PlayMove(m, false, true)
	if err != nil {
		return err
	}

	// Register time.
	entGame.RecordTimeOfMove(onTurn)
	uge.TimeRemaining = int32(entGame.TimeRemaining(onTurn))
	uge.NewRack = entGame.Game.RackLettersFor(onTurn)
	// Since the move was successful, we assume the user gameplay event is valid.
	// Re-send it, but overwrite the time remaining and new rack properly.
	playing := entGame.Game.Playing()

	err = gameStore.Set(ctx, entGame)
	if err != nil {
		return err
	}

	entGame.SendChange(entity.WrapEvent(uge))
	if !playing {
		performEndgameDuties(entGame, pb.GameEndReason_WENT_OUT, player)
	}
	return nil
}

func performEndgameDuties(g *entity.Game, reason pb.GameEndReason, player string) {
	// figure out ratings later lol
	// if g.RatingMode() == pb.RatingMode_RATED {
	// 	ratings :=
	// }

	g.SendChange(
		entity.WrapEvent(g.GameEndedEvent(pb.GameEndReason_WENT_OUT, player)))

}
