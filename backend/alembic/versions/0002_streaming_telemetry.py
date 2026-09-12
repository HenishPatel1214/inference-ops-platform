"""add streaming telemetry

Revision ID: 0002_streaming_telemetry
Revises: 0001_initial_schema
Create Date: 2026-09-11
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0002_streaming_telemetry"
down_revision: str | None = "0001_initial_schema"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "inference_requests",
        sa.Column("upstream_model_name", sa.String(length=160), nullable=True),
    )
    op.add_column(
        "inference_requests",
        sa.Column("is_streaming", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.add_column(
        "inference_requests",
        sa.Column("time_to_first_token_ms", sa.Float(), nullable=True),
    )
    op.add_column(
        "inference_requests",
        sa.Column("tokens_per_second", sa.Float(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("inference_requests", "tokens_per_second")
    op.drop_column("inference_requests", "time_to_first_token_ms")
    op.drop_column("inference_requests", "is_streaming")
    op.drop_column("inference_requests", "upstream_model_name")
