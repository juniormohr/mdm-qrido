import json
import urllib.request
from urllib.parse import quote

url = "https://lbazkpkvkvarimnqzgqb.supabase.co"
key = "sb_publishable_4nxSKcQZpb4iQ-Wdy55tgg_RYyqoTuS"

auth_url = f"{url}/auth/v1/token?grant_type=password"
auth_data = json.dumps({"email": "cliente@teste.com", "password": "123456"}).encode("utf-8")
headers = {
    "apikey": key,
    "Content-Type": "application/json"
}
try:
    req = urllib.request.Request(auth_url, data=auth_data, headers=headers, method="POST")
    with urllib.request.urlopen(req) as response:
        token = json.loads(response.read().decode())["access_token"]
        
    query = quote("*, profiles:user_id(full_name)")
    rewards_url = f"{url}/rest/v1/rewards?select={query}"
    
    req2 = urllib.request.Request(rewards_url, headers={
        "apikey": key,
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    })
    try:
        with urllib.request.urlopen(req2) as resp:
            print("Success:", resp.read().decode())
    except urllib.error.HTTPError as e:
        print("HTTP Error:", e.code, e.read().decode())
        
except Exception as e:
    print("Error:", e)
