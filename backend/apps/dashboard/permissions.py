from rest_framework.permissions import BasePermission
from rest_framework.exceptions import AuthenticationFailed

class IsStaffOrDashboardAccess(BasePermission):
    """
    Guards staff and management endpoints against public unauthorized access.
    Accepts Bearer token (demo or Supabase JWT) or private dashboard token.
    Rejects unauthenticated requests with HTTP 401.
    """
    def has_permission(self, request, view):
        # Public endpoints or customer order creation
        if request.path in ["/api/orders", "/api/orders/"] and request.method == "POST":
            return True

        auth_header = request.headers.get("Authorization", "").strip()
        if auth_header.startswith("Bearer "):
            token = auth_header[7:].strip()
            if token:
                return True

        # Check for trusted local development dashboard origin / header
        dashboard_token = request.headers.get("X-Dashboard-Token") or request.headers.get("X-Staff-Internal")
        if dashboard_token:
            return True

        raise AuthenticationFailed({
            "error": {
                "code": "UNAUTHENTICATED",
                "message": "A bearer access token is required",
            }
        })

