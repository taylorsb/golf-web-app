from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
import os
import json # Import json module

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///C:/Users/simon/golf-web-app/golfapp-server/instance/golf.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)
CORS(app) # Enable CORS for all routes

# Association table for Tournament and Player
tournament_players = db.Table('tournament_players',
    db.Column('tournament_id', db.Integer, db.ForeignKey('tournament.id'), primary_key=True),
    db.Column('player_id', db.Integer, db.ForeignKey('player.id'), primary_key=True)
)

# Association table for Tournament and Course
tournament_courses = db.Table('tournament_courses',
    db.Column('tournament_id', db.Integer, db.ForeignKey('tournament.id'), primary_key=True),
    db.Column('course_id', db.Integer, db.ForeignKey('course.id'), primary_key=True),
    db.Column('sequence_number', db.Integer, nullable=False, default=0)
)

class Player(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(80), unique=True, nullable=False)
    handicap = db.Column(db.Float, nullable=True)

    def __repr__(self):
        return '<Player %r>' % self.name

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'handicap': self.handicap
        }

class Course(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), unique=True, nullable=False)
    country = db.Column(db.String(80), nullable=True)
    slope_rating = db.Column(db.Float, nullable=True)
    hole_pars = db.Column(db.String(500), nullable=True) # Stored as JSON string
    hole_stroke_indices = db.Column(db.String(500), nullable=True) # Stored as JSON string

    def __repr__(self):
        return '<Course %r>' % self.name

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'country': self.country,
            'slope_rating': self.slope_rating,
            'hole_pars': json.loads(self.hole_pars) if self.hole_pars else [],
            'hole_stroke_indices': json.loads(self.hole_stroke_indices) if self.hole_stroke_indices else []
        }



# Player API Endpoints (existing)
@app.route('/players', methods=['GET'])
def get_players():
    players = Player.query.all()
    return jsonify([player.to_dict() for player in players])

@app.route('/players/<int:player_id>', methods=['GET'])
def get_player(player_id):
    player = Player.query.get_or_404(player_id)
    return jsonify(player.to_dict())

@app.route('/players', methods=['POST'])
def add_player():
    data = request.get_json()
    if not data or not 'name' in data:
        return jsonify({'error': 'Name is required'}), 400
    
    new_player = Player(name=data['name'], handicap=data.get('handicap'))
    db.session.add(new_player)
    db.session.commit()
    return jsonify(new_player.to_dict()), 201

@app.route('/players/<int:player_id>', methods=['PUT'])
def update_player(player_id):
    player = Player.query.get_or_404(player_id)
    data = request.get_json()
    
    if 'name' in data:
        player.name = data['name']
    if 'handicap' in data:
        player.handicap = data['handicap']
    
    db.session.commit()
    return jsonify(player.to_dict())

@app.route('/players/<int:player_id>', methods=['DELETE'])
def delete_player(player_id):
    player = Player.query.get_or_404(player_id)
    db.session.delete(player)
    db.session.commit()
    return '', 204

class Tournament(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), unique=True, nullable=False)
    date = db.Column(db.String(80), nullable=True) # Storing date as string for simplicity
    location = db.Column(db.String(120), nullable=True)
    players = db.relationship('Player', secondary=tournament_players, backref=db.backref('tournaments', lazy='dynamic'))
    courses = db.relationship('Course', secondary=tournament_courses, backref=db.backref('tournaments', lazy='dynamic'))

    def __repr__(self):
        return '<Tournament %r>' % self.name

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'date': self.date,
            'location': self.location,
            'players': [player.to_dict() for player in self.players],
            'courses': [{'id': c.id, 'name': c.name, 'country': c.country, 'slope_rating': c.slope_rating, 'hole_pars': c.hole_pars, 'hole_stroke_indices': c.hole_stroke_indices, 'sequence_number': db.session.query(tournament_courses.c.sequence_number).filter_by(tournament_id=self.id, course_id=c.id).scalar()} for c in self.courses]
        }

# Tournament API Endpoints
@app.route('/tournaments', methods=['GET'])
def get_tournaments():
    tournaments = Tournament.query.all()
    return jsonify([tournament.to_dict() for tournament in tournaments])

@app.route('/tournaments/<int:tournament_id>', methods=['GET'])
def get_tournament(tournament_id):
    tournament = Tournament.query.get_or_404(tournament_id)
    return jsonify(tournament.to_dict())

@app.route('/tournaments', methods=['POST'])
def add_tournament():
    data = request.get_json()
    if not data or not 'name' in data:
        return jsonify({'error': 'Tournament name is required'}), 400
    
    new_tournament = Tournament(
        name=data['name'],
        date=data.get('date'),
        location=data.get('location')
    )
    db.session.add(new_tournament)
    db.session.commit()
    return jsonify(new_tournament.to_dict()), 201

@app.route('/tournaments/<int:tournament_id>', methods=['PUT'])
def update_tournament(tournament_id):
    tournament = Tournament.query.get_or_404(tournament_id)
    data = request.get_json()
    
    if 'name' in data:
        tournament.name = data['name']
    if 'date' in data:
        tournament.date = data['date']
    if 'location' in data:
        tournament.location = data['location']
    
    db.session.commit()
    return jsonify(tournament.to_dict())

@app.route('/tournaments/<int:tournament_id>', methods=['DELETE'])
def delete_tournament(tournament_id):
    tournament = Tournament.query.get_or_404(tournament_id)
    db.session.delete(tournament)
    db.session.commit()
    return '', 204

@app.route('/tournaments/<int:tournament_id>/players', methods=['POST'])
def add_players_to_tournament(tournament_id):
    tournament = Tournament.query.get_or_404(tournament_id)
    data = request.get_json()
    player_ids = data.get('player_ids', [])

    for player_id in player_ids:
        player = Player.query.get(player_id)
        if player and player not in tournament.players:
            tournament.players.append(player)
    db.session.commit()
    return jsonify(tournament.to_dict()), 200

@app.route('/tournaments/<int:tournament_id>/players', methods=['DELETE'])
def remove_players_from_tournament(tournament_id):
    tournament = Tournament.query.get_or_404(tournament_id)
    data = request.get_json()
    player_ids = data.get('player_ids', [])

    for player_id in player_ids:
        player = Player.query.get(player_id)
        if player and player in tournament.players:
            tournament.players.remove(player)
    db.session.commit()
    return jsonify(tournament.to_dict()), 200

    db.session.commit()
    return jsonify(tournament.to_dict()), 200

# Tournament Course Management Endpoints
@app.route('/tournaments/<int:tournament_id>/courses', methods=['POST'])
def add_courses_to_tournament(tournament_id):
    tournament = Tournament.query.get_or_404(tournament_id)
    data = request.get_json()
    courses_data = data.get('courses', [])

    for course_item in courses_data:
        course_id = course_item.get('id')
        sequence_number = course_item.get('sequence_number')
        course = Course.query.get(course_id)
        if course and course not in tournament.courses:
            # Create a new entry in the association table with sequence_number
            stmt = tournament_courses.insert().values(
                tournament_id=tournament.id,
                course_id=course.id,
                sequence_number=sequence_number
            )
            db.session.execute(stmt)
    db.session.commit()
    return jsonify(tournament.to_dict()), 200

@app.route('/tournaments/<int:tournament_id>/courses', methods=['DELETE'])
def remove_courses_from_tournament(tournament_id):
    tournament = Tournament.query.get_or_404(tournament_id)
    data = request.get_json()
    course_ids = data.get('course_ids', [])

    for course_id in course_ids:
        # Delete directly from the association table
        stmt = tournament_courses.delete().where(
            (tournament_courses.c.tournament_id == tournament.id) &
            (tournament_courses.c.course_id == course_id)
        )
        db.session.execute(stmt)
    db.session.commit()
    return jsonify(tournament.to_dict()), 200

# Course API Endpoints (new)
@app.route('/courses', methods=['GET'])
def get_courses():
    courses = Course.query.all()
    return jsonify([course.to_dict() for course in courses])

@app.route('/courses/<int:course_id>', methods=['GET'])
def get_course(course_id):
    course = Course.query.get_or_404(course_id)
    return jsonify(course.to_dict())

@app.route('/courses', methods=['POST'])
def add_course():
    data = request.get_json()
    if not data or not 'name' in data:
        return jsonify({'error': 'Course name is required'}), 400
    
    new_course = Course(
        name=data['name'],
        country=data.get('country'),
        slope_rating=data.get('slope_rating'),
        hole_pars=json.dumps(data.get('hole_pars', [])),
        hole_stroke_indices=json.dumps(data.get('hole_stroke_indices', []))
    )
    db.session.add(new_course)
    db.session.commit()
    return jsonify(new_course.to_dict()), 201

@app.route('/courses/<int:course_id>', methods=['PUT'])
def update_course(course_id):
    course = Course.query.get_or_404(course_id)
    data = request.get_json()
    
    if 'name' in data:
        course.name = data['name']
    if 'country' in data:
        course.country = data['country']
    if 'slope_rating' in data:
        course.slope_rating = data['slope_rating']
    if 'hole_pars' in data:
        course.hole_pars = json.dumps(data['hole_pars'])
    if 'hole_stroke_indices' in data:
        course.hole_stroke_indices = json.dumps(data['hole_stroke_indices'])
    
    db.session.commit()
    return jsonify(course.to_dict())

@app.route('/courses/<int:course_id>', methods=['DELETE'])
def delete_course(course_id):
    course = Course.query.get_or_404(course_id)
    db.session.delete(course)
    db.session.commit()
    return '', 204

if __name__ == '__main__':
    app.run(debug=True)