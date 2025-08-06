import React, { useState, useEffect } from 'react';

function TournamentManager() {
  const [tournaments, setTournaments] = useState([]);
  const [newTournamentName, setNewTournamentName] = useState('');
  const [newTournamentDate, setNewTournamentDate] = useState('');
  const [newTournamentLocation, setNewTournamentLocation] = useState('');
  const [editingTournament, setEditingTournament] = useState(null);

  useEffect(() => {
    fetchTournaments();
  }, []);

  const fetchTournaments = async () => {
    const response = await fetch('http://127.0.0.1:5000/tournaments');
    const data = await response.json();
    setTournaments(data);
  };

  const handleAddTournament = async () => {
    const response = await fetch('http://127.0.0.1:5000/tournaments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        name: newTournamentName, 
        date: newTournamentDate, 
        location: newTournamentLocation 
      }),
    });
    const data = await response.json();
    setTournaments([...tournaments, data]);
    setNewTournamentName('');
    setNewTournamentDate('');
    setNewTournamentLocation('');
  };

  const handleEditClick = (tournament) => {
    setEditingTournament(tournament);
    setNewTournamentName(tournament.name);
    setNewTournamentDate(tournament.date);
    setNewTournamentLocation(tournament.location);
  };

  const handleUpdateTournament = async () => {
    await fetch(`http://127.0.0.1:5000/tournaments/${editingTournament.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        name: newTournamentName, 
        date: newTournamentDate, 
        location: newTournamentLocation 
      }),
    });
    setEditingTournament(null);
    setNewTournamentName('');
    setNewTournamentDate('');
    setNewTournamentLocation('');
    fetchTournaments();
  };

  const handleDeleteTournament = async (id) => {
    await fetch(`http://127.0.0.1:5000/tournaments/${id}`, {
      method: 'DELETE',
    });
    fetchTournaments();
  };

  return (
    <div>
      <h1>Tournament Management</h1>

      <div>
        <input
          type="text"
          placeholder="Tournament Name"
          value={newTournamentName}
          onChange={(e) => setNewTournamentName(e.target.value)}
        />
        <input
          type="text"
          placeholder="Date (e.g., YYYY-MM-DD)"
          value={newTournamentDate}
          onChange={(e) => setNewTournamentDate(e.target.value)}
        />
        <input
          type="text"
          placeholder="Location"
          value={newTournamentLocation}
          onChange={(e) => setNewTournamentLocation(e.target.value)}
        />
        {editingTournament ? (
          <button onClick={handleUpdateTournament}>Update Tournament</button>
        ) : (
          <button onClick={handleAddTournament}>Add Tournament</button>
        )}
      </div>

      <h2>Tournaments List</h2>
      <ul>
        {tournaments.map((tournament) => (
          <li key={tournament.id}>
            {tournament.name} ({tournament.date}, {tournament.location})
            <button onClick={() => handleEditClick(tournament)}>Edit</button>
            <button onClick={() => handleDeleteTournament(tournament.id)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default TournamentManager;
