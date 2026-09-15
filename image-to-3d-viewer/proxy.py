"""
proxy.py - Local CORS proxy for TripoAI API

Run this if the browser blocks TripoAI requests due to CORS.
This tiny server proxies /tripo/* → https://api.tripo3d.ai/v2/openapi/*
and adds the necessary CORS headers.

Usage:
  pip install flask flask-cors requests
  python proxy.py

Then in the app: tick 'Route through local proxy.py',
set proxy URL to: http://localhost:8765
"""

from flask import Flask, request, Response
from flask_cors import CORS
import requests

app = Flask(__name__)
CORS(app)  # Allow all origins

TRIPO_BASE = 'https://api.tripo3d.ai/v2/openapi'

@app.route('/tripo/<path:path>', methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'])
def proxy_tripo(path):
    if request.method == 'OPTIONS':
        # Pre-flight CORS response
        resp = Response()
        resp.headers['Access-Control-Allow-Origin']  = '*'
        resp.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
        resp.headers['Access-Control-Allow-Headers'] = 'Authorization, Content-Type'
        return resp

    url = f'{TRIPO_BASE}/{path}'
    if request.query_string:
        url += '?' + request.query_string.decode()

    # Forward headers (exclude Host)
    fwd_headers = {k: v for k, v in request.headers if k.lower() not in ('host', 'content-length')}

    # Forward request
    resp = requests.request(
        method=request.method,
        url=url,
        headers=fwd_headers,
        data=request.get_data(),
        stream=True,
        timeout=120,
    )

    # Build response
    excluded = {'content-encoding', 'transfer-encoding', 'connection'}
    headers  = [(k, v) for k, v in resp.raw.headers.items() if k.lower() not in excluded]
    headers.append(('Access-Control-Allow-Origin', '*'))

    return Response(
        response=resp.iter_content(chunk_size=8192),
        status=resp.status_code,
        headers=headers,
        content_type=resp.headers.get('Content-Type', 'application/octet-stream'),
    )

@app.route('/health')
def health():
    return {'status': 'ok', 'proxy_target': TRIPO_BASE}

if __name__ == '__main__':
    print('===================================================')
    print('  TripoAI CORS Proxy running on http://localhost:8765')
    print('  In the app: tick "Route through proxy.py"')
    print('  Proxy URL: http://localhost:8765')
    print('===================================================')
    app.run(host='0.0.0.0', port=8765, debug=False)
