async function handleHealth() {
  return {
    statusCode: 200,
    body: {
      ok: true,
      service: "anxos-agent",
      mode: "read-only",
      time: new Date().toISOString(),
    },
  };
}

module.exports = {
  handleHealth,
};
