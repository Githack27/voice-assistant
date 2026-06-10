import httpx
import json

VAPI_API_KEY = "92f9ea9d-4b42-4cc3-be43-dd80add9fcaf"

def check_vapi():
    headers = {
        "Authorization": f"Bearer {VAPI_API_KEY}"
    }
    
    # 1. Get all phone numbers
    print("--- Vapi Phone Numbers ---")
    try:
        response = httpx.get("https://api.vapi.ai/phone-number", headers=headers)
        if response.status_code == 200:
            numbers = response.json()
            print(f"Total numbers: {len(numbers)}")
            for idx, num in enumerate(numbers):
                print(f"[{idx+1}] ID: {num.get('id')}")
                print(f"    Number: {num.get('number')}")
                print(f"    Provider: {num.get('provider')}")
                print(f"    Name: {num.get('name')}")
                print(f"    Twilio SID: {num.get('twilioAccountSid')}")
                # Print serverUrl if configured
                print(f"    Server URL: {num.get('serverUrl')}")
                # Print fallbackServerUrl if configured
                print(f"    Fallback Server URL: {num.get('fallbackServerUrl')}")
        else:
            print(f"Error: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"Error: {e}")

    # 2. Get assistants
    print("\n--- Vapi Assistants ---")
    try:
        response = httpx.get("https://api.vapi.ai/assistant", headers=headers)
        if response.status_code == 200:
            assistants = response.json()
            print(f"Total assistants: {len(assistants)}")
            for idx, ast in enumerate(assistants):
                print(f"[{idx+1}] ID: {ast.get('id')}")
                print(f"    Name: {ast.get('name')}")
                print(f"    Model: {ast.get('model', {}).get('model') if isinstance(ast.get('model'), dict) else ast.get('model')}")
        else:
            print(f"Error: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_vapi()
