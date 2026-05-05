import os
from dotenv import load_dotenv

load_dotenv()

# Model Names
CHAT_MODEL = os.getenv("CHAT_MODEL", "sarvam-30b")
IMAGE_MODEL = os.getenv("IMAGE_MODEL", "black-forest-labs/FLUX.1-schnell")
REASONING_MODEL = os.getenv("REASONING_MODEL", "sarvam-105b")
LLM_MODEL = os.getenv("LLM_MODEL", "sarvam-105b")
