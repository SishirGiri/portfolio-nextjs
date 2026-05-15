import ScrollReveal from "@/components/ui/ScrollReveal";
import ContactForm from "./ContactForm";

export default function ContactSection() {
  return (
    <section id="contact" className="section contact">
      <div className="container">
        <ScrollReveal>
          <div className="section-header">
            <span className="section-number">04</span>
            <h2 className="section-title">
              Get In <em>Touch</em>
            </h2>
            <div className="section-line" />
          </div>
        </ScrollReveal>

        <ScrollReveal>
          <p className="contact-intro">
            Have a project idea, collaboration proposal, or just want to say
            hello? My inbox is always open. I&apos;ll get back to you within 24
            hours!
          </p>
        </ScrollReveal>

        <ContactForm />
      </div>
    </section>
  );
}
