# Garage Car Services - Landing de premiacion

Landing estatica pensada para GitHub Pages con backend en Supabase:

- landing sorpresa con entrada animada
- validacion automatica del QR como primer paso
- formulario progresivo con nombre, apellido, DUI, WhatsApp y correo
- bloqueo automatico de registros desde el 16 de mayo de 2026
- terminos imprimibles
- panel administrador con autenticacion
- correo de confirmacion posterior al registro

## Estructura

- `index.html`: landing publica
- `admin.html`: panel administrador
- `styles.css`: identidad visual
- `app.js`: flujo del participante
- `admin.js`: flujo del administrador
- `config.js`: configuracion de Supabase y fechas
- `supabase/schema.sql`: tablas, RLS y funciones
- `supabase/functions/send-claim-email/index.ts`: correo de confirmacion

## 1. Flujo publico actual

1. La persona entra por un QR valido.
2. La pagina detecta y valida ese QR en Supabase.
3. Solo si el codigo sigue libre, se despliega el formulario.
4. La persona completa:
   - nombre
   - apellido
   - DUI
   - WhatsApp
   - correo electronico
5. Al guardar, Supabase vuelve a validar el mismo codigo para evitar registros dobles.
6. Si el registro se completa, se muestran terminos y se intenta enviar el correo.

## 2. Lo que valida Supabase

- que el codigo exista
- que el codigo este activo
- que el codigo no haya sido usado antes
- que el registro siga abierto antes del 16 de mayo de 2026
- que el DUI tenga formato valido
- que el WhatsApp tenga formato valido
- que el correo tenga formato valido

## 3. Configurar Supabase

1. Crea el proyecto en Supabase.
2. Ejecuta completo [schema.sql](./supabase/schema.sql) desde `SQL Editor`.
   Ahí mismo se crea o actualiza la columna `public.promotion_claims.whatsapp_phone`.
3. En `Authentication > Providers`, habilita para el admin solo:
   - `Email`
4. En `Authentication > URL Configuration`, agrega estas URLs:
   - `https://TU-USUARIO.github.io/TU-REPO/`
   - `https://TU-USUARIO.github.io/TU-REPO/index.html`
   - `https://TU-USUARIO.github.io/TU-REPO/admin.html`
5. Crea el usuario administrador en `Authentication > Users` con correo y contrasena.
6. Autoriza ese mismo correo en la tabla `public.admin_users`.
7. Copia tu `Project URL` y tu `anon public key`.
8. Edita [config.js](./config.js) con esos valores.

## 4. Fechas ya validadas

- cierre de registros: `16 de mayo de 2026 a las 11:59 p. m.`
- fecha limite para canje: `31 de mayo de 2026`

La validacion existe en dos capas:

- frontend: deja de desplegar el proceso de registro
- backend: `validate_promo_code` y `claim_promotion` bloquean el avance

## 5. QR con codigo secreto

Si es viable y ya esta contemplado.

Ejemplo:

```text
https://tu-usuario.github.io/tu-repo/?code=GARAGE-2026-001
```

La landing detecta `code` y lo valida antes de mostrar el formulario.

## 6. Cargar codigos secretos

```sql
insert into public.promo_codes (code)
values
  ('GARAGE-2026-001'),
  ('GARAGE-2026-002'),
  ('GARAGE-2026-003');
```

## 7. Autorizar administradores

```sql
insert into public.admin_users (email)
values ('admin@garage.com');
```

## 8. Correo de confirmacion al registrarse

La landing llama una `Edge Function` de Supabase despues del registro:

- `send-claim-email`

### Opcion A: Gmail sin dominio propio

Si no tienes dominio propio, puedes usar la cuenta `ventas.garagecarservices@gmail.com`
con `Google Apps Script`.

1. Abre `script.google.com`.
2. Crea un proyecto nuevo.
3. Copia el contenido de [google-apps-script.gs](./supabase/functions/send-claim-email/google-apps-script.gs).
4. Reemplaza `WEBHOOK_SECRET` por una cadena larga y privada.
5. Despliega como app web:
   - `Deploy > New deployment`
   - tipo: `Web app`
   - ejecutar como: `Me`
   - acceso: `Anyone`
6. Copia la URL publicada.
7. En `Supabase > Edge Functions > Secrets`, crea:

```text
GOOGLE_APPS_SCRIPT_WEBHOOK_URL=tu_url_publicada_de_apps_script
GOOGLE_APPS_SCRIPT_SHARED_SECRET=el_mismo_secreto_que_pegaste_en_apps_script
```

### Opcion B: Resend con dominio propio

Si despues compras un dominio, puedes volver a la opcion mas robusta con Resend:

```text
RESEND_API_KEY=tu_api_key
CLAIM_EMAIL_FROM=Garage Car Services <promos@tudominio.com>
```

### Desplegar la funcion

La funcion `send-claim-email` ya soporta ambos caminos:

- Gmail por `Google Apps Script`
- Resend con dominio propio

Si tienes Supabase CLI:

```bash
supabase functions deploy send-claim-email
```

Si no tienes CLI, puedes desplegarla desde `Supabase > Edge Functions` usando el editor.

La funcion:

- recibe `claimId`
- busca el registro con service role
- evita enviar el correo dos veces
- envia confirmacion, terminos y forma de canje
- usa Gmail si existe `GOOGLE_APPS_SCRIPT_WEBHOOK_URL`
- si no, usa Resend

## 9. Publicacion en GitHub Pages

1. Sube el repo a GitHub.
2. Deja la rama principal como `main`.
3. En `Settings > Pages > Build and deployment`, usa `GitHub Actions`.
4. El workflow incluido publicara la landing automaticamente.

## 10. Recomendaciones importantes

- La verdadera seguridad del flujo esta en que el codigo solo pueda reclamarse una vez en Supabase.
- Aunque un QR se comparta, el segundo intento quedara bloqueado si el primero ya registro el codigo.
- Si quieres un control mas fino por cliente, el siguiente paso seria emitir un QR distinto por participante.

## 11. Pendiente para dejarlo en produccion

- reemplazar `config.js` con tus llaves reales
- cargar codigos de promocion
- cargar correos admin
- desplegar la edge function de correo
- probar un QR libre y luego reintentar con el mismo QR para confirmar el bloqueo
