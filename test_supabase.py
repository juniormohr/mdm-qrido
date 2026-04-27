import json
import urllib.request
import urllib.error

url = "https://lbazkpkvkvarimnqzgqb.supabase.co"
key = "sb_publishable_4nxSKcQZpb4iQ-Wdy55tgg_RYyqoTuS" # Anon key is not sufficient, better use service role key for direct check if we want, or ANON key + login.

service_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxiYXprcGt2a3ZhcmltbnF6Z3FiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTI4MzY5MSwiZXhwIjoyMDg2ODU5NjkxfQ.RDYx8KsUzlMNT5qb7WfTF4dCrp3dEx8eqSmC0b1g8E0"

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
        print(f"Logged in user_id={user_id}")
        
    # 2. Upsert
    table_url = f"{url}/rest/v1/loyalty_configs?on_conflict=user_id"
    upsert_data = json.dumps({
        "user_id": user_id,
        "points_per_real": 1.5,
        "min_points_to_redeem": 50
    }).encode("utf-8")
    
    upsert_headers = {
        "apikey": key,
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates"
    }
    
    req2 = urllib.request.Request(table_url, data=upsert_data, headers=upsert_headers, method="POST")
    with urllib.request.urlopen(req2) as response2:
        print("Upsert success:", response2.read().decode())

except urllib.error.HTTPError as e:
    print(f"HTTP Error {e.code}: {e.read().decode()}")
except Exception as e:
    print("Error:", e)
