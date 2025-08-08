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

class Round(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    tournament_id = db.Column(db.Integer, db.ForeignKey('tournament.id'), nullable=False)
    player_id = db.Column(db.Integer, db.ForeignKey('player.id'), nullable=False)
    course_id = db.Column(db.Integer, db.ForeignKey('course.id'), nullable=False)
    round_number = db.Column(db.Integer, nullable=False)
    date_played = db.Column(db.String(80), nullable=False) # Storing date as string

    # Summary scores
    gross_score_front_9 = db.Column(db.Integer, nullable=True)
    nett_score_front_9 = db.Column(db.Integer, nullable=True)
    stableford_front_9 = db.Column(db.Integer, nullable=True)
    gross_score_back_9 = db.Column(db.Integer, nullable=True)
    nett_score_back_9 = db.Column(db.Integer, nullable=True)
    stableford_back_9 = db.Column(db.Integer, nullable=True)
    gross_score_total = db.Column(db.Integer, nullable=True)
    nett_score_total = db.Column(db.Integer, nullable=True)
    stableford_total = db.Column(db.Integer, nullable=True)

    tournament = db.relationship('Tournament', backref=db.backref('rounds', lazy=True))
    player = db.relationship('Player', backref=db.backref('rounds', lazy=True))
    course = db.relationship('Course', backref=db.backref('rounds', lazy=True))
    hole_scores = db.relationship('HoleScore', backref='round', lazy=True, cascade="all, delete-orphan")

    def to_dict(self):
        return {
            'id': self.id,
            'tournament_id': self.tournament_id,
            'player_id': self.player_id,
            'course_id': self.course_id,
            'round_number': self.round_number,
            'date_played': self.date_played,
            'gross_score_front_9': self.gross_score_front_9,
            'nett_score_front_9': self.nett_score_front_9,
            'stableford_front_9': self.stableford_front_9,
            'gross_score_back_9': self.gross_score_back_9,
            'nett_score_back_9': self.nett_score_back_9,
            'stableford_back_9': self.stableford_back_9,
            'gross_score_total': self.gross_score_total,
            'nett_score_total': self.nett_score_total,
            'stableford_total': self.stableford_total,
            'hole_scores': [score.to_dict() for score in self.hole_scores]
        }

class HoleScore(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    round_id = db.Column(db.Integer, db.ForeignKey('round.id'), nullable=False)
    hole_number = db.Column(db.Integer, nullable=False)
    gross_score = db.Column(db.Integer, nullable=False)
    nett_score = db.Column(db.Integer, nullable=True)
    stableford_points = db.Column(db.Integer, nullable=True)

    def to_dict(self):
        return {
            'id': self.id,
            'round_id': self.round_id,
            'hole_number': self.hole_number,
            'gross_score': self.gross_score,
            'nett_score': self.nett_score,
            'stableford_points': self.stableford_points
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

@app.route('/tournaments/<int:tournament_id>/players', methods=['GET'])
def get_players_for_tournament(tournament_id):
    tournament = Tournament.query.get_or_404(tournament_id)
    return jsonify([player.to_dict() for player in tournament.players])

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

# Course Hole Endpoints
@app.route('/courses/<int:course_id>/holes', methods=['GET'])
def get_course_holes(course_id):
    course = Course.query.get_or_404(course_id)
    hole_pars = json.loads(course.hole_pars) if course.hole_pars else []
    hole_stroke_indices = json.loads(course.hole_stroke_indices) if course.hole_stroke_indices else []

    holes = []
    for i in range(18):
        holes.append({
            'hole_number': i + 1,
            'par': hole_pars[i] if i < len(hole_pars) else None,
            'strokeIndex': hole_stroke_indices[i] if i < len(hole_stroke_indices) else None
        })
    return jsonify(holes)

# Round Management Endpoints
@app.route('/rounds', methods=['POST'])
def create_round():
    data = request.get_json()
    required_fields = ['tournament_id', 'player_id', 'course_id', 'round_number', 'date_played']
    if not all(field in data for field in required_fields):
        return jsonify({'error': 'Missing required round fields'}), 400

    new_round = Round(
        tournament_id=data['tournament_id'],
        player_id=data['player_id'],
        course_id=data['course_id'],
        round_number=data['round_number'],
        date_played=data['date_played']
    )
    db.session.add(new_round)
    db.session.commit()
    return jsonify(new_round.to_dict()), 201

@app.route('/rounds/<int:round_id>', methods=['GET'])
def get_round(round_id):
    round_data = Round.query.get_or_404(round_id)
    return jsonify(round_data.to_dict())

def calculate_stableford_points(hole_par, player_handicap, hole_stroke_index, gross_score):
    # This is a simplified Stableford calculation. 
    # Real Stableford calculation is more complex and depends on course rating, slope, etc.
    # For now, let's assume a basic calculation based on par and handicap strokes.

    # Calculate handicap strokes for this hole
    # Assuming handicap strokes are distributed based on stroke index
    # A more accurate calculation would involve player's playing handicap and course stroke indices
    handicap_strokes = 0
    if player_handicap is not None and hole_stroke_index is not None:
        # Simple distribution: 1 stroke for each point of handicap up to 18, then 2 strokes, etc.
        if player_handicap > 0 and hole_stroke_index <= player_handicap:
            handicap_strokes = 1

    adjusted_par = hole_par + handicap_strokes

    if gross_score <= adjusted_par - 2:
        return 4  # Eagle or better
    elif gross_score == adjusted_par - 1:
        return 3  # Birdie
    elif gross_score == adjusted_par:
        return 2  # Par
    elif gross_score == adjusted_par + 1:
        return 1  # Bogey
    else:
        return 0  # Double Bogey or worse

@app.route('/rounds/<int:round_id>/scores', methods=['POST'])
def record_hole_scores(round_id):
    round_data = Round.query.get_or_404(round_id)
    data = request.get_json()
    hole_scores_data = data.get('hole_scores', [])

    if len(hole_scores_data) != 18:
        return jsonify({'error': 'Exactly 18 hole scores are required.'}), 400

    player = Player.query.get(round_data.player_id)
    course = Course.query.get(round_data.course_id)

    if not player or not course:
        return jsonify({'error': 'Player or Course not found for this round.'}), 404

    hole_pars = json.loads(course.hole_pars) if course.hole_pars else []
    hole_stroke_indices = json.loads(course.hole_stroke_indices) if course.hole_stroke_indices else []

    if len(hole_pars) != 18 or len(hole_stroke_indices) != 18:
        return jsonify({'error': 'Course hole pars or stroke indices are incomplete.'}), 400

    # Clear existing hole scores for this round before adding new ones
    HoleScore.query.filter_by(round_id=round_id).delete()
    db.session.commit()

    total_gross = 0
    total_nett = 0
    total_stableford = 0
    front_9_gross = 0
    front_9_nett = 0
    front_9_stableford = 0
    back_9_gross = 0
    back_9_nett = 0
    back_9_stableford = 0

    for i, score_data in enumerate(hole_scores_data):
        hole_number = score_data.get('hole_number')
        gross_score = score_data.get('gross_score')

        if hole_number is None or gross_score is None or not (1 <= hole_number <= 18):
            return jsonify({'error': f'Invalid score data for hole {i+1}.'}), 400

        hole_par = hole_pars[hole_number - 1]
        hole_stroke_index = hole_stroke_indices[hole_number - 1]

        # Calculate nett score for the hole
        nett_score = gross_score - (player.handicap / 18 if player.handicap else 0)

        # Calculate Stableford points for the hole
        stableford_points = calculate_stableford_points(hole_par, player.handicap, hole_stroke_index, gross_score)

        new_hole_score = HoleScore(
            round_id=round_id,
            hole_number=hole_number,
            gross_score=gross_score,
            nett_score=nett_score,
            stableford_points=stableford_points
        )
        db.session.add(new_hole_score)

        # Accumulate summary scores
        total_gross += gross_score
        total_nett += nett_score
        total_stableford += stableford_points

        if hole_number <= 9:
            front_9_gross += gross_score
            front_9_nett += nett_score
            front_9_stableford += stableford_points
        else:
            back_9_gross += gross_score
            back_9_nett += nett_score
            back_9_stableford += stableford_points

    # Update round summary scores
    round_data.gross_score_front_9 = front_9_gross
    round_data.nett_score_front_9 = round(front_9_nett) # Round to nearest integer
    round_data.stableford_front_9 = front_9_stableford
    round_data.gross_score_back_9 = back_9_gross
    round_data.nett_score_back_9 = round(back_9_nett) # Round to nearest integer
    round_data.stableford_back_9 = back_9_stableford
    round_data.gross_score_total = total_gross
    round_data.nett_score_total = round(total_nett) # Round to nearest integer
    round_data.stableford_total = total_stableford

    db.session.commit()
    return jsonify(round_data.to_dict()), 200

@app.route('/submit_round', methods=['POST'])
def submit_round():
    data = request.get_json()
    tournament_id = data.get('tournament_id')
    course_id = data.get('course_id')
    players_data = data.get('players_data', [])

    if not tournament_id or not course_id or not players_data:
        return jsonify({'error': 'Missing tournament_id, course_id, or players_data'}), 400

    # Get the current date for date_played
    from datetime import date
    today = date.today().isoformat()

    # Determine the next round number for this tournament and course
    # This is a simplified approach; a more robust solution might consider rounds per player or per tournament-course combination
    existing_rounds_count = Round.query.filter_by(tournament_id=tournament_id, course_id=course_id).count()
    round_number = existing_rounds_count + 1

    for player_data in players_data:
        player_id = player_data.get('player_id')
        hole_scores = player_data.get('hole_scores', {})
        summary_scores = player_data.get('summary_scores', {})

        if not player_id:
            continue # Skip if player_id is missing

        # Create a new Round entry
        new_round = Round(
            tournament_id=tournament_id,
            player_id=player_id,
            course_id=course_id,
            round_number=round_number, # Assign the determined round number
            date_played=today,
            gross_score_front_9=summary_scores.get('front9Gross'),
            nett_score_front_9=summary_scores.get('front9Nett'),
            stableford_front_9=summary_scores.get('stablefordPoints') / 2, # Assuming stablefordPoints is total
            gross_score_back_9=summary_scores.get('back9Gross'),
            nett_score_back_9=summary_scores.get('back9Nett'),
            stableford_back_9=summary_scores.get('stablefordPoints') / 2, # Assuming stablefordPoints is total
            gross_score_total=summary_scores.get('overallGross'),
            nett_score_total=summary_scores.get('overallNett'),
            stableford_total=summary_scores.get('stablefordPoints')
        )
        db.session.add(new_round)
        db.session.flush() # Flush to get the new_round.id

        # Add individual hole scores
        for hole_number, gross_score in hole_scores.items():
            if gross_score is not None and gross_score != '':
                new_hole_score = HoleScore(
                    round_id=new_round.id,
                    hole_number=int(hole_number),
                    gross_score=int(gross_score),
                    # Nett and Stableford for individual holes are calculated on frontend
                    # and not directly passed here, so they will be null in DB for now
                )
                db.session.add(new_hole_score)

    db.session.commit()
    return jsonify({'message': 'Round scores submitted successfully!'}), 200

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