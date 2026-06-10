import httpx
import json

VAPI_API_KEY = "92f9ea9d-4b42-4cc3-be43-dd80add9fcaf"

def get_calls():
    headers = {
        "Authorization": f"Bearer {VAPI_API_KEY}"
    }
    response = httpx.get("https://api.vapi.ai/call?limit=5", headers=headers)
    print(response.status_code)
    if response.status_code == 200:
        calls = response.json()
        print(f"Total calls retrieved: {len(calls)}")
        for idx, call in enumerate(calls):
            print(f"--- Call {idx+1} ---")
            print(f"ID: {call.get('id')}")
            print(f"Type: {call.get('type')}")
            print(f"Status: {call.get('status')}")
            print(f"Ended Reason: {call.get('endedReason')}")
            print(f"Error Message: {call.get('errorMessage')}")
            # If transcript exists, print a snippet
            print(f"Transcript: {call.get('transcript')}")
            # print(json.dumps(call, indent=2))
    else:
        print(response.text)

if __name__ == "__main__":
    get_calls()
