Ahora, por favor haz la siguiente auditoria, como se esta manejando la eliminacion de cursos y la creacion de los mismos? si empezamos el sistema de 0, primero alguien se registra, al registrarse se crea su usario en la db de moodle, luego inicia sesion y crea un curso con preguntas predeterminadas, luego matricula encuestados en ese curso y al matricularlos tambien se les crea su user y passowrd en la db, hasta ahi todo bien, pero que pasa si creo otro curso y matriculo a los mismo estudiantes, se supone que esos users ya estan en la db y solo deberian matricularse, y luego al eliminar un curso, solo deberia eliminarse el curso y sus preguntas relacionadas a ese curso,mas no el usuaro y contra de los encuestados porque pueden estar mtariculados en otro curso.
+ Thought: 1.6s
→Read app\dashboard\cursos\actions.ts 
→Read app\dashboard\encuestados\matricular\page.tsx 
✱Glob "**/actions.ts" (1 match)
✱Glob "**/lib/moodle*.ts" (1 match)
→Read app\dashboard\_components\CSVUploader.tsx 
→Read services\courseService.ts 
✱Glob "**/services/**/*.ts" (6 matches)
→Read lib\moodle.ts 
→Read services\userService.ts 
+ Thought: 48.0s
Hice una auditoria del flujo completo: registro → curso → matriculación → eliminación. Acá lo encontrado, qué funciona bien y qué riesgos hay.
Lo que está bien
1. Creación de curso con feedback base — services/courseService.ts:209 (createDefaultFeedbackInCourse) crea la actividad feedback con las 21 preguntas DeLone & McLean agrupadas por dimensión (label), usa la presentación Likert de 5 niveles y la agrega al section 0 del curso. El teacher queda auto-matriculado con enrol_manual_enrol_users (courseService.ts:358) y se le asigna el rol de profesor con core_role_assign_roles (courseService.ts:366).
2. Matriculación idempotente por email — services/userService.ts:128 busca primero por email en mdl_user WHERE deleted = 0; si existe reusa el userId y solo lo matricula con enrol_manual_enrol_users (userService.ts:131). Devuelve created: false, skipped: "El usuario ya existia y se matriculo en el curso". La contraseña del CSV no se sobreescribe (el password solo se pasa en core_user_create_users, que solo se llama para usuarios nuevos). 
3. Eliminación de curso preserva usuarios — actions.ts:99 usa core_course_delete_courses, que internamente llama a delete_course() de Moodle. Eso borra en cascada mdl_course_modules, mdl_enrol, role_assignments, mdl_course_sections, mdl_feedback y por FK mdl_feedback_item. No toca mdl_user (los usuarios son globales en Moodle). El Dialog de confirmación en course-card.tsx:129 solo avisa del curso, lo cual es coherente.
Lo que es un riesgo real
1. SQL directo sobre tablas de Moodle — createDefaultFeedbackInCourse (courseService.ts:209-316) hace INSERT/UPDATE manual en mdl_feedback, mdl_feedback_item, mdl_course_sections, mdl_course_modules y mdl_context (incluyendo el cálculo manual de path y depth). Esto:
- Se salta el sistema de eventos y cache de Moodle
- Queda frágil si Moodle cambia el esquema
- No limpia si algo falla a mitad de transacción (sí hay beginTransaction + commit/rollback, pero solo cubre hasta el INSERT INTO mdl_context)
Alternativa correcta: usar core_course_create_courses + core_course_add_module_from_template o los WS de mod_feedback_add_feedback + mod_feedback_add_item (o el endpoint de template de feedback que clona un feedback base).
2. Búsqueda por email es sensible a la collation — userService.ts:75:
"SELECT id, email, username FROM mdl_user WHERE email = ? AND deleted = 0 LIMIT 1"
Si la columna está en utf8mb4_bin, Juan@x.com no matchea con juan@x.com y se crearía un usuario duplicado. Moodle usa case-insensitive en su lógica de auth pero la columna email puede variar. Hay que normalizar a LOWER(email) = LOWER(?) o forzar la collation a utf8mb4_unicode_ci.
3. Email colisiona entre personas — Dos personas distintas con el mismo email (typo, dominio distinto) comparten cuenta. La unicidad real de Moodle es username + email, pero acá solo se valida email. Sugerencia: o bien bloquear si el email coincide pero el username/firstname no, o bien normalizar a la hora de buscar.
4. CSV con filas duplicadas — CSVUploader.tsx:167 itera sin dedupe; si suben un CSV con el mismo email dos veces, la segunda llamada a enrol_manual_enrol_users es idempotente en Moodle (re-asigna el rol), pero el contador created/skipped/enrolled queda inflado y el toast reporta números raros.
5. El dialog de eliminación no advierte sobre la perdida de respuestas — course-card.tsx:129-156 dice "se eliminara el curso de Moodle y del dashboard" pero no avisa explícitamente que se perderán todas las respuestas de mdl_feedback_value y mdl_feedback_completed asociadas. Para una tesis eso es un dato valioso.
6. No hay endpoint de "soft delete" o "archivar" — core_course_delete_courses es destructivo. Si el profesor se arrepiente, no hay vuelta atrás. Para un workflow de tesis, convendría un core_course_update_courses que pase visible = 0 o enddate en lugar de borrar.
7. La acción deleteCourseAction revalida /dashboard/cursos/${courseId} después de borrar — actions.ts:104-106 revalida paths de un curso que ya no existe. No rompe nada (Next solo invalida), pero es ruido.
Recomendaciones concretas
#	Cambio
1	Reemplazar createDefaultFeedbackInCourse por core_course_add_module_from_template o mod_feedback_* WS
2	Cambiar findUserByEmail a LOWER(email) = LOWER(?)
3	Dedupe el CSV por email antes de iterar
4	Sumar un step "soft archive" (visible = 0) en lugar de borrar directo, o pedir tipear el nombre del curso para confirmar
5	Cambiar el texto del Dialog a "se eliminara el curso, sus preguntas y todas las respuestas de la encuesta"
6	Verificar en Moodle con SHOW CREATE TABLE mdl_feedback_item\G que el FK feedback tiene ON DELETE CASCADE (debería, pero confirmarlo en la instancia)
¿Querés que implemente algunos de estos cambios? Sugiero arrancar por el #2 (LOWER email) y #5 (texto del dialog) que son triviales, y dejar el #1 (refactor del feedback a WS) para cuando definamos el resto.