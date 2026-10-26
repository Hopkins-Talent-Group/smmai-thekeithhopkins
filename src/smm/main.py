import subprocess
import time
import uuid

import structlog
from fastapi import FastAPI, Request
from fastapi.exceptions import HTTPException
from fastapi.responses import FileResponse, JSONResponse

app = FastAPI(title="SMM Automation API")

structlog.configure(processors=[structlog.processors.JSONRenderer()])


@app.middleware("http")
async def add_request_id(request: Request, call_next):
    request_id = str(uuid.uuid4())
    started = time.monotonic()
    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id
    response.headers["X-Process-Time"] = f"{time.monotonic() - started:.6f}"
    structlog.get_logger().info(
        "http_request",
        request_id=request_id,
        method=request.method,
        path=request.url.path,
        client_host=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent", ""),
    )
    return response


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    request_id = request.headers.get("X-Request-ID", "unknown")
    structlog.get_logger().error("http_exception", request_id=request_id, status_code=exc.status_code, path=request.url.path)
    return JSONResponse(status_code=exc.status_code, content={"error": exc.detail, "code": exc.status_code, "request_id": request_id})


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    request_id = request.headers.get("X-Request-ID", "unknown")
    structlog.get_logger().exception("unhandled_exception", request_id=request_id, path=request.url.path)
    return JSONResponse(status_code=500, content={"error": "Internal server error", "code": 500, "request_id": request_id})


@app.get("/api/health")
def health():
    checks = {"liveness": "ok"}
    try:
        result = subprocess.run(["python", "-c", "import smm"], capture_output=True, text=True, timeout=5, check=False)
        checks["readiness"] = "ok" if result.returncode == 0 else "degraded"
    except Exception:
        checks["readiness"] = "degraded"
    return {"status": "ok" if all(v == "ok" for v in checks.values()) else "degraded", "checks": checks}


@app.get("/api/platforms")
def platforms():
    from smm.integrations.contracts import capability_matrix
    return {"platforms": capability_matrix()}


@app.get("/wasm/{filename}")
def wasm_file(filename: str):
    return FileResponse(f"./smm/wasm/{filename}")


@app.post("/api/compute/engagement_rate")
def compute_engagement_rate(impressions: int, engagements: int):
    from smm.analytics.feedback import engagement_rate
    from smm.domain.models import AnalyticsSnapshot
    return {"engagement_rate": engagement_rate(AnalyticsSnapshot("test", impressions=impressions, engagements=engagements))}


@app.post("/api/compute/rank_signals")
def compute_rank_signals(payload: dict):
    from smm.research.signals import rank_signals
    result = rank_signals(payload.get("signals", []))
    return {"sorted": [{"topic": s.topic, "source": s.source, "relevance": s.relevance} for s in result]}


@app.post("/api/workflow/run")
def run_workflow(payload: dict):
    return {"received": payload}
