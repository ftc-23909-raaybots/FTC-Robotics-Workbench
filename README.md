# Robot Workbench

Robot Workbench is a Windows desktop toolkit for working with FTC-style robots. It connects to a robot-hosted telemetry API, records and exports measurements, offers a local Java simulator, and provides tools for editing and deploying OnBotJava code.

The desktop application is designed for PC use (minimum window size: 1280 × 760). It is a client and development tool, not a robot control dashboard: telemetry is read-only, and the app does not start or control a physical OpMode.

## Features

- **Live telemetry:** Read-only robot status, telemetry, and fault-log data over the robot's local network.
- **Robot profiles and themes:** Save connection profiles locally and choose among 13 built-in themes.
- **Measurement capture:** Record timestamped telemetry frames and export or import sessions as JSON.
- **Java simulator:** Compile and run supported FTC-style OpModes against simulated hardware.
- **Robot Code tools:** Edit Java source, inspect remote files, and explicitly confirm uploads and build requests through OnBotJava.
- **External dashboard definitions:** Load and validate JSON dashboard data definitions; the backend does not contain dashboard rendering logic.
- **C++20 backend:** A separate CMake project for telemetry and measurement platform development; it is not launched or packaged by the desktop application.

## Download

Windows x64 installer downloads will be published under [GitHub Releases](https://github.com/ftc-23909-raaybots/FTC-Robotics-Workbench/releases). The current desktop version in this source tree is **2.1.0**.

The 2.1.0 installer is unsigned, so Windows may show an unknown-publisher or SmartScreen warning. Install it only if you trust the source. A successful local install and launch check does not certify compatibility with a physical FTC Robot Controller.

## Connect to a robot

1. Connect the PC to the Robot Controller or Control Hub's Program & Manage Wi-Fi network.
2. Start an OpMode that initializes the robot telemetry API.
3. In Robot Workbench, configure the telemetry API origin. The default Control Hub address is `http://192.168.43.1:8765`.
4. To use the Robot Code tools, configure the Program & Manage origin as well. The default is `http://192.168.43.1:8080`.

The telemetry API is unauthenticated and intended only for a trusted, private robot network. Do not expose it to the public internet. The desktop uses internal OnBotJava web handlers for source inspection, upload, and build; these are not a stable public API and may change between FTC SDK versions. Test with the specific Robot Controller software before relying on deployment.

## Develop

### Desktop app

Requires Windows x64, Node.js, and npm.

```powershell
Set-Location ui
npm ci
npm run dev
```

Run the desktop tests and build:

```powershell
npm run test:simulator
npm run build
```

Build the per-user Windows x64 installer with `npm run installer`. A JDK 11 or newer is required separately to compile and run simulator OpModes.

### C++ backend

The C++20 backend is an independent project and is not part of the desktop app's runtime path. Build it with CMake from the repository root:

```powershell
cmake -S . -B build
cmake --build build --config Release
```

## Important limitations

- The simulator is not the Android FTC runtime and does not support every FTC API. It does not connect to or control a physical robot.
- Imported Java code runs as the current Windows user and is not sandboxed. Run only code you trust.
- Physical Robot Controller and FTC SDK compatibility has not been certified for this project.
- Robot Workbench is optimized for desktop PCs; phone and tablet layouts are out of scope.

## Project files

- [`TODO.md`](./TODO.md) tracks implementation and validation work.
- [`themes.md`](./themes.md) documents the visual themes implemented in the app.
- [`resources/dashboards/`](./resources/dashboards/) contains external dashboard definitions.
- [`examples/`](./examples/) contains example robot and simulator projects.

This repository uses the GNU General Public License v3.0. See [`LICENSE`](./LICENSE).
