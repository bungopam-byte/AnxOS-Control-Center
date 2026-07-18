# AnxOS Control Center 1.7-build145 - Private Alpha

Release channel: Private Alpha

This private-alpha build updates the packaged local Agent startup flow for testers.

## Fixes

- Allows the bundled local Agent to be started from Agent Control without requiring Node.js, npm, or a source checkout.
- Keeps background service installation and auto-start registration protected as Owner/admin operations.
- Updates onboarding and Agent Control wording so first-time testers can start the local Agent directly from AnxOS.
- Automatically selects the local Agent backend for first-time local-only installs after the bundled Agent starts.

## Tester Note

Install AnxOS Control Center, open Agent Control, and click `Start Agent`. The app should start the bundled local Agent from the packaged application.
