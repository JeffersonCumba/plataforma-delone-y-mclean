const mysql = require('mysql2/promise');

async function check() {
  const conn = await mysql.createConnection({host:'localhost',user:'root',password:'admin',database:'moodle'});
  const [users] = await conn.execute('SELECT id, username, email FROM mdl_user WHERE id IN (2, 20, 21)');
  console.log('Usuarios trial:', users);
  
  const [courses] = await conn.execute('SELECT id, fullname, shortname FROM mdl_course WHERE id != 1');
  console.log('Cursos:', courses);
  
  const [teacherCourses] = await conn.execute(`
    SELECT DISTINCT ctx.instanceid AS courseid, ra.userid
    FROM mdl_role_assignments ra
    JOIN mdl_context ctx ON ctx.id = ra.contextid AND ctx.contextlevel = 50
    WHERE ra.roleid = 4 AND ra.userid IN (2, 20, 21)
  `);
  console.log('Cursos por profesor:', teacherCourses);
  
  await conn.end();
}
check();