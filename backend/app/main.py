from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

load_dotenv(Path(__file__).resolve().parent.parent.parent / ".env")


from .agents.graph import setup_checkpointer  # noqa: E402
from .db import Base, engine  # noqa: E402
from .routers import auth, copilot, documents, observatory, ops, workflows  # noqa: E402

app = FastAPI(title="NEXUS OPS API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(documents.router)
app.include_router(ops.router)
app.include_router(copilot.router)
app.include_router(workflows.router)
app.include_router(observatory.router)


@app.on_event("startup")
def startup():
    if engine.dialect.name == "postgresql":
        # Alembic owns the schema on Postgres; run pending migrations at startup.
        from alembic import command
        from alembic.config import Config

        cfg = Config(Path(__file__).resolve().parent.parent / "alembic.ini")
        cfg.set_main_option("script_location", str(Path(__file__).resolve().parent.parent / "migrations"))
        command.upgrade(cfg, "head")
    Base.metadata.create_all(engine)
    setup_checkpointer()


@app.get("/health")
def health():
    return {"ok": True}
