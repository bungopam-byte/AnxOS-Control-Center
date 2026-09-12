# Security Notes

Current `npm audit` warnings originate from upstream dependencies pulled in by `@cubecoders/ampapi`.

The affected dependency chain includes deprecated or vulnerable packages such as:

- `request`
- `form-data`
- `qs`
- `tough-cookie`
- `uuid`

These packages are transitive dependencies of `@cubecoders/ampapi`, and there is currently no safe automatic fix available through the existing dependency tree.

Do not run `npm audit fix --force` for these findings. That can introduce breaking dependency changes and does not address the root issue cleanly.

Revisit these warnings when CubeCoders releases an updated `ampapi` package, or replace `ampapi` with a maintained implementation in the future.
