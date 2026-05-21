try:
    from slowapi import Limiter
    from slowapi.util import get_remote_address

    limiter = Limiter(key_func=get_remote_address)
    SLOWAPI_AVAILABLE = True
except ImportError:
    SLOWAPI_AVAILABLE = False

    class _NoopLimiter:
        def limit(self, _rule: str):
            def decorator(func):
                return func

            return decorator

    limiter = _NoopLimiter()
