-- Evidencia propia de Neggo de cada verificación de identidad/contacto que se
-- corre contra el microservicio externo (ver docs/microservicio-verificacion-
-- externo.md). Se persiste SIEMPRE, sin importar si el cliente termina
-- aprobado, rechazado, o aprobado-con-alerta (ej. un hallazgo tipo "demanda
-- alimentaria" que no bloquea el registro pero debe quedar registrado para
-- seguimiento). Esta tabla es la fuente de Neggo, independiente de lo que
-- devuelva el microservicio externo en el momento — el microservicio no
-- guarda histórico propio por diseño (minimización de datos, Ley 1581).
--
-- Es un cambio de estado sensible (determina si alguien puede registrarse),
-- así que sigue el mismo patrón que registrar_b2c_completo/registrar_b2b_completo:
-- ningún INSERT directo desde el cliente, todo pasa por una función
-- SECURITY DEFINER. A diferencia de eventos_uso_cliente (analítica no
-- sensible con INSERT abierto), acá NO hay policy de INSERT para
-- authenticated/anon — la única vía de escritura es la función de abajo.
--
-- tipo_verificacion es texto libre (no CHECK enum) a propósito: se espera
-- sumar tipos nuevos (antecedentes, financiero, enriquecimiento) sin requerir
-- una migración de esquema cada vez. Los valores conocidos hoy:
--   'compliance_ofac_onu', 'contacto_email', 'contacto_telefono'

CREATE TABLE public.verificaciones_identidad_cliente (
  id text PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  tipo_documento text NOT NULL,
  numero_documento text NOT NULL,
  nombres text,
  apellidos text,
  tipo_verificacion text NOT NULL,
  fuente text NOT NULL,
  resultado_crudo jsonb,
  nivel_riesgo text CHECK (nivel_riesgo IN ('bajo', 'medio', 'alto')),
  decision text NOT NULL CHECK (decision IN ('aprobado', 'rechazado', 'aprobado_con_alerta', 'pendiente_revision')),
  motivo_decision text,
  revisado_por text REFERENCES public.users(id),
  user_id text REFERENCES public.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_verificaciones_identidad_documento
  ON public.verificaciones_identidad_cliente (tipo_documento, numero_documento, created_at DESC);

CREATE INDEX idx_verificaciones_identidad_user
  ON public.verificaciones_identidad_cliente (user_id)
  WHERE user_id IS NOT NULL;

ALTER TABLE public.verificaciones_identidad_cliente ENABLE ROW LEVEL SECURITY;

-- Solo admin puede leer el detalle — sin policy de INSERT: solo la función
-- SECURITY DEFINER de abajo puede escribir acá.
CREATE POLICY verificaciones_identidad_select_admin
  ON public.verificaciones_identidad_cliente
  FOR SELECT
  TO public
  USING (public.is_platform_admin());

-- Registra el resultado de una verificación. Se llama ANTES de que exista la
-- cuenta (durante el chequeo en segundo plano al llenar el formulario), así
-- que debe ser alcanzable por anon Y authenticated — no depende de auth.uid().
--
-- p_user_id se deja NULL en la primera llamada (todavía no existe la cuenta);
-- se puede actualizar después vía UPDATE controlado si hace falta vincular el
-- registro ya creado — no se cubre en esta migración, es mejora futura si
-- resulta necesaria.
CREATE OR REPLACE FUNCTION public.registrar_resultado_verificacion(
  p_tipo_documento text,
  p_numero_documento text,
  p_nombres text,
  p_apellidos text,
  p_tipo_verificacion text,
  p_fuente text,
  p_resultado_crudo jsonb,
  p_nivel_riesgo text,
  p_decision text,
  p_motivo_decision text DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_id text;
BEGIN
  IF p_tipo_documento IS NULL OR p_numero_documento IS NULL THEN
    RAISE EXCEPTION 'tipo_documento y numero_documento son obligatorios.';
  END IF;

  IF p_decision NOT IN ('aprobado', 'rechazado', 'aprobado_con_alerta', 'pendiente_revision') THEN
    RAISE EXCEPTION 'decision inválida: %', p_decision;
  END IF;

  INSERT INTO public.verificaciones_identidad_cliente (
    tipo_documento, numero_documento, nombres, apellidos,
    tipo_verificacion, fuente, resultado_crudo, nivel_riesgo,
    decision, motivo_decision
  )
  VALUES (
    p_tipo_documento, p_numero_documento, p_nombres, p_apellidos,
    p_tipo_verificacion, p_fuente, p_resultado_crudo, p_nivel_riesgo,
    p_decision, p_motivo_decision
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$function$;

-- Alcanzable pre-cuenta (registro en curso) y post-cuenta.
GRANT EXECUTE ON FUNCTION public.registrar_resultado_verificacion TO anon, authenticated;

-- NOTA — pendiente, NO incluido en esta migración a propósito:
-- Conectar esto como bloqueo real en registrar_b2c_completo/registrar_b2b_completo
-- requiere: (1) que el chequeo de compliance esté realmente conectado (hoy
-- CSL/OFAC es un TODO sin terminar en el microservicio, solo ONU funciona), y
-- (2) que Jhey confirme la política fail-open vs fail-closed si el
-- microservicio está caído. Hacerlo antes de eso daría una falsa sensación de
-- protección real. Ver docs/microservicio-verificacion-externo.md.
