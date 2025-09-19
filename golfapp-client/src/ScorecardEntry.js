import React, { useState, useEffect, useMemo, useCallback } from 'react';
import './ScorecardEntry.css';
import './monochrome.css';
import API_URL from './config';

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
  const [isCurrentRoundFinalized, setIsCurrentRoundFinalized] = useState(false);
  const [roundPlayerHandicaps, setRoundPlayerHandicaps] = useState({}); // New state to store handicaps specific to the round
  const [notification, setNotification] = useState({ message: '', type: '' });
  const [isMobileView, setIsMobileView] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 768px)'); // Define your mobile breakpoint
    const handleMediaQueryChange = (e) => {
      setIsMobileView(e.matches);
    };

    // Initial check
    setIsMobileView(mediaQuery.matches);

    // Listen for changes
    mediaQuery.addEventListener('change', handleMediaQueryChange);

    // Cleanup
    return () => {
      mediaQuery.removeEventListener('change', handleMediaQueryChange);
    };
  }, []);

  const currentTournament = useMemo(() => {
    return tournaments.find(tournament => tournament.id === selectedTournament);
  }, [tournaments, selectedTournament]);

  const currentCourse = useMemo(() => {
    const foundCourse = courses.find(course => course.id === selectedCourse && course.sequence_number === selectedCourseSequence);
    console.log('currentCourse useMemo: courses', courses, 'selectedCourse', selectedCourse, 'selectedCourseSequence', selectedCourseSequence, 'foundCourse', foundCourse);
    return foundCourse;
  }, [courses, selectedCourse, selectedCourseSequence]);

  const displayNotification = (message, type) => {
    setNotification({ message, type });
    setTimeout(() => {
        setNotification({ message: '', type: '' });
    }, 3000); // Hide after 3 seconds
  };

  const handleInitiateScoring = async () => {
    if (!selectedTournament || !selectedCourse || players.length === 0) {
      displayNotification("Please select a tournament and course, and ensure players are loaded.", 'error');
      return;
    }

    const playersDataForInitiation = players.map(player => ({
      player_id: player.id,
      handicap_index: player.handicap,
      playing_handicap: calculatePlayingHandicap(player.handicap, currentCourse.slope_rating),
    }));

    try {
      const response = await fetch(`${API_URL}/initiate_round`, {
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
      displayNotification(result.message, 'success');
      setRoundInitiated(true);
      // Store round IDs for each player
      const newRoundIds = {};
      result.rounds.forEach(round => {
        newRoundIds[round.player_id] = round.id;
      });
      setRoundIds(newRoundIds);
      fetchHoleDataAndExistingScores(); // Call this to fetch and populate handicaps for newly initiated rounds

    } catch (error) {
      console.error("Error initiating scoring:", error);
      displayNotification(`Failed to initiate scoring: ${error.message}`, 'error');
    }
  };

  const [submittedSummaryScores, setSubmittedSummaryScores] = useState({}); // New state for summary scores from backend
  const [updatedPlayerHandicaps, setUpdatedPlayerHandicaps] = useState({}); // New state for updated handicaps after round end

  const handleSubmitFinalScores = async () => {
    if (!selectedTournament || !selectedCourse || players.length === 0) {
      displayNotification("Please select a tournament and course, and ensure players are loaded.", 'error');
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
        const response = await fetch(`${API_URL}/rounds/${roundId}/scores`, {
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
        displayNotification(`Failed to submit scores for ${player.name}: ${error.message}`, 'error');
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
    displayNotification('Scores submitted successfully!', 'success');
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
        const response = await fetch(`${API_URL}/tournaments`);
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
    const fetchCoursesAndPlayers = async () => {
      if (selectedTournament) {
        try {
          // Fetch courses for the selected tournament
          const coursesResponse = await fetch(`${API_URL}/tournaments/${selectedTournament}/courses`);
          if (!coursesResponse.ok) {
            throw new Error(`HTTP error! status: ${coursesResponse.status}`);
          }
          const coursesData = await coursesResponse.json();
          setCourses(coursesData);

          // Fetch players for the selected tournament
          const playersResponse = await fetch(`${API_URL}/tournaments/${selectedTournament}/players`);
          if (!playersResponse.ok) {
            throw new Error(`HTTP error! status: ${playersResponse.status}`);
          }
          const playersData = await playersResponse.json();
          setPlayers(playersData);

        } catch (error) {
          console.error("Error fetching courses or players:", error);
        }
      } else {
        // Reset courses and players when no tournament is selected
        setCourses([]);
        setPlayers([]);
      }
    };

    fetchCoursesAndPlayers();
  }, [selectedTournament]);

  const [isLoadingRounds, setIsLoadingRounds] = useState(true); // New state for loading indicator

  const fetchHoleDataAndExistingScores = useCallback(async () => {
    
    try {
      setIsLoadingRounds(true); // Set loading to true at the start
      // Aggressively clear states for a clean slate on each course/tournament/player change
      setScores({});
      setSubmittedSummaryScores({});
      setRoundIds({});
      setRoundInitiated(false);
      setIsCurrentRoundFinalized(false); // Clear finalized status
      setRoundPlayerHandicaps({}); // Clear round-specific handicaps

      console.log('fetchHoleDataAndExistingScores: selectedCourse changed', { selectedCourse, selectedCourseSequence, selectedTournament, players });
      console.log('fetchHoleDataAndExistingScores: currentCourse before check', currentCourse);

      if (!currentCourse) {
        console.warn("currentCourse is not available, cannot set hole data.");
        setIsLoadingRounds(false);
        return;
      }
      console.log('fetchHoleDataAndExistingScores: currentCourse after check', currentCourse);

      const newHoleData = [];
      const pars = currentCourse.hole_pars || [];
      const strokeIndices = currentCourse.hole_stroke_indices || [];
      console.log('fetchHoleDataAndExistingScores: pars', pars, 'strokeIndices', strokeIndices);

      for (let i = 0; i < 18; i++) {
        newHoleData.push({
          hole_number: i + 1,
          par: pars[i] !== undefined ? pars[i] : null,
          strokeIndex: strokeIndices[i] !== undefined ? strokeIndices[i] : null,
        });
      }
      console.log('fetchHoleDataAndExistingScores: newHoleData', newHoleData);
      setHoleData(newHoleData);

      const newRoundIds = {};
      const fetchedScores = {};
      const fetchedSummaries = {};
      let allPlayersHaveExistingRound = true; // Renamed for clarity
      let tempIsCurrentRoundFinalized = true; // Assume true, set to false if any round is not finalized

      // Collect all player IDs for a single API call
      const playerIds = players.map(p => p.id);
      const playerIdsString = playerIds.join(',');

      // Fetch all existing rounds for all players in a single API call
      console.log(`Fetching existing rounds for players: ${playerIdsString}, course ${selectedCourse}, sequence ${selectedCourseSequence}, tournament ${selectedTournament}`);
      const allExistingRoundsResponse = await fetch(`${API_URL}/rounds?tournament_id=${selectedTournament}&player_ids=${playerIdsString}&course_id=${selectedCourse}&sequence_number=${selectedCourseSequence}`);
      if (!allExistingRoundsResponse.ok) {
        console.error("Error fetching all existing rounds.");
        allPlayersHaveExistingRound = false; // If fetch itself fails, assume no rounds for any player
        tempIsCurrentRoundFinalized = false; // If fetch fails, assume not finalized
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

          // Store round-specific handicaps
          console.log('Full existingRound object:', existingRound); // NEW LINE
          const roundHandicapIndex = existingRound.player_handicap_index; // NEW
          const roundPlayingHandicap = existingRound.player_playing_handicap; // NEW
          console.log(`Attempting to store round-specific handicaps for player ${player.id}: roundHandicapIndex=${roundHandicapIndex}, roundPlayingHandicap=${roundPlayingHandicap}`); // MODIFIED
          setRoundPlayerHandicaps(prev => ({
            ...prev,
            [player.id]: {
              handicap_index: roundHandicapIndex, // MODIFIED
              playing_handicap: roundPlayingHandicap, // MODIFIED
            }
          }));
          console.log(`Stored round-specific handicaps for player ${player.id}: Index=${existingRound.handicap_index}, Playing=${existingRound.playing_handicap}`);

          // Check if this specific round is finalized
          if (!existingRound.is_finalized) {
            tempIsCurrentRoundFinalized = false; // If any round is NOT finalized, then the overall round is not finalized
          }
          console.log(`Frontend received existingRound.is_finalized: ${existingRound.is_finalized} for player ${player.id}`);
        } else {
          console.warn(`No existing round object found for player ${player.id} for sequence ${selectedCourseSequence}.`);
          allPlayersHaveExistingRound = false; // If any player doesn't have a round, then not all are initiated
          tempIsCurrentRoundFinalized = false; // If a round doesn't exist, it's not finalized
        }
      }
      console.log('Final fetchedScores:', fetchedScores);
      console.log('Final fetchedSummaries:', fetchedSummaries);
      console.log('Final newRoundIds:', newRoundIds);
      console.log('Final allPlayersHaveExistingRound:', allPlayersHaveExistingRound);
      console.log('Final tempIsCurrentRoundFinalized:', tempIsCurrentRoundFinalized);

      setRoundIds(newRoundIds);
      setScores(fetchedScores);
      setSubmittedSummaryScores(fetchedSummaries);
      setRoundInitiated(allPlayersHaveExistingRound);
      setIsCurrentRoundFinalized(tempIsCurrentRoundFinalized); // Set overall finalized status after loop
      console.log('After state updates: roundInitiated', allPlayersHaveExistingRound, 'isCurrentRoundFinalized', tempIsCurrentRoundFinalized);

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
  }, [selectedCourse, selectedCourseSequence, selectedTournament, players, currentCourse]);

  useEffect(() => {
    if (selectedCourse && selectedCourseSequence && selectedTournament && players.length > 0) {
      fetchHoleDataAndExistingScores();
    }
  }, [selectedCourse, selectedCourseSequence, selectedTournament, players, fetchHoleDataAndExistingScores]);

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

  const handleEndRound = async () => {
    if (!selectedTournament || !selectedCourseSequence) {
      displayNotification("Please select a tournament and a course sequence to end the round.", 'error');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/tournaments/${selectedTournament}/rounds/end`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          round_number: selectedCourseSequence,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      displayNotification(result.message, 'success');
      // Keep the current round displayed, but mark it as finalized
      setRoundInitiated(false); // No longer actively inputting scores for this round
      setIsCurrentRoundFinalized(true); // Mark as finalized

      // Fetch updated player handicaps
      const updatedPlayersResponse = await fetch(`${API_URL}/tournaments/${selectedTournament}/players`);
      if (updatedPlayersResponse.ok) {
        const updatedPlayersData = await updatedPlayersResponse.json();
        const newHandicaps = {};
        updatedPlayersData.forEach(player => {
          newHandicaps[player.id] = player.handicap;
        });
        setUpdatedPlayerHandicaps(newHandicaps);
      } else {
        console.error("Failed to fetch updated player handicaps.");
      }

    } catch (error) {
      console.error("Error ending round:", error);
      displayNotification(`Failed to end round: ${error.message}`, 'error');
    }
  };

  const handleReopenRound = async () => {
    if (!selectedTournament || !selectedCourseSequence) {
      displayNotification("Please select a tournament and a course sequence to re-open the round.", 'error');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/tournaments/${selectedTournament}/rounds/reopen_all`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sequence_number: selectedCourseSequence,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      displayNotification(result.message, 'success');

      // After re-opening, re-enable scoring and clear finalized status
      setRoundInitiated(true); // Allow score input again
      setIsCurrentRoundFinalized(false); // Not finalized anymore
      console.log('handleReopenRound: isCurrentRoundFinalized set to', false);
      setUpdatedPlayerHandicaps({}); // Clear updated handicaps display

      // Force re-fetch of round data to synchronize state with backend
      if (selectedCourse && selectedCourseSequence && selectedTournament && players.length > 0) {
        fetchHoleDataAndExistingScores();
      }

    } catch (error) {
      console.error("Error re-opening round:", error);
      displayNotification(`Failed to re-open round: ${error.message}`, 'error');
    }
  };

  // Remove redundant client-side calculations
  // const calculateNetScore = (playerId) => { ... };
  // const calculateFront9Net = (playerId) => { ... };
  // const calculateBack9Net = (playerId) => { ... };
  // const calculateTotalStablefordPoints = (playerId) => { ... };
  // The above functions are now replaced by direct lookups from submittedSummaryScores
  // and are included in the new_string for clarity.



  const handleTournamentChange = (e) => {
    setSelectedTournament(parseInt(e.target.value));
  };

  const handleCourseChange = (e) => {
    const [courseId, sequenceNumber] = e.target.value.split('-');
    setSelectedCourse(parseInt(courseId));
    setSelectedCourseSequence(parseInt(sequenceNumber));
  };

  return (
    <>
      <header className="page-header">
        <h1>Scorecard Entry</h1>
      </header>
      <div className="scorecard-container monochrome-container">
        {notification.message && (
            <div className={`notification ${notification.type}`}>
                {notification.message}
            </div>
        )}

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
                      <td>
                        {roundInitiated || isCurrentRoundFinalized ? (
                          `Hcp Index: ${roundPlayerHandicaps[player.id]?.handicap_index ?? 'N/A'} | Playing Hcp: ${roundPlayerHandicaps[player.id]?.playing_handicap ?? 'N/A'}`
                        ) : (
                          `Hcp Index: ${player.handicap} | Playing Hcp: ${calculatePlayingHandicap(player.handicap, currentCourse?.slope_rating)}`
                        )}
                      </td>
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
                <li><span className="worse-than-double-bogey-score-key"></span> Double Bogey +</li>
              </ul>
            </div>
            {!isLoadingRounds && !roundInitiated && !isCurrentRoundFinalized && (
              <button onClick={handleInitiateScoring}>Initiate Scoring</button>
            )}
            <h3>Round {selectedCourseSequence} - {currentCourse?.name}</h3>

            {isMobileView ? (
              <>
                {/* Holes 1-6 Table */}
                <table className="scorecard-table mobile-third">
                  <thead>
                    <tr>
                      <th>Player</th>
                      <th>Hcp Index</th>
                      <th>Playing Hcp</th>
                      {Array.from({ length: 6 }, (_, i) => (
                        <th key={`hole-header-${i + 1}`}>H{i + 1}</th>
                      ))}
                    </tr>
                    <tr>
                      <th></th>
                      <th></th>
                      <th>Par</th>
                      {Array.from({ length: 6 }, (_, i) => (
                        <th key={`par-header-${i + 1}`}>{holeData[i]?.par}</th>
                      ))}
                    </tr>
                    <tr>
                      <th></th>
                      <th></th>
                      <th>SI</th>
                      {Array.from({ length: 6 }, (_, i) => (
                        <th key={`si-header-${i + 1}`}>{holeData[i]?.strokeIndex}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {players.map(player => (
                      <tr key={`${player.id}-holes1-6`}>
                        <td>{player.name}</td>
                        <td>{roundPlayerHandicaps[player.id]?.handicap_index}</td>
                        <td>{roundPlayerHandicaps[player.id]?.playing_handicap}</td>
                        {Array.from({ length: 6 }, (_, i) => (
                          <td key={`${player.id}-hole-${i + 1}`}>
                            <div className={`score-input-wrapper ${getScoreClass(
                              parseInt(scores[player.id]?.[i + 1]),
                              holeData[i]?.par
                            )}`}>
                              <input
                                type="number"
                                value={scores[player.id]?.[i + 1] || ''}
                                onChange={(e) => handleScoreChange(player.id, i + 1, e.target.value)}
                                disabled={!roundInitiated}
                              />
                            </div>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Holes 7-12 Table */}
                <table className="scorecard-table mobile-third">
                  <thead>
                    <tr>
                      <th>Player</th>
                      <th>Hcp Index</th>
                      <th>Playing Hcp</th>
                      {Array.from({ length: 6 }, (_, i) => (
                        <th key={`hole-header-${i + 7}`}>H{i + 7}</th>
                      ))}
                    </tr>
                    <tr>
                      <th></th>
                      <th></th>
                      <th>Par</th>
                      {Array.from({ length: 6 }, (_, i) => (
                        <th key={`par-header-${i + 7}`}>{holeData[i + 6]?.par}</th>
                      ))}
                    </tr>
                    <tr>
                      <th></th>
                      <th></th>
                      <th>SI</th>
                      {Array.from({ length: 6 }, (_, i) => (
                        <th key={`si-header-${i + 7}`}>{holeData[i + 6]?.strokeIndex}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {players.map(player => (
                      <tr key={`${player.id}-holes7-12`}>
                        <td>{player.name}</td>
                        <td>{roundPlayerHandicaps[player.id]?.handicap_index}</td>
                        <td>{roundPlayerHandicaps[player.id]?.playing_handicap}</td>
                        {Array.from({ length: 6 }, (_, i) => (
                          <td key={`${player.id}-hole-${i + 7}`}>
                            <div className={`score-input-wrapper ${getScoreClass(
                              parseInt(scores[player.id]?.[i + 7]),
                              holeData[i + 6]?.par
                            )}`}>
                              <input
                                type="number"
                                value={scores[player.id]?.[i + 7] || ''}
                                onChange={(e) => handleScoreChange(player.id, i + 7, e.target.value)}
                                disabled={!roundInitiated}
                              />
                            </div>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Holes 13-18 Table */}
                <table className="scorecard-table mobile-third">
                  <thead>
                    <tr>
                      <th>Player</th>
                      <th>Hcp Index</th>
                      <th>Playing Hcp</th>
                      {Array.from({ length: 6 }, (_, i) => (
                        <th key={`hole-header-${i + 13}`}>H{i + 13}</th>
                      ))}
                    </tr>
                    <tr>
                      <th></th>
                      <th></th>
                      <th>Par</th>
                      {Array.from({ length: 6 }, (_, i) => (
                        <th key={`par-header-${i + 13}`}>{holeData[i + 12]?.par}</th>
                      ))}
                    </tr>
                    <tr>
                      <th></th>
                      <th></th>
                      <th>SI</th>
                      {Array.from({ length: 6 }, (_, i) => (
                        <th key={`si-header-${i + 13}`}>{holeData[i + 12]?.strokeIndex}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {players.map(player => (
                      <tr key={`${player.id}-holes13-18`}>
                        <td>{player.name}</td>
                        <td>{roundPlayerHandicaps[player.id]?.handicap_index}</td>
                        <td>{roundPlayerHandicaps[player.id]?.playing_handicap}</td>
                        {Array.from({ length: 6 }, (_, i) => (
                          <td key={`${player.id}-hole-${i + 13}`}>
                            <div className={`score-input-wrapper ${getScoreClass(
                              parseInt(scores[player.id]?.[i + 13]),
                              holeData[i + 12]?.par
                            )}`}>
                              <input
                                type="number"
                                value={scores[player.id]?.[i + 13] || ''}
                                onChange={(e) => handleScoreChange(player.id, i + 13, e.target.value)}
                                disabled={!roundInitiated}
                              />
                            </div>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            ) : (
              <table className="scorecard-table">
                <thead>
                  <tr>
                    <th>Player Name</th>
                    <th>Player Handicap Index</th>
                    <th>Playing Handicap</th>
                    {Array.from({ length: 18 }, (_, i) => (
                      <th key={`hole-header-${i + 1}`}>Hole {i + 1}</th>
                    ))}
                  </tr>
                  <tr>
                    <th></th>
                    <th></th>
                    <th>Par</th>
                    {Array.from({ length: 18 }, (_, i) => (
                      <th key={`par-header-${i + 1}`}>
                        {holeData[i]?.par}
                      </th>
                    ))}
                  </tr>
                  <tr>
                    <th></th>
                    <th></th>
                    <th>SI</th>
                    {Array.from({ length: 18 }, (_, i) => (
                      <th key={`si-header-${i + 1}`}>
                        {holeData[i]?.strokeIndex}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {players.map(player => (
                    <tr key={player.id}>
                      <td>{player.name}</td>
                      <td>{roundPlayerHandicaps[player.id]?.handicap_index}</td>
                      <td>{roundPlayerHandicaps[player.id]?.playing_handicap}</td>
                      {Array.from({ length: 18 }, (_, i) => (
                        <td key={`${player.id}-hole-${i + 1}`}>
                          <div className={`score-input-wrapper ${getScoreClass(
                            parseInt(scores[player.id]?.[i + 1]),
                            holeData[i]?.par
                          )}`}>
                            <input
                              type="number"
                              value={scores[player.id]?.[i + 1] || ''}
                              onChange={(e) => handleScoreChange(player.id, i + 1, e.target.value)}
                              disabled={!roundInitiated}
                            />
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {roundInitiated && !isCurrentRoundFinalized && (
              <button onClick={handleSubmitFinalScores}>Submit Scores</button>
            )}
            {roundInitiated && !isCurrentRoundFinalized && (
              <button onClick={handleEndRound}>End Round</button>
            )}
            {isCurrentRoundFinalized && (
              <button onClick={handleReopenRound}>Re-open Round</button>
            )}

            {/* New Summary Section */}
            <div className="scorecard-summary-section">
              <h3>Round Summary</h3>
              <table className="summary-table">
                <thead>
                  <tr>
                    <th>Player Name</th>
                    <th>Gross Front 9</th>
                    <th>Gross Back 9</th>
                    <th>Net Front 9</th>
                    <th>Net Back 9</th>
                    <th>Gross Total</th>
                    <th>Net Total</th>
                    <th>Stableford Points</th>
                  </tr>
                </thead>
                <tbody>
                  {players.map(player => (
                    <tr key={player.id}>
                      <td data-label="Player Name">{player.name}</td>
                      <td data-label="Gross Front 9">{calculateFront9Gross(player.id)}</td>
                      <td data-label="Gross Back 9">{calculateBack9Gross(player.id)}</td>
                      <td data-label="Net Front 9">{calculateFront9Net(player.id)}</td>
                      <td data-label="Net Back 9">{calculateBack9Net(player.id)}</td>
                      <td data-label="Gross Total">{calculateGrossScore(player.id)}</td>
                      <td data-label="Net Total">{calculateNetScore(player.id)}</td>
                      <td data-label="Stableford Points">{calculateTotalStablefordPoints(player.id)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {Object.keys(updatedPlayerHandicaps).length > 0 && (
              <div className="updated-handicaps-section" style={{ marginTop: '20px', borderTop: '1px solid #ccc', paddingTop: '20px' }}>
                <h3>Updated Player Handicaps for Next Round:</h3>
                <p>
                  {players.filter(player => updatedPlayerHandicaps[player.id] !== undefined)
                           .map(player => `${player.name}: ${updatedPlayerHandicaps[player.id].toFixed(1)}`)
                           .join(' | ')}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
};

export default ScorecardEntry;