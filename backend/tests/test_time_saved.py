from app.routers.ops import estimated_hours_saved


def test_time_saved_formula():
    # 9 minutes saved per document, 1000 documents -> 150 hours
    assert estimated_hours_saved(12, 3, 1000) == 150.0


def test_time_saved_zero_when_no_gain():
    assert estimated_hours_saved(5, 5, 1000) == 0.0


def test_time_saved_scales_with_volume():
    assert estimated_hours_saved(12, 3, 100) == 15.0
