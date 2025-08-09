import React, { useState, useEffect } from 'react';
import './Leaderboard.css';

const Leaderboard = () => {
  const [tournaments, setTournaments] = useState([]);
  const [selectedTournament, setSelectedTournament] = useState('');
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [allRoundsData, setAllRoundsData] = useState([]); // Raw data from backend
  const [displayedLeaderboard, setDisplayedLeaderboard] = useState([]); // Processed and sorted data
  const [sortColumn, setSortColumn] = useState('roundStablefordPoints'); // Default sort
  const [sortDirection, setSortDirection] = useState('desc'); // Default sort direction

  // Fetch tournaments
  useEffect(() => {
    const fetchTournaments = async () => {
      try {
        const response = await fetch('http://127.0.0.1:5000/tournaments');
        const data = await response.json();
        setTournaments(data);
        if (data.length > 0) {
          setSelectedTournament(data[0].id);
        }
      } catch (error) {
        console.error('Error fetching tournaments:', error);
        // Fallback for development if backend is not running
        setTournaments([{ id: 1, name: 'Development Tournament' }]);
        setSelectedTournament(1);
      }
    };
    fetchTournaments();
  }, []);

  // Fetch courses for selected tournament
  useEffect(() => {
    const fetchCourses = async () => {
      if (selectedTournament) {
        try {
          const response = await fetch(`http://127.0.0.1:5000/tournaments/${selectedTournament}/courses`);
          const data = await response.json();
          setCourses(data);
          if (data.length > 0) {
            setSelectedCourse(data[0].id);
          } else {
            setSelectedCourse(''); // No courses for this tournament
          }
        } catch (error) {
          console.error('Error fetching courses:', error);
          setCourses([]);
          setSelectedCourse('');
        }
      }
    };
    fetchCourses();
  }, [selectedTournament]);

  // Fetch all rounds data for the selected tournament (and optionally course)
  useEffect(() => {
    const fetchRoundsData = async () => {
      if (selectedTournament) {
        try {
          const response = await fetch(`http://127.0.0.1:5000/tournaments/${selectedTournament}/rounds_summary`);
          const data = await response.json();
          setAllRoundsData(data);
        } catch (error) {
          console.error('Error fetching rounds summary:', error);
          setAllRoundsData([]);
        }
      }
    };
    fetchRoundsData();
  }, [selectedTournament]);

  // Process and sort leaderboard data
  useEffect(() => {
    const processLeaderboardData = () => {
      console.log('Processing leaderboard data. Sort Column:', sortColumn, 'Sort Direction:', sortDirection);
      // First, calculate tournament-wide aggregates for each player
      const playerTournamentAggregates = {};
      allRoundsData.forEach(round => {
        if (!playerTournamentAggregates[round.player_id]) {
          playerTournamentAggregates[round.player_id] = {
            playerName: round.player_name,
            tournamentStablefordPoints: 0,
            tournamentGross: 0,
          };
        }
        playerTournamentAggregates[round.player_id].tournamentStablefordPoints += round.stableford_total || 0;
        playerTournamentAggregates[round.player_id].tournamentGross += round.gross_score_total || 0;
      });

      // Then, filter rounds based on selected course for display
      let roundsToDisplay = allRoundsData;
      if (selectedCourse) {
        roundsToDisplay = allRoundsData.filter(round => round.course_id === selectedCourse);
      }

      // Now, combine the filtered rounds with the tournament aggregates
      let processedData = roundsToDisplay.map(round => ({
        playerName: round.player_name,
        tournamentStablefordPoints: playerTournamentAggregates[round.player_id]?.tournamentStablefordPoints || 0,
        tournamentGross: playerTournamentAggregates[round.player_id]?.tournamentGross || 0,
        roundStablefordPoints: round.stableford_total || 0,
        roundGross: round.gross_score_total || 0,
        roundId: round.id, // Unique key for the row
      }));

      // Apply sorting
      processedData.sort((a, b) => {
        let comparison = 0;
        if (sortColumn === 'roundStablefordPoints' || sortColumn === 'tournamentStablefordPoints') {
          comparison = b[sortColumn] - a[sortColumn]; // High to low
        } else if (sortColumn === 'roundGross' || sortColumn === 'tournamentGross') {
          comparison = a[sortColumn] - b[sortColumn]; // Low to high
        }

        if (sortDirection === 'asc') {
          comparison *= -1; // Reverse for ascending
        }
        return comparison;
      });

      // Add position after sorting
      processedData = processedData.map((item, index) => ({
        ...item,
        position: index + 1,
      }));

      setDisplayedLeaderboard(processedData);
    };

    processLeaderboardData();
  }, [allRoundsData, selectedCourse, sortColumn, sortDirection]);

  const handleTournamentChange = (event) => {
    setSelectedTournament(event.target.value);
    setSelectedCourse(''); // Reset selected course when tournament changes
  };

  const handleCourseChange = (event) => {
    setSelectedCourse(parseInt(event.target.value));
  };

  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      // Set default direction based on column type
      if (column === 'roundStablefordPoints' || column === 'tournamentStablefordPoints') {
        setSortDirection('desc');
      } else {
        setSortDirection('asc');
      }
    }
  };

  return (
    <> {/* Use a React Fragment to wrap multiple top-level elements */}
      <div className="leaderboard-controls"> {/* New container for controls */}
        <label htmlFor="tournament-select">Tournament:</label>
        <select id="tournament-select" onChange={handleTournamentChange} value={selectedTournament}>
          {tournaments.map((tournament) => (
            <option key={tournament.id} value={tournament.id}>
              {tournament.name}
            </option>
          ))}
        </select>
        {selectedTournament && (
          <>
            <label htmlFor="course-select">Golf Course:</label>
            <select id="course-select" onChange={handleCourseChange} value={selectedCourse} disabled={courses.length === 0}>
              <option value="">All Courses</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.name} - {course.sequence_number}
                </option>
              ))}
            </select>
          </>
        )}
      </div>
      <div className="leaderboard-widget">
        <h2>Leaderboard</h2> {/* Renamed title */}
        <div className="leaderboard-body">
          <table className="leaderboard-table">
            <thead>
              <tr>
                <th onClick={() => handleSort('position')}>
                  Pos {sortColumn === 'position' && (sortDirection === 'asc' ? '▲' : '▼')}
                </th>
                <th onClick={() => handleSort('playerName')}>
                  Player {sortColumn === 'playerName' && (sortDirection === 'asc' ? '▲' : '▼')}
                </th>
                <th onClick={() => handleSort('tournamentStablefordPoints')}>
                  Tourn. Stableford {sortColumn === 'tournamentStablefordPoints' && (sortDirection === 'asc' ? '▲' : '▼')}
                </th>
                <th onClick={() => handleSort('roundStablefordPoints')}>
                  Round Stableford {sortColumn === 'roundStablefordPoints' && (sortDirection === 'asc' ? '▲' : '▼')}
                </th>
                <th onClick={() => handleSort('tournamentGross')}>
                  Tourn. Gross {sortColumn === 'tournamentGross' && (sortDirection === 'asc' ? '▲' : '▼')}
                </th>
                <th onClick={() => handleSort('roundGross')}>
                  Round Gross {sortColumn === 'roundGross' && (sortDirection === 'asc' ? '▲' : '▼')}
                </th>
              </tr>
            </thead>
            <tbody>
              {displayedLeaderboard.map((player) => (
                <tr key={player.roundId}> {/* Use roundId as key for unique rows */}
                  <td>{player.position}</td>
                  <td className="player-name-cell">{player.playerName}</td>
                  <td className="points-cell">{player.tournamentStablefordPoints}</td>
                  <td className="points-cell">{player.roundStablefordPoints}</td>
                  <td className="gross-score-cell">{player.tournamentGross}</td>
                  <td className="gross-score-cell">{player.roundGross}</td>
                </tr>
              ))}
            </tbody>
            <tfoot><tr><td colSpan="6"></td></tr></tfoot>
          </table>
        </div>
      </div>
    </>
  );
};

export default Leaderboard;
