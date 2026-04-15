from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app.routers import interactions, chat
import app.models  # noqa: F401 – ensure models are registered

# Create tables on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="HCP CRM AI API",
    description="AI-first CRM for Healthcare Professional interaction management",
    version="1.0.0",
)

# CORS – allow frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routes directly at root to match spec:
# POST /log-interaction, POST /edit-interaction, GET /interactions, POST /chat
app.include_router(interactions.router, prefix="")
app.include_router(chat.router, prefix="")


@app.get("/")
def root():
    return {"message": "HCP CRM AI API is running 🚀"}
