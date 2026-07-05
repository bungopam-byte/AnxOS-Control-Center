const ACTIONS = [
  {
    actionId: "docker.start",
    displayName: "Docker start",
    description: "Start a Docker container.",
    permission: "docker:write",
    implemented: false,
  },
  {
    actionId: "docker.stop",
    displayName: "Docker stop",
    description: "Stop a Docker container.",
    permission: "docker:write",
    implemented: false,
  },
  {
    actionId: "docker.restart",
    displayName: "Docker restart",
    description: "Restart a Docker container.",
    permission: "docker:write",
    implemented: false,
  },
  {
    actionId: "amp.start",
    displayName: "AMP start",
    description: "Start an AMP instance.",
    permission: "amp:write",
    implemented: false,
  },
  {
    actionId: "amp.stop",
    displayName: "AMP stop",
    description: "Stop an AMP instance.",
    permission: "amp:write",
    implemented: false,
  },
  {
    actionId: "amp.restart",
    displayName: "AMP restart",
    description: "Restart an AMP instance.",
    permission: "amp:write",
    implemented: false,
  },
  {
    actionId: "backup.create",
    displayName: "Backup create",
    description: "Create a backup.",
    permission: "backups:write",
    implemented: false,
  },
  {
    actionId: "backup.restore",
    displayName: "Backup restore",
    description: "Restore a backup.",
    permission: "backups:write",
    implemented: false,
  },
  {
    actionId: "file.upload",
    displayName: "File upload",
    description: "Upload a file.",
    permission: "files:write",
    implemented: false,
  },
  {
    actionId: "file.delete",
    displayName: "File delete",
    description: "Delete a file.",
    permission: "files:write",
    implemented: false,
  },
];

const ACTIONS_BY_ID = new Map(ACTIONS.map((action) => [action.actionId, action]));

function listActions() {
  return ACTIONS.map((action) => ({
    actionId: action.actionId,
    displayName: action.displayName,
    description: action.description,
    permission: action.permission,
    implemented: action.implemented,
  }));
}

function getAction(actionId) {
  return ACTIONS_BY_ID.get(actionId) || null;
}

module.exports = {
  getAction,
  listActions,
};
