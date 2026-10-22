import { JsonLd } from "@/components/JsonLd";
import { PageHero } from "@/components/PageHero";
import { breadcrumbLd, pageMetadata } from "@/lib/seo";
import { site } from "@/lib/site";

export const metadata = pageMetadata("/contact", "Contact", "How to contact the ONE MORE team about early access, Campus Clash, press, privacy requests or bug reports.");

export default function Contact() {
  return (
    <>
      <JsonLd data={breadcrumbLd("/contact", "Contact")} />
      <PageHero eyebrow="Contact" title="Get in touch" />
      <div className="section">
        <div className="container prose">
          {site.contactEmail ? (
            <p>Email <a href={`mailto:${site.contactEmail}`}><strong>{site.contactEmail}</strong></a>. We usually reply within a few working days.</p>
          ) : (
            <div className="draft-banner" role="note">The public contact address hasn&apos;t been published yet. It will appear here before launch.</div>
          )}
          <h2>Help us route your message</h2>
          <ul>
            <li><strong>Early access:</strong> include the email address you signed up with. Never send us confirmation or invitation links.</li>
            <li><strong>Campus Clash:</strong> use the <a href="/campus-clash">organizer interest form</a> so we have the details we need.</li>
            <li><strong>Privacy or deletion requests:</strong> write from the address you signed up with, with &ldquo;Privacy request&rdquo; in the subject.</li>
            <li><strong>Bugs:</strong> describe the device, browser and what happened.</li>
          </ul>
        </div>
      </div>
    </>
  );
}
