import httpx
import json

VAPI_API_KEY = "92f9ea9d-4b42-4cc3-be43-dd80add9fcaf"
ASSISTANT_ID = "4c9874be-7d09-4108-93bd-542275de9aaa"

def get_assistant_detail():
    headers = {
        "Authorization": f"Bearer {VAPI_API_KEY}"
    }
    response = httpx.get(f"https://api.vapi.ai/assistant/{ASSISTANT_ID}", headers=headers)
    print(response.status_code)
    print(json.dumps(response.json(), indent=2))

if __name__ == "__main__":
    get_assistant_detail()
