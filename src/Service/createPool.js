const mysql = require("mysql2/promise");
const { Connector } = require("@google-cloud/cloud-sql-connector");

const createPool = async () => {
  const connector = new Connector();

  const clientOpts = await connector.getOptions({
    instanceConnectionName: "capstonec242-ps168:asia-southeast2:refind-app",
    ipType: "PUBLIC",
  });

  return mysql.createPool({
    ...clientOpts,
    user: "refind",
    password: "root",
    database: "Refind",
  });
};

module.exports = createPool;
