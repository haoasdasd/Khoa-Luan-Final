"""
run.py - Entry point để khởi chạy server
Chạy: python run.py
"""
import uvicorn

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info",
    )
print("Server is running at http://localhost:8000")
print("API docs available at http://localhost:8000/docs#/")