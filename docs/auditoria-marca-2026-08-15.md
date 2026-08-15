# Auditoría de Marca — 15 de agosto 2026

Ejecutada por el Agente de Marca & Identidad Corporativa, corrida quincenal automática (sin
Jhey presente). Cubre: (A) verificación en vivo de neggo.co contra los hallazgos del 3 ago,
(B) verificación en vivo de Instagram y Facebook, (C) pendientes, (D) hallazgos nuevos con
orden ya redactada para aprobación de Jhey.

Fuentes: `docs/manual-marca-neggo.md`, `docs/auditoria-marca-2026-08-03.md`,
`docs/orden-acento-unico-2026-08-03.md`, `docs/auditoria-redes-2026-08-03.md`. Verificación
en vivo vía Claude in Chrome (extensión conectada, sesión con sesión iniciada en Instagram y
Facebook) + lectura de código fuente real (no solo inferencia visual) para las páginas web.

## A. Qué se corrigió desde el 3 de agosto (evidencia real)

1. **Acento único (web) — corregido y confirmado en producción.** Cargué `neggo.co` real y
   scrolleé hasta "¿Qué buscás hoy?": las 4 `AudienceCard` (Banco/Constructora/Comercio/
   Cliente) usan hoy el mismo ícono/badge verde esmeralda — ya no hay azul, púrpura ni ámbar
   decorativo. El gradiente del H1 del hero tampoco tiene el `to-blue-600` reportado el 3 ago
   ("sin caer en una **estafa**" se ve completo en tonos esmeralda). Confirmado con captura de
   pantalla real, no solo con el código. `git log` confirma el commit
   `e790573 fix: acento único verde esmeralda en superficies públicas`, que coincide
   exactamente con el alcance de `docs/orden-acento-unico-2026-08-03.md`.

2. **Voseo unificado en las 4 landings verticales — corregido y confirmado en producción.**
   Cargué en vivo `/corporativo/comercios`, `/landing/clientes`, `/landing/bancos` y
   `/landing/constructoras`: el copy principal de las 4 está en voseo colombiano consistente
   ("Ganá visibilidad", "Sabés exactamente qué se cobra", "Te registrás", "Accedé",
   "vos decidís a quién le compartís tus datos", "Contás qué buscás", "vos elegís el modelo",
   "Publicás", "Cerrás y pagás"). Coincide punto por punto con los cambios pedidos en la
   sección C de `docs/auditoria-marca-2026-08-03.md` (puntos 1-4). `git log` confirma el commit
   `90a1470 fix: unificar voseo colombiano en landings públicas`.

3. **`LoginEcosistema.tsx` — corregido, verificado en código fuente.** Línea 1806: "¿Sos un
   negocio o buscás algo para vos? **Elegí** abajo" (antes "Elige", mezcla voseo/tuteo en la
   misma oración — el hallazgo más flagrante del 3 ago). Líneas 1566/1570: "Bancos y productos
   que ya **tenés**" / "qué productos **tenés** activos" — también corregidas.

4. **Instagram (@neggo.co) — logo y bio corregidos, cuenta reactivada.** El avatar ya no es el
   logo azul "N neggo" viejo: es el ícono `Sparkles` verde esmeralda con glow, igual al lockup
   del manual (coincide con el archivo `avatar-neggo.png` exportado el 3 ago). Bio actualizada:
   "Tu aliado financiero en Medellín💚 Te protegemos de estafas con verificación
   anti-phishing🛡️ Conseguite las mejores..." — en voseo y con mención real de Medellín. La
   cuenta, inactiva desde agosto 2024 según el hallazgo del 3 ago, publicó una pieza nueva el
   **4 de agosto** ("¿Te da desconfianza comprarle a un negocio que no conocés?"): fondo
   oscuro, acento único esmeralda, voseo consistente ("no conocés", "sabés", "dudás",
   "Consultalo"), badge "VERIFICADO" — alineada al manual en cada checklist de la sección 5.

5. **Facebook (facebook.com/gruponeggo) — logo y bio corregidos.** Foto de portada y foto de
   perfil ya muestran el lockup verde esmeralda (ícono `Sparkles` con glow + wordmark "Neggo"),
   reemplazando el logo azul viejo — coincide con `facebook-cover-neggo.png` exportado el 3
   ago; el post "Neggo actualizó su foto del perfil" está fechado 3 de agosto a las 3:43 p.m.
   Bio corregida: "Neggo conecta comercios, bancos y constructoras con clientes ya verificados
   en **Medellín**... Te protegemos de estafas..." — ya no dice "Colombia y América Latina",
   resuelve la contradicción con el posicionamiento hiperlocal reportada el 3 ago.

## B. Qué sigue pendiente (sin cambios desde el 3 de agosto)

1. **Geografía real ausente en las 2 landings hiperlocales.** Verificado en vivo y en código
   (`grep` de "Medellín/Poblado/Laureles/Envigado/Sabaneta"): `/corporativo/comercios` y
   `/landing/clientes` — las dos páginas con ICP hiperlocal ya decidido — siguen sin mencionar
   Medellín ni ninguna comuna. Es el mismo vacío señalado como "de mayor prioridad" en la
   auditoría del 3 ago (punto B.2.7), no tocado en los dos commits de corrección.
2. **Fenalco / Cámara de Comercio / Camacol — cero mención, confirmado por `grep` en todo
   `web/src`.** Sigue como oportunidad futura, no urgente (condicionada a que exista un hecho
   real que citar).
3. **Enlace roto en Facebook — sin corregir.** La sección "Enlaces" del perfil de Facebook
   sigue mostrando `neggo.com.co` en vez de `neggo.co`, el mismo hallazgo del 3 ago.
4. **Tamaño real de I1/I2/I3 en Canva — sigue sin poder verificarse.** El conector de Canva
   (`plugin:small-business:canva`) sigue sin autorizar en esta sesión.
5. **Disclaimer de registro en tuteo, en 3 de las 4 landings B2B/B2C** (`/corporativo/
   comercios`, `/landing/bancos`, `/landing/constructoras`): "Al enviar esta solicitud,
   **aceptas** los términos y condiciones..." — no estaba en el alcance de la orden del 3 ago
   (que cubría solo las líneas ya listadas), así que no se tocó, pero es la misma inconsistencia
   de tono. Ver hallazgo nuevo #2 abajo — mismo texto exacto en dos archivos distintos.

## C. Hallazgos nuevos (no reportados el 3 de agosto)

1. **Instagram: solo 1 pieza nueva publicada en 12 días** (4 ago), y es la única desde la
   reactivación. No es un defecto de marca — la pieza que sí se publicó está bien alineada —
   pero la cadencia sigue siendo muy baja frente a lo esperado de una cuenta "reactivada".
   Highlight destacado "Ahorra así:" está en tuteo (imperativo "Ahorra" en vez de "Ahorrá") —
   inconsistencia menor de tono, no de código (es contenido publicado directo en Instagram).
2. **`web/src/components/auth/AuthForms.tsx` tiene una copia duplicada, sin corregir, del
   mismo texto que sí se corrigió en `LoginEcosistema.tsx`.** Verificado por `grep` en todo
   `web/src`:
   - `AuthForms.tsx:1083` — "Bancos y productos que ya **tienes**" (en `LoginEcosistema.tsx:1566`
     ya dice "ya **tenés**", corregido).
   - `AuthForms.tsx:1087` — "Selecciona tus bancos y, para cada uno, qué productos **tienes**
     activos." (en `LoginEcosistema.tsx:1570` ya dice "qué productos **tenés** activos",
     corregido; además "Selecciona" es imperativo de tuteo, debería ser "Seleccioná").
   - Confirmado en vivo: el formulario de registro de `/landing/clientes` ("BANCOS Y PRODUCTOS
     QUE YA TIENES") renderiza exactamente este texto sin corregir — es el componente que se
     ve en producción hoy.
   - Mismo patrón en el disclaimer de términos: `LoginEcosistema.tsx:897` y
     `AuthForms.tsx:623` tienen el string idéntico "Al enviar esta solicitud, **aceptas** los
     términos y condiciones..." — ninguno de los dos se corrigió (no estaba en el alcance
     original), pero como aparece en ambos archivos, conviene corregirlo en los dos a la vez.

## D. Orden técnica propuesta para `neggo-engineer` (pendiente de aprobación de Jhey)

**Alcance: solo texto (copy), 2 archivos, cero cambios de lógica.**

1. `web/src/components/auth/AuthForms.tsx`:
   - Línea 1083: "Bancos y productos que ya tienes" → "Bancos y productos que ya tenés"
   - Línea 1087: "Selecciona tus bancos y, para cada uno, qué productos tienes activos." →
     "Seleccioná tus bancos y, para cada uno, qué productos tenés activos."
   - Línea 623: "Al enviar esta solicitud, aceptas los términos y condiciones..." → "Al enviar
     esta solicitud, aceptás los términos y condiciones..."
2. `web/src/pages/LoginEcosistema.tsx`:
   - Línea 897: mismo cambio — "aceptas" → "aceptás".

**Verificación pedida al cerrar (regla de `CLAUDE.md`):** `npx tsc --noEmit -p
tsconfig.app.json` limpio, y cargar `neggo.co` real (no localhost) para confirmar visualmente
el copy corregido en el formulario de registro de `/landing/clientes` antes de declarar
"confirmado".

**Para Jhey (acción manual, no es código):** el enlace del perfil de Facebook
(facebook.com/gruponeggo → sección "Enlaces") sigue apuntando a `neggo.com.co`. Se corrige
directo en la configuración de la Página de Facebook, no requiere a Ingeniería.

## E. Pendiente para próxima revisión

- Confirmar si se corrige el enlace de Facebook y el copy de `AuthForms.tsx`.
- Revisar de nuevo la ausencia de geografía real en `/corporativo/comercios` y
  `/landing/clientes` — sigue siendo el vacío de mayor prioridad sin resolver desde el 3 ago.
- Confirmar tamaño real de I1/I2/I3 en Canva una vez autorizado el conector.
- Evaluar cadencia de publicación en Instagram — solo 1 pieza en el período.
