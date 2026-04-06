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

## Desarrollo

```bash
pnpm dev
```

Abrir `http://localhost:3000`.

## Flujo de login implementado

1. El usuario accede a `/auth/login`.
2. El formulario hace `POST` a `/api/auth/login`.
3. El Route Handler consulta Moodle con `core_user_get_users_by_field`.
4. Si el usuario existe y esta activo, se emite cookie HttpOnly (`dlm_session`).
5. `middleware.ts` protege `/dashboard` y redirige al login si no hay sesion valida.

## Nota de alcance actual

La fase inicial valida existencia de usuario por email usando Moodle. La
validacion criptografica del password contra Moodle requiere un flujo adicional
de autenticacion en Moodle (plugin/endpoint especifico).
