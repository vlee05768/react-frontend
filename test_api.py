import requests
import json

base_url = "http://192.168.50.100:5160"
login_data = {
    "userName": "admin",
    "password": "1qaz"
}
res = requests.post(f"{base_url}/api/v1/Auth/login", json=login_data)
token = res.json()["data"]["token"]

headers = {"Authorization": f"Bearer {token}"}
roles_res = requests.get(f"{base_url}/api/v1/Role?pageSize=100", headers=headers)
print("Roles:", json.dumps(roles_res.json(), ensure_ascii=False, indent=2))

users_res = requests.get(f"{base_url}/api/v1/User?pageSize=1", headers=headers)
print("Users:", json.dumps(users_res.json(), ensure_ascii=False, indent=2))
