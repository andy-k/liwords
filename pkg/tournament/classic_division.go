package tournament

import (
	"encoding/json"
	"errors"
	"fmt"
	"math/rand"
	"sort"

	"gorm.io/datatypes"

	"github.com/domino14/liwords/pkg/entity"
	"github.com/domino14/liwords/pkg/pair"
	realtime "github.com/domino14/liwords/rpc/api/proto/realtime"
)

type ClassicDivision struct {
	Matrix [][]*entity.PlayerRoundInfo `json:"matrix"`
	// By convention, players should look like userUUID:username
	Players           []string                         `json:"players"`
	PlayersProperties []*entity.PlayerProperties       `json:"playerProperties"`
	PlayerIndexMap    map[string]int                   `json:"pidxMap"`
	RoundControls     []*entity.RoundControls          `json:"roundCtrls"`
	CurrentRound      int                              `json:"currentRound"`
	LastStarted       *realtime.TournamentRoundStarted `json:"lastStarted"`
}

func NewClassicDivision(players []string, roundControls []*entity.RoundControls) (*ClassicDivision, error) {
	numberOfPlayers := len(players)

	numberOfRounds := len(roundControls)

	if numberOfPlayers < 2 || numberOfRounds < 1 {
		pairings := newPairingMatrix(numberOfRounds, numberOfPlayers)
		playerIndexMap := newPlayerIndexMap(players)
		t := &ClassicDivision{Matrix: pairings,
			Players:        players,
			PlayerIndexMap: playerIndexMap,
			RoundControls:  roundControls,
			CurrentRound:   0}
		return t, nil
	}

	isElimination := false

	for i := 0; i < numberOfRounds; i++ {
		control := roundControls[i]
		if control.PairingMethod == entity.Elimination {
			isElimination = true
			break
		}
	}

	initialFontes := 0
	for i := 0; i < numberOfRounds; i++ {
		control := roundControls[i]
		if isElimination && control.PairingMethod != entity.Elimination {
			return nil, errors.New("cannot mix Elimination pairings with any other pairing method")
		} else if i != 0 {
			if control.PairingMethod == entity.InitialFontes &&
				roundControls[i-1].PairingMethod != entity.InitialFontes {
				return nil, errors.New("cannot use Initial Fontes pairing when an earlier round used a different pairing method")
			} else if control.PairingMethod != entity.InitialFontes &&
				roundControls[i-1].PairingMethod == entity.InitialFontes {
				initialFontes = i
			}
		}
	}

	if initialFontes > 0 && initialFontes%2 == 0 {
		return nil, fmt.Errorf("number of rounds paired with Initial Fontes must be odd, have %d instead", initialFontes)
	}

	// For now, assume we require exactly n rounds and 2 ^ n players for an elimination tournament

	if roundControls[0].PairingMethod == entity.Elimination {
		expectedNumberOfPlayers := 1 << numberOfRounds
		if expectedNumberOfPlayers != numberOfPlayers {
			return nil, fmt.Errorf("invalid number of players based on the number of rounds: "+
				" have %d players, expected %d players based on the number of rounds which is %d",
				numberOfPlayers, expectedNumberOfPlayers, numberOfRounds)
		}
	}

	for i := 0; i < numberOfRounds; i++ {
		roundControls[i].InitialFontes = initialFontes
		roundControls[i].Round = i
	}

	playersProperties := []*entity.PlayerProperties{}
	for i := 0; i < numberOfPlayers; i++ {
		playersProperties = append(playersProperties, newPlayerProperties())
	}

	pairings := newPairingMatrix(numberOfRounds, numberOfPlayers)
	playerIndexMap := newPlayerIndexMap(players)
	t := &ClassicDivision{Matrix: pairings,
		Players:           players,
		PlayersProperties: playersProperties,
		PlayerIndexMap:    playerIndexMap,
		RoundControls:     roundControls,
		CurrentRound:      0}
	if roundControls[0].PairingMethod != entity.Manual {
		err := t.PairRound(0)
		if err != nil {
			return nil, err
		}
	}

	// We can make all standings independent pairings right now
	for i := 1; i < numberOfRounds; i++ {
		pm := roundControls[i].PairingMethod
		if pair.IsStandingsIndependent(pm) && pm != entity.Manual {
			err := t.PairRound(i)
			if err != nil {
				return nil, err
			}
		}
	}

	return t, nil
}

func (t *ClassicDivision) GetPlayerRoundInfo(player string, round int) (*entity.PlayerRoundInfo, error) {
	if round >= len(t.Matrix) || round < 0 {
		return nil, fmt.Errorf("round number out of range: %d", round)
	}
	roundPairings := t.Matrix[round]

	playerIndex, ok := t.PlayerIndexMap[player]
	if !ok {
		return nil, fmt.Errorf("player does not exist in the tournament: %s", player)
	}
	return roundPairings[playerIndex], nil
}

func (t *ClassicDivision) SetPairing(playerOne string, playerTwo string, round int, isForfeit bool) error {

	if playerOne != playerTwo && isForfeit {
		return fmt.Errorf("forfeit results require that player one and two are identical, instead have: %s, %s", playerOne, playerTwo)
	}

	playerOneInfo, err := t.GetPlayerRoundInfo(playerOne, round)
	if err != nil {
		return err
	}

	playerTwoInfo, err := t.GetPlayerRoundInfo(playerTwo, round)
	if err != nil {
		return err
	}

	playerOneOpponent, err := opponentOf(playerOneInfo.Pairing, playerOne)
	if err != nil {
		return err
	}

	playerTwoOpponent, err := opponentOf(playerTwoInfo.Pairing, playerTwo)
	if err != nil {
		return err
	}

	playerOneInfo.Pairing = nil
	playerTwoInfo.Pairing = nil

	// The GetPlayerRoundInfo calls protect against
	// out-of-range indexes
	playerOneProperties := t.PlayersProperties[t.PlayerIndexMap[playerOne]]
	playerTwoProperties := t.PlayersProperties[t.PlayerIndexMap[playerTwo]]

	// If playerOne was already paired, unpair their opponent
	if playerOneOpponent != "" {
		playerOneOpponentInfo, err := t.GetPlayerRoundInfo(playerOneOpponent, round)
		if err != nil {
			return err
		}
		playerOneOpponentInfo.Pairing = nil
	}

	// If playerTwo was already paired, unpair their opponent
	if playerTwoOpponent != "" {
		playerTwoOpponentInfo, err := t.GetPlayerRoundInfo(playerTwoOpponent, round)
		if err != nil {
			return err
		}
		playerTwoOpponentInfo.Pairing = nil
	}

	newPairing := newClassicPairing(t, playerOne, playerTwo, round)
	playerOneInfo.Pairing = newPairing
	playerTwoInfo.Pairing = newPairing

	// This pairing is a bye or forfeit, the result
	// can be submitted immediately
	if playerOne == playerTwo {

		score := entity.ByeScore
		tgr := realtime.TournamentGameResult_BYE
		if isForfeit {
			score = entity.ForfeitScore
			tgr = realtime.TournamentGameResult_FORFEIT_LOSS
		}
		// Use round < t.CurrentRound to satisfy
		// amendment checking. These results always need
		// to be submitted.
		err = t.SubmitResult(round,
			playerOne,
			playerOne,
			score,
			0,
			tgr,
			tgr,
			realtime.GameEndReason_NONE,
			round < t.CurrentRound,
			0)
		if err != nil {
			return err
		}
	} else if playerOneProperties.Removed || playerTwoProperties.Removed {
		err = t.SetPairing(playerOne, playerOne, round, playerOneProperties.Removed)
		if err != nil {
			return err
		}
		err = t.SetPairing(playerTwo, playerTwo, round, playerTwoProperties.Removed)
		if err != nil {
			return err
		}
	}

	return nil
}

func (t *ClassicDivision) SubmitResult(round int,
	p1 string,
	p2 string,
	p1Score int,
	p2Score int,
	p1Result realtime.TournamentGameResult,
	p2Result realtime.TournamentGameResult,
	reason realtime.GameEndReason,
	amend bool,
	gameIndex int) error {

	// Fetch the player round records
	pri1, err := t.GetPlayerRoundInfo(p1, round)
	if err != nil {
		return err
	}
	pri2, err := t.GetPlayerRoundInfo(p2, round)
	if err != nil {
		return err
	}

	// Ensure that this is the current round
	if round < t.CurrentRound && !amend {
		return fmt.Errorf("submitted result for a past round (%d) that is not marked as an amendment", round)
	}

	// Ensure that the pairing exists
	if pri1.Pairing == nil {
		return fmt.Errorf("submitted result for a player with a null pairing: %s round (%d)", p1, round)
	}

	if pri2.Pairing == nil {
		return fmt.Errorf("submitted result for a player with a null pairing: %s round (%d)", p2, round)
	}

	// Ensure the submitted results were for players that were paired
	if pri1.Pairing != pri2.Pairing {
		return fmt.Errorf("submitted result for players that didn't player each other: %s (%p), %s (%p) round (%d)", p1, pri1.Pairing, p2, pri2.Pairing, round)
	}

	pairing := pri1.Pairing
	pairingMethod := t.RoundControls[round].PairingMethod

	if pairing.Games == nil {
		return fmt.Errorf("submitted result for a pairing with no initialized games: %s (%p), %s (%p) round (%d)", p1, pri1.Pairing, p2, pri2.Pairing, round)
	}

	// For Elimination tournaments only.
	// Could be a tiebreaking result or could be an out of range
	// game index
	if pairingMethod == entity.Elimination && gameIndex >= t.RoundControls[round].GamesPerRound {
		if gameIndex != len(pairing.Games) {
			return fmt.Errorf("submitted tiebreaking result with invalid game index."+
				" Player 1: %s, Player 2: %s, Round: %d, GameIndex: %d", p1, p2, round, gameIndex)
		} else {
			pairing.Games = append(pairing.Games,
				&entity.TournamentGame{Scores: []int{0, 0},
					Results: []realtime.TournamentGameResult{realtime.TournamentGameResult_NO_RESULT,
						realtime.TournamentGameResult_NO_RESULT}})
		}
	}

	if gameIndex >= len(pairing.Games) {
		return fmt.Errorf("submitted result where game index is out of range: %d >= %d", gameIndex, len(pairing.Games))
	}

	// If this is not an amendment, but attempts to amend a result, reject
	// this submission.
	if !amend && ((pairing.Outcomes[0] != realtime.TournamentGameResult_NO_RESULT &&
		pairing.Outcomes[1] != realtime.TournamentGameResult_NO_RESULT) ||

		pairing.Games[gameIndex].Results[0] != realtime.TournamentGameResult_NO_RESULT &&
			pairing.Games[gameIndex].Results[1] != realtime.TournamentGameResult_NO_RESULT) {
		return fmt.Errorf("result is already submitted for round %d, %s vs. %s", round, p1, p2)
	}

	// If this claims to be an amendment and is not submitting forfeit
	// losses for players show up late, reject this submission.
	if amend && p1Result != realtime.TournamentGameResult_FORFEIT_LOSS &&
		p2Result != realtime.TournamentGameResult_FORFEIT_LOSS &&
		(pairing.Games[gameIndex].Results[0] == realtime.TournamentGameResult_NO_RESULT &&
			pairing.Games[gameIndex].Results[1] == realtime.TournamentGameResult_NO_RESULT) {
		return fmt.Errorf("submitted amendment for a result that does not exist in round %d, %s vs. %s", round, p1, p2)
	}

	p1Index := 0
	if pairing.Players[1] == p1 {
		p1Index = 1
	}

	if pairingMethod == entity.Elimination {
		pairing.Games[gameIndex].Scores[p1Index] = p1Score
		pairing.Games[gameIndex].Scores[1-p1Index] = p2Score
		pairing.Games[gameIndex].Results[p1Index] = p1Result
		pairing.Games[gameIndex].Results[1-p1Index] = p2Result
		pairing.Games[gameIndex].GameEndReason = reason

		// Get elimination outcomes will take care of the indexing
		// for us because the newOutcomes are aligned with the data
		// in pairing.Games
		newOutcomes := getEliminationOutcomes(pairing.Games, t.RoundControls[round].GamesPerRound)

		pairing.Outcomes[0] = newOutcomes[0]
		pairing.Outcomes[1] = newOutcomes[1]
	} else {
		// Classic tournaments only ever have
		// one game per round
		pairing.Games[0].Scores[p1Index] = p1Score
		pairing.Games[0].Scores[1-p1Index] = p2Score
		pairing.Games[0].Results[p1Index] = p1Result
		pairing.Games[0].Results[1-p1Index] = p2Result
		pairing.Games[0].GameEndReason = reason
		pairing.Outcomes[p1Index] = p1Result
		pairing.Outcomes[1-p1Index] = p2Result
	}

	roundComplete, err := t.IsRoundComplete(round)
	if err != nil {
		return err
	}
	finished, err := t.IsFinished()
	if err != nil {
		return err
	}

	// Only pair if this round is complete and the tournament
	// is not over. Don't pair for standings independent pairings since those pairings
	// were made when the tournament was created.
	if roundComplete {
		if !amend {
			t.CurrentRound = round + 1
		}
		if t.CurrentRound == round+1 &&
			!finished &&
			!pair.IsStandingsIndependent(t.RoundControls[t.CurrentRound].PairingMethod) {
			resultsArePresent, err := t.ResultsArePresent(t.CurrentRound)
			if err != nil {
				return err
			}
			if !resultsArePresent {
				err = t.PairRound(t.CurrentRound)
				if err != nil {
					return err
				}
			}
		}
	}

	return nil
}

func (t *ClassicDivision) PairRound(round int) error {
	if round < 0 || round >= len(t.Matrix) {
		return fmt.Errorf("round number out of range: %d", round)
	}
	roundPairings := t.Matrix[round]
	pairingMethod := t.RoundControls[round].PairingMethod
	// This automatic pairing could be the result of an
	// amendment. Undo all the pairings so byes can be
	// properly assigned (bye assignment checks for nil pairing).
	for i := 0; i < len(roundPairings); i++ {
		roundPairings[i].Pairing = nil
	}

	standingsRound := round
	if standingsRound == 0 {
		standingsRound = 1
	}

	standings, err := t.GetStandings(standingsRound - 1)
	if err != nil {
		return err
	}

	poolMembers := []*entity.PoolMember{}

	// Round Robin must have the same ordering for each round
	var playerOrder []string
	if pairingMethod == entity.RoundRobin {
		playerOrder = t.Players
	} else {
		playerOrder = make([]string, len(standings))
		for i := 0; i < len(standings); i++ {
			playerOrder[i] = standings[i].Player
		}
	}

	for i := 0; i < len(playerOrder); i++ {
		pm := &entity.PoolMember{Id: playerOrder[i]}
		// Wins do not matter for RoundRobin pairings
		if pairingMethod != entity.RoundRobin {
			pm.Wins = standings[i].Wins
			pm.Draws = standings[i].Draws
			pm.Spread = standings[i].Spread
		} else {
			pm.Wins = 0
			pm.Draws = 0
			pm.Spread = 0
		}
		poolMembers = append(poolMembers, pm)
	}

	repeats, err := getRepeats(t, round-1)
	if err != nil {
		return err
	}

	upm := &entity.UnpairedPoolMembers{RoundControls: t.RoundControls[round],
		PoolMembers: poolMembers,
		Repeats:     repeats}

	pairings, err := pair.Pair(upm)

	if err != nil {
		return err
	}

	l := len(pairings)

	if l != len(roundPairings) {
		return errors.New("pair did not return the correct number of pairings")
	}

	for i := 0; i < l; i++ {
		// Player order might be a different order than the players in roundPairings
		playerIndex := t.PlayerIndexMap[playerOrder[i]]

		if roundPairings[playerIndex].Pairing == nil {

			var opponentIndex int
			if pairings[i] < 0 {
				opponentIndex = playerIndex
			} else if pairings[i] >= l {
				fmt.Println(pairings)
				return fmt.Errorf("invalid pairing for round %d: %d", round, pairings[i])
			} else {
				opponentIndex = t.PlayerIndexMap[playerOrder[pairings[i]]]
			}

			playerName := t.Players[playerIndex]
			opponentName := t.Players[opponentIndex]

			if pairingMethod == entity.Elimination && round > 0 && i >= l>>round {
				roundPairings[playerIndex].Pairing = newEliminatedPairing(playerName, opponentName)
			} else {
				err = t.SetPairing(playerName, opponentName, round, false)
				if err != nil {
					return err
				}
			}
		}
	}
	return nil
}

func (t *ClassicDivision) AddPlayers(persons *entity.TournamentPersons) error {

	// Redundant players have already been checked for
	for person, _ := range persons.Persons {
		t.Players = append(t.Players, person)
		t.PlayersProperties = append(t.PlayersProperties, newPlayerProperties())
		t.PlayerIndexMap[person] = len(t.Players) - 1
	}

	for i := 0; i < len(t.Matrix); i++ {
		for _, _ = range persons.Persons {
			t.Matrix[i] = append(t.Matrix[i], &entity.PlayerRoundInfo{})
		}
	}

	for i := 0; i < len(t.Matrix); i++ {
		resultsArePresent := true
		if i == t.CurrentRound {
			presentResults, err := t.ResultsArePresent(i)
			if err != nil {
				return err
			}
			resultsArePresent = presentResults
		}
		if i < t.CurrentRound || i == t.CurrentRound && resultsArePresent {
			for person, _ := range persons.Persons {
				// Set the pairing
				// This also automatically submits a forfeit result
				err := t.SetPairing(person, person, i, true)
				if err != nil {
					return err
				}
			}
		} else {
			pm := t.RoundControls[i].PairingMethod
			if pair.IsStandingsIndependent(pm) && pm != entity.Manual {
				err := t.PairRound(i)
				if err != nil {
					return err
				}
			}
		}
	}
	return nil
}

func (t *ClassicDivision) RemovePlayers(persons *entity.TournamentPersons) error {
	for person, _ := range persons.Persons {
		playerIndex, ok := t.PlayerIndexMap[person]
		if !ok {
			return fmt.Errorf("player %s does not exist in"+
				" classic division RemovePlayers", person)
		}
		if playerIndex < 0 || playerIndex >= len(t.Players) {
			return fmt.Errorf("player index %d for player %s is"+
				" out of range in classic division RemovePlayers", playerIndex, person)
		}
	}

	playersRemaining := len(t.Players)
	for i := 0; i < len(t.PlayersProperties); i++ {
		if t.PlayersProperties[i].Removed {
			playersRemaining--
		}
	}

	if playersRemaining-len(persons.Persons) <= 0 {
		return fmt.Errorf("cannot remove players as tournament would be empty")
	}

	for person, _ := range persons.Persons {
		t.PlayersProperties[t.PlayerIndexMap[person]].Removed = true
	}

	for i := 0; i < len(t.Matrix); i++ {
		resultsArePresent := true
		if i == t.CurrentRound {
			presentResults, err := t.ResultsArePresent(i)
			if err != nil {
				return err
			}
			resultsArePresent = presentResults
		}
		if i > t.CurrentRound || (i == t.CurrentRound && !resultsArePresent) {
			pm := t.RoundControls[i].PairingMethod
			if (i == t.CurrentRound || pair.IsStandingsIndependent(pm)) && pm != entity.Manual {
				err := t.PairRound(i)
				if err != nil {
					return err
				}
			}
		}
	}

	return nil
}

func (t *ClassicDivision) GetStandings(round int) ([]*entity.Standing, error) {
	if round < 0 || round >= len(t.Matrix) {
		return nil, errors.New("round number out of range")
	}

	wins := 0
	losses := 0
	draws := 0
	spread := 0
	player := ""
	records := []*entity.Standing{}

	for i := 0; i < len(t.Players); i++ {
		wins = 0
		losses = 0
		draws = 0
		spread = 0
		player = t.Players[i]
		for j := 0; j <= round; j++ {
			pairing := t.Matrix[j][i].Pairing
			if pairing != nil && pairing.Players != nil {
				playerIndex := 0
				if pairing.Players[1] == player {
					playerIndex = 1
				}
				if pairing.Outcomes[playerIndex] != realtime.TournamentGameResult_NO_RESULT {
					result := convertResult(pairing.Outcomes[playerIndex])
					if result == 2 {
						wins++
					} else if result == 0 {
						losses++
					} else {
						draws++
					}
					for k := 0; k < len(pairing.Games); k++ {
						spread += pairing.Games[k].Scores[playerIndex] -
							pairing.Games[k].Scores[1-playerIndex]
					}
				}
			}
		}
		records = append(records, &entity.Standing{Player: player,
			Wins:    wins,
			Losses:  losses,
			Draws:   draws,
			Spread:  spread,
			Removed: t.PlayersProperties[i].Removed})
	}

	pairingMethod := t.RoundControls[round].PairingMethod

	// The difference for Elimination is that the original order
	// of the player list must be preserved. This is how we keep
	// track of the "bracket", which is simply modeled by an
	// array in this implementation. To keep this order, the
	// index in the tournament matrix is used as a tie breaker
	// for wins. In this way, The groupings are preserved across
	// rounds.
	if pairingMethod == entity.Elimination {
		sort.Slice(records,
			func(i, j int) bool {
				if records[i].Wins == records[j].Wins {
					return i < j
				} else {
					return records[i].Wins > records[j].Wins
				}
			})
	} else {
		sort.Slice(records,
			func(i, j int) bool {
				// If players were removed, they are listed last
				if (records[i].Removed && !records[j].Removed) || (!records[i].Removed && records[j].Removed) {
					return records[j].Removed
				} else if records[i].Wins == records[j].Wins && records[i].Draws == records[j].Draws && records[i].Spread == records[j].Spread {
					// Tiebreak alphabetically to ensure determinism
					return records[i].Player > records[j].Player
				} else if records[i].Wins == records[j].Wins && records[i].Draws == records[j].Draws {
					return records[i].Spread > records[j].Spread
				} else if records[i].Wins == records[j].Wins {
					return records[i].Draws > records[j].Draws
				} else {
					return records[i].Wins > records[j].Wins
				}
			})
	}

	return records, nil
}

func (t *ClassicDivision) IsRoundReady(round int) (bool, error) {
	if round >= len(t.Matrix) || round < 0 {
		return false, fmt.Errorf("round number out of range: %d", round)
	}
	// Check that everyone is paired
	for _, pri := range t.Matrix[round] {
		if pri.Pairing == nil {
			return false, nil
		}
	}
	// Check that all previous round are complete
	for i := 0; i <= round-1; i++ {
		complete, err := t.IsRoundComplete(i)
		if err != nil || !complete {
			return false, err
		}
	}
	return true, nil
}

func (t *ClassicDivision) ResultsArePresent(round int) (bool, error) {
	if round >= len(t.Matrix) || round < 0 {
		return false, fmt.Errorf("round number out of range: %d", round)
	}
	// Byes are not counted as "results", they are submitted automatically
	// when pairings are made
	for _, pri := range t.Matrix[round] {
		if pri.Pairing != nil && pri.Pairing.Outcomes != nil &&
			(isSubstantialResult(pri.Pairing.Outcomes[0]) ||
				isSubstantialResult(pri.Pairing.Outcomes[1])) {
			return true, nil
		}
	}
	return false, nil
}

func (t *ClassicDivision) SetLastStarted(ls *realtime.TournamentRoundStarted) error {
	t.LastStarted = ls
	return nil
}

func (t *ClassicDivision) SetReadyForGame(playerID, connID string, round, gameIndex int, unready bool) ([]string, error) {
	if round >= len(t.Matrix) || round < 0 {
		return nil, fmt.Errorf("round number out of range: %d", round)
	}
	toSet := connID
	if unready {
		toSet = ""
	}
	// gameIndex is ignored for ClassicDivision?
	foundPri := -1
	for priIndex, pri := range t.Matrix[round] {
		if pri.Pairing == nil {
			continue
		}
		for idx := range pri.Pairing.Players {
			if playerID == pri.Pairing.Players[idx] {
				pri.Pairing.ReadyStates[idx] = toSet
				foundPri = priIndex
			}
		}
	}
	if foundPri != -1 {
		// Check to see if both players are ready.
		pri := t.Matrix[round][foundPri]

		if pri.Pairing.ReadyStates[0] != "" && pri.Pairing.ReadyStates[1] != "" {
			return []string{
				pri.Pairing.Players[0] + ":" + pri.Pairing.ReadyStates[0],
				pri.Pairing.Players[1] + ":" + pri.Pairing.ReadyStates[1],
			}, nil
		}
	}
	return nil, nil
}

func isSubstantialResult(result realtime.TournamentGameResult) bool {
	return result != realtime.TournamentGameResult_NO_RESULT &&
		result != realtime.TournamentGameResult_BYE &&
		result != realtime.TournamentGameResult_FORFEIT_LOSS
}

func (t *ClassicDivision) IsRoundComplete(round int) (bool, error) {
	if round >= len(t.Matrix) || round < 0 {
		return false, fmt.Errorf("round number out of range: %d", round)
	}
	for _, pri := range t.Matrix[round] {
		if pri.Pairing == nil || pri.Pairing.Outcomes[0] == realtime.TournamentGameResult_NO_RESULT ||
			pri.Pairing.Outcomes[1] == realtime.TournamentGameResult_NO_RESULT {
			return false, nil
		}
	}
	return true, nil
}

func (t *ClassicDivision) IsFinished() (bool, error) {
	return t.IsRoundComplete(len(t.Matrix) - 1)
}

func (t *ClassicDivision) ToResponse() (*realtime.TournamentDivisionDataResponse, error) {

	realtimeTournamentControls := &realtime.TournamentControls{RoundControls: []*realtime.RoundControl{}}
	for i := 0; i < len(t.RoundControls); i++ {
		realtimeTournamentControls.RoundControls = append(realtimeTournamentControls.RoundControls,
			convertRoundControlsToResponse(t.RoundControls[i]))
	}

	oneDimMatrix := []*realtime.PlayerRoundInfo{}

	for i := 0; i < len(t.Matrix); i++ {
		for j := 0; j < len(t.Matrix[i]); j++ {
			oneDimMatrix = append(oneDimMatrix, convertPRIToResponse(t.Matrix[i][j]))
		}
	}

	classicDivision := &realtime.ClassicDivision{Matrix: oneDimMatrix}

	playersProperties := []*realtime.PlayerProperties{}
	for i := 0; i < len(t.PlayersProperties); i++ {
		playersProperties = append(playersProperties, &realtime.PlayerProperties{Removed: t.PlayersProperties[i].Removed})
	}

	return &realtime.TournamentDivisionDataResponse{Players: t.Players,
		Controls:          realtimeTournamentControls,
		Division:          classicDivision,
		PlayersProperties: playersProperties,
		CurrentRound:      int32(t.CurrentRound)}, nil
}

func convertRoundControlsToResponse(rc *entity.RoundControls) *realtime.RoundControl {
	return &realtime.RoundControl{PairingMethod: int32(rc.PairingMethod),
		FirstMethod:                 int32(rc.FirstMethod),
		GamesPerRound:               int32(rc.GamesPerRound),
		Round:                       int32(rc.Round),
		Factor:                      int32(rc.Factor),
		MaxRepeats:                  int32(rc.MaxRepeats),
		AllowOverMaxRepeats:         rc.AllowOverMaxRepeats,
		RepeatRelativeWeight:        int32(rc.RepeatRelativeWeight),
		WinDifferenceRelativeWeight: int32(rc.WinDifferenceRelativeWeight)}
}

func convertPRIToResponse(pri *entity.PlayerRoundInfo) *realtime.PlayerRoundInfo {
	priResponse := &realtime.PlayerRoundInfo{}
	if pri.Pairing != nil {
		priResponse.Players = pri.Pairing.Players
		priResponse.Outcomes = pri.Pairing.Outcomes
		priResponse.ReadyStates = pri.Pairing.ReadyStates
		for i := 0; i < len(pri.Pairing.Games); i++ {
			game := pri.Pairing.Games[i]
			priResponse.Games = append(priResponse.Games, &realtime.TournamentGame{Scores: []int32{int32(game.Scores[0]), int32(game.Scores[1])},
				Results:       game.Results,
				GameEndReason: game.GameEndReason})
		}
	}

	return priResponse
}

func (t *ClassicDivision) Serialize() (datatypes.JSON, error) {
	json, err := json.Marshal(t)
	if err != nil {
		return nil, err
	}
	return json, err
}

func newPairingMatrix(numberOfRounds int, numberOfPlayers int) [][]*entity.PlayerRoundInfo {
	pairings := [][]*entity.PlayerRoundInfo{}
	for i := 0; i < numberOfRounds; i++ {
		roundPairings := []*entity.PlayerRoundInfo{}
		for j := 0; j < numberOfPlayers; j++ {
			roundPairings = append(roundPairings, &entity.PlayerRoundInfo{})
		}
		pairings = append(pairings, roundPairings)
	}
	return pairings
}

func newClassicPairing(t *ClassicDivision,
	playerOne string,
	playerTwo string,
	round int) *entity.Pairing {

	games := []*entity.TournamentGame{}
	for i := 0; i < t.RoundControls[round].GamesPerRound; i++ {
		games = append(games, &entity.TournamentGame{Scores: []int{0, 0},
			Results: []realtime.TournamentGameResult{realtime.TournamentGameResult_NO_RESULT,
				realtime.TournamentGameResult_NO_RESULT}})
	}

	playerGoingFirst := playerOne
	playerGoingSecond := playerTwo
	switchFirst := false
	firstMethod := t.RoundControls[round].FirstMethod

	if firstMethod != entity.ManualFirst {
		playerOneFS := getPlayerFS(t, playerGoingFirst, round-1)
		playerTwoFS := getPlayerFS(t, playerGoingSecond, round-1)
		if firstMethod == entity.RandomFirst {
			switchFirst = rand.Intn(2) == 0
		} else { // AutomaticFirst
			if playerOneFS[0] != playerTwoFS[0] {
				switchFirst = playerOneFS[0] > playerTwoFS[0]
			} else if playerOneFS[1] != playerTwoFS[1] {
				switchFirst = playerOneFS[1] < playerTwoFS[1]
			} else {
				// Might want to use head-to-head in the future to break this up
				switchFirst = rand.Intn(2) == 0
			}
		}
	}

	if switchFirst {
		playerGoingFirst, playerGoingSecond = playerGoingSecond, playerGoingFirst
	}

	return &entity.Pairing{Players: []string{playerGoingFirst, playerGoingSecond},
		Games: games,
		Outcomes: []realtime.TournamentGameResult{realtime.TournamentGameResult_NO_RESULT,
			realtime.TournamentGameResult_NO_RESULT},
		ReadyStates: []string{"", ""},
	}
}

func getPlayerFS(t *ClassicDivision, player string, round int) []int {

	fs := []int{0, 0}
	for i := 0; i <= round; i++ {
		pairing := t.Matrix[i][t.PlayerIndexMap[player]].Pairing
		if pairing != nil {
			playerIndex := 0
			if pairing.Players[1] == player {
				playerIndex = 1
			}
			outcome := pairing.Outcomes[playerIndex]
			if outcome == realtime.TournamentGameResult_NO_RESULT ||
				outcome == realtime.TournamentGameResult_WIN ||
				outcome == realtime.TournamentGameResult_LOSS ||
				outcome == realtime.TournamentGameResult_DRAW {
				fs[playerIndex]++
			}
		}
	}
	return fs
}

func newEliminatedPairing(playerOne string, playerTwo string) *entity.Pairing {
	return &entity.Pairing{Outcomes: []realtime.TournamentGameResult{realtime.TournamentGameResult_ELIMINATED,
		realtime.TournamentGameResult_ELIMINATED}}
}

func newPlayerIndexMap(players []string) map[string]int {
	m := make(map[string]int)
	for i, player := range players {
		m[player] = i
	}
	return m
}

func newPlayerProperties() *entity.PlayerProperties {
	return &entity.PlayerProperties{Removed: false}
}

func getRepeats(t *ClassicDivision, round int) (map[string]int, error) {
	if round >= len(t.Matrix) {
		return nil, fmt.Errorf("round number out of range: %d", round)
	}
	repeats := make(map[string]int)
	for i := 0; i <= round; i++ {
		roundPairings := t.Matrix[i]
		for _, pri := range roundPairings {
			if pri.Pairing != nil && pri.Pairing.Players != nil {
				playerOne := pri.Pairing.Players[0]
				playerTwo := pri.Pairing.Players[1]
				if playerOne != playerTwo {
					key := pair.GetRepeatKey(playerOne, playerTwo)
					repeats[key]++
				}
			}
		}
	}

	// All repeats have been counted twice at this point
	// so divide by two.
	for key, _ := range repeats {
		repeats[key] = repeats[key] / 2
	}
	return repeats, nil
}

func getEliminationOutcomes(games []*entity.TournamentGame, gamesPerRound int) []realtime.TournamentGameResult {
	// Determines if a player is eliminated for a given round in an
	// elimination tournament. The convertResult function gives 2 for a win,
	// 1 for a draw, and 0 otherwise. If a player's score is greater than
	// the games per round, they have won, unless there is a tie.
	p1Wins := 0
	p2Wins := 0
	p1Spread := 0
	p2Spread := 0
	for _, game := range games {
		p1Wins += convertResult(game.Results[0])
		p2Wins += convertResult(game.Results[1])
		p1Spread += game.Scores[0] - game.Scores[1]
		p2Spread += game.Scores[1] - game.Scores[0]
	}

	p1Outcome := realtime.TournamentGameResult_NO_RESULT
	p2Outcome := realtime.TournamentGameResult_NO_RESULT

	// In case of a tie by spread, more games need to be
	// submitted to break the tie. In the future we
	// might want to allow for Elimination tournaments
	// to disregard spread as a tiebreak entirely, but
	// this is an extreme edge case.
	if len(games) > gamesPerRound { // Tiebreaking results are present
		if p1Wins > p2Wins ||
			(p1Wins == p2Wins && p1Spread > p2Spread) {
			p1Outcome = realtime.TournamentGameResult_WIN
			p2Outcome = realtime.TournamentGameResult_ELIMINATED
		} else if p2Wins > p1Wins ||
			(p2Wins == p1Wins && p2Spread > p1Spread) {
			p1Outcome = realtime.TournamentGameResult_ELIMINATED
			p2Outcome = realtime.TournamentGameResult_WIN
		}
	} else {
		if p1Wins > gamesPerRound ||
			(p1Wins == gamesPerRound && p2Wins == gamesPerRound && p1Spread > p2Spread) {
			p1Outcome = realtime.TournamentGameResult_WIN
			p2Outcome = realtime.TournamentGameResult_ELIMINATED
		} else if p2Wins > gamesPerRound ||
			(p1Wins == gamesPerRound && p2Wins == gamesPerRound && p1Spread < p2Spread) {
			p1Outcome = realtime.TournamentGameResult_ELIMINATED
			p2Outcome = realtime.TournamentGameResult_WIN
		}
	}
	return []realtime.TournamentGameResult{p1Outcome, p2Outcome}
}

func convertResult(result realtime.TournamentGameResult) int {
	convertedResult := 0
	if result == realtime.TournamentGameResult_WIN || result == realtime.TournamentGameResult_BYE || result == realtime.TournamentGameResult_FORFEIT_WIN {
		convertedResult = 2
	} else if result == realtime.TournamentGameResult_DRAW {
		convertedResult = 1
	}
	return convertedResult
}

func emptyRecord() []int {
	record := []int{}
	for i := 0; i < int(realtime.TournamentGameResult_ELIMINATED)+1; i++ {
		record = append(record, 0)
	}
	return record
}

func opponentOf(pairing *entity.Pairing, player string) (string, error) {
	if pairing == nil {
		return "", nil
	}
	if player != pairing.Players[0] && player != pairing.Players[1] {
		return "", fmt.Errorf("player %s does not exist in the pairing (%s, %s)",
			player,
			pairing.Players[0],
			pairing.Players[1])
	} else if player != pairing.Players[0] {
		return pairing.Players[0], nil
	} else {
		return pairing.Players[1], nil
	}
}

func reverse(array []string) {
	for i, j := 0, len(array)-1; i < j; i, j = i+1, j-1 {
		array[i], array[j] = array[j], array[i]
	}
}
