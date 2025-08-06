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

    def __repr__(self):
        return '<Tournament %r>' % self.name

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'date': self.date,
            'location': self.location
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