import React, { useState, useEffect } from 'react';
import './TournamentManager.css';

import API_URL from './config';

function TournamentManager() {
  const [tournaments, setTournaments] = useState([]);
  const [newTournamentName, setNewTournamentName] = useState('');
  const [newTournamentDate, setNewTournamentDate] = useState('');
  const [newTournamentLocation, setNewTournamentLocation] = useState('');
  const [editingTournament, setEditingTournament] = useState(null);
  const [players, setPlayers] = useState([]);
  const [courses, setCourses] = useState([]);
  const [assignedPlayers, setAssignedPlayers] = useState([]); // Players currently assigned to the editing tournament
  const [assignedCourses, setAssignedCourses] = useState([]); // Courses currently assigned to the editing tournament
  const [playersToAdd, setPlayersToAdd] = useState([]); // Players to be added on submit
  const [playersToRemove, setPlayersToRemove] = useState([]); // Players to be removed on submit
  const [coursesToAdd, setCoursesToAdd] = useState([]); // Courses to be added on submit
  const [coursesToRemove, setCoursesToRemove] = useState([]); // Courses to be removed on submit
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    fetchTournaments();
    fetchPlayers();
    fetchCourses();
  }, []);

  const fetchPlayers = async () => {
    const response = await fetch(`${API_URL}/players`);
    const data = await response.json();
    setPlayers(data);
  };

  const fetchCourses = async () => {
    const response = await fetch(`${API_URL}/courses`);
    const data = await response.json();
    setCourses(data);
  };

  const fetchTournaments = async () => {
    const response = await fetch(`${API_URL}/tournaments`);
    const data = await response.json();
    setTournaments(data);
  };

  const handleAddTournament = async () => {
    const response = await fetch(`${API_URL}/tournaments`, {
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
    setAssignedPlayers(tournament.players);
    setAssignedCourses(tournament.courses);
    setPlayersToAdd([]);
    setPlayersToRemove([]);
    setCoursesToAdd([]);
    setCoursesToRemove([]);
  };

  const handleAddPlayerToPending = (player) => {
    if (!assignedPlayers.some(p => p.id === player.id) && !playersToAdd.some(p => p.id === player.id)) {
      setPlayersToAdd([...playersToAdd, player]);
      setPlayersToRemove(playersToRemove.filter(p => p.id !== player.id)); // Remove from remove list if it was there
    }
  };

  const handleRemovePlayerFromPending = (player) => {
    if (playersToAdd.some(p => p.id === player.id)) {
      setPlayersToAdd(playersToAdd.filter(p => p.id !== player.id));
    } else if (assignedPlayers.some(p => p.id === player.id)) {
      setPlayersToRemove([...playersToRemove, player]);
      setAssignedPlayers(assignedPlayers.filter(p => p.id !== player.id)); // Optimistically remove from assigned list
    }
  };

  const handleAddCourseToPending = (course, sequenceNumber) => {
    const parsedSequence = parseInt(sequenceNumber, 10);
    if (isNaN(parsedSequence) || parsedSequence <= 0) {
      alert('Sequence number must be a positive integer.');
      return;
    }

    // Check for uniqueness of course_id and sequence_number combination
    const allCourses = [...assignedCourses, ...coursesToAdd];
    const isDuplicate = allCourses.some(c => c.id === course.id && c.sequence_number === parsedSequence);

    if (isDuplicate) {
      alert('This course with this sequence number is already assigned.');
      return;
    }

    setCoursesToAdd([...coursesToAdd, { ...course, sequence_number: parsedSequence }]);
    // When adding, ensure it's not in the coursesToRemove list
    setCoursesToRemove(coursesToRemove.filter(c => !(c.id === course.id && c.sequence_number === parsedSequence)));
  };

  const handleRemoveCourseFromPending = (courseToRemove) => {
    // Check if it's in the coursesToAdd list (pending additions)
    if (coursesToAdd.some(c => c.id === courseToRemove.id && c.sequence_number === courseToRemove.sequence_number)) {
      setCoursesToAdd(coursesToAdd.filter(c => !(c.id === courseToRemove.id && c.sequence_number === courseToRemove.sequence_number)));
    } 
    // Check if it's in the assignedCourses list (already assigned)
    else if (assignedCourses.some(c => c.id === courseToRemove.id && c.sequence_number === courseToRemove.sequence_number)) {
      setCoursesToRemove([...coursesToRemove, courseToRemove]);
      // Optimistically remove from assigned list for immediate UI update
      setAssignedCourses(assignedCourses.filter(c => !(c.id === courseToRemove.id && c.sequence_number === courseToRemove.sequence_number)));
    }
  };

  const handleSubmitChanges = async () => {
    const tournamentId = editingTournament.id;

    // Add players
    if (playersToAdd.length > 0) {
      await fetch(`${API_URL}/tournaments/${tournamentId}/players`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player_ids: playersToAdd.map(p => p.id) }),
      });
    }

    // Remove players
    if (playersToRemove.length > 0) {
      await fetch(`${API_URL}/tournaments/${tournamentId}/players`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player_ids: playersToRemove.map(p => p.id) }),
      });
    }

    // Add courses
    if (coursesToAdd.length > 0) {
      await fetch(`${API_URL}/tournaments/${tournamentId}/courses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courses: coursesToAdd.map(c => ({ id: c.id, sequence_number: c.sequence_number })) }),
      });
    }

    // Remove courses
    if (coursesToRemove.length > 0) {
      await fetch(`${API_URL}/tournaments/${tournamentId}/courses`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courses: coursesToRemove.map(c => ({ id: c.id, sequence_number: c.sequence_number })) }),
      });
    }

    // Refresh the tournament data after all changes are submitted
    const updatedTournamentResponse = await fetch(`${API_URL}/tournaments/${tournamentId}`);
    const updatedTournamentData = await updatedTournamentResponse.json();
    setEditingTournament(updatedTournamentData);
    setAssignedPlayers(updatedTournamentData.players);
    setAssignedCourses(updatedTournamentData.courses);
    setPlayersToAdd([]);
    setPlayersToRemove([]);
    setCoursesToAdd([]);
    setCoursesToRemove([]);
    fetchTournaments(); // Also refresh the main list of tournaments

    setSuccessMessage('All changes submitted successfully!');
    setTimeout(() => {
      setSuccessMessage('');
    }, 3000); // Message fades after 3 seconds
  };

  const handleUpdateTournament = async () => {
    await fetch(`${API_URL}/tournaments/${editingTournament.id}`, {
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
    await fetch(`${API_URL}/tournaments/${id}`, {
      method: 'DELETE',
    });
    fetchTournaments();
  };

  return (
    <>
      <header className="page-header">
        <h2 style={{ fontSize: '14pt', color: 'white', margin: 0 }}>Tournament Management</h2>
      </header>
      <div className="tournament-manager monochrome-container">
        <div className="tournament-form">
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
        <table className="tournament-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Date</th>
              <th>Location</th>
              <th>Edit</th>
              <th>Delete</th>
            </tr>
          </thead>
          <tbody>
            {tournaments.map((tournament) => (
              <tr key={tournament.id}>
                <td>{tournament.name}</td>
                <td>{tournament.date}</td>
                <td>{tournament.location}</td>
                <td><button onClick={() => handleEditClick(tournament)}>Edit</button></td>
                <td><button onClick={() => handleDeleteTournament(tournament.id)}>Delete</button></td>
              </tr>
            ))}
          </tbody>
        </table>

        {editingTournament && (
          <div className="assignment-section">
            <div className="assignment-box">
              <h2>Assign Players to {editingTournament.name}</h2>
              <div style={{ maxHeight: '150px', overflowY: 'auto', border: '1px solid #ccc', padding: '10px' }}>
                {players.map((player) => (
                  <div key={player.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                    <span>{player.name}</span>
                    <button
                      onClick={() => handleAddPlayerToPending(player)}
                      disabled={assignedPlayers.some(p => p.id === player.id) || playersToAdd.some(p => p.id === player.id)}
                    >
                      +
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="assignment-box">
              <h2>Assign Courses to {editingTournament.name}</h2>
              <div style={{ maxHeight: '150px', overflowY: 'auto', border: '1px solid #ccc', padding: '10px' }}>
                {courses.map((course) => (
                  <div key={course.id} className="course-assignment-row">
                    <span>{course.name}</span>
                    <div>
                      <input
                        type="number"
                        placeholder="Order"
                        min="1"
                        id={`course-seq-${course.id}`}
                      />
                      <button
                        onClick={() => handleAddCourseToPending(course, document.getElementById(`course-seq-${course.id}`).value)}
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {editingTournament && (
          <div className="current-assignments-section">
            <h2>Current Assignments for {editingTournament.name}</h2>
            <div className="current-assignments">
              <div className="assignment-list">
                <h3>Assigned Players:</h3>
                <table className="assignment-table" style={{ width: '100%', margin: '0 auto' }}>
                  <thead>
                    <tr>
                      <th>Player Name</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assignedPlayers.map(player => (
                      <tr key={player.id}>
                        <td>{player.name}</td>
                        <td>
                          <button onClick={() => handleRemovePlayerFromPending(player)}>-</button>
                        </td>
                      </tr>
                    ))}
                    {playersToAdd.map(player => (
                      <tr key={player.id} style={{ backgroundColor: '#e0ffe0' }}>
                        <td>{player.name} (Pending Add)</td>
                        <td>
                          <button onClick={() => handleRemovePlayerFromPending(player)}>-</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="assignment-list">
                <h3>Assigned Courses:</h3>
                <table className="assignment-table" style={{ width: '100%', margin: '0 auto' }}>
                  <thead>
                    <tr>
                      <th>Course Name</th>
                      <th>Order</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...assignedCourses].sort((a, b) => a.sequence_number - b.sequence_number).map(course => (
                      <tr key={`${course.id}-${course.sequence_number}`}>
                        <td>{course.name}</td>
                        <td>{course.sequence_number}</td>
                        <td>
                          <button onClick={() => handleRemoveCourseFromPending(course)}>-</button>
                        </td>
                      </tr>
                    ))}
                    {[...coursesToAdd].sort((a, b) => a.sequence_number - b.sequence_number).map(course => (
                      <tr key={`${course.id}-${course.sequence_number}`} style={{ backgroundColor: '#e0ffe0' }}>
                        <td>{course.name} (Pending Add)</td>
                        <td>{course.sequence_number}</td>
                        <td>
                          <button onClick={() => handleRemoveCourseFromPending(course)}>-</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <button onClick={handleSubmitChanges} style={{ marginTop: '20px', padding: '10px 20px', fontSize: '1.2em' }}>Update Assignments</button>
            {successMessage && <p style={{ color: 'green', marginTop: '10px' }}>{successMessage}</p>}
          </div>
        )}
      </div>
    </>
  );
}

export default TournamentManager;