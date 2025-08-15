"""Add is_finalized column to round table (manual)

Revision ID: 85f484d6113c
Revises: d62af2711254
Create Date: 2025-08-10 13:56:00.658377

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '85f484d6113c'
down_revision: Union[str, Sequence[str], None] = 'd62af2711254'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('round', sa.Column('is_finalized', sa.Boolean(), nullable=True))
    op.execute('UPDATE `round` SET is_finalized = FALSE')
    op.alter_column('round', 'is_finalized',
               existing_type=sa.Boolean(),
               nullable=False,
               existing_nullable=True)


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table('round') as batch_op:
        batch_op.drop_column('is_finalized')
