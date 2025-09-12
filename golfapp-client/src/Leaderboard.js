import React, { useState, useEffect } from 'react';
import './Leaderboard.css';
import API_URL from './config';
import backgroundImage from './theopenimage.jpg'; // Import the image

const Leaderboard = () => {
  const [tournaments, setTournaments] = useState([]);
  const [selectedTournament, setSelectedTournament] = useState('');
  
  const [allRoundsData, setAllRoundsData] = useState([]); // Raw data from backend
  const [leaderboardData, setLeaderboardData] = useState([]); // Processed and sorted data
  const [sortColumn, setSortColumn] = useState('tournamentStablefordPoints'); // Default sort
  const [sortDirection, setSortDirection] = useState('desc'); // Default sort direction

  const homeStyle = {
    backgroundImage: `url(${backgroundImage})`
  };

  // Fetch tournaments
  useEffect(() => {
    const fetchTournaments = async () => {
      try {
        const response = await fetch(`${API_URL}/tournaments`);
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

  

  // Fetch all rounds data for the selected tournament
  useEffect(() => {
    const fetchRoundsData = async () => {
      if (selectedTournament) {
        try {
          const response = await fetch(`${API_URL}/tournaments/${selectedTournament}/rounds_summary`);
          const data = await response.json();
          console.log('Raw rounds data:', data);
          setAllRoundsData(data);
        } catch (error) {
          console.error('Error fetching rounds data:', error);
          setAllRoundsData([]);
        }
      }
    };
    fetchRoundsData();
  }, [selectedTournament]);

  // Process and sort leaderboard data
  useEffect(() => {
    const processLeaderboardData = () => {
      const players = {};

      allRoundsData.forEach(round => {
        if (!players[round.player_id]) {
          players[round.player_id] = {
            playerName: round.player_name,
            tournamentStablefordPoints: 0,
            tournamentGross: 0,
            rounds: [],
          };
        }

        players[round.player_id].rounds[round.round_number - 1] = round.stableford_total || 0;
        players[round.player_id].tournamentStablefordPoints += round.stableford_total || 0;
        players[round.player_id].tournamentGross += round.gross_score_total || 0;
        
      });

      let processedData = Object.values(players);

      // Apply sorting
      processedData.sort((a, b) => {
        let comparison = 0;
        if (sortColumn === 'tournamentStablefordPoints') {
          comparison = b[sortColumn] - a[sortColumn]; // High to low
        } else if (sortColumn === 'tournamentGross') {
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

      setLeaderboardData(processedData);
      console.log('Processed leaderboard data:', processedData);
    };

    processLeaderboardData();
  }, [allRoundsData, sortColumn, sortDirection]);

  const handleTournamentChange = (event) => {
    setSelectedTournament(event.target.value);
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
    <div className="home-container" style={homeStyle}>
      <header className="app-header">
        <h1>
          <span role="img" aria-label="golf-icon">⛳</span> Golf Tournament Manager
        </h1>
        <p>
          <em>“Golf is the closest game to the game we call life. You get bad breaks from good shots;
          <br />
          you get good breaks from bad shots – but you have to play the ball where it lies.”</em>
          <br />
          <span style={{ textAlign: 'center', display: 'block' }}>by Bobby Jones</span>
        </p>
      </header>
      <main className="leaderboard-container">
        <div className="leaderboard-controls"> {/* New container for controls */}
          <label htmlFor="tournament-select">Tournament:</label>
          <select id="tournament-select" onChange={handleTournamentChange} value={selectedTournament}>
            {tournaments.map((tournament) => (
              <option key={tournament.id} value={tournament.id}>
                {tournament.name}
              </option>
            ))}
          </select>
          
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
                <th className="narrow-column" onClick={() => handleSort('tournamentStablefordPoints')}>
                  Tourn. Stableford {sortColumn === 'tournamentStablefordPoints' && (sortDirection === 'asc' ? '▲' : '▼')}
                </th>
                {leaderboardData.length > 0 && leaderboardData[0].rounds.map((_, index) => (
                  <th key={index}>
                    R{index + 1}
                  </th>
                ))}
                <th className="narrow-column" onClick={() => handleSort('tournamentGross')}>
                  Tourn. Gross {sortColumn === 'tournamentGross' && (sortDirection === 'asc' ? '▲' : '▼')}
                </th>
                
              </tr>
            </thead>
            <tbody>
              {leaderboardData.map((player) => (
                <tr key={player.playerName}>
                  <td>{player.position}</td>
                  <td className="player-name-cell">{player.playerName}</td>
                  <td className="points-cell narrow-column">{player.tournamentStablefordPoints}</td>
                  {player.rounds.map((round, index) => (
                    <td key={index} className="points-cell">{round}</td>
                  ))}
                  <td className="gross-score-cell narrow-column">{player.tournamentGross}</td>
                  
                </tr>
              ))}
            </tbody>
            <tfoot><tr><td colSpan={leaderboardData.length > 0 ? 5 + leaderboardData[0].rounds.length : 5}></td></tr></tfoot>
          </table>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Leaderboard;
