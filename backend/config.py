"""
Central config — reads from .env via python-dotenv.
Import `settings` anywhere in the backend to access env vars.
"""

from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv(dotenv_path="../.env")  # root .env file


class Settings(BaseSettings):
    # IBM Watson Assistant
    WATSON_ASSISTANT_API_KEY: str = ""
    WATSON_ASSISTANT_URL: str = "https://api.us-south.assistant.watson.cloud.ibm.com"
    WATSON_ASSISTANT_ID: str = ""

    # IBM watsonx.ai
    WATSONX_API_KEY: str = ""
    WATSONX_PROJECT_ID: str = ""
    WATSONX_URL: str = "https://us-south.ml.cloud.ibm.com"

    # HuggingFace fallback
    HUGGINGFACE_API_KEY: str = ""

    # Blender executable path
    BLENDER_PATH: str = "blender"

    # Frontend URL for CORS
    FRONTEND_URL: str = "http://localhost:3000"

    class Config:
        env_file = "../.env"
        extra = "ignore"


settings = Settings()
