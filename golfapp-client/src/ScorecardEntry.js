import React, { useState, useEffect, useMemo } from 'react';
import './ScorecardEntry.css';

const ScorecardEntry = () => {
  const [tournaments, setTournaments] = useState([]);
  const [selectedTournament, setSelectedTournament] = useState('');
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');

  useEffect(() => {
    const fetchTournaments = async () => {
      try {
        const response = await fetch('http://localhost:5000/tournaments');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setTournaments(data);
      } catch (error) {
        console.error("Error fetching tournaments:", error);
      }
    };

    const fetchCourses = async () => {
      try {
        const response = await fetch('http://localhost:5000/courses');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setCourses(data);
      } catch (error) {
        console.error("Error fetching courses:", error);
      }
    };

    fetchTournaments();
    fetchCourses();
  }, []);

  const currentTournament = useMemo(() => {
    return tournaments.find(tournament => tournament.id === selectedTournament);
  }, [tournaments, selectedTournament]);

  const currentCourse = useMemo(() => {
    return courses.find(course => course.id === selectedCourse);
  }, [courses, selectedCourse]);

  const handleTournamentChange = (e) => {
    setSelectedTournament(parseInt(e.target.value));
  };

  const handleCourseChange = (e) => {
    setSelectedCourse(parseInt(e.target.value));
  };

  

  return (
    <div className="scorecard-container">
      <h2>Scorecard Entry</h2>

      <div className="controls-container">
        <label htmlFor="tournament-select">Select Tournament:</label>
        <select id="tournament-select" value={selectedTournament} onChange={handleTournamentChange}>
          <option value="">--Select a Tournament--</option>
          {tournaments.map(tournament => (
            <option key={tournament.id} value={tournament.id}>{tournament.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="course-select">Filter by Course:</label>
        <select id="course-select" value={selectedCourse} onChange={handleCourseChange}>
          <option value="">--Select a Course--</option>
          {courses.map(course => (
            <option key={course.id} value={course.id}>{course.name}</option>
          ))}
        </select>
      </div>

      {selectedTournament && currentTournament && (
        <div className="tournament-details">
          <h3>Tournament Details</h3>
          <p><strong>Name:</strong> {currentTournament.name}</p>
          <p><strong>Date:</strong> {currentTournament.date}</p>
          <p><strong>Location:</strong> {currentTournament.location}</p>
        </div>
      )}

      {selectedCourse && currentCourse && (
        <div className="course-details">
          <h3>Course Details</h3>
          <p><strong>Course Name:</strong> {currentCourse.name}</p>
          <p><strong>Slope Rating:</strong> {currentCourse.slope_rating}</p>
        </div>
      )}
    </div>
  );
};

export default ScorecardEntry;