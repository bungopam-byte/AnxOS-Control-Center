import { redirectLatestArtifact } from "../../../_shared/release-download.mjs";

export function onRequestGet({ request, env }) {
  return redirectLatestArtifact(request, env, "linux-deb");
}
