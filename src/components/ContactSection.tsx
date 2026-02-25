import { motion } from "framer-motion";
import { useState } from "react";

const ContactSection = () => {
  const [formData, setFormData] = useState({
    nombre: "",
    email: "",
    whatsapp: "",
    bloqueo: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Future: connect to backend
    alert("¡Gracias! Nos pondremos en contacto contigo pronto.");
    setFormData({ nombre: "", email: "", whatsapp: "", bloqueo: "" });
  };

  return (
    <section id="contacto" className="py-32 px-6 bg-gradient-violet relative">
      <div className="absolute inset-0 opacity-5 bg-[radial-gradient(circle_at_70%_30%,hsl(43_69%_52%),transparent_60%)]" />

      <div className="relative z-10 max-w-xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <p className="text-gold-light tracking-[0.25em] uppercase text-xs font-sans font-medium mb-4">
            Da el primer paso
          </p>
          <h2 className="text-3xl md:text-4xl font-serif font-semibold text-primary-foreground mb-6">
            Comienza tu Diagnóstico
          </h2>
          <div className="divider-gold mx-auto" />
        </motion.div>

        <motion.form
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.2 }}
          onSubmit={handleSubmit}
          className="space-y-6"
        >
          {[
            { name: "nombre" as const, placeholder: "Tu nombre", type: "text" },
            { name: "email" as const, placeholder: "Tu email", type: "email" },
            { name: "whatsapp" as const, placeholder: "Tu WhatsApp", type: "tel" },
          ].map((field) => (
            <input
              key={field.name}
              type={field.type}
              placeholder={field.placeholder}
              required
              value={formData[field.name]}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, [field.name]: e.target.value }))
              }
              className="w-full px-5 py-4 bg-violet-light/30 border border-gold-light/20 rounded-sm text-primary-foreground placeholder:text-primary-foreground/40 font-sans text-sm focus:outline-none focus:border-gold transition-colors duration-300"
            />
          ))}

          <textarea
            placeholder="¿Cuál es tu mayor bloqueo actual?"
            rows={4}
            value={formData.bloqueo}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, bloqueo: e.target.value }))
            }
            className="w-full px-5 py-4 bg-violet-light/30 border border-gold-light/20 rounded-sm text-primary-foreground placeholder:text-primary-foreground/40 font-sans text-sm focus:outline-none focus:border-gold transition-colors duration-300 resize-none"
          />

          <button
            type="submit"
            className="w-full px-10 py-4 bg-accent text-accent-foreground font-sans font-semibold tracking-wide uppercase text-sm rounded-sm transition-all duration-300 hover:bg-gold-dark hover:shadow-gold"
          >
            Enviar Diagnóstico
          </button>
        </motion.form>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5 }}
          className="text-center text-primary-foreground/40 text-xs font-sans mt-8"
        >
          Tu información es 100% confidencial y segura.
        </motion.p>
      </div>

      {/* Footer */}
      <div className="relative z-10 max-w-4xl mx-auto mt-24 pt-12 border-t border-gold-light/10 text-center">
        <p className="text-primary-foreground/30 text-xs font-sans tracking-wide">
          © 2025 Arquitectura Energética · Consultoría Técnica de la Experiencia Humana
        </p>
      </div>
    </section>
  );
};

export default ContactSection;
