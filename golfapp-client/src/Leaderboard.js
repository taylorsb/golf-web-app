import React, { useState, useEffect } from 'react';
import './Leaderboard.css';

const Leaderboard = () => {
  const [tournaments, setTournaments] = useState([]);
  const [selectedTournament, setSelectedTournament] = useState('');

  // Mock data for the leaderboard
  const mockLeaderboardData = {
    '1': [
      { position: 1, playerName: 'Player One', grossScore: 70, nettScore: 68, points: 36 },
      { position: 2, playerName: 'Player Two', grossScore: 72, nettScore: 70, points: 34 },
      { position: 3, playerName: 'Player Three', grossScore: 73, nettScore: 71, points: 33 },
      { position: 4, playerName: 'Another Player', grossScore: 71, nettScore: 69, points: 35 },
      { position: 5, playerName: 'Long Player Name Here', grossScore: 75, nettScore: 73, points: 30 },
      { position: 6, playerName: 'Sixth Player', grossScore: 76, nettScore: 74, points: 29 },
      { position: 7, playerName: 'Seventh Player', grossScore: 77, nettScore: 75, points: 28 },
      { position: 8, playerName: 'Eighth Player', grossScore: 78, nettScore: 76, points: 27 },
      { position: 9, playerName: 'Ninth Player', grossScore: 79, nettScore: 77, points: 26 },
      { position: 10, playerName: 'Tenth Player', grossScore: 80, nettScore: 78, points: 25 },
      { position: 11, playerName: 'Eleventh Player', grossScore: 81, nettScore: 79, points: 24 },
    ],
    '2': [
      { position: 1, playerName: 'Player Alpha', grossScore: 68, nettScore: 65, points: 38 },
      { position: 2, playerName: 'Player Beta', grossScore: 71, nettScore: 69, points: 35 },
      { position: 3, playerName: 'Player Gamma', grossScore: 74, nettScore: 72, points: 32 },
      { position: 4, playerName: 'Player Delta', grossScore: 75, nettScore: 73, points: 31 },
      { position: 5, playerName: 'Player Epsilon', grossScore: 76, nettScore: 74, points: 30 },
      { position: 6, playerName: 'Player Zeta', grossScore: 77, nettScore: 75, points: 29 },
      { position: 7, playerName: 'Player Eta', grossScore: 78, nettScore: 76, points: 28 },
      { position: 8, playerName: 'Player Theta', grossScore: 79, nettScore: 77, points: 27 },
      { position: 9, playerName: 'Player Iota', grossScore: 80, nettScore: 78, points: 26 },
      { position: 10, playerName: 'Player Kappa', grossScore: 81, nettScore: 79, points: 25 },
      { position: 11, playerName: 'Player Lambda', grossScore: 82, nettScore: 80, points: 24 },
    ],
  };

  useEffect(() => {
    // Fetch tournaments to populate the dropdown
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
        // Set up mock tournaments if the fetch fails
        const mockTournaments = [
          { id: '1', name: 'Mock Tournament 1' },
          { id: '2', name: 'Mock Tournament 2' },
        ];
        setTournaments(mockTournaments);
        if (mockTournaments.length > 0) {
          setSelectedTournament(mockTournaments[0].id);
        }
      }
    };
    fetchTournaments();
  }, []);

  const handleTournamentChange = (event) => {
    setSelectedTournament(event.target.value);
  };

  const renderCharacters = (value, totalCells) => {
    let strValue = String(value);
    // Pad with spaces to the totalCells length
    strValue = strValue.padEnd(totalCells, ' ');
    // Truncate if longer than totalCells
    strValue = strValue.substring(0, totalCells);

    return strValue.split('').map((char, index) => (
      <span key={index}>{char === ' ' ? '\u00A0' : char}</span> // Use non-breaking space for empty cells
    ));
  };

  const leaderboardData = (mockLeaderboardData[selectedTournament] || []).slice(0, 10);

  return (
    <div className="leaderboard-widget">
      <div className="leaderboard-header">
        <select onChange={handleTournamentChange} value={selectedTournament}>
          {tournaments.map((tournament) => (
            <option key={tournament.id} value={tournament.id}>
              {tournament.name}
            </option>
          ))}
        </select>
      </div>
      <div className="leaderboard-body">
        <table className="leaderboard-table">
          <thead>
            <tr>
              <th>Pos</th>
              <th>Player</th>
              <th>Gross</th>
              <th>Nett</th>
              <th>Points</th>
            </tr>
          </thead>
          <tbody>
            {leaderboardData.map((player) => (
              <tr key={player.playerName}>
                <td>{renderCharacters(player.position, 3)}</td>
                <td className="player-name-cell">{renderCharacters(player.playerName, 20)}</td>
                <td className="gross-score-cell">{renderCharacters(player.grossScore, 3)}</td>
                <td className="nett-score-cell">{renderCharacters(player.nettScore, 3)}</td>
                <td className="points-cell">{renderCharacters(player.points, 3)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Leaderboard;
