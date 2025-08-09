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

    const fetchCourses = async () => {
      try {
        const response = await fetch('http://localhost:5000/courses');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setCourses(data);
      } catch (error) {
        console.error("Error fetching courses:", error);
      }
    };

    fetchTournaments();
    fetchCourses();
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
      fetchPlayers();
    } else {
      setPlayers([]);
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
                      />
                    </td>
                  ))}
                  <td></td> {/* Gross Front 9 */}
                  <td></td> {/* Gross Back 9 */}
                  <td></td> {/* Net Front 9 */}
                  <td></td> {/* Net Back 9 */}
                  <td></td> {/* Gross Total */}
                  <td></td> {/* Net Total */}
                  <td></td> {/* Stableford Points */}
                </tr>
              ))}
            </tbody>
          </table>
          <button className="initiate-scoring-button">Initiate Scoring</button>
        </div>
      )}
    </div>
  );
};

export default ScorecardEntry;