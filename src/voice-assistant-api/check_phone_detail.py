import httpx
import json

VAPI_API_KEY = "92f9ea9d-4b42-4cc3-be43-dd80add9fcaf"
PHONE_NUMBER_ID = "9d7107a4-f7c2-4e72-a78f-f507a0173c8f"

def get_detail():
    headers = {
        "Authorization": f"Bearer {VAPI_API_KEY}"
    }
    response = httpx.get(f"https://api.vapi.ai/phone-number/{PHONE_NUMBER_ID}", headers=headers)
    print(response.status_code)
    print(json.dumps(response.json(), indent=2))

if __name__ == "__main__":
    get_detail()
