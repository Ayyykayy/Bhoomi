import unittest
from unittest.mock import patch
from fastapi.testclient import TestClient
from app.config import normalize_origins, settings
from app.main import app

class DeploymentTests(unittest.TestCase):
    def test_origin_cleanup(self):
        self.assertEqual(normalize_origins(' https://bhoomi-1-ht53.onrender.com/ ,http://localhost:5173/, '), ['https://bhoomi-1-ht53.onrender.com', 'http://localhost:5173'])
    def test_home_redirect(self):
        with patch.object(settings, 'ALLOWED_ORIGINS', ['https://bhoomi-1-ht53.onrender.com']):
            response = TestClient(app).get('/', follow_redirects=False)
        self.assertEqual(response.status_code,307)
        self.assertEqual(response.headers['location'],'https://bhoomi-1-ht53.onrender.com/')
    def test_local_home(self):
        with patch.object(settings, 'ALLOWED_ORIGINS', ['http://localhost:5173']):
            response = TestClient(app).get('/')
        self.assertEqual(response.status_code,200)
        self.assertEqual(response.json()['health'],'/api/health')
