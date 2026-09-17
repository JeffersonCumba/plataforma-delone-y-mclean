# Tesis DeLone y McLean

Aplicacion Next.js para evaluar software con el modelo DeLone y McLean,
integrando datos de Moodle mediante un backend proxy seguro.

## Requisitos

- Node.js 20+
- pnpm
- Moodle con webservices REST habilitados

## Variables de entorno

Configura el archivo `.env` con:

```env
MOODLE_URL=http://localhost/webservice/rest/server.php
MOODLE_TOKEN=tu_token_de_webservice
AUTH_SECRET=una_clave_larga_para_firmar_cookies
```

`AUTH_SECRET` debe tener al menos 32 caracteres y ser distinto en cada entorno. La plataforma usa esta clave para firmar la sesión privada de administradores y profesores.

## Desarrollo

```bash
pnpm dev
```

Abrir `http://localhost:3000`.

## Flujo de login implementado

1. El usuario accede a `/login`.
2. El formulario valida las credenciales contra la cuenta de Moodle.
3. El servidor consulta los roles asignados en Moodle.
4. Solo los administradores y usuarios con el rol docente configurado en Moodle pueden iniciar sesión; los estudiantes matriculados conservan su acceso a Moodle, pero no a esta aplicación.
5. Si la cuenta está autorizada, se emite una cookie HttpOnly firmada (`dlm_session`).
6. `proxy.ts` y la validación del servidor protegen `/dashboard` y redirigen al login si no hay una sesión válida.

## Nota de alcance actual

La fase inicial valida existencia de usuario por email usando Moodle. La
validacion criptografica del password contra Moodle requiere un flujo adicional
de autenticacion en Moodle (plugin/endpoint especifico).
