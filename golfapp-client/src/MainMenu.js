
import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const MainMenu = () => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  return (
    <>
      <div className="hamburger-icon" onClick={toggleMenu}>
        <div className="bar"></div>
        <div className="bar"></div>
        <div className="bar"></div>
      </div>
      <nav className={isOpen ? 'open' : ''}>
        <ul>
          <li>
            <Link to="/" onClick={toggleMenu}>Home</Link>
          </li>
          <li>
            <Link to="/players" onClick={toggleMenu}>Players</Link>
          </li>
          <li>
            <Link to="/courses" onClick={toggleMenu}>Courses</Link>
          </li>
          <li>
            <Link to="/tournaments" onClick={toggleMenu}>Tournaments</Link>
            <ul>
              <li>
                <Link to="/tournaments/scorecard-entry" onClick={toggleMenu}>Scorecard Entry</Link>
              </li>
            </ul>
          </li>
          <li>
            <Link to="/handicap-adjustments" onClick={toggleMenu}>Hcp Adjust</Link>
          </li>
        </ul>
      </nav>
    </>
  );
};

export default MainMenu;
