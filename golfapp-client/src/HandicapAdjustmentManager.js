import React, { useState, useEffect } from 'react';
import './HandicapAdjustmentManager.css';
import API_URL from './config';

const HandicapAdjustmentManager = () => {
  const [adjustments, setAdjustments] = useState([]);
  const [newStablefordScore, setNewStablefordScore] = useState('');
  const [newAdjustmentValue, setNewAdjustmentValue] = useState('');
  const [editingAdjustment, setEditingAdjustment] = useState(null);

  useEffect(() => {
    fetchAdjustments();
  }, []);

  const fetchAdjustments = async () => {
    try {
      const response = await fetch(`${API_URL}/handicap_adjustments`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setAdjustments(data);
    } catch (error) {
      console.error("Error fetching handicap adjustments:", error);
    }
  };

  const handleAddAdjustment = async () => {
    if (newStablefordScore === '' || newAdjustmentValue === '') {
      alert('Please enter both Stableford Score and Adjustment.');
      return;
    }
    const stableford = parseInt(newStablefordScore);
    const adjustment = parseFloat(newAdjustmentValue);

    if (isNaN(stableford) || isNaN(adjustment)) {
      alert('Stableford Score must be an integer and Adjustment must be a number.');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/handicap_adjustments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ stableford_score: stableford, adjustment: adjustment }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      setNewStablefordScore('');
      setNewAdjustmentValue('');
      fetchAdjustments(); // Refresh the list
    } catch (error) {
      console.error("Error adding adjustment:", error);
      alert(`Failed to add adjustment: ${error.message}`);
    }
  };

  const handleEditClick = (adjustment) => {
    setEditingAdjustment(adjustment);
    setNewStablefordScore(adjustment.stableford_score);
    setNewAdjustmentValue(adjustment.adjustment);
  };

  const handleUpdateAdjustment = async () => {
    if (newStablefordScore === '' || newAdjustmentValue === '') {
      alert('Please enter both Stableford Score and Adjustment.');
      return;
    }
    const stableford = parseInt(newStablefordScore);
    const adjustment = parseFloat(newAdjustmentValue);

    if (isNaN(stableford) || isNaN(adjustment)) {
      alert('Stableford Score must be an integer and Adjustment must be a number.');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/handicap_adjustments/${editingAdjustment.stableford_score}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ adjustment: adjustment }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      setEditingAdjustment(null);
      setNewStablefordScore('');
      setNewAdjustmentValue('');
      fetchAdjustments(); // Refresh the list
    } catch (error) {
      console.error("Error updating adjustment:", error);
      alert(`Failed to update adjustment: ${error.message}`);
    }
  };

  const handleDeleteAdjustment = async (stableford_score) => {
    if (!window.confirm(`Are you sure you want to delete the adjustment for Stableford Score ${stableford_score}?`)) {
      return;
    }
    try {
      const response = await fetch(`${API_URL}/handicap_adjustments/${stableford_score}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      fetchAdjustments(); // Refresh the list
    } catch (error) {
      console.error("Error deleting adjustment:", error);
      alert(`Failed to delete adjustment: ${error.message}`);
    }
  };

  const handleCancelEdit = () => {
    setEditingAdjustment(null);
    setNewStablefordScore('');
    setNewAdjustmentValue('');
  };

  return (
    <div className="handicap-adjustment-manager">
      <h1>Handicap Adjustment Reference</h1>

      <div className="adjustment-form"> {/* New div for the form */}
        <input
          type="number"
          placeholder="Stableford Score"
          value={newStablefordScore}
          onChange={(e) => setNewStablefordScore(e.target.value)}
          disabled={editingAdjustment !== null} // Disable score input when editing
        />
        <input
          type="number"
          step="0.01"
          placeholder="Adjustment (e.g., -0.5)"
          value={newAdjustmentValue}
          onChange={(e) => setNewAdjustmentValue(e.target.value)}
        />
        {editingAdjustment ? (
          <>
            <button onClick={handleUpdateAdjustment} className="initiate-scoring-button">Update Adjustment</button>
            <button onClick={handleCancelEdit} className="initiate-scoring-button">Cancel</button>
          </>
        ) : (
          <button onClick={handleAddAdjustment} className="initiate-scoring-button">Add Adjustment</button>
        )}
      </div>

      <h2>Existing Adjustments</h2>
      <div className="adjustments-display-grid"> {/* New grid container for columns */}
        {/* Column 1 */}
        <div className="adjustment-column">
          <table>
            <thead>
              <tr>
                <th>Score</th>
                <th>Adj.</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {adjustments.slice(0, 18).map((adj) => ( // First 18 rows
                <tr key={adj.stableford_score}>
                  <td>{adj.stableford_score}</td>
                  <td>{adj.adjustment}</td>
                  <td>
                    <button className="table-action-button" onClick={() => handleEditClick(adj)}>✏️</button>
                    <button className="table-action-button delete" onClick={() => handleDeleteAdjustment(adj.stableford_score)}>🗑️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Column 2 */}
        <div className="adjustment-column">
          <table>
            <thead>
              <tr>
                <th>Score</th>
                <th>Adj.</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {adjustments.slice(18, 36).map((adj) => ( // Next 18 rows
                <tr key={adj.stableford_score}>
                  <td>{adj.stableford_score}</td>
                  <td>{adj.adjustment}</td>
                  <td>
                    <button className="table-action-button" onClick={() => handleEditClick(adj)}>✏️</button>
                    <button className="table-action-button delete" onClick={() => handleDeleteAdjustment(adj.stableford_score)}>🗑️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Column 3 */}
        <div className="adjustment-column">
          <table>
            <thead>
              <tr>
                <th>Score</th>
                <th>Adj.</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {adjustments.slice(36, 54).map((adj) => ( // Last 18 rows
                <tr key={adj.stableford_score}>
                  <td>{adj.stableford_score}</td>
                  <td>{adj.adjustment}</td>
                  <td>
                    <button className="table-action-button" onClick={() => handleEditClick(adj)}>✏️</button>
                    <button className="table-action-button delete" onClick={() => handleDeleteAdjustment(adj.stableford_score)}>🗑️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default HandicapAdjustmentManager;
