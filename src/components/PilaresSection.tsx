import { motion } from "framer-motion";
import { Zap, Star, Brain, Sparkles } from "lucide-react";

const pilares = [
  {
    icon: Zap,
    title: "Gestión Energética y Biodescodificación",
    description:
      "Identifica y transforma los patrones energéticos que bloquean tu expansión financiera y emocional.",
  },
  {
    icon: Star,
    title: "Astrología Kármica",
    description:
      "Tu mapa de patrones: descubre los ciclos que repites y las ventanas de oportunidad que el cosmos abre para ti.",
  },
  {
    icon: Brain,
    title: "Reprogramación Neuronal (PNL)",
    description:
      "Reescribe las narrativas inconscientes que limitan tu capacidad de liderazgo y abundancia.",
  },
  {
    icon: Sparkles,
    title: "Mentalidad Cuántica y Coaching",
    description:
      "Alinea tu frecuencia interna con los resultados extraordinarios que deseas manifestar en tu realidad.",
  },
];

const PilaresSection = () => {
  return (
    <section className="py-32 px-6 bg-background">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
          className="text-center mb-20"
        >
          <p className="text-accent tracking-[0.25em] uppercase text-xs font-sans font-medium mb-4">
            Metodología
          </p>
          <h2 className="text-3xl md:text-5xl font-serif font-semibold text-foreground mb-6">
            Los 4 Pilares
          </h2>
          <div className="divider-gold mx-auto" />
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
          {pilares.map((pilar, i) => (
            <motion.div
              key={pilar.title}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.7, delay: i * 0.15 }}
              className="group p-8 lg:p-10 border border-border rounded-sm bg-card transition-all duration-500 hover:border-gold hover:shadow-gold"
            >
              <pilar.icon className="w-8 h-8 text-accent mb-6 transition-transform duration-300 group-hover:scale-110" />
              <h3 className="text-xl lg:text-2xl font-serif font-semibold text-foreground mb-4">
                {pilar.title}
              </h3>
              <p className="text-muted-foreground font-sans leading-relaxed">
                {pilar.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PilaresSection;
