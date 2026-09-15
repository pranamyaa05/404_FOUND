#!/usr/bin/env python3
"""
start.py — Cross-platform launcher for Image → 3D Mesh Viewer
Usage: python start.py
"""

import os
import sys
import subprocess
import threading
import time
import webbrowser

ROOT = os.path.dirname(os.path.abspath(__file__))
BACKEND = os.path.join(ROOT, 'backend')
REQ_FILE = os.path.join(BACKEND, 'requirements.txt')
APP_FILE = os.path.join(BACKEND, 'app.py')
URL = 'http://localhost:5000'

def banner():
    print()
    print('  =' * 22)
    print('   Image → 3D Mesh Viewer')
    print('  =' * 22)
    print()

def install_deps():
    print('  [1/2] Installing / verifying Python dependencies...')
    result = subprocess.run(
        [sys.executable, '-m', 'pip', 'install', '-r', REQ_FILE, '--quiet'],
        cwd=BACKEND
    )
    if result.returncode != 0:
        print('\n  [ERROR] Dependency installation failed. Check your internet connection.')
        sys.exit(1)
    print('  [1/2] Dependencies OK.')

def open_browser():
    """Wait a moment then open the browser."""
    time.sleep(2.5)
    print(f'\n  Opening browser at {URL} ...\n')
    webbrowser.open(URL)

def start_server():
    print(f'  [2/2] Starting Flask server...')
    print()
    print('  ----------------------------------------')
    print(f'   App running at: {URL}')
    print('   Press Ctrl+C to stop.')
    print('  ----------------------------------------')
    print()
    subprocess.run([sys.executable, APP_FILE], cwd=BACKEND)

if __name__ == '__main__':
    banner()
    install_deps()

    # Open browser in background thread
    threading.Thread(target=open_browser, daemon=True).start()

    try:
        start_server()
    except KeyboardInterrupt:
        print('\n\n  Server stopped. Goodbye!')
