import json
import datetime
import os

package_json_path = os.path.join(os.path.dirname(__file__), '..', 'package.json')

if not os.path.exists(package_json_path):
    print("找不到 package.json")
    exit(1)

# 使用台灣時間 (UTC+8) 作為本地時間
tz = datetime.timezone(datetime.timedelta(hours=8))
now = datetime.datetime.now(tz)
new_version = f"1.{now.month}.{now.day}.{now.strftime('%H%M')}"

with open(package_json_path, 'r', encoding='utf-8') as f:
    data = json.load(f)

old_version = data.get('version', '')
data['version'] = new_version

with open(package_json_path, 'w', encoding='utf-8') as f:
    # 保持縮寫與排版格式 (縮排 2 格)
    json.dump(data, f, indent=2, ensure_ascii=False)
    # 檔尾補上換行符
    f.write('\n')

print(f"🚀 自動更新 package.json 版本由 {old_version} 為: {new_version}")
