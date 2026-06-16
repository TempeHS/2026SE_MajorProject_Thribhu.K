import os
import socket
from logging import Logger
from urllib.parse import urlparse

from sqlmodel import Session, SQLModel, create_engine, text
from settings import DATABASE_PATH, PRODUCTION, env_flag


def _sqlite_database_url() -> str:
    return f"sqlite:///{DATABASE_PATH}"


def _is_placeholder_database_url(database_url: str) -> bool:
    return database_url.strip() in {
        "",
        "your-postgres-database",
        "postgresql://user:password@localhost:5432/database",
    }


def _local_postgres_is_unreachable(database_url: str) -> bool:
    parsed = urlparse(database_url)
    if parsed.scheme not in {"postgres", "postgresql", "postgresql+psycopg2"}:
        return False
    if parsed.hostname not in {"localhost", "127.0.0.1", "::1"}:
        return False

    try:
        with socket.create_connection((parsed.hostname, parsed.port or 5432), timeout=1):
            return False
    except OSError:
        return True


def _configured_database_url() -> str:
    database_url = os.getenv("DATABASE_URL", "").strip()
    if PRODUCTION and (not database_url or _is_placeholder_database_url(database_url)):
        raise RuntimeError("DATABASE_URL must be set when PRODUCTION=1")

    if not database_url or _is_placeholder_database_url(database_url):
        return _sqlite_database_url()

    if not PRODUCTION and _local_postgres_is_unreachable(database_url):
        print(
            "DATABASE_URL points to local PostgreSQL, but it is not reachable. "
            f"Using SQLite at {DATABASE_PATH} for local development."
        )
        return _sqlite_database_url()

    return database_url


DATABASE_URL = _configured_database_url()
if PRODUCTION and not DATABASE_URL:
    raise RuntimeError("DATABASE_URL must be set when PRODUCTION=1")

DATABASE_ECHO = False if PRODUCTION else env_flag("DATABASE_ECHO", False)

engine = create_engine(DATABASE_URL, echo=DATABASE_ECHO)

if env_flag("DATABASE_PRINT_VERSION", False) and not PRODUCTION:
    with engine.connect() as conn:
        result = conn.execute(text("SELECT version();"))
        for row in result:
            print(row)


def prepare(log: Logger) -> None:
    log.info(
        "Connecting to database: "
        f"{engine.url.render_as_string(hide_password=True)}"
    )
    SQLModel.metadata.create_all(engine)
    log.info("All tables created / verified")


def get_session() -> Session:
    """Create a new database session."""
    return Session(engine)
