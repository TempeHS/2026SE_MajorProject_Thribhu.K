import os
from logging import Logger

from sqlmodel import Session, SQLModel, create_engine, text
from settings import PRODUCTION, env_flag


def _configured_database_url() -> str:
    # Support a full DATABASE_URL if provided
    database_url = os.getenv("DATABASE_URL", "").strip()
    if database_url:
        return database_url

    # Otherwise build from individual vars
    user = os.getenv("DB_USER")
    password = os.getenv("DB_PASSWORD")
    host = os.getenv("DB_HOST")
    port = os.getenv("DB_PORT", "5432")
    dbname = os.getenv("DB_NAME")

    if not all([user, password, host, dbname]):
        raise RuntimeError(
            "Database not configured. Set DATABASE_URL or DB_USER, DB_PASSWORD, DB_HOST, DB_NAME in your .env"
        )

    return f"postgresql+psycopg2://{user}:{password}@{host}:{port}/{dbname}?sslmode=require"


DATABASE_URL = _configured_database_url()
DATABASE_ECHO = False if PRODUCTION else env_flag("DATABASE_ECHO", False)

engine = create_engine(DATABASE_URL, echo=DATABASE_ECHO)


def prepare(log: Logger) -> None:
    log.info(
        "Connecting to database: "
        f"{engine.url.render_as_string(hide_password=True)}"
    )
    SQLModel.metadata.create_all(engine)
    log.info("All tables created / verified")


def get_session() -> Session:
    return Session(engine)