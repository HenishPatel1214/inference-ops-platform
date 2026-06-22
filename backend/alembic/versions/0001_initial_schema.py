"""initial schema

Revision ID: 0001_initial_schema
Revises:
Create Date: 2026-06-22
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0001_initial_schema"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "user_accounts",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("display_name", sa.String(length=120), nullable=False),
        sa.Column("hashed_password", sa.String(length=255), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_user_accounts_email", "user_accounts", ["email"], unique=True)

    op.create_table(
        "inference_nodes",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("region", sa.String(length=80), nullable=False),
        sa.Column("gpu_type", sa.String(length=120), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("capacity_rps", sa.Float(), nullable=False),
        sa.Column("current_load", sa.Float(), nullable=False),
        sa.Column("last_heartbeat_at", sa.DateTime(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_inference_nodes_name", "inference_nodes", ["name"], unique=True)

    op.create_table(
        "model_deployments",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("model_name", sa.String(length=160), nullable=False),
        sa.Column("model_version", sa.String(length=80), nullable=False),
        sa.Column("runtime", sa.String(length=120), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("replicas", sa.Integer(), nullable=False),
        sa.Column("node_id", sa.Integer(), sa.ForeignKey("inference_nodes.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_model_deployments_model_name", "model_deployments", ["model_name"])

    op.create_table(
        "inference_requests",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("request_id", sa.String(length=80), nullable=False),
        sa.Column("model_name", sa.String(length=160), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("latency_ms", sa.Float(), nullable=False),
        sa.Column("prompt_tokens", sa.Integer(), nullable=False),
        sa.Column("completion_tokens", sa.Integer(), nullable=False),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("node_id", sa.Integer(), sa.ForeignKey("inference_nodes.id"), nullable=True),
        sa.Column("deployment_id", sa.Integer(), sa.ForeignKey("model_deployments.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_inference_requests_request_id", "inference_requests", ["request_id"], unique=True)
    op.create_index("ix_requests_model_created", "inference_requests", ["model_name", "created_at"])

    op.create_table(
        "latency_metrics",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("request_id", sa.Integer(), sa.ForeignKey("inference_requests.id"), nullable=False),
        sa.Column("queue_ms", sa.Float(), nullable=False),
        sa.Column("inference_ms", sa.Float(), nullable=False),
        sa.Column("total_ms", sa.Float(), nullable=False),
        sa.Column("recorded_at", sa.DateTime(), nullable=False),
    )

    op.create_table(
        "system_events",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("event_type", sa.String(length=80), nullable=False),
        sa.Column("severity", sa.String(length=32), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("node_id", sa.Integer(), sa.ForeignKey("inference_nodes.id"), nullable=True),
        sa.Column("deployment_id", sa.Integer(), sa.ForeignKey("model_deployments.id"), nullable=True),
        sa.Column("payload_json", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_events_type_created", "system_events", ["event_type", "created_at"])


def downgrade() -> None:
    op.drop_table("system_events")
    op.drop_table("latency_metrics")
    op.drop_table("inference_requests")
    op.drop_table("model_deployments")
    op.drop_table("inference_nodes")
    op.drop_table("user_accounts")
