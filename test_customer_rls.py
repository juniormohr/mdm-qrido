import json
import urllib.request

url = "https://lbazkpkvkvarimnqzgqb.supabase.co"
key = "sb_publishable_4nxSKcQZpb4iQ-Wdy55tgg_RYyqoTuS"

# 1. Sign in as a test customer. Do we know a customer email?
# Or just register one? Wait, I can look at profiles or customers.
auth_url = f"{url}/auth/v1/token?grant_type=password"
auth_data = json.dumps({"email": "cliente@teste.com", "password": "123456"}).encode("utf-8")
headers = {
    "apikey": key,
    "Content-Type": "application/json"
}
try:
    req = urllib.request.Request(auth_url, data=auth_data, headers=headers, method="POST")
    with urllib.request.urlopen(req) as response:
        auth_res = json.loads(response.read().decode())
        token = auth_res["access_token"]
        customer_id = auth_res["user"]["id"]
        print(f"Logged in customer user_id={customer_id}")
        
    # 2. Fetch rewards with Customer Token
    rewards_url = f"{url}/rest/v1/rewards?select=*"
    rewards_headers = {
        "apikey": key,
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    req2 = urllib.request.Request(rewards_url, headers=rewards_headers)
    with urllib.request.urlopen(req2) as resp:
        print("Rewards seen by customer:", json.dumps(json.loads(resp.read().decode()), indent=2))
        
except Exception as e:
    print("Error:", e)
