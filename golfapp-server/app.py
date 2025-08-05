from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
import os

app = Flask(__name__)
CORS(app) # Enable CORS for all routes
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///golf.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

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

# Create database tables
with app.app_context():
    db.create_all()

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

if __name__ == '__main__':
    app.run(debug=True)
