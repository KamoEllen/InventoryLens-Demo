#!/usr/bin/env python3
"""
InventoryLens AI Backend Startup Script

Purpose:
---------
This script simplifies running the FastAPI backend server by:
- Checking required Python dependencies
- Loading environment variables from a .env file
- Validating HuggingFace API token presence
- Automatically launching the server using Uvicorn

Run this with: `python start.py`
"""

import os
import sys
import subprocess
from pathlib import Path

def check_requirements():
    """Check if all required packages are installed"""
    required_packages = [
        'fastapi', 'uvicorn', 'requests', 'Pillow', 'python-multipart'
    ]
    
    missing_packages = []
    for package in required_packages:
        try:
            __import__(package.replace('-', '_'))
        except ImportError:
            missing_packages.append(package)
    
    if missing_packages:
        print("❌ Missing required packages:")
        for pkg in missing_packages:
            print(f"   - {pkg}")
        print("\n🔧 Install missing packages with:")
        print("   pip install -r requirements.txt")
        return False
    
    print(" All required packages are installed")
    return True

def check_environment():
    """Check environment configuration"""
    env_file = Path('.env')
    
    if env_file.exists():
        print(" Found .env file")
        # Load environment variables from .env file
        with open(env_file) as f:
            for line in f:
                if line.strip() and not line.startswith('#'):
                    key, value = line.strip().split('=', 1)
                    os.environ[key] = value
    else:
        print("  No .env file found (optional)")
        print("   Create .env file with HUGGINGFACE_API_KEY for better rate limits")
    
    # Check HuggingFace token
    hf_token = os.getenv('HUGGINGFACE_API_KEY')
    if hf_token:
        print(" HuggingFace API token configured")
    else:
        print("  No HuggingFace API token found")
        print("   The demo will work but may have rate limits")
        print("   Get token from: https://huggingface.co/settings/tokens")

def start_server():
    """Start the FastAPI server"""
    print("\n Starting InventoryLens AI Backend...")
    print("   Server will be available at: http://localhost:8000")
    print("   API Documentation: http://localhost:8000/docs")
    print("   Press Ctrl+C to stop the server")
    print("-" * 50)
    
    try:
        # Start uvicorn server
        subprocess.run([
            sys.executable, '-m', 'uvicorn', 
            'main:app', 
            '--host', '0.0.0.0', 
            '--port', '8000', 
            '--reload'
        ], check=True)
    except KeyboardInterrupt:
        print("\n Server stopped by user")
    except subprocess.CalledProcessError as e:
        print(f"\n❌ Server failed to start: {e}")
        return False
    except FileNotFoundError:
        print("\n❌ uvicorn not found. Install with: pip install uvicorn[standard]")
        return False
    
    return True

def main():
    print("🔍 InventoryLens AI - Backend Startup")
    print("=" * 40)
    
    if not Path('main.py').exists():
        print("❌ main.py not found. Make sure you're in the backend directory")
        return
    
    if not check_requirements():
        return
    
    # Check environment
    check_environment()
    
    # Start server
    start_server()

if __name__ == "__main__":
    main()