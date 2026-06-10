import requests

url = "https://api.vapi.ai/call"
headers = {
    "Authorization": "Bearer 92f9ea9d-4b42-4cc3-be43-dd80add9fcaf"
}

response = requests.get(url, headers=headers)
calls_data = response.json()

# Access call transcripts and logs
for call in calls_data:
    print(f"Call ID: {call['id']}")
    print(f"Transcript: {call.get('transcript')}")