"""Discover a local Raaybots server and publish newline-delimited JSON values."""

from __future__ import annotations

import argparse
import asyncio
import json
import socket
import sys
from typing import Any

import websockets


DISCOVERY_PORT = 8766
DISCOVERY_REQUEST = b"RAAYBOTS_DISCOVER_V1"
DISCOVERY_TIMEOUT_SECONDS = 8.0


async def discover_server(timeout: float = DISCOVERY_TIMEOUT_SECONDS) -> str:
    """Find a Raaybots telemetry server on the local IPv4 network."""
    loop = asyncio.get_running_loop()
    deadline = loop.time() + timeout

    with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as discovery:
        discovery.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)
        discovery.bind(("", 0))
        discovery.setblocking(False)
        discovery.sendto(DISCOVERY_REQUEST, ("255.255.255.255", DISCOVERY_PORT))
        discovery.sendto(DISCOVERY_REQUEST, ("127.0.0.1", DISCOVERY_PORT))

        while loop.time() < deadline:
            remaining = deadline - loop.time()
            try:
                payload, (host, _) = await asyncio.wait_for(
                    loop.sock_recvfrom(discovery, 4096),
                    timeout=remaining,
                )
            except TimeoutError:
                break
            try:
                response = json.loads(payload)
            except (UnicodeDecodeError, json.JSONDecodeError):
                continue
            if (
                isinstance(response, dict)
                and response.get("service") == "raaybots-telemetry"
                and response.get("protocol") == 1
                and isinstance(response.get("websocket_port"), int)
                and isinstance(response.get("websocket_path"), str)
            ):
                return (
                    f"ws://{host}:{response['websocket_port']}"
                    f"{response['websocket_path']}"
                )

    raise TimeoutError(
        "No Raaybots app was discovered. Check that both devices are on the same "
        "local network and allow Raaybots Telemetry through the desktop firewall."
    )


async def publish_lines(once: bool = False) -> None:
    """Read real telemetry JSON from stdin and forward each frame to the app."""
    websocket_url = await discover_server()
    print(f"Found Raaybots at {websocket_url}", file=sys.stderr)

    async with websockets.connect(websocket_url, max_size=1_048_576) as websocket:
        print("Connected; send nested JSON frames on stdin.", file=sys.stderr)
        while True:
            line = await asyncio.to_thread(sys.stdin.readline)
            if not line:
                break
            if not line.strip():
                continue

            data: Any = json.loads(line)
            if not isinstance(data, dict) or not data:
                raise ValueError("Each telemetry frame must be a non-empty JSON object.")

            await websocket.send(json.dumps({"type": "telemetry_update", "data": data}))
            while True:
                response = json.loads(await websocket.recv())
                if response.get("type") == "error":
                    raise RuntimeError(response.get("error", "Telemetry update was rejected."))
                if response.get("type") == "telemetry_update_ack":
                    print("Telemetry frame accepted.", file=sys.stderr)
                    break

            if once:
                break


def main() -> None:
    parser = argparse.ArgumentParser(
        description=(
            "Automatically discover Raaybots on the local network and publish "
            "real telemetry JSON read from stdin."
        )
    )
    parser.add_argument(
        "--once",
        action="store_true",
        help="publish only the first JSON frame read from stdin",
    )
    arguments = parser.parse_args()

    try:
        asyncio.run(publish_lines(once=arguments.once))
    except (OSError, TimeoutError, ValueError, RuntimeError, websockets.WebSocketException) as error:
        parser.exit(1, f"Robot telemetry client: {error}\n")


if __name__ == "__main__":
    main()
