import json
import urllib.request
from typing import Any

MCP_SERVER_URL = "http://localhost:8888"

def call_mcp_tool(tool_name: str, arguments: dict = {}) -> Any:
    """Calls a tool from the MCP Dynatrace server."""
    payload = json.dumps({
        "jsonrpc": "2.0",
        "id": 1,
        "method": "tools/call",
        "params": {
            "name": tool_name,
            "arguments": arguments
        }
    }).encode()

    req = urllib.request.Request(
        f"{MCP_SERVER_URL}/mcp",
        data=payload,
        headers={
            "Content-Type": "application/json",
            "Accept": "application/json, text/event-stream"
        }
    )

    try:
        response = urllib.request.urlopen(req, timeout=30).read().decode()
        for line in response.split('\n'):
            if line.startswith('data: '):
                data = json.loads(line[6:])
                if 'result' in data:
                    return data['result']
    except Exception as e:
        print(f"  ❌ MCP error: {e}")
    return None

def get_active_problems() -> list:
    """Retrieves active problems from Dynatrace via MCP."""
    result = call_mcp_tool("list_problems", {
        "status": "ACTIVE",
        "timeframe": "1h",
        "maxProblemsToDisplay": 5
    })
    return result or []

def send_incident_event(title: str, metrics: dict) -> bool:
    """Sends an incident event to Dynatrace via MCP."""
    result = call_mcp_tool("send_event", {
        "eventType": "CUSTOM_ALERT",
        "title": title,
        "properties": {
            "latency_ms": str(metrics.get("latency_ms", 0)),
            "error_rate": str(metrics.get("error_rate", 0)),
            "source": "SRE-GPT Agent"
        }
    })
    return result is not None

def ask_davis(question: str, context: str = "") -> str:
    """Queries Davis CoPilot via MCP for analysis."""
    result = call_mcp_tool("chat_with_davis_copilot", {
        "text": question,
        "context": context
    })
    if result and isinstance(result, list):
        for item in result:
            if isinstance(item, dict) and item.get("type") == "text":
                return item.get("text", "")
    return ""

if __name__ == "__main__":
    print("🔍 Testing MCP Dynatrace...")

    print("\n1. Active problems:")
    problems = get_active_problems()
    print(f"   → {len(problems) if isinstance(problems, list) else 0} problem(s) found")

    print("\n2. Davis CoPilot:")
    answer = ask_davis("What is the current health status of my environment?")
    print(f"   → {answer[:150] if answer else 'No response'}...")