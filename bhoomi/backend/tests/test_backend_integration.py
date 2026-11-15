import unittest
from unittest.mock import patch
import requests
from fastapi import HTTPException
from fastapi.testclient import TestClient
from app.main import app
from app.nasa_service import normalize_payload, generate_date_range, fetch_nasa_power_range

class IntegrationTests(unittest.TestCase):
    def payload(self):
        return {"header": {"fill_value": -999}, "properties": {"parameter": {
            "T2M": {"20260101": 20, "20260103": -999},
            "PRECTOTCORR": {"20260101": 0, "20260103": 2},
            "RH2M": {"20260101": 60}}}}
    def test_missing_days_zero_and_summary(self):
        r=normalize_payload(self.payload(),31,75,["20260101","20260102","20260103"],"test")
        self.assertEqual(len(r["records"]),3)
        self.assertEqual(r["records"][0]["precipitation"]["value"],0)
        self.assertIsNone(r["records"][1]["temperature"]["value"])
        self.assertEqual(r["summary"]["requested_days"],3)
        self.assertFalse(r["summary"]["precipitation_complete"])
        self.assertEqual(r["latestByParameter"]["temperature"]["date"],"2026-01-01")
        self.assertEqual(r["completenessByParameter"]["soilMoistureTop"],0)
    def test_soil_values_dates_units_and_invalid_values(self):
        payload=self.payload()
        payload["properties"]["parameter"].update({"GWETTOP":{"20260101":0,"20260102":0.58,"20260103":-999},
            "GWETROOT":{"20260101":0.63,"20260102":1.5,"20260103":True}})
        result=normalize_payload(payload,26,80,["20260101","20260102","20260103"],"test")
        self.assertEqual(result["records"][0]["soilMoistureTop"]["value"],0)
        self.assertEqual(result["latestByParameter"]["soilMoistureTop"]["date"],"2026-01-02")
        self.assertEqual(result["latestByParameter"]["soilMoistureRoot"]["value"],0.63)
        self.assertEqual(result["soilMetadata"]["kind"],"relative_saturation")
        self.assertEqual(result["datasetStatus"]["soilMoisture"],"available")
        self.assertAlmostEqual(result["completenessByParameter"]["soilMoistureTop"],66.67)
    def test_malformed_soil_does_not_hide_weather(self):
        payload=self.payload()
        payload["properties"]["parameter"]["GWETTOP"] = "invalid"
        result=normalize_payload(payload,26,80,["20260101"],"test")
        self.assertEqual(result["records"][0]["temperature"]["value"],20)
        self.assertIsNone(result["records"][0]["soilMoistureTop"]["value"])

    def test_empty_payload_is_not_a_success(self):
        with self.assertRaises(ValueError): normalize_payload({},31,75,["20260101"],"test")
    def test_date_formats_and_inclusive_limit(self):
        self.assertEqual(generate_date_range("2026-01-01","20260103"),["20260101","20260102","20260103"])
        with self.assertRaises(HTTPException): generate_date_range("20240101","20250101")
    def test_api_contract(self):
        with patch("app.nasa_service.requests.get") as get:
            get.return_value.json.return_value=self.payload()
            response=TestClient(app).get("/api/observations",params={"lat":31.123456,"lon":75,"start":"2026-01-01","end":"2026-01-03"})
            self.assertEqual(response.status_code,200)
            data=response.json()
            self.assertTrue(data["success"])
            self.assertIn("temperature",data["records"][0])
            self.assertIn("summary",data)
    def test_invalid_coordinate(self):
        response=TestClient(app).get("/api/climate?lat=100&lon=75")
        self.assertEqual(response.status_code,422)
    def test_timeout_is_504(self):
        with patch("app.nasa_service.requests.get",side_effect=requests.exceptions.Timeout):
            with self.assertRaises(HTTPException) as error: fetch_nasa_power_range(32.987654,76,"20260101","20260102")
            self.assertEqual(error.exception.status_code,504)

if __name__ == "__main__": unittest.main()
