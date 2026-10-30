from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

load_dotenv(Path(__file__).resolve().parent.parent.parent / ".env")

from .db import Base, engine  # noqa: E402
from .routers import auth, copilot, documents, ops  # noqa: E402

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


@app.on_event("startup")
def startup():
    Base.metadata.create_all(engine)


@app.get("/health")
def health():
    return {"ok": True}
