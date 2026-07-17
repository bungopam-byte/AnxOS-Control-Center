# Windows hardware telemetry helper

This read-only helper embeds `LibreHardwareMonitorLib` and emits one JSON sensor
snapshot. Release builds publish it self-contained for `win-x64`; users do not
need the LibreHardwareMonitor GUI or a separate .NET installation.

LibreHardwareMonitor is licensed under MPL-2.0. See `THIRD-PARTY-NOTICES.txt`
and the upstream notices included beside packaged helper files.
