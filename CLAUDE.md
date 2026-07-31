# Neggo — Reglas del Proyecto

## Verificación — regla de oro
NUNCA dar por confirmado que algo funciona sin evidencia real (resultado de SQL, o prueba real en el navegador). "Compiló limpio" no es lo mismo que "funciona". Antes de decir "confirmado", correr una consulta de verificación.

## Verificación de despliegue — regla de oro (no negociable)
El dashboard de Cloudflare mostrando una versión como "Active Deployment" con 100% de tráfico NO es evidencia de que el cambio se vea en producción — solo prueba que el build se subió. Confundir esto causó un incidente real (25 jul 2026): se declaró "deploy confirmado" sin haber cargado la página real, y el cambio no se veía ni en incógnito.
Antes de decir "confirmado" sobre CUALQUIER deploy:
1. Cargar la URL real de producción (neggo.co) con herramienta de navegador (Claude in Chrome) y verificar visualmente que el cambio específico está presente — no alcanza con `curl`/`fetch` a la home si el cambio está detrás de login o en una ruta interna.
2. Si no hay navegador disponible (extensión desconectada, sandbox sin acceso a internet), decirlo explícitamente y pedirle a Jhey que verifique él mismo con un paso concreto (qué URL abrir, qué botón tocar, qué debería ver) — nunca inferir éxito solo del pipeline de build/deploy.
3. Si el cambio no aparece pese a un deploy "exitoso", el primer sospechoso es un desajuste entre el dominio público y el proyecto/entorno de Cloudflare al que se deployó (dominios mal enrutados, proyecto equivocado, entorno preview vs producción) — verificarlo en la pestaña "Domains" del proyecto en Cloudflare antes de asumir caché de navegador.
4. Un "build exitoso" o "deploy exitoso" reportado por Claude Code en otra terminal tampoco es evidencia suficiente por sí solo — sigue aplicando el paso 1.

## TypeScript
Usar SIEMPRE: npx tsc --noEmit -p tsconfig.app.json
NUNCA usar: npx tsc --noEmit -p . (el tsconfig raíz es "solution-style", no revisa nada sin --build)

## Seguridad primero — regla de oro (no negociable)
Ante cualquier decisión de arquitectura, proveedor externo o integración, siempre se prioriza la opción de mayor seguridad/protección — incluso si es más cara, más lenta de implementar, o cubre menos casos que una alternativa. Nunca elegir un atajo (proveedor no autorizado, bypass de protecciones ajenas, fuente de datos de origen dudoso) solo por precio o velocidad. Si una opción barata/rápida depende de saltarse protecciones de un tercero (CAPTCHA, anti-bot, ToS) para conseguir datos, se descarta de plano para cualquier flujo de producción, sin importar cuánto ahorre — el riesgo legal, de continuidad y reputacional para un fintech vale más que el ahorro.

## Patrones de seguridad establecidos
- Cambios de estado sensibles (financieros, pipeline, facturación) SIEMPRE pasan por una función SECURITY DEFINER con guardas de transición explícitas — nunca un UPDATE directo desde el cliente.
- Toda función SECURITY DEFINER debe incluir SET search_path = public.
- Todo UPDATE debe verificar filas afectadas (.select('id') + chequeo de longitud) — un UPDATE bloqueado por RLS falla silenciosamente sin error, hay que detectarlo explícitamente.
- IDs del proyecto son siempre `text`, nunca `uuid` (excepto auth.uid() que es uuid nativo, requiere ::text al compararlo).
- Antes de escribir SQL nuevo que dependa de una función/tabla existente, verificar su definición real con una consulta — nunca asumir el esquema de memoria.

## Al aplicar SQL/columnas nuevas
Siempre sincronizar integrations/supabase/types.ts en el mismo paso — no dejarlo para después (ha causado errores repetidos de tipos desincronizados en esta sesión).

## Alcance de cambios
No expandir el alcance de una tarea sin decirlo explícitamente primero. Si un cambio requiere tocar algo fuera de lo pedido, señalarlo y esperar confirmación antes de aplicar.

## Commits
Agrupar en commits temáticos (no un commit gigante). Nunca incluir: .DS_Store, archivos de auditoría/notas personales, carpetas de respaldo temporal.

## Proceso — MCP de Supabase conectado a claude.ai
El proyecto de Supabase (idbyahyffuhvircgzpvg) ahora tiene un MCP conectado directamente a la conversación de claude.ai (no a Claude Code en terminal) — SQL puede aplicarse directo desde ahí. Sin importar cuál camino se use (MCP directo o copiar/pegar en el editor), todo cambio de esquema debe quedar respaldado como archivo de migración en supabase/migrations/, igual que siempre.

## Probar múltiples perfiles en desarrollo
Supabase Auth comparte UNA sola sesión por navegador vía localStorage — dos pestañas normales del mismo navegador nunca pueden estar logueadas como usuarios distintos al mismo tiempo (loguear una cuenta distinta en una pestaña sobrescribe el JWT de todas). Para probar dos perfiles a la vez, usa una ventana de incógnito para el segundo perfil (localStorage separado).
