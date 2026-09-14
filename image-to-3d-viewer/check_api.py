import sys
from gradio_client import Client

client = Client("trellis-community/TRELLIS")

# Redirect stdout to a file
with open("api_info.txt", "w", encoding="utf-8") as f:
    old_stdout = sys.stdout
    sys.stdout = f
    try:
        client.view_api(all_endpoints=True)
    finally:
        sys.stdout = old_stdout

print("API info saved to api_info.txt")
