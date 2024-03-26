const mysql = require('mysql2/promise');
const fs = require('mz/fs');
const path = require('path');
require('dotenv').config();

async function connect(){
  const connection = await mysql.createConnection({
    host     : process.env.HOST,
    user     : process.env.USERNAME,
    password : process.env.PASSWORD,
    database : process.env.DATABASE,
    port: process.env.DBPORT,
    ssl: {
      ca: await fs.readFile(path.resolve(__dirname, '../ca_aiven.pem'), 'utf-8')
    }
  });
  return connection;
}

module.exports = connect;
