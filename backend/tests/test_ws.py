from app.main import app


def test_ws_endpoint_registration():
    paths = []
    for r in app.routes:
        if hasattr(r, 'original_router'):
            paths.extend([s.path for s in r.original_router.routes])
    assert '/ws/live/{symbol}/{timeframe}' in paths
