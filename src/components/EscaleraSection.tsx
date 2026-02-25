import { motion } from "framer-motion";

const niveles = [
  {
    tag: "Gratis",
    title: "Guía de Autodiagnóstico",
    description:
      "Descarga tu guía gratuita para identificar los patrones energéticos que limitan tu expansión.",
    highlight: false,
  },
  {
    tag: "Curso",
    title: "Arquitectura de la Abundancia",
    description:
      "Programa intensivo de 8 semanas para reprogramar tu relación con el dinero, el tiempo y la energía.",
    highlight: true,
  },
  {
    tag: "High Ticket",
    title: "Mentorship Platinum",
    description:
      "Acompañamiento 1:1 personalizado para líderes que buscan una transformación profunda y sostenida.",
    highlight: false,
  },
];

const EscaleraSection = () => {
  return (
    <section className="py-32 px-6 bg-background">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
          className="text-center mb-20"
        >
          <p className="text-accent tracking-[0.25em] uppercase text-xs font-sans font-medium mb-4">
            Tu camino
          </p>
          <h2 className="text-3xl md:text-5xl font-serif font-semibold text-foreground mb-6">
            Escalera de Valor
          </h2>
          <div className="divider-gold mx-auto" />
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {niveles.map((nivel, i) => (
            <motion.div
              key={nivel.title}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: i * 0.15 }}
              className={`relative p-8 lg:p-10 rounded-sm border transition-all duration-500 hover:shadow-gold ${
                nivel.highlight
                  ? "border-gold bg-card shadow-gold"
                  : "border-border bg-card hover:border-gold"
              }`}
            >
              <span
                className={`inline-block text-xs tracking-[0.2em] uppercase font-sans font-semibold px-3 py-1 rounded-sm mb-6 ${
                  nivel.highlight
                    ? "bg-accent text-accent-foreground"
                    : "bg-secondary text-muted-foreground"
                }`}
              >
                {nivel.tag}
              </span>
              <h3 className="text-xl font-serif font-semibold text-foreground mb-4">
                {nivel.title}
              </h3>
              <p className="text-muted-foreground font-sans text-sm leading-relaxed">
                {nivel.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default EscaleraSection;
