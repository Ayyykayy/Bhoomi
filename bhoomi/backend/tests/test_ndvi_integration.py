import unittest
from unittest.mock import patch
from fastapi import HTTPException
from app.ndvi_service import get_ndvi, normalize, CACHE

def payload(raw=1397, qa=2116, rel=0):
    return {"nrows": 1, "ncols": 1, "subset": [{"calendar_date": "2026-10-16", "band": band, "data": [value]} for band, value in [("250m_16_days_NDVI", raw), ("250m_16_days_VI_Quality", qa), ("250m_16_days_pixel_reliability", rel)]]}

class NdviIntegrationTest(unittest.TestCase):
    def setUp(self): CACHE.clear()
    def test_scale_once_and_zero(self):
        self.assertEqual(normalize(payload())[0]["value"], .1397)
        self.assertEqual(normalize(payload(raw=0))[0]["value"], 0)
    def test_bad_quality_and_fill(self):
        for data in [payload(rel=3), payload(raw=-3000), payload(qa=2116 | (1<<15)), payload(qa=-1), payload(qa=2116 | (1<<8))]:
            self.assertIsNone(normalize(data)[0]["value"])
    def test_marginal_retained(self):
        self.assertEqual(normalize(payload(qa=2117,rel=1))[0]["quality"], "marginal")
    def test_reject_wrong_grid(self):
        with self.assertRaises(HTTPException): normalize({"nrows": 2,"ncols": 1,"subset": []})
    @patch("app.ndvi_service._request")
    def test_arbitrary_location_and_cache(self, request):
        request.side_effect = [({"dates": [{"calendar_date":"2026-10-16", "modis_date":"A2026289"}]}, "dates"), (payload(), "subset")]
        result = get_ndvi(30.8863,10.7317,"20261001","20261031")
        self.assertEqual(result["latest"]["value"], .1397)
        self.assertEqual(result["mode"], "automatic_point")
        self.assertEqual(result["location"]["longitude"],10.7317)
        get_ndvi(30.8863,10.7317,"20261001","20261031")
        self.assertEqual(request.call_count,2)
    @patch("app.ndvi_service._request",return_value=({"dates":[]}, "dates"))
    def test_no_observations(self, request):
        self.assertIsNone(get_ndvi(0,0,"20261001","20261031")["latest"])
    def test_invalid(self):
        for args in [(float('nan'),80), (91,80), (26,80,'bad'), (26,80,'20261031','20261001')]:
            with self.assertRaises(HTTPException): get_ndvi(*args)
