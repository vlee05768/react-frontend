import re

with open("src/api/generated/types.gen.ts", "r") as f:
    content = f.read()

# Split by export type
types = content.split("export type ")
api_types = {}

for t in types:
    if t.startswith("GetApiV1"):
        name_end = t.find(" =")
        if name_end != -1:
            name = t[:name_end].strip()
            if name.endswith("Data"):
                query_start = t.find("query?: {")
                if query_start != -1:
                    # extract the block
                    block = t[query_start:t.find("};", query_start)]
                    # parse properties
                    lines = block.split("\n")
                    props = []
                    for line in lines:
                        match = re.search(r'^\s*([a-zA-Z0-9_]+)\??:\s*(.*?);', line)
                        if match:
                            prop_name = match.group(1)
                            prop_type = match.group(2)
                            if prop_name not in ['pageNumber', 'pageSize', 'SortBy', 'SortDescending']:
                                props.append(f"{prop_name}: {prop_type}")
                    if props:
                        api_types[name] = props

for k, v in api_types.items():
    print(f"{k}:")
    for p in v:
        print(f"  {p}")

