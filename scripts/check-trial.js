const mysql = require('mysql2/promise');

async function check() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'admin',
    database: 'moodle'
  });
  
  const [rows] = await conn.execute('SELECT * FROM mdl_user_trial');
  console.log('mdl_user_trial:', rows);
  
  const [users] = await conn.execute('SELECT id, username, email FROM mdl_user WHERE username = "admin"');
  console.log('admin user:', users);
  
  await conn.end();
}

check();