import json
import urllib.request

url_base = "https://lbazkpkvkvarimnqzgqb.supabase.co/rest/v1"
key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxiYXprcGt2a3ZhcmltbnF6Z3FiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTI4MzY5MSwiZXhwIjoyMDg2ODU5NjkxfQ.RDYx8KsUzlMNT5qb7WfTF4dCrp3dEx8eqSmC0b1g8E0"

headers = {
    "apikey": key,
    "Authorization": f"Bearer {key}",
    "Content-Type": "application/json"
}

# 1. Fetch all profiles
req_profiles = urllib.request.Request(f"{url_base}/profiles?select=id,full_name,role,is_active", headers=headers)
with urllib.request.urlopen(req_profiles) as res:
    profiles = json.loads(res.read().decode())

profile_map = {p["id"]: p for p in profiles}

# 2. Fetch all rewards
req_rewards = urllib.request.Request(f"{url_base}/rewards?select=id,title,user_id,is_active", headers=headers)
with urllib.request.urlopen(req_rewards) as res:
    rewards = json.loads(res.read().decode())

print(f"Total Profiles: {len(profiles)}")
print(f"Total Rewards: {len(rewards)}")

orphaned_ids = []
for r in rewards:
    comp = profile_map.get(r["user_id"])
    if not comp:
        print(f"Orphaned reward found: ID={r['id']}, Title={r['title']}, UserID={r['user_id']}")
        orphaned_ids.append(r["id"])
    elif comp.get("is_active") == False:
        print(f"Inactive company reward: ID={r['id']}, Title={r['title']}, Company={comp.get('full_name')}")

# Delete orphaned rewards
if orphaned_ids:
    for oid in orphaned_ids:
        del_req = urllib.request.Request(
            f"{url_base}/rewards?id=eq.{oid}",
            headers=headers,
            method="DELETE"
        )
        with urllib.request.urlopen(del_req) as del_res:
            print(f"Deleted orphaned reward ID: {oid}")
else:
    print("No orphaned rewards found to delete.")
