import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import './App.css';
import MainMenu from './MainMenu';
import PlayerManager from './PlayerManager';
import CourseManager from './CourseManager';
import TournamentManager from './TournamentManager';
import Leaderboard from './Leaderboard';
import backgroundImage from './theopenimage.jpg'; // Import the image

function Home() {
  const homeStyle = {
    backgroundImage: `url(${backgroundImage})`
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
        <Leaderboard />
      </main>
    </div>
  );
}

function App() {
  return (
    <Router>
      <div className="App">
        <MainMenu />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/players" element={<PlayerManager />} />
          <Route path="/courses" element={<CourseManager />} />
          <Route path="/tournaments" element={<TournamentManager />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;