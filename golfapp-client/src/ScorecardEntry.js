import React, { useState, useEffect, useMemo } from 'react';
import './ScorecardEntry.css';

const ScorecardEntry = () => {
  const [tournaments, setTournaments] = useState([]);
  const [selectedTournament, setSelectedTournament] = useState('');
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');
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

  const handleSubmitFinalScores = async () => {
    if (!selectedTournament || !selectedCourse || players.length === 0) {
      alert("Please select a tournament and course, and ensure players are loaded.");
      return;
    }

    const playersDataForSubmission = players.map(player => {
      const playerHoleScores = {};
      for (let i = 1; i <= 18; i++) {
        playerHoleScores[i] = scores[player.id]?.[i] ? parseInt(scores[player.id][i]) : 0; // Default to 0 if no score entered
      }

      const summaryScores = {
        front9Gross: calculateFront9Gross(player.id),
        back9Gross: calculateBack9Gross(player.id),
        overallGross: calculateGrossScore(player.id),
        front9Nett: calculateFront9Net(player.id),
        back9Nett: calculateBack9Net(player.id),
        overallNett: calculateNetScore(player.id),
        stablefordPoints: calculateTotalStablefordPoints(player.id),
      };

      return {
        player_id: player.id,
        hole_scores: playerHoleScores,
        summary_scores: summaryScores,
      };
    });

    try {
      const response = await fetch('http://localhost:5000/submit_round', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tournament_id: selectedTournament,
          course_id: selectedCourse,
          players_data: playersDataForSubmission,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      alert(result.message);
      // Optionally, clear scores or navigate away after successful submission
      setScores({});

    } catch (error) {
      console.error("Error submitting scores:", error);
      alert(`Failed to submit scores: ${error.message}`);
    }
  };



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

  useEffect(() => {
    if (selectedCourse) {
      const fetchHoleData = async () => {
        try {
          const response = await fetch(`http://localhost:5000/courses/${selectedCourse}/holes`);
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const data = await response.json();
          // Sort hole data by sequence number if available, otherwise by hole number
          const sortedHoleData = data.sort((a, b) => (a.sequence || a.hole_number) - (b.sequence || b.hole_number));
          setHoleData(sortedHoleData);
        } catch (error) {
          console.error("Error fetching hole data:", error);
        }
      };
      fetchHoleData();
    } else {
      setHoleData([]);
    }
  }, [selectedCourse]);

  const currentTournament = useMemo(() => {
    return tournaments.find(tournament => tournament.id === selectedTournament);
  }, [tournaments, selectedTournament]);

  const currentCourse = useMemo(() => {
    return courses.find(course => course.id === selectedCourse);
  }, [courses, selectedCourse]);

  const handleTournamentChange = (e) => {
    setSelectedTournament(parseInt(e.target.value));
  };

  const handleCourseChange = (e) => {
    setSelectedCourse(parseInt(e.target.value));
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

  const calculateGrossScore = (playerId) => {
    let totalGross = 0;
    for (let i = 1; i <= 18; i++) {
      const score = parseInt(scores[playerId]?.[i]);
      if (!isNaN(score)) {
        totalGross += score;
      }
    }
    return totalGross;
  };

  const calculateFront9Gross = (playerId) => {
    let front9Gross = 0;
    for (let i = 1; i <= 9; i++) {
      const score = parseInt(scores[playerId]?.[i]);
      if (!isNaN(score)) {
        front9Gross += score;
      }
    }
    return front9Gross;
  };

  const calculateBack9Gross = (playerId) => {
    let back9Gross = 0;
    for (let i = 10; i <= 18; i++) {
      const score = parseInt(scores[playerId]?.[i]);
      if (!isNaN(score)) {
        back9Gross += score;
      }
    }
    return back9Gross;
  };

  const calculateNetScore = (playerId) => {
    const grossScore = calculateGrossScore(playerId);
    const player = players.find(p => p.id === playerId);
    if (!player || !currentCourse) return 'N/A';
    const playingHandicap = calculatePlayingHandicap(player.handicap, currentCourse.slope_rating);
    return grossScore - playingHandicap;
  };

  const calculateFront9Net = (playerId) => {
    const grossFront9 = calculateFront9Gross(playerId);
    const player = players.find(p => p.id === playerId);
    if (!player || !currentCourse) return 'N/A';
    const playingHandicap = calculatePlayingHandicap(player.handicap, currentCourse.slope_rating);

    let front9Strokes = 0;
    const holesWithStrokes = [];
    for (let i = 1; i <= 18; i++) {
      const strokeIndex = getStrokeIndexForHole(i);
      if (strokeIndex > 0) {
        holesWithStrokes.push({ holeIndex: i, strokeIndex: strokeIndex });
      }
    }

    holesWithStrokes.sort((a, b) => a.strokeIndex - b.strokeIndex);

    let remainingHandicap = playingHandicap;
    for (let i = 0; i < 18; i++) {
      if (remainingHandicap > 0) {
        const hole = holesWithStrokes[i];
        if (hole && hole.holeIndex <= 9) {
          front9Strokes++;
        }
        remainingHandicap--;
      } else {
        break;
      }
    }
    return grossFront9 - front9Strokes;
  };

  const calculateBack9Net = (playerId) => {
    const grossBack9 = calculateBack9Gross(playerId);
    const player = players.find(p => p.id === playerId);
    if (!player || !currentCourse) return 'N/A';
    const playingHandicap = calculatePlayingHandicap(player.handicap, currentCourse.slope_rating);

    let back9Strokes = 0;
    const holesWithStrokes = [];
    for (let i = 1; i <= 18; i++) {
      const strokeIndex = getStrokeIndexForHole(i);
      if (strokeIndex > 0) {
        holesWithStrokes.push({ holeIndex: i, strokeIndex: strokeIndex });
      }
    }

    holesWithStrokes.sort((a, b) => a.strokeIndex - b.strokeIndex);

    let remainingHandicap = playingHandicap;
    for (let i = 0; i < 18; i++) {
      if (remainingHandicap > 0) {
        const hole = holesWithStrokes[i];
        if (hole && hole.holeIndex > 9) {
          back9Strokes++;
        }
        remainingHandicap--;
      } else {
        break;
      }
    }
    return grossBack9 - back9Strokes;
  };

  const calculateTotalStablefordPoints = (playerId) => {
    // This is a placeholder. Actual Stableford calculation is complex and depends on net score per hole.
    // For now, return a placeholder or 0.
    return 'N/A';
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
          <select id="course-select" value={selectedCourse} onChange={handleCourseChange}>
            <option value="">--Select a Course--</option>
            {courses.map(course => (
              <option key={course.id} value={course.id}>{course.name}</option>
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
          {!roundInitiated && (
            <button className="initiate-scoring-button" onClick={handleInitiateScoring}>Initiate Scoring</button>
          )}
          <h3>Input Scores</h3>
          <table className="scorecard-table">
            <thead>
              <tr>
                <th>Player Name</th>
                <th>Player Handicap Index</th>
                <th>Playing Handicap</th>
                {Array.from({ length: 18 }, (_, i) => (<th key={`hole-${i + 1}`}>Hole {i + 1}</th>))}
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
                {holeData.map((hole, index) => (<th key={`par-${index}`}>{hole.par}</th>))}
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
                {holeData.map((hole, index) => (<th key={`si-${index}`}>{hole.strokeIndex}</th>))}
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