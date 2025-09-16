import React, { useState, useEffect } from 'react';
import './leaderboard_bbc.css';
import API_URL from './config';
import backgroundImage from './anfi.jpg'; // Import the image

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
            tournamentStablefordBack9: 0, /* New field for countback */
            tournamentStablefordFront9: 0, /* New field for countback */
            rounds: [],
          };
        }

        players[round.player_id].rounds[round.round_number - 1] = round.stableford_total || 0;
        players[round.player_id].tournamentStablefordPoints += round.stableford_total || 0;
        players[round.player_id].tournamentGross += round.gross_score_total || 0;
        players[round.player_id].tournamentStablefordBack9 += round.stableford_back_9 || 0;
        players[round.player_id].tournamentStablefordFront9 += round.stableford_front_9 || 0;
        
      });

      let processedData = Object.values(players);

      // Apply sorting
      processedData.sort((a, b) => {
        let comparison = 0;

        // Primary sort: Tournament Stableford Points (descending)
        comparison = b.tournamentStablefordPoints - a.tournamentStablefordPoints;
        if (comparison !== 0) return comparison;

        // Secondary sort: Back 9 Stableford Points (descending)
        comparison = b.tournamentStablefordBack9 - a.tournamentStablefordBack9;
        if (comparison !== 0) return comparison;

        // Tertiary sort: Front 9 Stableford Points (descending)
        comparison = b.tournamentStablefordFront9 - a.tournamentStablefordFront9;
        if (comparison !== 0) return comparison;

        // If still tied, maintain original order (or sort by name, etc. if desired)
        return 0;
      });

      // Add position after sorting
      processedData = processedData.map((item, index) => ({
        ...item,
        position: index + 1,
        isCountbackApplied: false, // Default to false
      }));

      // Identify players where countback was applied
      for (let i = 1; i < processedData.length; i++) {
        if (processedData[i].tournamentStablefordPoints === processedData[i-1].tournamentStablefordPoints) {
          // If current player is tied with previous, mark both (and potentially others in the group)
          processedData[i].isCountbackApplied = true;
          processedData[i-1].isCountbackApplied = true;
        }
      }

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
    <div className="leaderboard-page-container">
      <div className="top-blue-bar">
        <h1>DGC Tour Golf</h1>
      </div>
      <div className="hero-section">
        <div className="hero-image-container" style={homeStyle}>
          <header className="app-header">
            <h1>
              <span role="img" aria-label="golf-icon">⛳</span> Golf Tournament Manager
            </h1>
          </header>
        </div>
      </div>
      <main className="leaderboard-section">
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
        <div className="leaderboard-container">
          <div className="leaderboard-widget">
            <h2>Leaderboard</h2> {/* Renamed title */}
            <div className="leaderboard-body">
              <table className="leaderboard-table">
                <thead>
                  <tr>
                    <th style={{color: '#333'}}>Pos {sortColumn === 'position' && (sortDirection === 'asc' ? '▲' : '▼')}</th>
                    <th style={{color: '#333'}}>Player {sortColumn === 'playerName' && (sortDirection === 'asc' ? '▲' : '▼')}</th>
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
                      <td>{player.playerName} {player.isCountbackApplied && <span className="countback-indicator">(CB)</span>}</td>
                      <td><div className="score-square stableford-square">{player.tournamentStablefordPoints}</div></td>
                      {player.rounds.map((round, index) => (
                        <td key={index}><div className="score-square round-square">{round}</div></td>
                      ))}
                      <td><div className="score-square gross-square">{player.tournamentGross}</div></td>
                    </tr>
                  ))}
                </tbody>
                <tfoot><tr><td colSpan={leaderboardData.length > 0 ? 5 + leaderboardData[0].rounds.length : 5}></td></tr></tfoot>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Leaderboard;
