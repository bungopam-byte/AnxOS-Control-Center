const { createFileDownload, getFilesystemIdentity, listFiles, mutateFile, readTextFile, statPath } = require("../services/fileService");

function buildContentDisposition(filename) {
  const fallbackName = String(filename || "download")
    .replace(/["\r\n]/g, "_");
  const encodedName = encodeURIComponent(String(filename || "download"));

  return `attachment; filename="${fallbackName}"; filename*=UTF-8''${encodedName}`;
}

function getPathParam(url) {
  return url.searchParams.get("path") || "";
}

async function handleFilesList(url) {
  return {
    statusCode: 200,
    body: await listFiles(getPathParam(url)),
  };
}

async function handleFilesIdentity() {
  return {
    statusCode: 200,
    body: await getFilesystemIdentity(),
  };
}

async function handleFilesStat(url) {
  return {
    statusCode: 200,
    body: await statPath(getPathParam(url)),
  };
}

async function handleFilesRead(url) {
  return {
    statusCode: 200,
    body: await readTextFile(getPathParam(url)),
  };
}

async function handleFilesDownload(url) {
  const download = await createFileDownload(getPathParam(url));

  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Length": String(download.size),
      "Content-Disposition": buildContentDisposition(download.name),
      "Last-Modified": new Date(download.modified).toUTCString(),
      "Cache-Control": "no-store",
      "X-AnxHub-File-Name": encodeURIComponent(download.name),
      "X-AnxHub-File-Size": String(download.size),
    },
    stream: download.stream,
  };
}

async function handleFilesMutate(request) {
  let payload;
  try {
    payload = JSON.parse(request.body || "{}");
  } catch {
    throw Object.assign(new Error("INVALID_JSON"), { code: "INVALID_JSON", statusCode: 400 });
  }
  return { statusCode: 200, body: await mutateFile(payload.action, payload) };
}

module.exports = {
  handleFilesDownload,
  handleFilesIdentity,
  handleFilesList,
  handleFilesMutate,
  handleFilesRead,
  handleFilesStat,
};
