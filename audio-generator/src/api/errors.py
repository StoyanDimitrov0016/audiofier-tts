from __future__ import annotations

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse


async def http_exception_handler(_request: Request, error: Exception) -> JSONResponse:
    if not isinstance(error, HTTPException):
        return JSONResponse(status_code=500, content={"ok": False, "error": "Request failed."})

    detail = error.detail if isinstance(error.detail, str) else "Request failed."
    return JSONResponse(status_code=error.status_code, content={"ok": False, "error": detail})


async def validation_error_handler(_request: Request, error: Exception) -> JSONResponse:
    if not isinstance(error, RequestValidationError):
        return JSONResponse(status_code=422, content={"ok": False, "error": "Request validation failed."})

    first_error = error.errors()[0] if error.errors() else None
    message = str(first_error.get("msg", "Request validation failed.")) if first_error else "Request validation failed."
    return JSONResponse(status_code=422, content={"ok": False, "error": message})


async def value_error_handler(_request: Request, error: Exception) -> JSONResponse:
    return JSONResponse(status_code=400, content={"ok": False, "error": str(error)})


async def runtime_error_handler(_request: Request, error: Exception) -> JSONResponse:
    return JSONResponse(status_code=503, content={"ok": False, "error": str(error)})


def add_error_handlers(app: FastAPI) -> None:
    app.add_exception_handler(HTTPException, http_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_error_handler)
    app.add_exception_handler(ValueError, value_error_handler)
    app.add_exception_handler(RuntimeError, runtime_error_handler)
