import httpx
import json

VAPI_API_KEY = "92f9ea9d-4b42-4cc3-be43-dd80add9fcaf"

def check_org():
    headers = {
        "Authorization": f"Bearer {VAPI_API_KEY}"
    }
    response = httpx.get("https://api.vapi.ai/org", headers=headers)
    print(response.status_code)
    print(json.dumps(response.json(), indent=2))

if __name__ == "__main__":
    check_org()
