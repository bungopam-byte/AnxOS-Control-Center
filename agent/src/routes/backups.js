const {
  createBackup,
  deleteBackup,
  deleteSchedule,
  getBackupDownload,
  importBackup,
  listBackups,
  listSchedules,
  restoreBackup,
  saveSchedule,
} = require("../services/backupService");

function parseJsonBody(request) {
  if (!request.body) {
    return {};
  }

  try {
    return JSON.parse(request.body);
  } catch {
    const error = new Error("INVALID_JSON");
    error.code = "INVALID_JSON";
    error.statusCode = 400;
    throw error;
  }
}

function result(statusCode, body) {
  return { statusCode, body };
}

function errorResult(error) {
  return result(error.statusCode || 500, {
    error: {
      code: error.code || "BACKUP_REQUEST_FAILED",
      message: "Request failed.",
    },
  });
}

function getBackupIdFromPath(pathname, suffix = "") {
  const prefix = "/api/v1/backups/";

  if (!pathname.startsWith(prefix) || !pathname.endsWith(suffix)) {
    return null;
  }

  const raw = pathname.slice(prefix.length, suffix ? -suffix.length : undefined);
  return decodeURIComponent(raw.replace(/\/$/, ""));
}

async function handleBackups(request, url) {
  try {
    if (request.method === "GET" && (url.pathname === "/api/v1/backups" || url.pathname === "/api/v1/backups/list")) {
      return result(200, await listBackups({ instanceId: url.searchParams.get("instanceId") || "" }));
    }

    if (request.method === "POST" && url.pathname === "/api/v1/backups") {
      return result(201, await createBackup(parseJsonBody(request)));
    }

    if (request.method === "POST" && url.pathname === "/api/v1/backups/import") {
      return result(201, await importBackup(parseJsonBody(request)));
    }

    if (request.method === "POST" && url.pathname === "/api/v1/backups/restore") {
      return result(200, await restoreBackup(parseJsonBody(request)));
    }

    if (request.method === "GET" && url.pathname === "/api/v1/backups/schedules") {
      return result(200, await listSchedules());
    }

    if (request.method === "PUT" && url.pathname === "/api/v1/backups/schedules") {
      return result(200, await saveSchedule(parseJsonBody(request)));
    }

    const scheduleId = getBackupIdFromPath(url.pathname, "/schedule");
    if (request.method === "DELETE" && scheduleId) {
      return result(200, await deleteSchedule(scheduleId));
    }

    const downloadId = getBackupIdFromPath(url.pathname, "/download");
    if (request.method === "GET" && downloadId) {
      const download = await getBackupDownload(downloadId);
      return {
        statusCode: 200,
        stream: download.stream,
        headers: download.headers,
      };
    }

    const deleteId = getBackupIdFromPath(url.pathname);
    if (request.method === "DELETE" && deleteId) {
      return result(200, await deleteBackup(deleteId));
    }

    return result(404, {
      error: {
        code: "NOT_FOUND",
        message: "Request failed.",
      },
    });
  } catch (error) {
    return errorResult(error);
  }
}

async function handleBackupsList() {
  return result(200, await listBackups());
}

module.exports = {
  handleBackups,
  handleBackupsList,
};
