from app.core.config import settings


def init_sentry() -> None:
    if not settings.sentry_dsn:
        return

    import sentry_sdk

    sentry_sdk.init(
        dsn=settings.sentry_dsn,
        traces_sample_rate=0.2,
        environment=settings.environment,
        send_default_pii=False,
    )
