import logging
from rest_framework.views import exception_handler
from rest_framework.response import Response

logger = logging.getLogger("django.request")

def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)

    if response is not None:
        message = ""
        if isinstance(response.data, dict):
            if "detail" in response.data:
                message = str(response.data["detail"])
            elif "message" in response.data:
                message = str(response.data["message"])
            else:
                first_key = next(iter(response.data))
                val = response.data[first_key]
                message = f"{first_key}: {val[0] if isinstance(val, list) else val}"
        elif isinstance(response.data, list):
            message = str(response.data[0])
        else:
            message = str(response.data)

        # Normalize 401 unauthenticated
        code = getattr(exc, "default_code", "ERROR").upper()
        if (
            "bearer access token" in message.lower()
            or "authentication" in message.lower()
            or "unauthenticated" in message.lower()
            or "invalid staff token" in message.lower()
        ):
            code = "UNAUTHENTICATED"
            response.status_code = 401
        elif response.status_code == 403:
            code = "FORBIDDEN"
        elif response.status_code == 404:
            code = "NOT_FOUND"
        elif response.status_code == 429:
            code = "RATE_LIMITED"

        response.data = {
            "error": {
                "code": code,
                "message": message,
            },
            "message": message,
        }
        return response

    # Handle unhandled 500 exceptions securely without leaking internal stack traces
    logger.exception("Unhandled server exception encountered: %s", exc)
    return Response(
        {
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": "An unexpected server error occurred. Please try again later.",
            },
            "message": "An unexpected server error occurred. Please try again later.",
        },
        status=500,
    )
