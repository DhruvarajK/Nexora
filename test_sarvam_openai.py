import os
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

SARVAM_KEY = os.getenv("SARVAM_KEY")

client = OpenAI(
    api_key=SARVAM_KEY, # Pass it here too just in case it expects it in Authorization
    base_url="https://api.sarvam.ai/v1",
    default_headers={"API-Subscription-Key": SARVAM_KEY}
)

try:
    response = client.chat.completions.create(
        model="sarvam-30b",
        messages=[{"role": "user", "content": "Hello, who are you?"}],
        stream=True
    )

    for chunk in response:
        if not chunk.choices:
            continue
        if chunk.choices[0].delta.content:
            print(chunk.choices[0].delta.content, end="", flush=True)
    print()
except Exception as e:
    print(f"Error: {e}")
