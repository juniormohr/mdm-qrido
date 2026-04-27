import json
import urllib.request
import urllib.error

url = "https://lbazkpkvkvarimnqzgqb.supabase.co"
key = "sb_publishable_4nxSKcQZpb4iQ-Wdy55tgg_RYyqoTuS"

# 1. Sign in
auth_url = f"{url}/auth/v1/token?grant_type=password"
auth_data = json.dumps({"email": "empresa1@teste.com", "password": "123456"}).encode("utf-8")
headers = {
    "apikey": key,
    "Content-Type": "application/json"
}
try:
    req = urllib.request.Request(auth_url, data=auth_data, headers=headers, method="POST")
    with urllib.request.urlopen(req) as response:
        auth_res = json.loads(response.read().decode())
        token = auth_res["access_token"]
        user_id = auth_res["user"]["id"]
        
    # 2. Select
    table_url = f"{url}/rest/v1/loyalty_configs?user_id=eq.{user_id}"
    
    select_headers = {
        "apikey": key,
        "Authorization": f"Bearer {token}",
    }
    
    req2 = urllib.request.Request(table_url, headers=select_headers, method="GET")
    with urllib.request.urlopen(req2) as response2:
        print("Select result:", response2.read().decode())

except urllib.error.HTTPError as e:
    print(f"HTTP Error {e.code}: {e.read().decode()}")
except Exception as e:
    print("Error:", e)
