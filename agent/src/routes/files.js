const { listFiles, readTextFile, statPath } = require("../services/fileService");

function getPathParam(url) {
  return url.searchParams.get("path") || "";
}

async function handleFilesList(url) {
  return {
    statusCode: 200,
    body: await listFiles(getPathParam(url)),
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

module.exports = {
  handleFilesList,
  handleFilesRead,
  handleFilesStat,
};
