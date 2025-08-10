import React, { useState, useEffect, useMemo } from 'react';
import './ScorecardEntry.css';

const ScorecardEntry = () => {
  const [tournaments, setTournaments] = useState([]);
  const [selectedTournament, setSelectedTournament] = useState('');
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedCourseSequence, setSelectedCourseSequence] = useState(null);
  const [players, setPlayers] = useState([]);
  const [holeData, setHoleData] = useState([]); // To store par and stroke index for each hole
  const [scores, setScores] = useState({}); // To store player scores

  const [roundInitiated, setRoundInitiated] = useState(false);
  const [roundIds, setRoundIds] = useState({}); // To store round_id for each player

  const handleInitiateScoring = async () => {
    if (!selectedTournament || !selectedCourse || players.length === 0) {
      alert("Please select a tournament and course, and ensure players are loaded.");
      return;
    }

    const playersDataForInitiation = players.map(player => ({
      player_id: player.id,
      handicap_index: player.handicap,
      playing_handicap: calculatePlayingHandicap(player.handicap, currentCourse.slope_rating),
    }));

    try {
      const response = await fetch('http://localhost:5000/initiate_round', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tournament_id: selectedTournament,
          course_id: selectedCourse,
          sequence_number: selectedCourseSequence,
          players_data: playersDataForInitiation,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      alert(result.message);
      setRoundInitiated(true);
      // Store round IDs for each player
      const newRoundIds = {};
      result.rounds.forEach(round => {
        newRoundIds[round.player_id] = round.id;
      });
      setRoundIds(newRoundIds);

    } catch (error) {
      console.error("Error initiating scoring:", error);
      alert(`Failed to initiate scoring: ${error.message}`);
    }
  };

  const [submittedSummaryScores, setSubmittedSummaryScores] = useState({}); // New state for summary scores from backend

  const handleSubmitFinalScores = async () => {
    if (!selectedTournament || !selectedCourse || players.length === 0) {
      alert("Please select a tournament and course, and ensure players are loaded.");
      return;
    }

    const submissionPromises = players.map(async (player) => {
      const roundId = roundIds[player.id];
      if (!roundId) {
        console.warn(`No round ID found for player ${player.name}. Skipping submission.`);
        return null; // Skip this player if no roundId
      }

      const playerHoleScores = {};
      for (let i = 1; i <= 18; i++) {
        playerHoleScores[i] = scores[player.id]?.[i] ? parseInt(scores[player.id][i]) : 0; // Default to 0 if no score entered
      }

      try {
        const response = await fetch(`http://localhost:5000/rounds/${roundId}/scores`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            hole_scores: Array.from({ length: 18 }, (_, i) => ({
              hole_number: i + 1,
              gross_score: playerHoleScores[i + 1],
            })),
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        console.log(`Scores submitted successfully for ${player.name}:`, result);
        return { playerId: player.id, summary: result };
      } catch (error) {
        console.error(`Error submitting scores for ${player.name}:`, error);
        alert(`Failed to submit scores for ${player.name}: ${error.message}`);
        return null;
      }
    });

    const results = await Promise.all(submissionPromises);
    const newSubmittedSummaryScores = {};
    results.forEach(result => {
      if (result) {
        newSubmittedSummaryScores[result.playerId] = result.summary;
      }
    });
    setSubmittedSummaryScores(newSubmittedSummaryScores);
    alert("Score submission process completed. Check console for individual player results.");
  };

  // Placeholder for calculateTotalStablefordPoints - now gets from submittedSummaryScores
  const calculateTotalStablefordPoints = (playerId) => {
    return submittedSummaryScores[playerId]?.stableford_total ?? 'N/A';
  };

  const calculateGrossScore = (playerId) => {
    return submittedSummaryScores[playerId]?.gross_score_total ?? 'N/A';
  };

  const calculateNetScore = (playerId) => {
    return submittedSummaryScores[playerId]?.nett_score_total ?? 'N/A';
  };

  const calculateFront9Gross = (playerId) => {
    return submittedSummaryScores[playerId]?.gross_score_front_9 ?? 'N/A';
  };

  const calculateBack9Gross = (playerId) => {
    return submittedSummaryScores[playerId]?.gross_score_back_9 ?? 'N/A';
  };

  const calculateFront9Net = (playerId) => {
    return submittedSummaryScores[playerId]?.nett_score_front_9 ?? 'N/A';
  };

  const calculateBack9Net = (playerId) => {
    return submittedSummaryScores[playerId]?.nett_score_back_9 ?? 'N/A';
  };

  // Remove redundant client-side calculations
  // const calculateNetScore = (playerId) => { ... };
  // const calculateFront9Net = (playerId) => { ... };
  // const calculateBack9Net = (playerId) => { ... };
  // const calculateTotalStablefordPoints = (playerId) => { ... };
  // The above functions are now replaced by direct lookups from submittedSummaryScores
  // and are included in the new_string for clarity.



  useEffect(() => {
    const fetchTournaments = async () => {
      try {
        const response = await fetch('http://localhost:5000/tournaments');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setTournaments(data);
      } catch (error) {
        console.error("Error fetching tournaments:", error);
      }
    };

    fetchTournaments();
  }, []);

  useEffect(() => {
    if (selectedTournament) {
      const fetchPlayers = async () => {
        try {
          const response = await fetch(`http://localhost:5000/tournaments/${selectedTournament}/players`);
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const data = await response.json();
          setPlayers(data);
        } catch (error) {
          console.error("Error fetching players for tournament:", error);
        }
      };

      const fetchCoursesForTournament = async () => {
        try {
          const response = await fetch(`http://localhost:5000/tournaments/${selectedTournament}/courses`);
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const data = await response.json();
          setCourses(data);
        } catch (error) {
          console.error("Error fetching courses for tournament:", error);
        }
      };

      fetchPlayers();
      fetchCoursesForTournament();
    } else {
      setPlayers([]);
      setCourses([]); // Clear courses when no tournament is selected
    }
  }, [selectedTournament]);

  const [isLoadingRounds, setIsLoadingRounds] = useState(true); // New state for loading indicator

  useEffect(() => {
    if (selectedCourse && selectedCourseSequence && selectedTournament && players.length > 0) {
      const fetchHoleDataAndExistingScores = async () => {
        try {
          setIsLoadingRounds(true); // Set loading to true at the start
          // Aggressively clear states for a clean slate on each course/tournament/player change
          setScores({});
          setSubmittedSummaryScores({});
          setRoundIds({});
          setRoundInitiated(false);

          console.log('useEffect: selectedCourse changed', { selectedCourse, selectedCourseSequence, selectedTournament, players });

          // Fetch hole data (par, stroke index)
          const holeDataResponse = await fetch(`http://localhost:5000/courses/${selectedCourse}/holes`);
          if (!holeDataResponse.ok) {
            throw new Error(`HTTP error! status: ${holeDataResponse.status}`);
          }
          const data = await holeDataResponse.json();
          const sortedHoleData = data.sort((a, b) => (a.sequence || a.hole_number) - (b.sequence || b.hole_number));
          setHoleData(sortedHoleData);

          const newRoundIds = {};
          const fetchedScores = {};
          const fetchedSummaries = {};
          let allPlayersHaveExistingRound = true; // Renamed for clarity

          // Collect all player IDs for a single API call
          const playerIds = players.map(p => p.id);
          const playerIdsString = playerIds.join(',');

          // Fetch all existing rounds for all players in a single API call
          console.log(`Fetching existing rounds for players: ${playerIdsString}, course ${selectedCourse}, sequence ${selectedCourseSequence}, tournament ${selectedTournament}`);
          const allExistingRoundsResponse = await fetch(`http://localhost:5000/rounds?tournament_id=${selectedTournament}&player_ids=${playerIdsString}&course_id=${selectedCourse}&sequence_number=${selectedCourseSequence}`);
          if (!allExistingRoundsResponse.ok) {
            console.error("Error fetching all existing rounds.");
            allPlayersHaveExistingRound = false; // If fetch itself fails, assume no rounds for any player
          }
          const allExistingRounds = allExistingRoundsResponse.ok ? await allExistingRoundsResponse.json() : [];
          console.log('All existing rounds fetched:', allExistingRounds);

          // Process existing rounds for each player
          for (const player of players) {
            // Initialize for each player
            fetchedScores[player.id] = {};
            fetchedSummaries[player.id] = {};

            const existingRound = allExistingRounds.find(r => r.player_id === player.id && r.round_number === selectedCourseSequence);

            if (existingRound) {
              newRoundIds[player.id] = existingRound.id;
              console.log(`Found existing round ${existingRound.id} for player ${player.id} (Sequence: ${selectedCourseSequence}). Using embedded hole scores.`);
              const playerHoleScores = {};
              existingRound.hole_scores.forEach(hs => {
                playerHoleScores[hs.hole_number] = hs.gross_score;
              });
              fetchedScores[player.id] = playerHoleScores;
              fetchedSummaries[player.id] = existingRound; // Store the whole round object for summaries
            } else {
              console.warn(`No existing round object found for player ${player.id} for sequence ${selectedCourseSequence}.`);
              allPlayersHaveExistingRound = false; // If any player doesn't have a round, then not all are initiated
            }
          }
          console.log('Final fetchedScores:', fetchedScores);
          console.log('Final fetchedSummaries:', fetchedSummaries);
          console.log('Final newRoundIds:', newRoundIds);
          console.log('Final allPlayersHaveExistingRound:', allPlayersHaveExistingRound);

          setRoundIds(newRoundIds);
          setScores(fetchedScores);
          setSubmittedSummaryScores(fetchedSummaries);
          setRoundInitiated(allPlayersHaveExistingRound);

        } catch (error) {
          console.error("Error fetching hole data or existing scores:", error);
          setHoleData([]);
          setScores({});
          setSubmittedSummaryScores({});
          setRoundIds({}); // Ensure roundIds is also cleared on error
          setRoundInitiated(false);
        } finally {
          setIsLoadingRounds(false); // Set loading to false after fetch completes (success or error)
        }
      };
      fetchHoleDataAndExistingScores();
    } else {
      setHoleData([]);
      setScores({});
      setSubmittedSummaryScores({});
      setRoundIds({}); // Ensure roundIds is cleared when no course/tournament/players selected
      setRoundInitiated(false);
      setIsLoadingRounds(false); // Also set to false if no course/tournament/players selected
    }
  }, [selectedCourse, selectedCourseSequence, selectedTournament, players]);

  const currentTournament = useMemo(() => {
    return tournaments.find(tournament => tournament.id === selectedTournament);
  }, [tournaments, selectedTournament]);

  const currentCourse = useMemo(() => {
    return courses.find(course => course.id === selectedCourse && course.sequence_number === selectedCourseSequence);
  }, [courses, selectedCourse, selectedCourseSequence]);

  const handleTournamentChange = (e) => {
    setSelectedTournament(parseInt(e.target.value));
  };

  const handleCourseChange = (e) => {
    const [courseId, sequenceNumber] = e.target.value.split('-');
    setSelectedCourse(parseInt(courseId));
    setSelectedCourseSequence(parseInt(sequenceNumber));
  };

  const handleScoreChange = (playerId, holeIndex, value) => {
    setScores(prevScores => ({
      ...prevScores,
      [playerId]: {
        ...prevScores[playerId],
        [holeIndex]: value
      }
    }));
  };

  const calculatePlayingHandicap = (handicapIndex, slopeRating) => {
    if (handicapIndex === null || handicapIndex === undefined || slopeRating === null || slopeRating === undefined) return 'N/A';
    return Math.round(handicapIndex * (slopeRating / 113));
  };

  const getStrokeIndexForHole = (holeNumber) => {
    const hole = holeData.find(h => h.hole_number === holeNumber);
    return hole ? hole.stroke_index : 0; // Return 0 or appropriate default if not found
  };

  const getScoreClass = (grossScore, par) => {
    if (grossScore === '' || isNaN(grossScore) || par === '' || isNaN(par)) {
      return ''; // No class if score or par is not a valid number
    }

    const scoreDiff = grossScore - par;

    if (scoreDiff <= -2) {
      return 'eagle-score'; // Yellow
    } else if (scoreDiff === -1) {
      return 'birdie-score'; // Red
    } else if (scoreDiff === 0) {
      return ''; // No color for par
    } else if (scoreDiff === 1) {
      return 'bogey-score'; // Blue
    } else if (scoreDiff === 2) {
      return 'double-bogey-score'; // Grey
    } else if (scoreDiff > 2) {
      return 'worse-than-double-bogey-score'; // Purple
    }
    return '';
  };

  return (
    <div className="scorecard-container">
      <h2>Scorecard Entry</h2>

      <div className="dropdown-grid">
        <div className="controls-container">
          <label htmlFor="tournament-select">Select Tournament:</label>
          <select id="tournament-select" value={selectedTournament} onChange={handleTournamentChange}>
            <option value="">--Select a Tournament--</option>
            {tournaments.map(tournament => (
              <option key={tournament.id} value={tournament.id}>{tournament.name}</option>
            ))}
          </select>
        </div>

        <div className="controls-container">
          <label htmlFor="course-select">Select Course:</label>
          <select id="course-select" value={`${selectedCourse}-${selectedCourseSequence}`} onChange={handleCourseChange}>
            <option value="">--Select a Course--</option>
            {courses.map(course => (
              <option key={`${course.id}-${course.sequence_number}`} value={`${course.id}-${course.sequence_number}`}>{course.name} - {course.sequence_number}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="details-grid">
        {selectedTournament && currentTournament && (
          <div className="tournament-details">
            <h3>Tournament Details</h3>
            <p><strong>Tournament:</strong> {currentTournament.name} | Date: {currentTournament.date} | Location: {currentTournament.location}</p>
          </div>
        )}

        {selectedCourse && currentCourse && (
          <div className="course-details">
            <h3>Course Details</h3>
            <p><strong>Course:</strong> {currentCourse.name} | Slope Rating: {currentCourse.slope_rating}</p>
          </div>
        )}

        {selectedTournament && selectedCourse && players.length > 0 && (
          <div className="player-handicaps">
            <h3>Player Course Handicaps</h3>
            <table>
              <thead>
                <tr>
                  <th>Player Name</th>
                  <th>Handicap Details</th>
                </tr>
              </thead>
              <tbody>
                {players.map(player => (
                  <tr key={player.id}>
                    <td>{player.name}</td>
                    <td>Handicap Index: {player.handicap} | Playing Handicap: {calculatePlayingHandicap(player.handicap, currentCourse.slope_rating)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedTournament && selectedCourse && players.length > 0 && (
        <div className="scorecard-grid-container">
          <div className="scorecard-color-key">
            <h4>Scorecard Color Key:</h4>
            <ul>
              <li><span className="eagle-score-key"></span> Eagle or Better</li>
              <li><span className="birdie-score-key"></span> Birdie</li>
              <li><span className="bogey-score-key"></span> Bogey</li>
              <li><span className="double-bogey-score-key"></span> Double Bogey</li>
              <li><span className="worse-than-double-bogey-score-key"></span> Worse than Double Bogey</li>
            </ul>
          </div>
          {!isLoadingRounds && !roundInitiated && (
            <button className="initiate-scoring-button" onClick={handleInitiateScoring}>Initiate Scoring</button>
          )}
          <h3>Input Scores</h3>
          <table className="scorecard-table">
            <thead>
              <tr>
                <th>Player Name</th>
                <th>Player Handicap Index</th>
                <th>Playing Handicap</th>
                {Array.from({ length: 18 }, (_, i) => (<th key={`hole-header-${i + 1}`}>Hole {i + 1}</th>))}
                <th>Gross Front 9</th>
                <th>Gross Back 9</th>
                <th>Net Front 9</th>
                <th>Net Back 9</th>
                <th>Gross Total</th>
                <th>Net Total</th>
                <th>Stableford Points</th>
              </tr>
              <tr>
                <th></th> {/* Empty cell instead of "Par" */}
                <th></th> {/* Empty cell for Player Handicap Index */}
                <th>Par</th> {/* Hard-coded "Par" */}
                {holeData.map((hole, index) => (<th key={`par-header-${hole.hole_number}`}>{hole.par}</th>))}
                <th></th> {/* Gross Front 9 */}
                <th></th> {/* Gross Back 9 */}
                <th></th> {/* Net Front 9 */}
                <th></th> {/* Net Back 9 */}
                <th></th> {/* Gross Total */}
                <th></th> {/* Net Total */}
                <th></th> {/* Stableford Points */} 
              </tr>
              <tr>
                <th></th> {/* Empty cell for Player Name */}
                <th></th> {/* Empty cell for Player Handicap Index */}
                <th>SI</th> {/* Hard-coded "SI" */}
                {holeData.map((hole, index) => (<th key={`si-header-${hole.hole_number}`}>{hole.strokeIndex}</th>))}
                <th></th> {/* Gross Front 9 */}
                <th></th> {/* Gross Back 9 */}
                <th></th> {/* Net Front 9 */}
                <th></th> {/* Net Back 9 */}
                <th></th> {/* Gross Total */}
                <th></th> {/* Net Total */}
                <th></th> {/* Stableford Points */}
              </tr>
            </thead>
            <tbody>
              {players.map(player => (
                <tr key={player.id}>
                  <td>{player.name}</td>
                  <td>{player.handicap}</td>
                  <td>{calculatePlayingHandicap(player.handicap, currentCourse.slope_rating)}</td>
                  {Array.from({ length: 18 }, (_, i) => (
                    <td key={`${player.id}-hole-${i + 1}`}>
                      <input
                        type="number"
                        className={getScoreClass(parseInt(scores[player.id]?.[i + 1]), holeData[i]?.par)}
                        value={scores[player.id]?.[i + 1] || ''}
                        onChange={(e) => handleScoreChange(player.id, i + 1, e.target.value)}
                        disabled={!roundInitiated} // Re-add disabled attribute
                      />
                    </td>
                  ))}
                  <td>{calculateFront9Gross(player.id)}</td>
                  <td>{calculateBack9Gross(player.id)}</td>
                  <td>{calculateFront9Net(player.id)}</td>
                  <td>{calculateBack9Net(player.id)}</td>
                  <td>{calculateGrossScore(player.id)}</td>
                  <td>{calculateNetScore(player.id)}</td>
                  <td>{calculateTotalStablefordPoints(player.id)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {roundInitiated && (
            <button className="initiate-scoring-button" onClick={handleSubmitFinalScores}>Submit Scores</button>
          )}
        </div>
      )}
    </div>
  );
};

export default ScorecardEntry;