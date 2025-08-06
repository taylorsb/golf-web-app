
import React from 'react';
import { Link } from 'react-router-dom';

const MainMenu = () => {
  return (
    <nav>
      <ul>
        <li>
          <Link to="/">Home</Link>
        </li>
        <li>
          <Link to="/players">Players</Link>
        </li>
        <li>
          <Link to="/courses">Courses</Link>
        </li>
        <li>
          <Link to="/tournaments">Tournaments</Link>
        </li>
      </ul>
    </nav>
  );
};

export default MainMenu;
