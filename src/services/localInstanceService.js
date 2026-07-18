const path = require("path");
const { app } = require("electron");
const instanceService = require("../shared/instances/instanceServiceCore");

function getLocalInstanceRoot() {
  if (process.env.AGENT_INSTANCE_ROOT) {
    return process.env.AGENT_INSTANCE_ROOT;
  }

  try {
    return path.join(app.getPath("userData"), "instances");
  } catch {
    return path.join(process.cwd(), "anxos-instances");
  }
}

instanceService.configureInstanceService({
  getConfig: () => ({
    instanceRoot: getLocalInstanceRoot(),
  }),
});

module.exports = instanceService;
