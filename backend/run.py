import uvicorn
from app.config import HOST, PORT

if __name__ == "__main__":
    print(f"Starting LabelLens Backend Server on http://{HOST}:{PORT}")
    print(f"Interactive API Docs available at http://{HOST}:{PORT}/docs")
    uvicorn.run("app.main:app", host=HOST, port=PORT, reload=True)
