import { motion } from "framer-motion";
import heroBg from "@/assets/hero-bg.jpg";

const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <img
          src={heroBg}
          alt="Geometría sagrada"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-violet opacity-60" />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-gold-light tracking-[0.3em] uppercase text-sm mb-8 font-sans font-medium"
        >
          Economía de la Consciencia 2025
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="text-4xl md:text-6xl lg:text-7xl font-serif font-semibold text-primary-foreground leading-tight mb-8"
        >
          Reingeniería de Vida:{" "}
          <span className="text-gradient-gold italic">
            El Arte de la Arquitectura Energética
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.7 }}
          className="text-lg md:text-xl text-gold-light/80 max-w-2xl mx-auto mb-12 font-sans font-light leading-relaxed"
        >
          Fusionamos ciencia cuántica, astrología kármica y PNL para desbloquear
          tu máximo potencial financiero y personal.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1 }}
        >
          <a
            href="#contacto"
            className="inline-block px-10 py-4 bg-accent text-accent-foreground font-sans font-semibold tracking-wide uppercase text-sm rounded-sm transition-all duration-300 hover:bg-gold-dark hover:shadow-gold"
          >
            Comienza tu Diagnóstico
          </a>
        </motion.div>

        {/* Decorative line */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 1.2, delay: 1.3 }}
          className="divider-gold mx-auto mt-16"
        />
      </div>
    </section>
  );
};

export default HeroSection;
