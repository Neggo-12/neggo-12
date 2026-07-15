# Neggo — Reglas del Proyecto

## Verificación — regla de oro
NUNCA dar por confirmado que algo funciona sin evidencia real (resultado de SQL, o prueba real en el navegador). "Compiló limpio" no es lo mismo que "funciona". Antes de decir "confirmado", correr una consulta de verificación.

## TypeScript
Usar SIEMPRE: npx tsc --noEmit -p tsconfig.app.json
NUNCA usar: npx tsc --noEmit -p . (el tsconfig raíz es "solution-style", no revisa nada sin --build)

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
