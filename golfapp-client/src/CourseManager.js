import React, { useState, useEffect } from 'react';
import './CourseManager.css';
import './monochrome.css';
import API_URL from './config';

function CourseManager() {
  const [courses, setCourses] = useState([]);
  const [newCourseName, setNewCourseName] = useState('');
  const [newCourseCountry, setNewCourseCountry] = useState('');
  const [newCourseSlopeRating, setNewCourseSlopeRating] = useState('');
  const [newCourseHolePars, setNewCourseHolePars] = useState(Array(18).fill(''));
  const [newCourseHoleStrokeIndices, setNewCourseHoleStrokeIndices] = useState(Array(18).fill(''));
  const [editingCourse, setEditingCourse] = useState(null);
  const [showCourseForm, setShowCourseForm] = useState(false); // New state for form visibility

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    const response = await fetch(`${API_URL}/courses`);
    const data = await response.json();
    setCourses(data);
  };

  const handleAddCourse = async () => {
    const response = await fetch(`${API_URL}/courses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: newCourseName,
        country: newCourseCountry,
        slope_rating: parseFloat(newCourseSlopeRating),
        hole_pars: newCourseHolePars.map(Number),
        hole_stroke_indices: newCourseHoleStrokeIndices.map(Number),
      }),
    });
    const data = await response.json();
    setCourses([...courses, data]);
    resetForm();
  };

  const handleEditClick = (course) => {
    setEditingCourse(course);
    setNewCourseName(course.name);
    setNewCourseCountry(course.country);
    setNewCourseSlopeRating(course.slope_rating);
    setNewCourseHolePars(course.hole_pars || Array(18).fill(''));
    setNewCourseHoleStrokeIndices(course.hole_stroke_indices || Array(18).fill(''));
    setShowCourseForm(true); // Show form when editing
  };

  const handleUpdateCourse = async () => {
    await fetch(`${API_URL}/courses/${editingCourse.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: newCourseName,
        country: newCourseCountry,
        slope_rating: parseFloat(newCourseSlopeRating),
        hole_pars: newCourseHolePars.map(Number),
        hole_stroke_indices: newCourseHoleStrokeIndices.map(Number),
      }),
    });
    resetForm();
    fetchCourses();
  };

  const handleDeleteCourse = async (id) => {
    await fetch(`${API_URL}/courses/${id}`, {
      method: 'DELETE',
    });
    fetchCourses();
  };


  const resetForm = () => {
    setEditingCourse(null);
    setNewCourseName('');
    setNewCourseCountry('');
    setNewCourseSlopeRating('');
    setNewCourseHolePars(Array(18).fill(''));
    setNewCourseHoleStrokeIndices(Array(18).fill(''));
    setShowCourseForm(false); // Hide form after action or cancel
  };

  const handleHoleParChange = (index, value) => {
    const updatedPars = [...newCourseHolePars];
    updatedPars[index] = value;
    setNewCourseHolePars(updatedPars);
  };

  const handleHoleStrokeIndexChange = (index, value) => {
    const updatedIndices = [...newCourseHoleStrokeIndices];
    updatedIndices[index] = value;
    setNewCourseHoleStrokeIndices(updatedIndices);
  };

  return (
    <div className="course-manager monochrome-container">
      <h2>Golf Courses</h2>

      {!showCourseForm && !editingCourse && (
        <button onClick={() => setShowCourseForm(true)}>Add New Course</button>
      )}

      {(showCourseForm || editingCourse) && (
        <div>
          <div className="course-form-main-inputs">
            <input
              type="text"
              placeholder="Course Name"
              value={newCourseName}
              onChange={(e) => setNewCourseName(e.target.value)}
            />
            <input
              type="text"
              placeholder="Country"
              value={newCourseCountry}
              onChange={(e) => setNewCourseCountry(e.target.value)}
            />
            <input
              type="number"
              step="0.1"
              placeholder="Slope Rating"
              value={newCourseSlopeRating}
              onChange={(e) => setNewCourseSlopeRating(e.target.value)}
            />
          </div>
          
          <h3>Hole Details</h3>
          <div className="hole-details-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '5px' }}>
            {[...Array(18)].map((_, index) => (
              <div key={index} style={{ border: '1px solid #ccc', padding: '5px' }}>
                <h4>Hole {index + 1}</h4>
                <input
                  type="number"
                  placeholder="Par"
                  value={newCourseHolePars[index]}
                  onChange={(e) => handleHoleParChange(index, e.target.value)}
                />
                <input
                  type="number"
                  placeholder="Stroke Index"
                  value={newCourseHoleStrokeIndices[index]}
                  onChange={(e) => handleHoleStrokeIndexChange(index, e.target.value)}
                />
              </div>
            ))}
          </div>

          {editingCourse ? (
            <button onClick={handleUpdateCourse}>Update Course</button>
          ) : (
            <button onClick={handleAddCourse}>Add Course</button>
          )}
          <button onClick={resetForm}>Cancel</button>
        </div>
      )}

      <h3>Courses List</h3>
      <table className="course-table">
        <tbody>
          {courses.sort((a, b) => a.name.localeCompare(b.name)).map((course) => (
            <tr key={course.id}>
              <td data-label="Course">{course.name} ({course.country}) - Slope: {course.slope_rating}</td>
              <td data-label="Actions"><button onClick={() => handleEditClick(course)}>Edit</button></td>
              <td data-label="Actions"><button onClick={() => handleDeleteCourse(course.id)}>Delete</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default CourseManager;