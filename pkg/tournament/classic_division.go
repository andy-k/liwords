package tournament

import (
	"encoding/json"
	"errors"
	"fmt"
	"gorm.io/datatypes"
	"math/rand"
	"sort"

	"github.com/domino14/liwords/pkg/entity"
	realtime "github.com/domino14/liwords/rpc/api/proto/realtime"
)

type ClassicDivision struct {
	Matrix         [][]*entity.PlayerRoundInfo `json:"t"`
	Players        []string                    `json:"p"`
	PlayerIndexMap map[string]int              `json:"i"`
	PairingMethods []entity.PairingMethod      `json:"m"`
	FirstMethods   []entity.FirstMethod        `json:"f"`
	GamesPerRound  int                         `json:"g"`
}

func NewClassicDivision(players []string,
	numberOfRounds int,
	gamesPerRound int,
	pmethods []entity.PairingMethod,
	fmethods []entity.FirstMethod) (*ClassicDivision, error) {
	numberOfPlayers := len(players)

	if numberOfPlayers < 2 {
		return nil, errors.New("Classic Tournaments must have at least 2 players")
	}

	if numberOfRounds < 1 {
		return nil, errors.New("Classic Tournaments must have at least 1 round")
	}

	if numberOfRounds != len(pmethods) {
		return nil, errors.New("Pairing methods length does not match the number of rounds!")
	}

	isElimination := false
	for _, method := range pmethods {
		if method == entity.Elimination {
			isElimination = true
		} else if isElimination && method != entity.Elimination {
			return nil, errors.New("Cannot mix Elimination pairings with any other pairing method.")
		}
	}

	// For now, assume we require exactly n round and 2 ^ n players for an elimination tournament

	if pmethods[0] == entity.Elimination {
		expectedNumberOfPlayers := twoPower(numberOfRounds)
		if expectedNumberOfPlayers != numberOfPlayers {
			return nil, errors.New(fmt.Sprintf("Invalid number of players based on the number of rounds."+
				" Have %d players, expected %d players based on the number of rounds (%d)\n",
				expectedNumberOfPlayers, numberOfPlayers, numberOfRounds))
		}

	}

	pairings := newPairingMatrix(numberOfRounds, numberOfPlayers)
	playerIndexMap := newPlayerIndexMap(players)
	t := &ClassicDivision{Matrix: pairings,
		Players:        players,
		PlayerIndexMap: playerIndexMap,
		PairingMethods: pmethods,
		FirstMethods:   fmethods,
		GamesPerRound:  gamesPerRound}
	pairClassicRound(t, 0)

	// We can make all non-standings dependent pairings right now
	for i := 1; i < numberOfRounds; i++ {
		if pmethods[i] == entity.RoundRobin || pmethods[i] == entity.Random {
			pairClassicRound(t, i)
			isElimination = true
		}
	}

	return t, nil
}

func (t *ClassicDivision) StartRound(round int) error {
	// Not sure yet
	return nil
}

func (t *ClassicDivision) GetPlayerRoundInfo(player string, round int) (*entity.PlayerRoundInfo, error) {
	if round >= len(t.Matrix) || round < 0 {
		return nil, errors.New(fmt.Sprintf("Round number out of range: %d\n", round))
	}
	roundPairings := t.Matrix[round]

	playerIndex, ok := t.PlayerIndexMap[player]
	if !ok {
		return nil, errors.New(fmt.Sprintf("Player does not exist in the tournament: %s\n", player))
	}
	return roundPairings[playerIndex], nil
}

func (t *ClassicDivision) SetPairing(playerOne string, playerTwo string, round int) error {
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

	playerOneFirsts, err := getFirsts(t, playerOne, round)
	if err != nil {
		return err
	}

	playerTwoFirsts, err := getFirsts(t, playerTwo, round)
	if err != nil {
		return err
	}

	newPairing := newClassicPairing(playerOne,
		playerTwo,
		playerOneFirsts,
		playerTwoFirsts,
		t.FirstMethods[round],
		t.GamesPerRound)
	playerOneInfo.Pairing = newPairing
	playerTwoInfo.Pairing = newPairing
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

	// Ensure that the pairing exists
	if pri1.Pairing == nil {
		return errors.New(fmt.Sprintf("Submitted result for a player with a null pairing: %s round (%d)\n", p1, round))
	}

	if pri2.Pairing == nil {
		return errors.New(fmt.Sprintf("Submitted result for a player with a null pairing: %s round (%d)\n", p2, round))
	}

	// Ensure the submitted results were for players that were paired
	if pri1.Pairing != pri2.Pairing {
		return errors.New(fmt.Sprintf("Submitted result for players that didn't player each other: %s, %s round (%d)\n", p1, p2, round))
	}

	pairing := pri1.Pairing
	pairingMethod := t.PairingMethods[round]

	// For Elimination tournaments only.
	// Could be a tiebreaking result or could be an out of range
	// game index
	if pairingMethod == entity.Elimination && gameIndex >= t.GamesPerRound {
		if gameIndex != len(pairing.Games) {
			return errors.New(fmt.Sprintf("Submitted tiebreaking result with invalid game index."+
				" Player 1: %s, Player 2: %s, Round: %d, GameIndex: %d\n", p1, p2, round, gameIndex))
		} else {
			pairing.Games = append(pairing.Games,
				&entity.TournamentGame{Scores: []int{0, 0},
					Results: []realtime.TournamentGameResult{realtime.TournamentGameResult_NO_RESULT,
						realtime.TournamentGameResult_NO_RESULT}})
		}
	}

	if !amend && ((pairing.Outcomes[0] != realtime.TournamentGameResult_NO_RESULT &&
		pairing.Outcomes[1] != realtime.TournamentGameResult_NO_RESULT) ||
		pairing.Games[gameIndex].Results[0] != realtime.TournamentGameResult_NO_RESULT &&
			pairing.Games[gameIndex].Results[1] != realtime.TournamentGameResult_NO_RESULT) {
		return errors.New("This result is already submitted")
	}

	if pairingMethod == entity.Elimination {
		if amend {
			p1ScoreOld := pairing.Games[gameIndex].Scores[0]
			p2ScoreOld := pairing.Games[gameIndex].Scores[1]
			pri1.Spread -= p1ScoreOld - p2ScoreOld
			pri2.Spread -= p2ScoreOld - p1ScoreOld
		}

		pairing.Games[gameIndex].Scores[0] = p1Score
		pairing.Games[gameIndex].Scores[1] = p2Score
		pairing.Games[gameIndex].Results[0] = p1Result
		pairing.Games[gameIndex].Results[1] = p2Result
		pairing.Games[gameIndex].GameEndReason = reason
		pri1.Spread += p1Score - p2Score
		pri2.Spread += p2Score - p1Score

		// A possible amendment to the outcomes.
		// If the outcomes remain unchanged, this will
		// just be undone in the next if block.
		if pairing.Outcomes[0] != realtime.TournamentGameResult_NO_RESULT &&
			pairing.Outcomes[1] != realtime.TournamentGameResult_NO_RESULT {
			pri1.Record[pairing.Outcomes[0]] -= 1
			pri2.Record[pairing.Outcomes[1]] -= 1
		}

		newOutcomes := getEliminationOutcomes(pairing.Games, t.GamesPerRound)

		pairing.Outcomes[0] = newOutcomes[0]
		pairing.Outcomes[1] = newOutcomes[1]

		if pairing.Outcomes[0] != realtime.TournamentGameResult_NO_RESULT &&
			pairing.Outcomes[1] != realtime.TournamentGameResult_NO_RESULT {
			pri1.Record[pairing.Outcomes[0]] += 1
			pri2.Record[pairing.Outcomes[1]] += 1
		}
	} else {
		if amend {
			pri1.Record[pairing.Outcomes[0]] -= 1
			pri2.Record[pairing.Outcomes[1]] -= 1
			p1ScoreOld := pairing.Games[0].Scores[0]
			p2ScoreOld := pairing.Games[0].Scores[1]
			pri1.Spread -= p1ScoreOld - p2ScoreOld
			pri2.Spread -= p2ScoreOld - p1ScoreOld
		}

		// Classic tournaments only ever have
		// one game per round
		pairing.Games[0].Scores[0] = p1Score
		pairing.Games[0].Scores[1] = p2Score
		pairing.Games[0].Results[0] = p1Result
		pairing.Games[0].Results[1] = p2Result
		pairing.Games[0].GameEndReason = reason
		pairing.Outcomes[0] = p1Result
		pairing.Outcomes[1] = p2Result

		// Update the player records
		pri1.Record[pairing.Outcomes[0]] += 1
		pri2.Record[pairing.Outcomes[1]] += 1
		pri1.Spread += p1Score - p2Score
		pri2.Spread += p2Score - p1Score
	}

	complete, err := t.IsRoundComplete(round)
	if err != nil {
		return err
	}
	finished, err := t.IsFinished()
	if err != nil {
		return err
	}

	// Copy the records over to the next round is the round is
	// over.
	// Only pair if this round is complete and the tournament
	// is not over. Don't pair for round robin and random since those pairings
	// were made when the tournament was created.
	if !finished && complete {
		copyRecords(t, round)
		nextPairingMethod := t.PairingMethods[round+1]
		if nextPairingMethod != entity.RoundRobin && nextPairingMethod != entity.Random {
			pairClassicRound(t, round+1)
		}
	}

	return nil
}

func (t *ClassicDivision) GetStandings(round int) ([]*entity.Standing, error) {
	if round < 0 || round >= len(t.Matrix) {
		return nil, errors.New("Round number out of range")
	}
	records := []*entity.Standing{}
	for i, pri := range t.Matrix[round] {
		wins, losses, draws := resultsToScores(pri.Record)
		records = append(records, &entity.Standing{Player: t.Players[i],
			Wins:   wins,
			Losses: losses,
			Draws:  draws,
			Spread: pri.Spread})
	}

	pairingMethod := t.PairingMethods[round]

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
				if records[i].Wins == records[j].Wins && records[i].Draws == records[j].Draws {
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

func (t *ClassicDivision) IsRoundComplete(round int) (bool, error) {
	if round >= len(t.Matrix) || round < 0 {
		return false, errors.New(fmt.Sprintf("Round number out of range: %d\n", round))
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
			roundPairings = append(roundPairings, &entity.PlayerRoundInfo{Record: emptyRecord(), Spread: 0, FirstsAndSeconds: []int{0, 0}})
		}
		pairings = append(pairings, roundPairings)
	}
	return pairings
}

func newClassicPairing(playerOne string,
	playerTwo string,
	playerOneFirsts []int,
	playerTwoFirsts []int,
	firstMethod entity.FirstMethod,
	gamesPerRound int) *entity.Pairing {
	games := []*entity.TournamentGame{}
	for i := 0; i < gamesPerRound; i++ {
		games = append(games, &entity.TournamentGame{Scores: []int{0, 0},
			Results: []realtime.TournamentGameResult{realtime.TournamentGameResult_NO_RESULT,
				realtime.TournamentGameResult_NO_RESULT}})
	}

	playerGoingFirst := playerOne
	playerGoingSecond := playerTwo
	switchFirst := false

	if firstMethod == entity.RandomFirst {
		switchFirst = rand.Intn(2) == 0
	} else if firstMethod == entity.AutomaticFirst {
		if playerOneFirsts[0] != playerTwoFirsts[0] {
			switchFirst = playerOneFirsts[0] > playerTwoFirsts[0]
		} else if playerOneFirsts[1] != playerTwoFirsts[1] {
			switchFirst = playerOneFirsts[1] < playerTwoFirsts[1]
		} else {
			// Might want to use head-to-head in the future to break this up
			switchFirst = rand.Intn(2) == 0
		}
	}

	if switchFirst {
		playerGoingFirst, playerGoingSecond = playerGoingSecond, playerGoingFirst
	}

	return &entity.Pairing{Players: []string{playerGoingFirst, playerGoingSecond},
		Games: games,
		Outcomes: []realtime.TournamentGameResult{realtime.TournamentGameResult_NO_RESULT,
			realtime.TournamentGameResult_NO_RESULT}}
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

func getFirsts(t *ClassicDivision, player string, round int) ([]int, error) {
	info, err := t.GetPlayerRoundInfo(player, round)
	if err != nil {
		return nil, err
	}
	return info.FirstsAndSeconds, nil
}

func pairClassicRound(t *ClassicDivision, round int) error {
	if round < 0 || round >= len(t.Matrix) {
		return errors.New("Round number out of range")
	}

	roundPairings := t.Matrix[round]
	pairingMethod := t.PairingMethods[round]
	firstMethod := t.FirstMethods[round]
	// This automatic pairing could be the result of an
	// amendment. Undo all the pairings so byes can be
	// properly assigned (bye assignment checks for nil pairing).
	// Do not do this for manual pairings
	if pairingMethod != entity.Manual {
		for i := 0; i < len(roundPairings); i++ {
			roundPairings[i].Pairing = nil
		}
	}

	if pairingMethod == entity.KingOfTheHill || pairingMethod == entity.Elimination {
		standingsRound := round - 1
		// If this is the first round, just pair
		// based on the order of the player list,
		// which GetStandings should return for a tournament
		// with no results
		if standingsRound < 0 {
			standingsRound = 0
		}
		standings, err := t.GetStandings(standingsRound)
		if err != nil {
			return err
		}
		l := len(standings)
		for i := 0; i < l-1; i += 2 {
			playerOne := standings[i].Player
			playerTwo := standings[i+1].Player

			playerOneFirsts, err := getFirsts(t, playerOne, round)
			if err != nil {
				return err
			}

			playerTwoFirsts, err := getFirsts(t, playerTwo, round)
			if err != nil {
				return err
			}

			var newPairing *entity.Pairing
			// If we are past the first round in an elimination tournament,
			// the bottom half of the standings have been eliminated.
			// Each successive round eliminates half as many players,
			// hence the l / twoPower(l) determines which players are eliminated.
			if pairingMethod == entity.Elimination && round > 0 && i >= l/twoPower(round) {
				newPairing = newEliminatedPairing(playerOne, playerTwo)
			} else {
				newPairing = newClassicPairing(playerOne,
					playerTwo,
					playerOneFirsts,
					playerTwoFirsts,
					firstMethod,
					t.GamesPerRound)
			}
			roundPairings[t.PlayerIndexMap[playerOne]].Pairing = newPairing
			roundPairings[t.PlayerIndexMap[playerTwo]].Pairing = newPairing
		}
	} else if pairingMethod == entity.Random {
		playerIndexes := []int{}
		for _, v := range t.PlayerIndexMap {
			playerIndexes = append(playerIndexes, v)
		}
		// rand.Seed(time.Now().UnixNano())
		rand.Shuffle(len(playerIndexes),
			func(i, j int) {
				playerIndexes[i], playerIndexes[j] = playerIndexes[j], playerIndexes[i]
			})
		for i := 0; i < len(playerIndexes)-1; i += 2 {
			playerOne := t.Players[playerIndexes[i]]
			playerTwo := t.Players[playerIndexes[i+1]]

			playerOneFirsts, err := getFirsts(t, playerOne, round)
			if err != nil {
				return err
			}

			playerTwoFirsts, err := getFirsts(t, playerTwo, round)
			if err != nil {
				return err
			}

			newPairing := newClassicPairing(playerOne,
				playerTwo,
				playerOneFirsts,
				playerTwoFirsts,
				firstMethod,
				t.GamesPerRound)
			roundPairings[playerIndexes[i]].Pairing = newPairing
			roundPairings[playerIndexes[i+1]].Pairing = newPairing
		}
	} else if pairingMethod == entity.RoundRobin {
		roundRobinPlayers := t.Players
		// The empty string represents the bye
		if len(roundRobinPlayers)%2 == 1 {
			roundRobinPlayers = append(roundRobinPlayers, "")
		}

		roundRobinPairings := getRoundRobinPairings(roundRobinPlayers, round)
		for i := 0; i < len(roundRobinPairings)-1; i += 2 {
			playerOne := roundRobinPairings[i]
			playerTwo := roundRobinPairings[i+1]

			if playerOne == "" && playerTwo == "" {
				return errors.New(fmt.Sprintf("Two byes playing each other in round %d\n", round))
			}

			// The blank string represents a bye in the
			// getRoundRobinPairings algorithm, but in a Tournament
			// is represented by a player paired with themselves,
			// so convert it here.

			if playerOne == "" {
				playerOne = playerTwo
			}

			if playerTwo == "" {
				playerTwo = playerOne
			}

			playerOneFirsts, err := getFirsts(t, playerOne, round)
			if err != nil {
				return err
			}

			playerTwoFirsts, err := getFirsts(t, playerTwo, round)
			if err != nil {
				return err
			}

			newPairing := newClassicPairing(playerOne,
				playerTwo,
				playerOneFirsts,
				playerTwoFirsts,
				firstMethod,
				t.GamesPerRound)
			roundPairings[t.PlayerIndexMap[playerOne]].Pairing = newPairing
			roundPairings[t.PlayerIndexMap[playerTwo]].Pairing = newPairing
		}
	}
	// Give all unpaired players a bye
	// realtime.TournamentGameResult_BYEs are always designated as a player
	// paired with themselves
	if pairingMethod != entity.Manual {
		for i := 0; i < len(roundPairings); i++ {
			pri := roundPairings[i]
			if pri.Pairing == nil {
				pri.Pairing = newClassicPairing(t.Players[i],
					t.Players[i],
					roundPairings[i].FirstsAndSeconds,
					roundPairings[i].FirstsAndSeconds,
					firstMethod,
					t.GamesPerRound)
			}
		}
	}
	return nil
}

func getRoundRobinPairings(players []string, round int) []string {

	/* Round Robin pairing algorithm (from stackoverflow, where else?):

	Players are numbered 1..n. In this example, there are 8 players

	Write all the players in two rows.

	1 2 3 4
	8 7 6 5

	The columns show which players will play in that round (1 vs 8, 2 vs 7, ...).

	Now, keep 1 fixed, but rotate all the other players. In round 2, you get

	1 8 2 3
	7 6 5 4

	and in round 3, you get

	1 7 8 2
	6 5 4 3

	This continues through round n-1, in this case,

	1 3 4 5
	2 8 7 6

	The following algorithm captures the pairings for a certain rotation
	based on the round. The length of players will always be even
	since a bye will be added for any odd length players.

	*/

	rotatedPlayers := players[1:len(players)]

	l := len(rotatedPlayers)
	rotationIndex := l - (round % l)

	rotatedPlayers = append(rotatedPlayers[rotationIndex:l], rotatedPlayers[0:rotationIndex]...)
	rotatedPlayers = append([]string{players[0]}, rotatedPlayers...)

	l = len(rotatedPlayers)
	topHalf := rotatedPlayers[0 : l/2]
	bottomHalf := rotatedPlayers[l/2 : l]
	reverse(bottomHalf)

	pairings := []string{}
	for i := 0; i < len(players)/2; i++ {
		pairings = append(pairings, topHalf[i])
		pairings = append(pairings, bottomHalf[i])
	}
	return pairings
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

func copyRecords(t *ClassicDivision, round int) error {

	m := t.Matrix
	players := t.Players
	if round < 0 {
		return nil
	}
	if round+1 >= len(m) {
		return errors.New(fmt.Sprintf("Copying records to an out of range round: %d\n", round+1))
	}

	// Finalize the firsts and seconds
	roundInfo := m[round]
	for i := 0; i < len(m[round]); i++ {
		pairing := roundInfo[i].Pairing
		fsIndex := 1
		if pairing.Players[0] == players[i] {
			fsIndex = 0
		}
		roundInfo[i].FirstsAndSeconds[fsIndex]++
	}

	nextRoundInfo := m[round+1]
	for i := 0; i < len(m[round]); i++ {
		nextRoundInfo[i].Record = roundInfo[i].Record
		nextRoundInfo[i].Spread = roundInfo[i].Spread
		nextRoundInfo[i].FirstsAndSeconds = roundInfo[i].FirstsAndSeconds
	}
	return nil
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
		return "", errors.New(fmt.Sprintf("Player %s does not exist in the pairing (%s, %s)\n",
			player,
			pairing.Players[0],
			pairing.Players[1]))
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

func twoPower(power int) int {
	product := 1
	for i := 0; i < power; i++ {
		product = product * 2
	}
	return product
}
