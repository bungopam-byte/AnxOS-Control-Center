# AnxOS Control Center 1.7 Build 154

## Who it is for

Private Alpha users managing Windows and Debian dedicated servers.

## New installations

Build 154 includes the paired remote-Agent status correction.

## Existing remote Agent users

Pair or repair the Debian Agent before using Marketplace operations.

## Windows-only limitation

Embedded hardware telemetry depends on available Windows sensor access.

## macOS Local Agent support is not documented or claimed

## Upgrade guidance

Install Build 154 over the existing Build 153 installation.

## Repair guidance

Use Agent Control repair if pairing credentials are stale.

## real-machine Windows installation

Validate the installer and confirm the paired Debian Agent displays Paired after restart.

## Fixed

- Paired remote Agents now display `Paired` instead of `Waiting for Control Center` after authentication.
