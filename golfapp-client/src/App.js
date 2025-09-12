import React from 'react'; // Trigger build - third time
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import './App.css';
// Dummy change to trigger deployment
import MainMenu from './MainMenu';
import PlayerManager from './PlayerManager';
import CourseManager from './CourseManager';
import TournamentManager from './TournamentManager';
import ScorecardEntry from './ScorecardEntry';
import Leaderboard from './Leaderboard';
import HandicapAdjustmentManager from './HandicapAdjustmentManager';

function App() {
  return (
    <Router>
      <div className="App">
        <MainMenu />
        <Routes>
          <Route path="/" element={<Navigate to="/leaderboard" />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/players" element={<PlayerManager />} />
          <Route path="/courses" element={<CourseManager />} />
          <Route path="/tournaments" element={<TournamentManager />} />
          <Route path="/tournaments/scorecard-entry" element={<ScorecardEntry />} />
          <Route path="/handicap-adjustments" element={<HandicapAdjustmentManager />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;