"""Create tables for a new deployment; never drop or seed existing data."""

from app.database.base import Base
from app.database.session import engine
from app.models import user, otp  # noqa: F401: register every table in metadata


def main() -> None:
    Base.metadata.create_all(bind=engine)
    print("Database tables initialized")


if __name__ == "__main__":
    main()
