import requests
base_url = "http://192.168.50.100:5160"
res = requests.post(f"{base_url}/api/v1/Auth/Login", json={"userName": "admin", "password": "wellan"})
token = res.json().get('data', {}).get('token')
headers = {"Authorization": f"Bearer {token}"}
r = requests.get(f"{base_url}/api/v1/Mold", headers=headers, params={"pageNumber": 1, "pageSize": 10, "CodeOrName": "", "Type": None, "SupplierCode": None})
print(r.status_code)
print(r.text[:500])
