"""Initial schema - Social Network + Chat + Call

Revision ID: 001
Revises:
Create Date: 2024-01-01 00:00:00
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── pgcrypto extension ────────────────────────────────────────────────
    op.execute('CREATE EXTENSION IF NOT EXISTS "pgcrypto"')

    # ── users ─────────────────────────────────────────────────────────────
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("username", sa.String(50), nullable=False, unique=True),
        sa.Column("email", sa.String(100), nullable=False, unique=True),
        sa.Column("password_hash", sa.Text, nullable=False),
        sa.Column("full_name", sa.String(100)),
        sa.Column("avatar_url", sa.Text),
        sa.Column("bio", sa.Text),
        sa.Column("role", sa.String(20), server_default="user"),
        sa.Column("is_active", sa.Boolean, server_default="true"),
        sa.Column("created_at", sa.DateTime, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.DateTime),
        sa.Column("deleted_at", sa.DateTime),
    )

    # ── follows ───────────────────────────────────────────────────────────
    op.create_table(
        "follows",
        sa.Column("follower_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("following_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("created_at", sa.DateTime, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.CheckConstraint("follower_id <> following_id", name="no_self_follow"),
    )

    # ── posts ─────────────────────────────────────────────────────────────
    op.create_table(
        "posts",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("content", sa.Text),
        sa.Column("media_url", sa.Text),
        sa.Column("visibility", sa.String(20), server_default="public"),
        sa.Column("created_at", sa.DateTime, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.DateTime),
        sa.Column("deleted_at", sa.DateTime),
    )

    # ── comments ──────────────────────────────────────────────────────────
    op.create_table(
        "comments",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("post_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("posts.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("content", sa.Text),
        sa.Column("created_at", sa.DateTime, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.DateTime),
        sa.Column("deleted_at", sa.DateTime),
    )

    # ── likes ─────────────────────────────────────────────────────────────
    op.create_table(
        "likes",
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("post_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("posts.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("created_at", sa.DateTime, server_default=sa.text("CURRENT_TIMESTAMP")),
    )

    # ── media_files ───────────────────────────────────────────────────────
    op.create_table(
        "media_files",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("uploader_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id")),
        sa.Column("file_url", sa.Text),
        sa.Column("file_type", sa.String(20)),
        sa.Column("created_at", sa.DateTime, server_default=sa.text("CURRENT_TIMESTAMP")),
    )

    # ── conversations ─────────────────────────────────────────────────────
    op.create_table(
        "conversations",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("name", sa.String(100)),
        sa.Column("type", sa.String(20), server_default="private"),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id")),
        sa.Column("last_message_id", postgresql.UUID(as_uuid=True)),
        sa.Column("created_at", sa.DateTime, server_default=sa.text("CURRENT_TIMESTAMP")),
    )

    # ── conversation_members ──────────────────────────────────────────────
    op.create_table(
        "conversation_members",
        sa.Column("conversation_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("conversations.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("role", sa.String(20), server_default="member"),
        sa.Column("last_seen_message_id", postgresql.UUID(as_uuid=True)),
        
        # THÊM DÒNG NÀY VÀO ĐÂY
        sa.Column("is_accepted", sa.Boolean, server_default="false"), 
        
        sa.Column("joined_at", sa.DateTime, server_default=sa.text("CURRENT_TIMESTAMP")),
    )

    # ── messages ──────────────────────────────────────────────────────────
    op.create_table(
        "messages",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("conversation_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("sender_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id")),
        sa.Column("content", sa.Text),
        sa.Column("media_url", sa.Text),
        sa.Column("message_type", sa.String(20), server_default="text"),
        sa.Column("created_at", sa.DateTime, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("edited_at", sa.DateTime),
        sa.Column("deleted_at", sa.DateTime),
    )

    # ── message_status ────────────────────────────────────────────────────
    op.create_table(
        "message_status",
        sa.Column("message_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("messages.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("status", sa.String(20), server_default="sent"),
        sa.Column("seen_at", sa.DateTime),
    )

    # ── message_reactions ─────────────────────────────────────────────────
    op.create_table(
        "message_reactions",
        sa.Column("message_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("messages.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("reaction", sa.String(20), nullable=False),
        sa.Column("created_at", sa.DateTime, server_default=sa.text("CURRENT_TIMESTAMP")),
    )

    # ── call_sessions ─────────────────────────────────────────────────────
    op.create_table(
        "call_sessions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("conversation_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("conversations.id")),
        sa.Column("started_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id")),
        sa.Column("call_type", sa.String(20)),
        sa.Column("started_at", sa.DateTime, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("ended_at", sa.DateTime),
    )

    # ── call_participants ─────────────────────────────────────────────────
    op.create_table(
        "call_participants",
        sa.Column("call_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("call_sessions.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), primary_key=True),
        sa.Column("joined_at", sa.DateTime),
        sa.Column("left_at", sa.DateTime),
    )

    # ── notifications ─────────────────────────────────────────────────────
    op.create_table(
        "notifications",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id")),
        sa.Column("type", sa.String(50)),
        sa.Column("reference_id", postgresql.UUID(as_uuid=True)),
        sa.Column("is_read", sa.Boolean, server_default="false"),
        sa.Column("created_at", sa.DateTime, server_default=sa.text("CURRENT_TIMESTAMP")),
    )

    # ── user_interactions ─────────────────────────────────────────────────
    op.create_table(
        "user_interactions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id")),
        sa.Column("post_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("posts.id")),
        sa.Column("action_type", sa.String(20)),
        sa.Column("created_at", sa.DateTime, server_default=sa.text("CURRENT_TIMESTAMP")),
    )

    # ── refresh_tokens ────────────────────────────────────────────────────
    op.create_table(
        "refresh_tokens",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id")),
        sa.Column("token", sa.Text, nullable=False, unique=True),
        sa.Column("expires_at", sa.DateTime, nullable=False),
        sa.Column("created_at", sa.DateTime, server_default=sa.text("CURRENT_TIMESTAMP")),
    )

    # ── blocked_users ─────────────────────────────────────────────────────
    op.create_table(
        "blocked_users",
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("blocked_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("created_at", sa.DateTime, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.CheckConstraint("user_id <> blocked_user_id", name="no_self_block"),
    )

    # ── reports ───────────────────────────────────────────────────────────
    op.create_table(
        "reports",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("reporter_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id")),
        sa.Column("target_type", sa.String(20)),
        sa.Column("target_id", postgresql.UUID(as_uuid=True)),
        sa.Column("reason", sa.Text),
        sa.Column("created_at", sa.DateTime, server_default=sa.text("CURRENT_TIMESTAMP")),
    )

    # ── saved_posts ───────────────────────────────────────────────────────
    op.create_table(
        "saved_posts",
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("post_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("posts.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("created_at", sa.DateTime, server_default=sa.text("CURRENT_TIMESTAMP")),
    )

    # ── typing_status ─────────────────────────────────────────────────────
    op.create_table(
        "typing_status",
        sa.Column("conversation_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("conversations.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("is_typing", sa.Boolean),
        sa.Column("updated_at", sa.DateTime, server_default=sa.text("CURRENT_TIMESTAMP")),
    )

    # ── indexes ───────────────────────────────────────────────────────────
    op.create_index("idx_posts_user_id", "posts", ["user_id"])
    op.create_index("idx_comments_post_id", "comments", ["post_id"])
    op.create_index("idx_messages_conversation_id", "messages", ["conversation_id"])
    op.create_index("idx_notifications_user_id", "notifications", ["user_id"])
    op.create_index("idx_user_interactions_user_id", "user_interactions", ["user_id"])
    op.create_index("idx_messages_sender_id", "messages", ["sender_id"])
    op.create_index("idx_posts_created_at", "posts", ["created_at"])
    op.create_index("idx_messages_created_at", "messages", ["created_at"])
    op.create_index("idx_follows_following", "follows", ["following_id"])
    op.create_index(
        "idx_posts_not_deleted", "posts", ["user_id"],
        postgresql_where=sa.text("deleted_at IS NULL")
    )
    op.create_index(
        "idx_comments_not_deleted", "comments", ["post_id"],
        postgresql_where=sa.text("deleted_at IS NULL")
    )
    op.create_index(
        "idx_messages_not_deleted", "messages", ["conversation_id"],
        postgresql_where=sa.text("deleted_at IS NULL")
    )


def downgrade() -> None:
    # Drop indexes
    op.drop_index("idx_messages_not_deleted", table_name="messages")
    op.drop_index("idx_comments_not_deleted", table_name="comments")
    op.drop_index("idx_posts_not_deleted", table_name="posts")
    op.drop_index("idx_follows_following", table_name="follows")
    op.drop_index("idx_messages_created_at", table_name="messages")
    op.drop_index("idx_posts_created_at", table_name="posts")
    op.drop_index("idx_messages_sender_id", table_name="messages")
    op.drop_index("idx_user_interactions_user_id", table_name="user_interactions")
    op.drop_index("idx_notifications_user_id", table_name="notifications")
    op.drop_index("idx_messages_conversation_id", table_name="messages")
    op.drop_index("idx_comments_post_id", table_name="comments")
    op.drop_index("idx_posts_user_id", table_name="posts")

    # Drop tables in reverse dependency order
    op.drop_table("typing_status")
    op.drop_table("saved_posts")
    op.drop_table("reports")
    op.drop_table("blocked_users")
    op.drop_table("refresh_tokens")
    op.drop_table("user_interactions")
    op.drop_table("notifications")
    op.drop_table("call_participants")
    op.drop_table("call_sessions")
    op.drop_table("message_reactions")
    op.drop_table("message_status")
    op.drop_table("messages")
    op.drop_table("conversation_members")
    op.drop_table("conversations")
    op.drop_table("media_files")
    op.drop_table("likes")
    op.drop_table("comments")
    op.drop_table("posts")
    op.drop_table("follows")
    op.drop_table("users")