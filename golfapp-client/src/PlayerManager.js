import React, { useState, useEffect } from 'react';
import './PlayerManager.css';

import API_URL from './config';

const PlayerManager = () => {
  const [players, setPlayers] = useState([]);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerHandicap, setNewPlayerHandicap] = useState('');
  const [editingPlayer, setEditingPlayer] = useState(null);

  useEffect(() => {
    fetchPlayers();
  }, []);

  const fetchPlayers = async () => {
    const response = await fetch(`${API_URL}/players`);
    const data = await response.json();
    setPlayers(data);
  };

  const handleAddPlayer = async () => {
    const response = await fetch(`${API_URL}/players`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: newPlayerName, handicap: parseFloat(newPlayerHandicap) }),
    });
    const data = await response.json();
    setPlayers([...players, data]);
    setNewPlayerName('');
    setNewPlayerHandicap('');
  };

  const handleEditClick = (player) => {
    setEditingPlayer(player);
    setNewPlayerName(player.name);
    setNewPlayerHandicap(player.handicap);
  };

  const handleUpdatePlayer = async () => {
    await fetch(`${API_URL}/players/${editingPlayer.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: newPlayerName, handicap: parseFloat(newPlayerHandicap) }),
    });
    setEditingPlayer(null);
    setNewPlayerName('');
    setNewPlayerHandicap('');
    fetchPlayers();
  };

  const handleDeletePlayer = async (id) => {
    await fetch(`${API_URL}/players/${id}`, {
      method: 'DELETE',
    });
    fetchPlayers();
  };

  return (
    <>
      <header className="page-header">
        <h1>Player Management</h1>
      </header>
      <div className="player-manager monochrome-container">
        <div>
          <input
            type="text"
            placeholder="Player Name"
            value={newPlayerName}
            onChange={(e) => setNewPlayerName(e.target.value)}
          />
          <input
            type="number"
            placeholder="Handicap"
            value={newPlayerHandicap}
            onChange={(e) => setNewPlayerHandicap(e.target.value)}
          />
          {editingPlayer ? (
            <button onClick={handleUpdatePlayer}>Update Player</button>
          ) : (
            <button onClick={handleAddPlayer}>Add Player</button>
          )}
        </div>

        <h2>Players List</h2>
        <table className="player-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Hcp Index</th>
              <th>Edit</th>
              <th>Delete</th>
            </tr>
          </thead>
          <tbody>
            {players.sort((a, b) => a.name.localeCompare(b.name)).map((player) => (
              <tr key={player.id}>
                <td>{player.name}</td>
                <td>{player.handicap}</td>
                <td><button onClick={() => handleEditClick(player)}>Edit</button></td>
                <td><button onClick={() => handleDeletePlayer(player.id)}>Del</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export default PlayerManager;