from dotenv import load_dotenv
import requests
import json
import os

load_dotenv()


API_KEY = os.getenv("SARVAM_KEY")
API_URL = "https://api.sarvam.ai/v1/chat/completions"

headers = {
    "API-Subscription-Key": API_KEY,
    "Content-Type": "application/json"
}

payload = {
    "model": "sarvam-105b",
    "messages": [
        {
            "role": "user",
            "content": "<YOUR_MESSAGE>"
        }
    ],
    "temperature": 0.8,
    "top_p": 1,
    "stream": True,
    "reasoning_effort": "low"
}

response = requests.post(API_URL, headers=headers, json=payload, stream=True)
response.raise_for_status()

for line in response.iter_lines():
    if line:
        line = line.decode("utf-8")
        if line.startswith("data: "):
            data = line[6:]
            if data == "[DONE]":
                break
            chunk = json.loads(data)
            delta = chunk["choices"][0]["delta"]
            if "content" in delta and delta["content"]:
                print(delta["content"], end="", flush=True)

print()  # newline at end

# sarvam-30b → general use (fast + cheaper)
# sarvam-105b → best quality (reasoning, coding)


