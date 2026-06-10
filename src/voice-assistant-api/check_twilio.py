import httpx
import json

TWILIO_ACCOUNT_SID = "AC8fdd01bcc925b55b5b706e2c6157e1a8"
TWILIO_AUTH_TOKEN = "b0d38c423daee0162bf25579714b7492"
TWILIO_PHONE_NUMBER = "+13614365454"

def check_twilio():
    # Fetch phone number list from Twilio
    url = f"https://api.twilio.com/2010-04-01/Accounts/{TWILIO_ACCOUNT_SID}/IncomingPhoneNumbers.json"
    auth = (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
    
    try:
        response = httpx.get(url, auth=auth)
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            phone_numbers = data.get("incoming_phone_numbers", [])
            print(f"Total numbers on Twilio: {len(phone_numbers)}")
            for idx, num in enumerate(phone_numbers):
                print(f"[{idx+1}] SID: {num.get('sid')}")
                print(f"    Phone Number: {num.get('phone_number')}")
                print(f"    Voice URL: {num.get('voice_url')}")
                print(f"    Voice Method: {num.get('voice_method')}")
                print(f"    Sms URL: {num.get('sms_url')}")
        else:
            print(response.text)
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_twilio()
