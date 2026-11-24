"""
ArchLens Backend Entry Point
FastAPI application exposing architecture parsing, deterministic analysis, and graph statistics.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .api.routes import router as architecture_router

app = FastAPI(
    title="ArchLens API",
    version="0.1.0",
    description="Deterministic and AI-Assisted Cloud-Native Microservices Architecture Reviewer"
)

# CORS Configuration for local Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", tags=["Health"])
def health_check():
    """Liveness check confirming ArchLens API is operational."""
    return {
        "status": "ok",
        "service": "archlens-api",
        "version": "0.1.0"
    }


# Mount API routes
app.include_router(architecture_router)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
