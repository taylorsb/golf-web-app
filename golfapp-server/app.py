# Another non-functional change to trigger workflow (25)
from flask import Flask, request, jsonify
# Another non-functional change to trigger workflow (24)
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from flask_migrate import Migrate # Import Migrate
import os
import json # Import json module
from datetime import date
from sqlalchemy.orm import joinedload
from sqlalchemy import func

app = Flask(__name__)
if os.path.exists('/run/secrets/azure-mysql-connection-string'):
    with open('/run/secrets/azure-mysql-connection-string', 'r') as f:
        database_url = f.read().strip()
    app.config['SQLALCHEMY_DATABASE_URI'] = database_url.replace('mysql://', 'mysql+pymysql://')
    app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {'connect_args': {'ssl': {'ca': os.path.join(os.path.dirname(os.path.abspath(__file__)), 'combined-ca-certificates.pem')}}}
else:
    app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'sqlite:///C:/Users/simon/golf-web-app/golfapp-server/instance/golf.db')

app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)
migrate = Migrate(app, db) # Initialize Migrate
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
    db.Column('sequence_number', db.Integer, nullable=False, default=0, primary_key=True)
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
        courses_data = []
        # Query the association table directly to get courses with their sequence numbers
        course_associations = db.session.query(tournament_courses).filter_by(tournament_id=self.id).all()
        for assoc in course_associations:
            course = Course.query.get(assoc.course_id)
            if course:
                course_dict = course.to_dict()
                course_dict['sequence_number'] = assoc.sequence_number
                courses_data.append(course_dict)

        return {
            'id': self.id,
            'name': self.name,
            'date': self.date,
            'location': self.location,
            'players': [player.to_dict() for player in self.players],
            'courses': courses_data
        }

class Round(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    tournament_id = db.Column(db.Integer, db.ForeignKey('tournament.id'), nullable=False)
    player_id = db.Column(db.Integer, db.ForeignKey('player.id'), nullable=False)
    course_id = db.Column(db.Integer, db.ForeignKey('course.id'), nullable=False)
    round_number = db.Column(db.Integer, nullable=False)
    date_played = db.Column(db.String(80), nullable=False) # Storing date as string
    player_handicap_index = db.Column(db.Float, nullable=True)
    player_playing_handicap = db.Column(db.Integer, nullable=True)
    is_finalized = db.Column(db.Boolean, default=False, nullable=False)

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
    hole_scores = db.relationship('HoleScore', backref='round', lazy=False, cascade="all, delete-orphan")

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
            'player_handicap_index': self.player_handicap_index,
            'player_playing_handicap': self.player_playing_handicap,
            'is_finalized': self.is_finalized, # New field
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

# Course API Endpoints
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
@app.route('/tournaments/<int:tournament_id>/courses', methods=['GET'])
def get_courses_for_tournament(tournament_id):
    print(f"Fetching courses for tournament_id: {tournament_id}")
    tournament = Tournament.query.get_or_404(tournament_id)
    # Order courses by sequence_number
    courses_with_sequence = (db.session.query(Course, tournament_courses.c.sequence_number)
                                .join(tournament_courses)
                                .filter(tournament_courses.c.tournament_id == tournament_id)
                                .order_by(tournament_courses.c.sequence_number).all())

    result = []
    for course, sequence_number in courses_with_sequence:
        course_dict = course.to_dict()
        course_dict['sequence_number'] = sequence_number
        result.append(course_dict)
    print(f"Returning courses: {result}")
    return jsonify(result)

@app.route('/tournaments/<int:tournament_id>/courses', methods=['POST'])
def add_courses_to_tournament(tournament_id):
    tournament = Tournament.query.get_or_404(tournament_id)
    data = request.get_json()
    courses_data = data.get('courses', [])

    for course_item in courses_data:
        course_id = course_item.get('id')
        sequence_number = course_item.get('sequence_number')
        course = Course.query.get(course_id)
        if course:
            # Create a new entry in the association table with sequence_number
            stmt = tournament_courses.insert().values(
                tournament_id=tournament.id,
                course_id=course.id,
                sequence_number=sequence_number
            )
            try:
                db.session.execute(stmt)
            except Exception as e:
                db.session.rollback()
                print(f"Error adding course {course_id} with sequence {sequence_number}: {e}")
                # Optionally, return an error to the frontend here if needed
                continue # Skip to the next course_item
    db.session.commit()
    return jsonify(tournament.to_dict()), 200

@app.route('/tournaments/<int:tournament_id>/courses', methods=['DELETE'])
def remove_courses_from_tournament(tournament_id):
    tournament = Tournament.query.get_or_404(tournament_id)
    data = request.get_json()
    courses_to_remove = data.get('courses', [])

    for course_item in courses_to_remove:
        course_id = course_item.get('id')
        sequence_number = course_item.get('sequence_number')
        # Delete directly from the association table
        stmt = tournament_courses.delete().where(
            (tournament_courses.c.tournament_id == tournament.id) &
            (tournament_courses.c.course_id == course_id) &
            (tournament_courses.c.sequence_number == sequence_number)
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

@app.route('/rounds', methods=['GET'])
def get_rounds():
    tournament_id = request.args.get('tournament_id', type=int)
    player_id = request.args.get('player_id', type=int)
    course_id = request.args.get('course_id', type=int)
    sequence_number = request.args.get('sequence_number', type=int)
    player_id_str = request.args.get('player_ids')

    from sqlalchemy.orm import joinedload
    query = Round.query.options(joinedload(Round.hole_scores))

    if tournament_id:
        query = query.filter_by(tournament_id=tournament_id)
    if player_id:
        query = query.filter_by(player_id=player_id)
    if course_id:
        query = query.filter_by(course_id=course_id)
    if sequence_number:
        query = query.filter_by(round_number=sequence_number)
    if player_id_str:
        player_ids = [int(pid) for pid in player_id_str.split(',')]
        query = query.filter(Round.player_id.in_(player_ids))

    rounds = query.all()
    # Add print statements for debugging
    for r in rounds:
        print(f"Round ID: {r.id}, Player Handicap Index: {r.player_handicap_index}, Player Playing Handicap: {r.player_playing_handicap}")
    return jsonify([r.to_dict() for r in rounds])

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

    # Initialize summary variables
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
        handicap_strokes_for_this_hole = calculate_hole_handicap_strokes(round_data.player_playing_handicap, hole_stroke_index)
        nett_score = gross_score - handicap_strokes_for_this_hole

        # Calculate Stableford points for the hole
        stableford_points = calculate_stableford_points(hole_par, round_data.player_playing_handicap, hole_stroke_index, gross_score)

        # Check if HoleScore already exists for this round and hole number
        existing_hole_score = HoleScore.query.filter_by(round_id=round_id, hole_number=hole_number).first()

        if existing_hole_score:
            # Update existing score
            existing_hole_score.gross_score = gross_score
            existing_hole_score.nett_score = nett_score
            existing_hole_score.stableford_points = stableford_points
            db.session.add(existing_hole_score) # Re-add to session for update
        else:
            # Create new score
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

@app.route('/rounds/<int:round_id>/scores', methods=['GET'])
def get_hole_scores_for_round(round_id):
    hole_scores = HoleScore.query.filter_by(round_id=round_id).all()
    return jsonify([score.to_dict() for score in hole_scores])

@app.route('/initiate_round', methods=['POST'])
def initiate_round():
    data = request.get_json()
    tournament_id = data.get('tournament_id')
    course_id = data.get('course_id')
    sequence_number = data.get('sequence_number')
    players_data = data.get('players_data', [])

    if not all([tournament_id, course_id, sequence_number is not None, players_data]):
        return jsonify({'error': 'Missing tournament_id, course_id, sequence_number, or players_data'}), 400

    course = Course.query.get(course_id)
    if not course or not course.slope_rating:
        return jsonify({'error': 'Course not found or slope rating not set'}), 404

    today = date.today().isoformat()
    rounds_created = []

    for player_data in players_data:
        player_id = player_data.get('player_id')
        if not player_id:
            continue

        player = Player.query.get(player_id)
        if not player:
            # Optionally, handle cases where a player ID is invalid
            continue

        # Authoritative handicap lookup from the database
        handicap_index = player.handicap
        
        # Recalculate playing handicap on the server
        # This assumes a standard calculation. Adjust if your formula is different.
        playing_handicap = round(handicap_index * (course.slope_rating / 113)) if handicap_index is not None else None

        new_round = Round(
            tournament_id=tournament_id,
            player_id=player_id,
            course_id=course_id,
            round_number=sequence_number, # The sequence_number directly represents the round number
            date_played=today,
            player_handicap_index=handicap_index,
            player_playing_handicap=playing_handicap
        )
        db.session.add(new_round)
        db.session.flush()  # Flush to get the new_round.id for the response if needed
        rounds_created.append(new_round.to_dict())

    db.session.commit()
    return jsonify({'message': 'Rounds initiated successfully!', 'rounds': rounds_created}), 200

@app.route('/tournaments/<int:tournament_id>/rounds_summary', methods=['GET'])
def get_rounds_summary_for_tournament(tournament_id):
    # Fetch all rounds for the given tournament, eagerly loading player and course details
    rounds = Round.query.filter_by(tournament_id=tournament_id).options(
        joinedload(Round.player),
        joinedload(Round.course)
    ).all()

    rounds_data = []
    for r in rounds:
        round_dict = r.to_dict()
        # Add player and course names directly to the round dictionary for easier consumption
        round_dict['player_name'] = r.player.name if r.player else 'Unknown Player'
        round_dict['course_name'] = r.course.name if r.course else 'Unknown Course'
        rounds_data.append(round_dict)
    
    return jsonify(rounds_data)

@app.route('/tournaments/<int:tournament_id>/rounds/end', methods=['POST'])
def end_round(tournament_id):
    data = request.get_json()
    round_number_to_end = data.get('round_number')

    if round_number_to_end is None:
        return jsonify({'error': 'Round number to end is required.'}), 400

    # 1. Validation: Check if all players in the tournament have submitted scores for this round

    # Get all rounds for this tournament and the specified round_number
    rounds_for_current_number = Round.query.filter_by(
        tournament_id=tournament_id,
        round_number=round_number_to_end
    ).all()

    if not rounds_for_current_number:
        return jsonify({'error': f'No rounds found for tournament {tournament_id} and round number {round_number_to_end}.'}), 404

    # Check if all players have submitted scores (stableford_total is not None)
    for r in rounds_for_current_number:
        if r.stableford_total is None:
            return jsonify({'error': f'Scores not submitted for all players in round {round_number_to_end}. Player {r.player_id} is missing scores.'}), 400

    # 2. Handicap Calculation & Storage for next round
    players_in_tournament = Player.query.join(Tournament.players).filter(Tournament.id == tournament_id).all()
    next_round_number = round_number_to_end + 1
    today = date.today().isoformat()

    for player in players_in_tournament:
        # Get the current round entry for this player
        player_current_round = next((r for r in rounds_for_current_number if r.player_id == player.id), None)

        if player_current_round and not player_current_round.is_finalized:
            stableford_score = player_current_round.stableford_total
            current_handicap_index = player.handicap # Get player's current overall handicap

            # Calculate new handicap index
            new_handicap_index = calculate_new_handicap_index(current_handicap_index, stableford_score)

            # Update player's overall handicap
            player.handicap = new_handicap_index
            db.session.add(player) # Mark player for update

            

    # 3. Mark current round as Finalized
    for r in rounds_for_current_number:
        print(f"Before commit: Round {r.id} (Player {r.player_id}) is_finalized was {r.is_finalized}")
        r.is_finalized = True
        db.session.add(r)

    db.session.commit()
    print(f"After commit: Round {r.id} (Player {r.player_id}) is_finalized is now {r.is_finalized}")
    return jsonify({'message': f'Round {round_number_to_end} finalized and handicaps updated successfully!'}), 200

@app.route('/rounds/<int:round_id>/reopen', methods=['POST'])
def reopen_round(round_id):
    round_to_reopen = Round.query.get_or_404(round_id)
    if not round_to_reopen.is_finalized:
        return jsonify({'error': 'Round is not finalized.'}), 400

    round_to_reopen.is_finalized = False
    db.session.add(round_to_reopen)
    db.session.commit()
    return jsonify({'message': f'Round {round_id} re-opened successfully!'}), 200

@app.route('/tournaments/<int:tournament_id>/rounds/reopen_all', methods=['POST'])
def reopen_all_rounds_for_tournament(tournament_id):
    data = request.get_json()
    sequence_number = data.get('sequence_number')

    if sequence_number is None:
        return jsonify({'error': 'Sequence number is required.'}), 400

    rounds_to_reopen = Round.query.filter_by(
        tournament_id=tournament_id,
        round_number=sequence_number,
        is_finalized=True
    ).all()

    if not rounds_to_reopen:
        return jsonify({'message': 'No finalized rounds found to re-open for this tournament and sequence.'}), 200

    for r in rounds_to_reopen:
        r.is_finalized = False
        db.session.add(r)

        # Revert player's handicap to what it was at the start of this round
        player = Player.query.get(r.player_id)
        if player and r.player_handicap_index is not None:
            player.handicap = r.player_handicap_index
            db.session.add(player)

    db.session.commit()
    return jsonify({'message': f'All rounds for tournament {tournament_id}, sequence {sequence_number} re-opened successfully!'}), 200

def calculate_hole_handicap_strokes(playing_handicap, hole_stroke_index):
    handicap_strokes = 0
    if playing_handicap is not None and hole_stroke_index is not None:
        if playing_handicap > 0:
            full_rounds = playing_handicap // 18
            remaining_strokes = playing_handicap % 18
            
            handicap_strokes += full_rounds
            if hole_stroke_index <= remaining_strokes:
                handicap_strokes += 1
        elif playing_handicap < 0:
            abs_handicap = abs(playing_handicap)
            full_rounds = abs_handicap // 18
            remaining_strokes = abs_handicap % 18

            handicap_strokes -= full_rounds
            if hole_stroke_index > (18 - remaining_strokes):
                handicap_strokes -= 1
    return handicap_strokes

def calculate_stableford_points(hole_par, player_handicap, hole_stroke_index, gross_score):
    # This is a simplified Stableford calculation. 
    # Real Stableford calculation is more complex and depends on course rating, slope, etc.
    # For now, let's assume a basic calculation based on par and handicap strokes.

    handicap_strokes = 0
    if player_handicap is not None and hole_stroke_index is not None:
        if player_handicap > 0:
            # Positive handicap: strokes are added to holes based on stroke index
            full_rounds = player_handicap // 18
            remaining_strokes = player_handicap % 18
            
            handicap_strokes += full_rounds
            if hole_stroke_index <= remaining_strokes:
                handicap_strokes += 1
        elif player_handicap < 0:
            # Negative handicap: strokes are subtracted from holes based on stroke index (in reverse)
            abs_handicap = abs(player_handicap)
            full_rounds = abs_handicap // 18
            remaining_strokes = abs_handicap % 18

            handicap_strokes -= full_rounds
            # For negative handicaps, strokes are taken from the hardest holes first (highest stroke index)
            if hole_stroke_index > (18 - remaining_strokes):
                handicap_strokes -= 1

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

def calculate_new_handicap_index(current_handicap_index, stableford_score):
    # Find the adjustment value based on the stableford_score
    # This assumes a direct lookup. If interpolation or ranges are needed, this logic will be more complex.
    adjustment_entry = HandicapAdjustment.query.filter_by(stableford_score=stableford_score).first()

    if adjustment_entry:
        adjustment_value = adjustment_entry.adjustment
        new_handicap_index = round(current_handicap_index + adjustment_value, 1)
        # Ensure handicap index doesn't go below a certain minimum if applicable (e.g., 0 or -ve)
        # For now, no minimum enforced.
        return new_handicap_index
    else:
        # If no specific adjustment found for the score, return original handicap or handle as error
        # For now, return original handicap if no adjustment found
        return current_handicap_index

# New Model for Handicap Adjustments
class HandicapAdjustment(db.Model):
    stableford_score = db.Column(db.Integer, primary_key=True)
    adjustment = db.Column(db.Float, nullable=False)

    def __repr__(self):
        return f'<HandicapAdjustment {self.stableford_score}: {self.adjustment}>'

    def to_dict(self):
        return {
            'stableford_score': self.stableford_score,
            'adjustment': self.adjustment
        }

# New API Endpoints for Handicap Adjustments
@app.route('/handicap_adjustments', methods=['GET'])
def get_handicap_adjustments():
    adjustments = HandicapAdjustment.query.all()
    return jsonify([adj.to_dict() for adj in adjustments])

@app.route('/handicap_adjustments', methods=['POST'])
def add_handicap_adjustment():
    data = request.get_json()
    if not data or 'stableford_score' not in data or 'adjustment' not in data:
        return jsonify({'error': 'Stableford score and adjustment are required'}), 400

    # Check if an adjustment for this score already exists
    existing_adjustment = HandicapAdjustment.query.get(data['stableford_score'])
    if existing_adjustment:
        return jsonify({'error': 'Adjustment for this Stableford score already exists'}), 409 # Conflict

    new_adjustment = HandicapAdjustment(
        stableford_score=data['stableford_score'],
        adjustment=data['adjustment']
    )
    db.session.add(new_adjustment)
    db.session.commit()
    return jsonify(new_adjustment.to_dict()), 201

@app.route('/handicap_adjustments/<int:stableford_score>', methods=['PUT'])
def update_handicap_adjustment(stableford_score):
    adjustment = HandicapAdjustment.query.get_or_404(stableford_score)
    data = request.get_json()

    if 'adjustment' in data:
        adjustment.adjustment = data['adjustment']
    
    db.session.commit()
    return jsonify(adjustment.to_dict())

@app.route('/handicap_adjustments/<int:stableford_score>', methods=['DELETE'])
def delete_handicap_adjustment(stableford_score):
    adjustment = HandicapAdjustment.query.get_or_404(stableford_score)
    db.session.delete(adjustment)
    db.session.commit()
    return '', 204

# This is a non-functional change to trigger the workflow (revert deployment).