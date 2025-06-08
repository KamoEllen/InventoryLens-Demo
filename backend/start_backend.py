#!/usr/bin/env python3
"""
InventoryLens AI Backend Starter

This script serves as a simplified entry point for the InventoryLens AI backend application.
It handles common startup issues by managing Python path configuration and providing
clear error messages for missing dependencies.

Key Functions:
- Configures Python path to include current directory
- Starts FastAPI application using Uvicorn server
- Provides user-friendly error handling and setup instructions
- Enables development mode with auto-reload functionality

Usage:
    python start_backend.py

Requirements:
    - FastAPI framework for API endpoints
    - Uvicorn ASGI server for serving the application
    - Additional dependencies: pillow, python-multipart, requests, pydantic
"""
import sys
import os

def main():
    print("🚀 Starting InventoryLens AI Backend...")
    print("=" * 50)
    
    # Add current directory to Python path
    current_dir = os.path.dirname(os.path.abspath(__file__))
    sys.path.insert(0, current_dir)
    
    try:
        
        import uvicorn
        from main import app
        
        print(" All imports successful!")
        print(" Backend will be available at: http://localhost:8000")
        print(" API documentation at: http://localhost:8000/docs")
        print("\nPress Ctrl+C to stop the server\n")
        
        # Start the server
        uvicorn.run(
            app,
            host="0.0.0.0",
            port=8000,
            reload=True,
            log_level="info"
        )
        
    except ImportError as e:
        print(f"❌ Import error: {e}")
        print("🔧 Try installing missing packages:")
        print("   pip install fastapi uvicorn pillow python-multipart requests pydantic")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Error starting server: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()