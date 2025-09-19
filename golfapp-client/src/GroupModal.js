import React from 'react';

const GroupModal = ({ show, handleClose, player, courses, groups, handleAddToGroup }) => {
  if (!show) {
    return null;
  }

  return (
    <div className="modal">
      <div className="modal-content">
        <h2>Add {player.name} to a Group</h2>
        <div className="course-selection">
          {courses.map(course => (
            <div key={course.id} className="course-group-selection">
              <h3>{course.name} (Seq: {course.sequence_number})</h3>
              {groups[course.id] && groups[course.id][course.sequence_number] && Array.isArray(groups[course.id][course.sequence_number]) && groups[course.id][course.sequence_number].map((group, i) => (
                <button key={i} onClick={() => handleAddToGroup(player, course.id, course.sequence_number, i)} disabled={group.length >= 4}>
                  Group {i + 1} ({group.length}/4)
                </button>
              ))}
              <button onClick={() => handleAddToGroup(player, course.id, course.sequence_number, groups[course.id] && groups[course.id][course.sequence_number] && Array.isArray(groups[course.id][course.sequence_number]) ? groups[course.id][course.sequence_number].length : 0)}>New Group</button>
            </div>
          ))}
        </div>
        <button onClick={handleClose}>Close</button>
      </div>
    </div>
  );
};

export default GroupModal;
