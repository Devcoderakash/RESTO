"""
Enterprise Security Headers Middleware for RESTO.
Enforces defense-in-depth HTTP response headers against XSS, clickjacking,
MIME sniffing, unauthorized iframe embedding, and information leakage.
"""

class SecurityHeadersMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)

        # 1. Prevent MIME-type sniffing
        response["X-Content-Type-Options"] = "nosniff"

        # 2. Prevent clickjacking / frame embedding
        response["X-Frame-Options"] = "DENY"

        # 3. Referrer Policy & Cross-Origin Resource Policy
        response["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response["Cross-Origin-Resource-Policy"] = "cross-origin"

        # 4. Restrict dangerous browser capabilities
        response["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"

        # 5. Content Security Policy (Allows necessary assets while preventing XSS/injection)
        response["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' https:; "
            "style-src 'self' 'unsafe-inline' https:; "
            "img-src 'self' data: https:; "
            "font-src 'self' https: data:; "
            "connect-src 'self' https: wss:; "
            "frame-ancestors 'none';"
        )

        # 6. HSTS (Enforce HTTPS in production)
        if request.is_secure() or request.headers.get("X-Forwarded-Proto") == "https":
            response["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"

        # 7. Strip sensitive server identification headers
        if "Server" in response:
            del response["Server"]

        return response

