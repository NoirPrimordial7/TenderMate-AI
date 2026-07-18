from fastapi import FastAPI
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from starlette.requests import Request

from app.api.v1.routes import auth, billing, health, launch, tender_questions, tenders, uploads
from app.core.config import get_settings

settings = get_settings()
SERVICE_UNAVAILABLE_MESSAGE = "Backend temporarily unavailable. Please try again in a moment."

app = FastAPI(
    title=settings.project_name,
    version="0.1.0",
    description="Backend foundation for NividaIQ."
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def private_api_cache_headers(request: Request, call_next):
    response = await call_next(request)
    if request.url.path.startswith(settings.api_v1_prefix):
        sensitive = any(part in request.url.path for part in ("/source", "/questions", "/auth", "/billing"))
        response.headers.setdefault("Cache-Control", "private, no-store" if sensitive else "private, max-age=0, must-revalidate")
        response.headers.setdefault("Vary", "Authorization")
    return response


@app.exception_handler(RuntimeError)
def runtime_error_handler(_request, _exc: RuntimeError) -> JSONResponse:
    return JSONResponse(
        status_code=503,
        content={"detail": SERVICE_UNAVAILABLE_MESSAGE},
    )


@app.get("/")
def root() -> dict[str, str]:
    return {
        "service": "NividaIQ Backend",
        "status": "running",
        "docs": "/docs",
        "health": "/health",
    }


app.include_router(health.router)
app.include_router(auth.router, prefix=settings.api_v1_prefix)
app.include_router(billing.router, prefix=settings.api_v1_prefix)
app.include_router(uploads.router, prefix=settings.api_v1_prefix)
app.include_router(tenders.router, prefix=settings.api_v1_prefix)
app.include_router(tender_questions.router, prefix=settings.api_v1_prefix)
app.include_router(launch.router, prefix=settings.api_v1_prefix)
