const instanceService = require("../../../../src/shared/instances/instanceServiceCore");
const { getConfig } = require("../../config");

instanceService.configureInstanceService({ getConfig });

module.exports = instanceService;
