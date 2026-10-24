import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from app.core.config import settings
from app.api.routes import router as api_router
from app.api.auth_routes import router as auth_router
from app.db.database import init_db

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("suchnasetu")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize SQLite database tables on startup
    await init_db()
    if settings.ENVIRONMENT == "production" and settings.AUTH_SECRET_KEY == "suchnasetu-dev-insecure-secret-key-change-in-production":
        logger.warning(
            "[SECURITY CAUTION] AUTH_SECRET_KEY is using the default development key. "
            "Set a random, secure AUTH_SECRET_KEY in your production environment variables."
        )
    if settings.AUTH_EMAIL_BACKEND == "console":
        logger.info(
            "[CONFIG NOTICE] AUTH_EMAIL_BACKEND is 'console' (development mode only). "
            "No real emails will be delivered over SMTP."
        )
    yield

app = FastAPI(
    title=f"{settings.PROJECT_NAME} ({settings.HINDI_NAME}) API",
    description="PS 02 — Notice-to-Action Accessibility Assistant powered by Gemma 4",
    version=settings.VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# CSRF and Trusted-Origin Protection Middleware for state-changing requests
@app.middleware("http")
async def verify_csrf_and_origin(request: Request, call_next):
    if request.method in ("POST", "PUT", "DELETE", "PATCH"):
        origin = request.headers.get("origin")
        if origin:
            trusted_origins = {o.rstrip("/") for o in settings.CORS_ORIGINS}
            if settings.AUTH_PUBLIC_APP_URL:
                trusted_origins.add(settings.AUTH_PUBLIC_APP_URL.rstrip("/"))
            trusted_origins.add("http://testserver")
            trusted_origins.add("https://testserver")

            if origin.rstrip("/") not in trusted_origins:
                logger.warning(f"Blocked state-changing request from untrusted origin: {origin}")
                return JSONResponse(
                    status_code=403,
                    content={"detail": "Untrusted request origin / CSRF verification failed."}
                )

    return await call_next(request)

# Global Exception Handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception on {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal server error occurred. Please try again."}
    )

# Include API routes
app.include_router(api_router, prefix=settings.API_PREFIX)
app.include_router(auth_router, prefix=settings.API_PREFIX)

@app.get("/")
def root():
    return {
        "project": settings.PROJECT_NAME,
        "hindi_name": settings.HINDI_NAME,
        "tagline": "From Complex Notices to Clear Next Steps.",
        "track": "Track 1: Best Use of Gemma 4",
        "problem_statement": "PS 02 — Notice-to-Action Accessibility Assistant",
        "status": "online",
        "docs": "/docs",
        "health": f"{settings.API_PREFIX}/health"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
