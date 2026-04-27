import json
import urllib.request

url = "https://lbazkpkvkvarimnqzgqb.supabase.co/rest/v1/rpc/get_policies"
key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxiYXprcGt2a3ZhcmltbnF6Z3FiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTI4MzY5MSwiZXhwIjoyMDg2ODU5NjkxfQ.RDYx8KsUzlMNT5qb7WfTF4dCrp3dEx8eqSmC0b1g8E0"

headers = {
    "apikey": key,
    "Authorization": f"Bearer {key}"
}
req = urllib.request.Request(url, headers=headers)
try:
    with urllib.request.urlopen(req) as res:
        data = json.loads(res.read().decode())
        print(json.dumps(data, indent=2))
except Exception as e:
    print(e)
