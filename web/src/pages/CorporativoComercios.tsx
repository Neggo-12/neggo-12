import { Store, Tag, ShieldCheck, Users, TrendingUp, Package, Star, Crown } from "lucide-react";
import { SectorPageLayout } from "@/components/auth/AuthForms";

export default function CorporativoComercios() {
  return (
    <SectorPageLayout
      sector="comercio"
      heroTitle="Conecta tu comercio con"
      heroHighlight="clientes verificados"
      heroSubtitle="Portal aliado comercial con gestión de ofertas, Sello de Confianza Neggo y conexión directa con clientes del ecosistema. Publica productos, gestiona solicitudes y crece con la red Neggo."
      benefits={["Sello de Confianza", "Ofertas publicables", "Clientes B2C verificados", "Gestión de solicitudes"]}
      features={[
        { icon: Tag, title: "Publicación de ofertas", description: "Crea y gestiona ofertas comerciales visibles para los clientes del ecosistema. Control total sobre productos, precios y disponibilidad." },
        { icon: ShieldCheck, title: "Sello de Confianza Neggo", description: "Distintivo verificable que acredita tu comercio dentro del ecosistema. Genera credibilidad y confianza con los clientes." },
        { icon: Users, title: "Conexión con clientes B2C", description: "Accede a clientes verificados del ecosistema Neggo que buscan productos y servicios de comercios aliados." },
        { icon: TrendingUp, title: "Métricas de desempeño", description: "Visualiza el rendimiento de tus ofertas, solicitudes recibidas y tasa de conversión en tu panel de control." },
        { icon: Package, title: "Gestión de inventario", description: "Administra tus productos y servicios desde un solo lugar. Actualiza disponibilidad, precios y descripciones en tiempo real." },
        { icon: Crown, title: "Comisión B2B transparente", description: "Estructura de comisiones clara y configurable. El Admin Neggo gestiona tasas y emite el Sello de Confianza." },
      ]}
    />
  );
}
