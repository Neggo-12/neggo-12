import { Link } from 'react-router-dom';
import { ArrowLeft, AlertTriangle } from 'lucide-react';

export default function PoliticaDatos() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-8"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Volver a Neggo
        </Link>

        <div className="mb-8 flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-400 mt-0.5" />
          <p className="text-sm font-medium text-amber-400">
            BORRADOR — requiere revisión de abogado colombiano especializado en protección de datos
            antes de publicación y lanzamiento.
          </p>
        </div>

        <article className="space-y-8 text-sm leading-relaxed text-foreground">
          <header>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Política de Tratamiento de Datos Personales — Neggo
            </h1>
          </header>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-foreground">1. Identificación del Responsable del Tratamiento</h2>
            <p><span className="font-medium text-foreground">Razón social:</span> Neggo</p>
            <p><span className="font-medium text-foreground">NIT:</span> [NIT]</p>
            <p><span className="font-medium text-foreground">Domicilio:</span> [dirección], Medellín, Colombia</p>
            <p><span className="font-medium text-foreground">Correo de contacto para asuntos de protección de datos:</span> [correo de contacto]</p>
            <p className="text-muted-foreground">
              Neggo (en adelante, "el Responsable" o "Neggo") es responsable del tratamiento de los datos
              personales de sus usuarios (clientes, comercios, bancos y constructoras aliadas) conforme a
              la normativa colombiana de protección de datos personales.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-foreground">2. Marco Legal</h2>
            <p className="text-muted-foreground">Esta política se rige por:</p>
            <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
              <li><span className="font-medium text-foreground">Ley 1581 de 2012</span> — Régimen General de Protección de Datos Personales de Colombia.</li>
              <li><span className="font-medium text-foreground">Decreto 1377 de 2013</span> — Reglamentario de la Ley 1581 de 2012, que establece los requisitos para el aviso de privacidad, las autorizaciones y las políticas de tratamiento.</li>
              <li><span className="font-medium text-foreground">Ley 1266 de 2008</span> — Régimen de Habeas Data aplicable específicamente a datos financieros, crediticios y comerciales (relevante para la información de score estimado, rango de ingresos, y las solicitudes de productos financieros que Neggo intermedia con bancos y constructoras).</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-foreground">3. Definiciones</h2>
            <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
              <li><span className="font-medium text-foreground">Dato personal:</span> cualquier información vinculada o que pueda asociarse a una o varias personas naturales determinadas o determinables.</li>
              <li><span className="font-medium text-foreground">Dato sensible:</span> dato personal que afecta la intimidad del titular o cuyo uso indebido puede generar discriminación (ej. datos de salud, origen étnico, orientación sexual). Neggo no recolecta datos sensibles como parte de su operación ordinaria.</li>
              <li><span className="font-medium text-foreground">Titular:</span> persona natural cuyos datos personales son objeto de tratamiento (cliente, usuario de un comercio, representante de un banco/constructora/comercio aliado).</li>
              <li><span className="font-medium text-foreground">Tratamiento:</span> cualquier operación sobre datos personales, tales como recolección, almacenamiento, uso, circulación o supresión.</li>
              <li><span className="font-medium text-foreground">Autorización:</span> consentimiento previo, expreso e informado del titular para el tratamiento de sus datos personales.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-foreground">4. Datos Personales que Recolectamos</h2>
            <p className="text-muted-foreground">
              Neggo recolecta y trata los siguientes datos personales, correspondientes a lo que la
              plataforma efectivamente captura en su operación real:
            </p>

            <p className="font-medium text-foreground mt-3">Datos de identificación y contacto:</p>
            <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
              <li>Nombre completo</li>
              <li>Correo electrónico</li>
              <li>Número de teléfono</li>
              <li>Ciudad de residencia</li>
              <li>Tipo y número de documento de identidad</li>
            </ul>

            <p className="font-medium text-foreground mt-3">Datos financieros (sujetos también a la Ley 1266 de 2008):</p>
            <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
              <li>Rango de ingresos declarado por el titular</li>
              <li>Score financiero estimado</li>
            </ul>

            <p className="font-medium text-foreground mt-3">Datos sobre metas de ahorro (módulo "Metas/IFC"):</p>
            <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
              <li>Categoría y subcategoría de la meta (ej. vivienda, vehículo, educación)</li>
              <li>Monto objetivo de ahorro</li>
              <li>Monto ahorrado y aporte mensual</li>
              <li>Estado de la meta (activa, completada, eliminada)</li>
            </ul>

            <p className="font-medium text-foreground mt-3">Datos de solicitudes de productos financieros (módulo "Me Interesa"):</p>
            <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
              <li>Tipo de producto solicitado (crédito, vivienda, u otro producto bancario)</li>
              <li>Entidades (bancos, constructoras o comercios) seleccionadas por el titular para recibir la solicitud</li>
              <li>Estado de gestión de la solicitud dentro del pipeline comercial del banco/constructora/comercio receptor</li>
            </ul>

            <p className="font-medium text-foreground mt-3">Datos de compras y facturación:</p>
            <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
              <li>Facturas de compra (monto, fecha de compra, y documento adjunto cuando el comercio lo registra) asociadas a ofertas aceptadas por el titular sobre sus propias metas de ahorro.</li>
            </ul>

            <p className="font-medium text-foreground mt-3">Datos de negocios de interés no registrados:</p>
            <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
              <li>Nombre del negocio deseado, sector y datos de contacto, cuando el titular manifiesta interés en un negocio que aún no está registrado en Neggo.</li>
            </ul>

            <p className="text-muted-foreground mt-3">
              Neggo <span className="font-medium text-foreground">no</span> recolecta datos sensibles (salud, origen étnico,
              convicciones religiosas o políticas, orientación sexual) como parte de su operación.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-foreground">5. Finalidades del Tratamiento</h2>
            <p className="text-muted-foreground">Los datos personales recolectados se tratan para las siguientes finalidades:</p>
            <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
              <li>Conectar a los titulares (clientes) con bancos, constructoras y comercios aliados, de acuerdo con las solicitudes y preferencias expresadas por el titular.</li>
              <li>Generar y enrutar leads comerciales hacia las entidades que el titular selecciona explícitamente, siempre con la autorización previa del titular.</li>
              <li>Permitir que comercios aliados envíen ofertas sobre las metas de ahorro del titular, y que el titular pueda ver, aceptar o rechazar dichas ofertas.</li>
              <li>Registrar facturas de compras reales derivadas de ofertas aceptadas, para efectos de completar automáticamente las metas de ahorro del titular.</li>
              <li>Enviar notificaciones por correo electrónico relacionadas con eventos relevantes de la plataforma (nuevas ofertas, cambios de estado en solicitudes, facturación).</li>
              <li>Gestionar la facturación y cobro de los servicios de intermediación que Neggo presta a sus negocios aliados (bancos, constructoras, comercios).</li>
              <li>Cumplir con obligaciones legales, regulatorias y de auditoría aplicables a la operación de Neggo.</li>
              <li>Mejorar la plataforma y sus algoritmos de emparejamiento entre oferta y demanda.</li>
            </ol>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-foreground">6. Derechos del Titular</h2>
            <p className="text-muted-foreground">
              De conformidad con la Ley 1581 de 2012, el titular de los datos personales tiene derecho a:
            </p>
            <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
              <li><span className="font-medium text-foreground">Conocer, actualizar y rectificar</span> sus datos personales frente al Responsable.</li>
              <li><span className="font-medium text-foreground">Solicitar prueba</span> de la autorización otorgada para el tratamiento de sus datos.</li>
              <li><span className="font-medium text-foreground">Ser informado</span>, previa solicitud, respecto del uso que se ha dado a sus datos personales.</li>
              <li><span className="font-medium text-foreground">Presentar quejas</span> ante la Superintendencia de Industria y Comercio (SIC) por infracciones a la normativa de protección de datos.</li>
              <li><span className="font-medium text-foreground">Revocar la autorización</span> y/o solicitar la <span className="font-medium text-foreground">supresión</span> del dato, cuando en el tratamiento no se respeten los principios, derechos y garantías constitucionales y legales.</li>
              <li><span className="font-medium text-foreground">Acceder de forma gratuita</span> a sus datos personales que hayan sido objeto de tratamiento.</li>
            </ul>
            <p className="text-muted-foreground mt-3">
              <span className="font-medium text-foreground">Canal para ejercer estos derechos:</span> el titular puede ejercer
              cualquiera de estos derechos escribiendo a [correo de contacto], indicando su nombre completo,
              documento de identidad, y una descripción clara de la solicitud. Neggo dará respuesta dentro
              de los términos establecidos por la Ley 1581 de 2012 (máximo 10 días hábiles para consultas,
              prorrogables; máximo 15 días hábiles para reclamos).
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-foreground">7. Transferencia y Transmisión de Datos a Terceros</h2>
            <p className="text-muted-foreground">
              Neggo comparte datos personales con terceros únicamente en los siguientes escenarios, y
              siempre bajo autorización del titular:
            </p>
            <p className="text-muted-foreground mt-3">
              <span className="font-medium text-foreground">Módulo "Me Interesa":</span> cuando el titular crea una solicitud
              de producto financiero, sus datos de contacto y la información de la solicitud se comparten{' '}
              <span className="font-medium text-foreground">directamente con los bancos, constructoras o comercios
              específicos que el titular elige</span> al momento de crear la solicitud. El titular controla
              explícitamente a qué entidades se envía su información.
            </p>
            <p className="text-muted-foreground mt-3">
              <span className="font-medium text-foreground">Módulo "Metas/IFC" (antes de aceptar una oferta):</span> mientras
              una meta de ahorro tiene el Sello IFC activo, los comercios aliados que califican por categoría
              pueden ver la existencia y características de la meta (monto, categoría, capacidad de ahorro)
              de forma <span className="font-medium text-foreground">completamente anónima</span> — sin acceso al nombre,
              identidad, ni datos de contacto del titular. La identidad del titular solo se revela a un
              comercio específico en el momento en que el <span className="font-medium text-foreground">titular acepta
              explícitamente una oferta</span> enviada por ese comercio.
            </p>
            <p className="text-muted-foreground mt-3">
              <span className="font-medium text-foreground">Terceros proveedores de infraestructura:</span> ver sección 9.
            </p>
            <p className="text-muted-foreground mt-3">
              Neggo no vende ni comercializa datos personales de sus titulares a terceros con fines
              distintos a los aquí descritos.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-foreground">8. Medidas de Seguridad</h2>
            <p className="text-muted-foreground">
              Neggo implementa las siguientes medidas técnicas y organizativas para proteger los datos
              personales bajo su tratamiento:
            </p>
            <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
              <li><span className="font-medium text-foreground">Cifrado en tránsito</span>, mediante conexiones HTTPS/TLS para toda comunicación entre los clientes y la plataforma.</li>
              <li><span className="font-medium text-foreground">Cifrado en reposo</span> de la base de datos y del almacenamiento de documentos.</li>
              <li><span className="font-medium text-foreground">Row-Level Security (RLS) con aislamiento multi-tenant</span>: cada organización (banco, constructora, comercio) y cada cliente solo puede acceder a los datos que le corresponden, aplicado a nivel de base de datos, no solo de aplicación.</li>
              <li><span className="font-medium text-foreground">Control de acceso basado en roles y autenticación</span>, con verificación de identidad antes de exponer cualquier dato personal.</li>
              <li><span className="font-medium text-foreground">Registros de auditoría</span> sobre operaciones sensibles (cambios de estado financiero, actualizaciones de registros).</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-foreground">9. Proveedores de Infraestructura y Transferencia Internacional</h2>
            <p className="text-muted-foreground">
              Para operar la plataforma, Neggo utiliza los siguientes proveedores de infraestructura
              tecnológica, algunos de los cuales pueden implicar el procesamiento o almacenamiento de datos
              personales fuera del territorio colombiano:
            </p>
            <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
              <li><span className="font-medium text-foreground">Supabase / AWS</span> — infraestructura de base de datos, autenticación y almacenamiento de archivos.</li>
              <li><span className="font-medium text-foreground">Resend</span> — servicio de envío de correos electrónicos transaccionales y notificaciones.</li>
              <li><span className="font-medium text-foreground">Cloudflare</span> — infraestructura de red, seguridad y distribución de contenido.</li>
            </ul>
            <p className="text-muted-foreground mt-3">
              Cuando el tratamiento de datos personales implique una transferencia o transmisión
              internacional, Neggo verificará que el país de destino cuente con niveles adecuados de
              protección de datos personales, conforme a los estándares definidos por la Superintendencia
              de Industria y Comercio, o que existan las garantías contractuales correspondientes con dichos
              proveedores.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-foreground">10. Vigencia y Modificaciones</h2>
            <p className="text-muted-foreground">
              Esta política rige a partir de su fecha de publicación y permanecerá vigente mientras Neggo
              continúe realizando tratamiento de datos personales de sus titulares, y durante el tiempo
              adicional que sea necesario para el cumplimiento de obligaciones legales.
            </p>
            <p className="text-muted-foreground">
              Neggo se reserva el derecho de modificar esta política en cualquier momento, para adaptarla
              a novedades legislativas, políticas internas o nuevas finalidades del tratamiento. Cualquier
              cambio sustancial será comunicado a los titulares a través de los canales habituales de la
              plataforma (correo electrónico o aviso dentro de la aplicación) antes de su entrada en
              vigencia.
            </p>
          </section>
        </article>

        <div className="mt-10 flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-400 mt-0.5" />
          <p className="text-sm font-medium text-amber-400">
            BORRADOR — requiere revisión de abogado colombiano especializado en protección de datos
            antes de publicación y lanzamiento.
          </p>
        </div>
      </div>
    </div>
  );
}
