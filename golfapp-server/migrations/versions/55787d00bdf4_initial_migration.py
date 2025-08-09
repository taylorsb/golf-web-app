"""Initial migration

Revision ID: 55787d00bdf4
Revises: 
Create Date: 2025-08-09 22:12:11.156361

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '55787d00bdf4'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table('player',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('name', sa.String(length=80), nullable=False),
    sa.Column('handicap', sa.Float(), nullable=True),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('name')
    )
    op.create_table('course',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('name', sa.String(length=120), nullable=False),
    sa.Column('country', sa.String(length=80), nullable=True),
    sa.Column('slope_rating', sa.Float(), nullable=True),
    sa.Column('hole_pars', sa.String(length=500), nullable=True),
    sa.Column('hole_stroke_indices', sa.String(length=500), nullable=True),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('name')
    )
    op.create_table('tournament',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('name', sa.String(length=120), nullable=False),
    sa.Column('date', sa.String(length=80), nullable=True),
    sa.Column('location', sa.String(length=120), nullable=True),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('name')
    )
    op.create_table('tournament_players',
    sa.Column('tournament_id', sa.Integer(), nullable=False),
    sa.Column('player_id', sa.Integer(), nullable=False),
    sa.ForeignKeyConstraint(['player_id'], ['player.id'], ),
    sa.ForeignKeyConstraint(['tournament_id'], ['tournament.id'], ),
    sa.PrimaryKeyConstraint('tournament_id', 'player_id')
    )
    op.create_table('tournament_courses',
    sa.Column('tournament_id', sa.Integer(), nullable=False),
    sa.Column('course_id', sa.Integer(), nullable=False),
    sa.Column('sequence_number', sa.Integer(), nullable=False),
    sa.ForeignKeyConstraint(['course_id'], ['course.id'], ),
    sa.ForeignKeyConstraint(['tournament_id'], ['tournament.id'], ),
    sa.PrimaryKeyConstraint('tournament_id', 'course_id', 'sequence_number')
    )
    op.create_table('round',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('tournament_id', sa.Integer(), nullable=False),
    sa.Column('player_id', sa.Integer(), nullable=False),
    sa.Column('course_id', sa.Integer(), nullable=False),
    sa.Column('round_number', sa.Integer(), nullable=False),
    sa.Column('date_played', sa.String(length=80), nullable=False),
    sa.Column('player_handicap_index', sa.Float(), nullable=True),
    sa.Column('player_playing_handicap', sa.Integer(), nullable=True),
    sa.Column('gross_score_front_9', sa.Integer(), nullable=True),
    sa.Column('nett_score_front_9', sa.Integer(), nullable=True),
    sa.Column('stableford_front_9', sa.Integer(), nullable=True),
    sa.Column('gross_score_back_9', sa.Integer(), nullable=True),
    sa.Column('nett_score_back_9', sa.Integer(), nullable=True),
    sa.Column('stableford_back_9', sa.Integer(), nullable=True),
    sa.Column('gross_score_total', sa.Integer(), nullable=True),
    sa.Column('nett_score_total', sa.Integer(), nullable=True),
    sa.Column('stableford_total', sa.Integer(), nullable=True),
    sa.ForeignKeyConstraint(['course_id'], ['course.id'], ),
    sa.ForeignKeyConstraint(['player_id'], ['player.id'], ),
    sa.ForeignKeyConstraint(['tournament_id'], ['tournament.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('hole_score',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('round_id', sa.Integer(), nullable=False),
    sa.Column('hole_number', sa.Integer(), nullable=False),
    sa.Column('gross_score', sa.Integer(), nullable=False),
    sa.Column('nett_score', sa.Integer(), nullable=True),
    sa.Column('stableford_points', sa.Integer(), nullable=True),
    sa.ForeignKeyConstraint(['round_id'], ['round.id'], ),
    sa.PrimaryKeyConstraint('id')
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('hole_score')
    op.drop_table('round')
    op.drop_table('tournament_courses')
    op.drop_table('tournament_players')
    op.drop_table('tournament')
    op.drop_table('course')
    op.drop_table('player')
