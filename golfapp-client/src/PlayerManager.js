import React, { useState, useEffect } from 'react';

const PlayerManager = () => {
  const [players, setPlayers] = useState([]);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerHandicap, setNewPlayerHandicap] = useState('');
  const [editingPlayer, setEditingPlayer] = useState(null);

  useEffect(() => {
    fetchPlayers();
  }, []);

  const fetchPlayers = async () => {
    const response = await fetch('http://127.0.0.1:5000/players');
    const data = await response.json();
    setPlayers(data);
  };

  const handleAddPlayer = async () => {
    const response = await fetch('http://127.0.0.1:5000/players', {
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
    await fetch(`http://127.0.0.1:5000/players/${editingPlayer.id}`, {
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
    await fetch(`http://127.0.0.1:5000/players/${id}`, {
      method: 'DELETE',
    });
    fetchPlayers();
  };

  return (
    <div>
      <h1>Golf Players</h1>

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
      <ul>
        {players.map((player) => (
          <li key={player.id}>
            {player.name} (Handicap: {player.handicap})
            <button onClick={() => handleEditClick(player)}>Edit</button>
            <button onClick={() => handleDeletePlayer(player.id)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default PlayerManager;