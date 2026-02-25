import { motion } from "framer-motion";

const dolores = [
  "Sientes burnout a pesar del éxito profesional",
  "Has alcanzado techos de cristal que no logras romper",
  "Identificas bloqueos invisibles que frenan tu siguiente nivel",
  "Buscas coherencia entre tu mundo externo y tu realidad interna",
];

const IdentidadSection = () => {
  return (
    <section className="py-32 px-6 bg-gradient-violet relative overflow-hidden">
      {/* Subtle texture */}
      <div className="absolute inset-0 opacity-5 bg-[radial-gradient(circle_at_30%_50%,hsl(43_69%_52%),transparent_70%)]" />

      <div className="relative z-10 max-w-4xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
        >
          <p className="text-gold-light tracking-[0.25em] uppercase text-xs font-sans font-medium mb-4">
            ¿Te identificas?
          </p>
          <h2 className="text-3xl md:text-5xl font-serif font-semibold text-primary-foreground mb-6 leading-tight">
            Para la mujer líder que ha alcanzado el éxito externo pero busca{" "}
            <span className="text-gradient-gold italic">coherencia interna</span>
          </h2>
          <div className="divider-gold mx-auto mb-16" />
        </motion.div>

        <div className="grid sm:grid-cols-2 gap-6 text-left max-w-3xl mx-auto">
          {dolores.map((dolor, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.12 }}
              className="flex items-start gap-4 p-5 rounded-sm border border-gold-light/20 bg-violet-light/20"
            >
              <span className="w-2 h-2 mt-2 rounded-full bg-accent flex-shrink-0" />
              <p className="text-primary-foreground/80 font-sans text-sm leading-relaxed">
                {dolor}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default IdentidadSection;
