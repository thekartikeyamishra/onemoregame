/**
 * Mitra's zero-cost brain: intents answered without calling any AI model.
 * Most questions on this site are one of these, so most chats cost ₹0.
 * Unmatched questions are logged (anonymised) — promote frequent ones to
 * new intents here and the AI bill shrinks as traffic grows.
 */

import type { Mood } from "@/components/mascot/expressions";

export const languages = [
  { id: "en", label: "English", dir: "ltr" },
  { id: "hi", label: "हिन्दी", dir: "ltr" },
  { id: "es", label: "Español", dir: "ltr" },
  { id: "fr", label: "Français", dir: "ltr" },
  { id: "de", label: "Deutsch", dir: "ltr" },
  { id: "pt", label: "Português", dir: "ltr" },
  { id: "ar", label: "العربية", dir: "rtl" },
] as const;

export type Lang = (typeof languages)[number]["id"];
type T = Record<Lang, string>;

export type Action =
  | { type: "link"; href: string; label: T }
  | { type: "flow"; flow: "invite"; label: T };

export type Intent = {
  id: string;
  keywords: string[];
  mood: Mood;
  reply: T;
  actions?: Action[];
  /** Multiplier for specific intents that should beat broad ones (e.g. "build with AI" vs "build") */
  weight?: number;
};

const L = (en: string, hi: string, es: string, fr: string, de: string, pt: string, ar: string): T => ({ en, hi, es, fr, de, pt, ar });

const linkCalc: Action = {
  type: "link",
  href: "/tools/app-cost-calculator",
  label: L("Open the cost calculator", "कॉस्ट कैलकुलेटर खोलें", "Abrir la calculadora", "Ouvrir le calculateur", "Kostenrechner öffnen", "Abrir a calculadora", "افتح حاسبة التكلفة"),
};
const linkWork: Action = {
  type: "link",
  href: "/work-with-me",
  label: L("Start a project", "प्रोजेक्ट शुरू करें", "Empezar un proyecto", "Lancer un projet", "Projekt starten", "Começar um projeto", "ابدأ مشروعًا"),
};
const flowInvite: Action = {
  type: "flow",
  flow: "invite",
  label: L("Request an invite here", "यहीं इनवाइट माँगें", "Pedir invitación aquí", "Demander une invitation ici", "Hier Einladung anfragen", "Pedir convite aqui", "اطلب دعوة هنا"),
};
const linkBlog: Action = {
  type: "link",
  href: "/blog",
  label: L("Read the writing", "लेख पढ़ें", "Leer los artículos", "Lire les articles", "Artikel lesen", "Ler os artigos", "اقرأ المقالات"),
};
const linkPrivacy: Action = {
  type: "link",
  href: "/privacy",
  label: L("Privacy policy", "प्राइवेसी पॉलिसी", "Política de privacidad", "Politique de confidentialité", "Datenschutz", "Política de privacidade", "سياسة الخصوصية"),
};

export const intents: Intent[] = [
  {
    id: "greet",
    keywords: ["hi", "hello", "hey", "namaste", "namaskar", "नमस्ते", "हेलो", "hola", "bonjour", "salut", "hallo", "olá", "ola", "oi", "مرحبا", "السلام"],
    mood: "happy",
    reply: L(
      "Hi! I'm Mitra. I can estimate what your app might cost, get you on the early-access list, or point you to the right article.",
      "नमस्ते! मैं मित्र हूँ। मैं आपके ऐप की अनुमानित लागत बता सकता हूँ, आपको अर्ली-एक्सेस लिस्ट में जोड़ सकता हूँ, या सही लेख तक पहुँचा सकता हूँ।",
      "¡Hola! Soy Mitra. Puedo estimar cuánto costaría tu app, apuntarte a la lista de acceso anticipado o recomendarte un artículo.",
      "Bonjour ! Je suis Mitra. Je peux estimer le coût de votre app, vous inscrire à l'accès anticipé ou vous guider vers le bon article.",
      "Hallo! Ich bin Mitra. Ich schätze die Kosten deiner App, trage dich in die Early-Access-Liste ein oder zeige dir den passenden Artikel.",
      "Olá! Sou o Mitra. Posso estimar quanto seu app custaria, colocar você na lista de acesso antecipado ou indicar o artigo certo.",
      "مرحبًا! أنا ميترا. يمكنني تقدير تكلفة تطبيقك، أو إضافتك إلى قائمة الوصول المبكر، أو إرشادك إلى المقال المناسب."
    ),
    actions: [linkCalc, flowInvite],
  },
  {
    id: "cost",
    keywords: ["cost", "price", "pricing", "budget", "how much", "estimate", "quote", "rate", "कीमत", "लागत", "खर्च", "kitna", "kitne", "paisa", "cuanto", "cuánto", "precio", "costo", "coût", "prix", "combien", "kosten", "preis", "wie viel", "quanto", "preço", "custo", "تكلفة", "سعر", "كم"],
    mood: "nerd",
    reply: L(
      "The free calculator breaks an app into features, design, testing and compliance, then prices it for five team types. Indian teams are priced at domestic rupee rates for Indian clients, and it also shows a smaller phase-1 option. Every assumption is shown.",
      "फ्री कैलकुलेटर ऐप को फीचर्स, डिज़ाइन, टेस्टिंग और कम्प्लायंस में बाँटकर कीमत बताता है। भारतीय क्लाइंट के लिए भारतीय टीमों की कीमत रुपये की घरेलू दरों पर दिखती है, साथ में छोटा फ़ेज़-1 विकल्प भी। हर अनुमान खुलकर दिखाया गया है।",
      "La calculadora gratuita divide la app en funciones, diseño, pruebas y cumplimiento, y la presupuesta para cinco tipos de equipo en $, ₹, £ o €. Todas las suposiciones son visibles.",
      "Le calculateur gratuit découpe l'app en fonctionnalités, design, tests et conformité, puis la chiffre pour cinq types d'équipes en $, ₹, £ ou €. Toutes les hypothèses sont visibles.",
      "Der kostenlose Rechner zerlegt die App in Funktionen, Design, Tests und Compliance und kalkuliert sie für fünf Teamarten in $, ₹, £ oder €. Alle Annahmen sind offen.",
      "A calculadora gratuita divide o app em funções, design, testes e conformidade e o orça para cinco tipos de equipe em $, ₹, £ ou €. Todas as premissas ficam visíveis.",
      "تقسم الحاسبة المجانية التطبيق إلى ميزات وتصميم واختبار وامتثال، ثم تقدّر تكلفته لخمسة أنواع من الفرق بالدولار أو الروبية أو الجنيه أو اليورو، مع عرض كل الافتراضات."
    ),
    actions: [linkCalc],
  },
  {
    id: "invite",
    keywords: ["invite", "early access", "waitlist", "wait list", "join", "beta", "sign up", "signup", "launch", "इनवाइट", "जुड़", "जुड़ना", "invitación", "acceso", "lista", "invitation", "accès", "einladung", "warteliste", "convite", "acesso", "دعوة", "قائمة", "انضم"],
    mood: "starstruck",
    reply: L(
      "The studio's next apps open in small invite waves. Joining is free, takes ten seconds, and you can leave any time. I can add you right here.",
      "स्टूडियो के अगले ऐप छोटे-छोटे इनवाइट बैच में खुलेंगे। जुड़ना मुफ़्त है, दस सेकंड लगते हैं, और आप कभी भी हट सकते हैं। मैं आपको यहीं जोड़ सकता हूँ।",
      "Las próximas apps del estudio se abren por tandas de invitaciones. Unirte es gratis, tarda diez segundos y puedes salir cuando quieras. Te apunto aquí mismo.",
      "Les prochaines apps du studio ouvrent par petites vagues d'invitations. C'est gratuit, ça prend dix secondes et vous pouvez partir à tout moment. Je peux vous inscrire ici.",
      "Die nächsten Apps des Studios öffnen in kleinen Einladungswellen. Kostenlos, dauert zehn Sekunden, jederzeit kündbar. Ich kann dich direkt hier eintragen.",
      "Os próximos apps do estúdio abrem em pequenas ondas de convites. É grátis, leva dez segundos e você pode sair quando quiser. Posso te adicionar aqui.",
      "تُفتح تطبيقات الاستوديو القادمة على دفعات صغيرة بالدعوة. الانضمام مجاني ويستغرق عشر ثوانٍ ويمكنك المغادرة متى شئت. يمكنني إضافتك هنا."
    ),
    actions: [flowInvite],
  },
  {
    id: "hire",
    keywords: ["hire", "freelance", "project", "work with", "build my", "build an app", "developer", "consult", "contract", "agency", "प्रोजेक्ट", "हायर", "बनवाना", "contratar", "proyecto", "desarrollador", "embaucher", "projet", "développeur", "beauftragen", "projekt", "entwickler", "contratar", "projeto", "desenvolvedor", "مشروع", "توظيف", "مطور"],
    mood: "grin",
    reply: L(
      "Kartikeya takes on a few client projects at a time: MVPs, Flutter and web apps, and AI features with cost controls. Share your idea and budget range on the project page and you'll get a written reply, usually within two working days.",
      "कार्तिकेय एक समय में कुछ ही क्लाइंट प्रोजेक्ट लेते हैं: MVP, Flutter और वेब ऐप, और कॉस्ट-कंट्रोल के साथ AI फीचर्स। प्रोजेक्ट पेज पर अपना आइडिया और बजट बताइए, आमतौर पर दो कार्यदिवस में लिखित जवाब मिलता है।",
      "Kartikeya acepta pocos proyectos a la vez: MVPs, apps Flutter y web, y funciones de IA con control de costes. Cuenta tu idea y presupuesto en la página de proyectos y recibirás respuesta, normalmente en dos días hábiles.",
      "Kartikeya prend peu de projets à la fois : MVP, apps Flutter et web, fonctionnalités d'IA à coûts maîtrisés. Décrivez votre idée et votre budget sur la page projet ; réponse écrite en général sous deux jours ouvrés.",
      "Kartikeya übernimmt wenige Kundenprojekte gleichzeitig: MVPs, Flutter- und Web-Apps sowie KI-Funktionen mit Kostenkontrolle. Beschreibe Idee und Budget auf der Projektseite; Antwort meist binnen zwei Werktagen.",
      "Kartikeya aceita poucos projetos por vez: MVPs, apps Flutter e web, e recursos de IA com controle de custos. Conte sua ideia e orçamento na página de projetos; resposta por escrito, em geral em dois dias úteis.",
      "يقبل كارتيكيا عددًا محدودًا من المشاريع: نماذج أولية، وتطبيقات Flutter والويب، وميزات ذكاء اصطناعي بتكلفة مضبوطة. شارك فكرتك وميزانيتك في صفحة المشاريع وستصلك إجابة مكتوبة خلال يومي عمل عادة."
    ),
    actions: [linkWork, linkCalc],
  },
  {
    id: "ai-build",
    weight: 3,
    keywords: ["chatgpt", "gpt", "can ai", "with ai", "using ai", "use ai", "ai builder", "app builder", "build with ai", "ai build", "no code", "nocode", "lovable", "bolt", "cursor", "vibe", "why not ai", "use ai instead", "एआई से", "chatgpt से", "con ia", "avec l'ia", "mit ki", "com ia", "بالذكاء"],
    mood: "thinking",
    reply: L(
      "AI tools are brilliant for prototypes, demos and internal tools, so use them to test your idea. A public app with accounts, payments and personal data also needs security review, privacy law, store approval and someone accountable when it breaks. Kartikeya uses AI to speed up the routine parts and takes responsibility for the rest.",
      "एआई टूल प्रोटोटाइप, डेमो और इंटरनल टूल के लिए बेहतरीन हैं, तो आइडिया टेस्ट करने के लिए इनका इस्तेमाल कीजिए। लेकिन अकाउंट, पेमेंट और पर्सनल डेटा वाले असली ऐप को सिक्योरिटी रिव्यू, प्राइवेसी क़ानून, स्टोर अप्रूवल और किसी ज़िम्मेदार व्यक्ति की ज़रूरत होती है। कार्तिकेय रूटीन काम एआई से तेज़ करते हैं और बाक़ी की ज़िम्मेदारी ख़ुद लेते हैं।",
      "Las herramientas de IA son geniales para prototipos, demos y herramientas internas: úsalas para probar tu idea. Una app pública con cuentas, pagos y datos personales necesita además revisión de seguridad, cumplimiento de privacidad, aprobación de las tiendas y alguien responsable. Kartikeya usa IA para acelerar lo rutinario y se hace cargo del resto.",
      "Les outils d'IA sont parfaits pour les prototypes, démos et outils internes : utilisez-les pour tester votre idée. Une app publique avec comptes, paiements et données personnelles exige aussi une revue de sécurité, la conformité RGPD, la validation des stores et un responsable. Kartikeya utilise l'IA pour accélérer le routinier et assume le reste.",
      "KI-Tools sind ideal für Prototypen, Demos und interne Tools, also teste deine Idee damit. Eine öffentliche App mit Konten, Zahlungen und personenbezogenen Daten braucht zusätzlich Sicherheitsprüfung, Datenschutz, Store-Freigabe und jemanden, der Verantwortung trägt. Kartikeya beschleunigt Routinearbeit mit KI und übernimmt den Rest.",
      "Ferramentas de IA são ótimas para protótipos, demos e ferramentas internas, então use-as para testar sua ideia. Um app público com contas, pagamentos e dados pessoais também precisa de revisão de segurança, conformidade de privacidade, aprovação das lojas e alguém responsável. O Kartikeya usa IA para acelerar o rotineiro e assume o resto.",
      "أدوات الذكاء الاصطناعي ممتازة للنماذج الأولية والعروض والأدوات الداخلية، فاستخدمها لاختبار فكرتك. لكن التطبيق العام الذي يضم حسابات ومدفوعات وبيانات شخصية يحتاج أيضًا إلى مراجعة أمنية والتزام بقوانين الخصوصية وموافقة المتاجر وشخص مسؤول. يستخدم كارتيكيا الذكاء الاصطناعي لتسريع الأعمال الروتينية ويتحمّل مسؤولية الباقي."
    ),
    actions: [
      { type: "link", href: "/blog/can-ai-build-my-app", label: L("What AI can and can't build", "एआई क्या बना सकता है", "Qué puede hacer la IA", "Ce que l'IA sait faire", "Was KI kann", "O que a IA faz", "ما تستطيعه الأدوات") },
      linkWork,
    ],
  },
  {
    id: "why",
    keywords: ["why you", "why kartikeya", "why hire", "why should i", "why choose", "better than", "cheaper freelancer", "trust you", "आपको क्यों", "क्यों चुनें", "por qué tú", "pourquoi vous", "warum du", "por que você", "لماذا أنت"],
    mood: "cool",
    reply: L(
      "You work directly with the engineer building your app: fixed price per milestone after a written scope, rupee quotes for Indian clients, code and store accounts in your name, and privacy law and running costs planned from day one.",
      "आप सीधे उसी इंजीनियर के साथ काम करते हैं जो आपका ऐप बनाता है: लिखित स्कोप के बाद हर माइलस्टोन की तय कीमत, भारतीय क्लाइंट के लिए रुपये में कोटेशन, कोड और स्टोर अकाउंट आपके नाम पर, और प्राइवेसी क़ानून व चलाने का ख़र्च पहले दिन से प्लान।",
      "Trabajas directamente con el ingeniero que construye tu app: precio fijo por hito tras un alcance escrito, código y cuentas de tienda a tu nombre, y privacidad y costes de operación planificados desde el primer día.",
      "Vous travaillez directement avec l'ingénieur qui construit votre app : prix fixe par jalon après un périmètre écrit, code et comptes stores à votre nom, confidentialité et coûts d'exploitation prévus dès le départ.",
      "Du arbeitest direkt mit dem Entwickler deiner App: Festpreis pro Meilenstein nach schriftlichem Umfang, Code und Store-Konten auf deinen Namen, Datenschutz und Betriebskosten von Anfang an geplant.",
      "Você trabalha direto com o engenheiro que constrói seu app: preço fixo por marco após um escopo escrito, código e contas das lojas no seu nome, e privacidade e custos de operação planejados desde o início.",
      "تعمل مباشرة مع المهندس الذي يبني تطبيقك: سعر ثابت لكل مرحلة بعد نطاق مكتوب، والكود وحسابات المتاجر باسمك، والخصوصية وتكاليف التشغيل مخطط لها من اليوم الأول."
    ),
    actions: [linkWork, linkCalc],
  },
  {
    id: "apps",
    keywords: ["download", "play store", "app store", "android", "iphone", "ios", "apk", "install", "डाउनलोड", "descargar", "télécharger", "herunterladen", "baixar", "تحميل", "تنزيل"],
    mood: "wink",
    reply: L(
      "The apps aren't public yet, so the store buttons say “coming soon”. Invited members hear first when a listing goes live.",
      "ऐप्स अभी सार्वजनिक नहीं हैं, इसलिए स्टोर बटन पर “जल्द आ रहा है” लिखा है। लिस्टिंग लाइव होते ही इनवाइट वाले सदस्यों को सबसे पहले बताया जाएगा।",
      "Las apps aún no son públicas, por eso los botones dicen «próximamente». Los invitados se enteran primero cuando salga la ficha.",
      "Les apps ne sont pas encore publiques, d'où les boutons « bientôt ». Les invités sont prévenus en premier à la mise en ligne.",
      "Die Apps sind noch nicht öffentlich, daher steht „demnächst“ auf den Store-Buttons. Eingeladene erfahren zuerst vom Launch.",
      "Os apps ainda não são públicos, por isso os botões dizem “em breve”. Convidados sabem primeiro quando a página for ao ar.",
      "التطبيقات ليست متاحة للعامة بعد، لذلك تظهر الأزرار «قريبًا». يعرف المدعوون أولًا عند نشرها في المتجر."
    ),
    actions: [flowInvite],
  },
  {
    id: "who",
    keywords: ["who", "about", "kartikeya", "experience", "background", "skills", "कौन", "कार्तिकेय", "quién", "quien", "qui", "wer", "quem", "من هو"],
    mood: "cool",
    reply: L(
      "Kartikeya Mishra is an independent full-stack and AI product engineer in Lucknow, India. He builds Flutter, Firebase, Next.js and Node apps end to end, with privacy law and unit economics designed in from day one.",
      "कार्तिकेय मिश्रा लखनऊ के एक स्वतंत्र फुल-स्टैक और AI प्रोडक्ट इंजीनियर हैं। वे Flutter, Firebase, Next.js और Node ऐप शुरू से अंत तक बनाते हैं, जिनमें प्राइवेसी क़ानून और यूनिट इकोनॉमिक्स पहले दिन से शामिल होते हैं।",
      "Kartikeya Mishra es ingeniero independiente full-stack y de producto IA en Lucknow, India. Construye apps con Flutter, Firebase, Next.js y Node de principio a fin.",
      "Kartikeya Mishra est ingénieur full-stack et produit IA indépendant à Lucknow, en Inde. Il conçoit des apps Flutter, Firebase, Next.js et Node de bout en bout.",
      "Kartikeya Mishra ist unabhängiger Full-Stack- und KI-Produktingenieur in Lucknow, Indien. Er baut Flutter-, Firebase-, Next.js- und Node-Apps von Anfang bis Ende.",
      "Kartikeya Mishra é engenheiro independente full-stack e de produto de IA em Lucknow, Índia. Ele constrói apps Flutter, Firebase, Next.js e Node de ponta a ponta.",
      "كارتيكيا ميشرا مهندس مستقل متكامل ومهندس منتجات ذكاء اصطناعي في لكناو بالهند، يبني تطبيقات Flutter وFirebase وNext.js وNode من البداية إلى النهاية."
    ),
    actions: [{ type: "link", href: "/about", label: L("About Kartikeya", "कार्तिकेय के बारे में", "Sobre Kartikeya", "À propos", "Über Kartikeya", "Sobre Kartikeya", "عن كارتيكيا") }],
  },
  {
    id: "blog",
    keywords: ["blog", "article", "read", "guide", "learn", "pwa", "requirements", "prd", "validate", "publish", "flutter", "react native", "mvp", "dpdp", "gdpr", "llm", "लेख", "ब्लॉग", "artículo", "article", "artikel", "artigo", "مقال", "مدونة"],
    mood: "nerd",
    reply: L(
      "The writing covers app costs, MVP scoping, Flutter vs React Native, DPDP and GDPR for app founders, and keeping LLM bills under control.",
      "लेखों में ऐप की लागत, MVP स्कोपिंग, Flutter बनाम React Native, ऐप फ़ाउंडर्स के लिए DPDP और GDPR, और LLM खर्च को काबू में रखने पर बात है।",
      "Los artículos tratan costes de apps, alcance de MVP, Flutter vs React Native, DPDP y GDPR, y cómo controlar el gasto en LLM.",
      "Les articles couvrent le coût d'une app, le périmètre d'un MVP, Flutter vs React Native, DPDP et RGPD, et la maîtrise des coûts LLM.",
      "Die Artikel behandeln App-Kosten, MVP-Umfang, Flutter vs. React Native, DPDP und DSGVO sowie LLM-Kostenkontrolle.",
      "Os artigos falam de custo de apps, escopo de MVP, Flutter vs React Native, DPDP e GDPR, e controle de gastos com LLM.",
      "تتناول المقالات تكلفة التطبيقات، ونطاق النموذج الأولي، وFlutter مقابل React Native، وقوانين DPDP وGDPR، وضبط تكاليف النماذج اللغوية."
    ),
    actions: [linkBlog],
  },
  {
    id: "privacy",
    keywords: ["privacy", "data", "delete", "unsubscribe", "remove me", "gdpr request", "डेटा", "प्राइवेसी", "हटाओ", "privacidad", "datos", "borrar", "données", "supprimer", "datenschutz", "löschen", "dados", "excluir", "بيانات", "حذف", "خصوصية"],
    mood: "relieved",
    reply: L(
      "Your email is used only to send invites and launch news, never sold. Every email has a one-click unsubscribe, and you can ask for a copy or deletion of your data by email at any time.",
      "आपका ईमेल सिर्फ़ इनवाइट और लॉन्च की ख़बर भेजने के लिए इस्तेमाल होता है, कभी बेचा नहीं जाता। हर ईमेल में एक-क्लिक अनसब्सक्राइब है, और आप कभी भी ईमेल करके डेटा की कॉपी या डिलीट माँग सकते हैं।",
      "Tu email solo se usa para invitaciones y noticias de lanzamiento, nunca se vende. Puedes darte de baja con un clic y pedir copia o borrado de tus datos por email.",
      "Votre email sert uniquement aux invitations et annonces, jamais vendu. Désinscription en un clic, et vous pouvez demander une copie ou la suppression de vos données par email.",
      "Deine E-Mail dient nur für Einladungen und Launch-News und wird nie verkauft. Abmeldung mit einem Klick; Auskunft oder Löschung jederzeit per E-Mail.",
      "Seu email é usado só para convites e novidades de lançamento, nunca vendido. Cancelamento em um clique, e você pode pedir cópia ou exclusão dos dados por email.",
      "يُستخدم بريدك فقط لإرسال الدعوات وأخبار الإطلاق ولا يُباع أبدًا. يمكنك إلغاء الاشتراك بنقرة، وطلب نسخة من بياناتك أو حذفها عبر البريد في أي وقت."
    ),
    actions: [linkPrivacy],
  },
  {
    id: "contact",
    keywords: ["contact", "email", "mail", "reach", "talk", "call", "संपर्क", "ईमेल", "contacto", "correo", "contacter", "kontakt", "contato", "تواصل", "بريد"],
    mood: "happy",
    reply: L(
      "The fastest route is the contact page; it goes straight to Kartikeya's inbox.",
      "सबसे तेज़ तरीका संपर्क पेज है, जो सीधे कार्तिकेय के इनबॉक्स में जाता है।",
      "Lo más rápido es la página de contacto; llega directo a la bandeja de Kartikeya.",
      "Le plus rapide est la page contact, qui arrive directement chez Kartikeya.",
      "Am schnellsten geht es über die Kontaktseite, direkt in Kartikeyas Postfach.",
      "O caminho mais rápido é a página de contato, que vai direto para o Kartikeya.",
      "أسرع طريقة هي صفحة التواصل، فهي تصل مباشرة إلى بريد كارتيكيا."
    ),
    actions: [{ type: "link", href: "/contact", label: L("Contact", "संपर्क", "Contacto", "Contact", "Kontakt", "Contato", "تواصل") }],
  },
  {
    id: "thanks",
    keywords: ["thanks", "thank you", "thx", "great", "awesome", "cool", "धन्यवाद", "शुक्रिया", "thanku", "gracias", "merci", "danke", "obrigado", "obrigada", "شكرا"],
    mood: "love",
    reply: L("Anytime! Tap me if you need anything else.", "कभी भी! और कुछ चाहिए तो मुझे टैप कीजिए।", "¡Cuando quieras! Tócame si necesitas algo más.", "Avec plaisir ! Touchez-moi si besoin.", "Gern! Tipp mich an, wenn du noch etwas brauchst.", "Sempre! Toque em mim se precisar de algo.", "في أي وقت! انقر عليّ إن احتجت شيئًا."),
  },
  {
    id: "help",
    keywords: ["help", "what can you do", "menu", "options", "मदद", "क्या कर", "ayuda", "aide", "hilfe", "ajuda", "مساعدة"],
    mood: "grin",
    reply: L(
      "I can estimate an app budget, add you to early access, explain how projects work, or find an article. Pick one below or just ask.",
      "मैं ऐप का बजट अनुमान लगा सकता हूँ, आपको अर्ली एक्सेस में जोड़ सकता हूँ, प्रोजेक्ट का तरीका समझा सकता हूँ, या लेख ढूँढ सकता हूँ।",
      "Puedo estimar el presupuesto de una app, apuntarte al acceso anticipado, explicar cómo funcionan los proyectos o encontrar un artículo.",
      "Je peux estimer un budget d'app, vous inscrire à l'accès anticipé, expliquer le déroulé d'un projet ou trouver un article.",
      "Ich kann ein App-Budget schätzen, dich für Early Access eintragen, Projektabläufe erklären oder Artikel finden.",
      "Posso estimar o orçamento de um app, colocar você no acesso antecipado, explicar como funcionam os projetos ou achar um artigo.",
      "يمكنني تقدير ميزانية تطبيق، أو إضافتك للوصول المبكر، أو شرح سير المشاريع، أو إيجاد مقال."
    ),
    actions: [linkCalc, flowInvite, linkWork],
  },
];

export const ui: Record<string, T> = {
  hello: intents[0].reply,
  placeholder: L("Ask Mitra anything…", "मित्र से कुछ भी पूछें…", "Pregúntale a Mitra…", "Demandez à Mitra…", "Frag Mitra…", "Pergunte ao Mitra…", "اسأل ميترا…"),
  send: L("Send", "भेजें", "Enviar", "Envoyer", "Senden", "Enviar", "إرسال"),
  close: L("Close chat", "चैट बंद करें", "Cerrar chat", "Fermer", "Chat schließen", "Fechar chat", "إغلاق"),
  fallback: L(
    "I'm not sure about that one yet. Kartikeya reads every message, so the contact page is the surest route.",
    "इसका जवाब मुझे अभी पक्का नहीं पता। कार्तिकेय हर संदेश पढ़ते हैं, तो संपर्क पेज सबसे भरोसेमंद रास्ता है।",
    "Aún no estoy seguro de eso. Kartikeya lee cada mensaje, así que la página de contacto es lo más seguro.",
    "Je ne suis pas sûr pour celle-ci. Kartikeya lit chaque message : la page contact est la voie la plus sûre.",
    "Da bin ich mir noch nicht sicher. Kartikeya liest jede Nachricht, die Kontaktseite ist der sicherste Weg.",
    "Ainda não sei responder isso. O Kartikeya lê todas as mensagens, então a página de contato é o caminho mais certo.",
    "لست متأكدًا من ذلك بعد. يقرأ كارتيكيا كل رسالة، لذا صفحة التواصل هي الطريق الأضمن."
  ),
  askEmail: L(
    "Lovely. What email should the invite go to?",
    "बढ़िया! इनवाइट किस ईमेल पर भेजें?",
    "¡Genial! ¿A qué email enviamos la invitación?",
    "Parfait ! À quelle adresse envoyer l'invitation ?",
    "Super! An welche E-Mail soll die Einladung gehen?",
    "Ótimo! Para qual email enviamos o convite?",
    "رائع! إلى أي بريد نرسل الدعوة؟"
  ),
  badEmail: L(
    "That doesn't look like an email address. Try again, like name@example.com.",
    "यह ईमेल पता नहीं लगता। फिर से लिखें, जैसे name@example.com",
    "Eso no parece un email. Prueba de nuevo, por ejemplo nombre@ejemplo.com.",
    "Cela ne ressemble pas à une adresse email. Réessayez, par ex. nom@exemple.com.",
    "Das sieht nicht wie eine E-Mail aus. Versuch es nochmal, z. B. name@beispiel.de.",
    "Isso não parece um email. Tente de novo, como nome@exemplo.com.",
    "هذا لا يبدو بريدًا إلكترونيًا. حاول مجددًا مثل name@example.com"
  ),
  consent: L(
    "Last step: I'll store this email to send invites and launch news. You can unsubscribe any time. OK?",
    "आख़िरी कदम: मैं यह ईमेल इनवाइट और लॉन्च की ख़बर भेजने के लिए सेव करूँगा। आप कभी भी अनसब्सक्राइब कर सकते हैं। ठीक है?",
    "Último paso: guardaré este email para enviarte invitaciones y novedades. Puedes darte de baja cuando quieras. ¿De acuerdo?",
    "Dernière étape : je conserve cet email pour les invitations et annonces. Désinscription possible à tout moment. D'accord ?",
    "Letzter Schritt: Ich speichere diese E-Mail für Einladungen und Launch-News. Abmeldung jederzeit möglich. Okay?",
    "Último passo: vou guardar este email para convites e novidades. Você pode sair quando quiser. Tudo bem?",
    "الخطوة الأخيرة: سأحفظ هذا البريد لإرسال الدعوات وأخبار الإطلاق، ويمكنك إلغاء الاشتراك متى شئت. موافق؟"
  ),
  agree: L("Yes, add me", "हाँ, जोड़ दो", "Sí, apúntame", "Oui, ajoutez-moi", "Ja, eintragen", "Sim, me adicione", "نعم، أضفني"),
  cancel: L("Not now", "अभी नहीं", "Ahora no", "Pas maintenant", "Jetzt nicht", "Agora não", "ليس الآن"),
  joined: L(
    "You're on the list. Check your inbox to confirm, then share your personal link to move up a wave.",
    "आप लिस्ट में हैं! पुष्टि के लिए इनबॉक्स देखें, फिर अपना पर्सनल लिंक शेयर करके पहले बैच में आएँ।",
    "¡Estás en la lista! Revisa tu correo para confirmar y comparte tu enlace para subir de tanda.",
    "Vous êtes inscrit ! Confirmez depuis votre boîte mail, puis partagez votre lien pour passer à une vague plus tôt.",
    "Du bist dabei! Bestätige per E-Mail und teile deinen Link, um eine Welle früher dran zu sein.",
    "Você está na lista! Confirme pelo email e compartilhe seu link para subir de onda.",
    "أنت في القائمة! أكّد من بريدك، ثم شارك رابطك الشخصي لتتقدم إلى دفعة أبكر."
  ),
  failed: L(
    "That didn't go through. Please try the early-access page instead.",
    "यह पूरा नहीं हुआ। कृपया अर्ली-एक्सेस पेज से कोशिश करें।",
    "No se pudo completar. Prueba desde la página de acceso anticipado.",
    "Cela n'a pas abouti. Essayez depuis la page d'accès anticipé.",
    "Das hat nicht geklappt. Bitte nutze die Early-Access-Seite.",
    "Não deu certo. Tente pela página de acesso antecipado.",
    "لم تكتمل العملية. جرّب صفحة الوصول المبكر."
  ),
  limit: L(
    "I've answered a lot this session! For anything more, the contact page reaches Kartikeya directly.",
    "इस सेशन में काफ़ी बातें हो गईं! आगे के लिए संपर्क पेज से सीधे कार्तिकेय तक पहुँचें।",
    "¡Ya he respondido mucho en esta sesión! Para más, la página de contacto llega directo a Kartikeya.",
    "J'ai beaucoup répondu cette session ! Pour la suite, la page contact joint directement Kartikeya.",
    "Ich habe in dieser Sitzung schon viel beantwortet! Für mehr erreichst du Kartikeya über die Kontaktseite.",
    "Já respondi bastante nesta sessão! Para mais, a página de contato fala direto com o Kartikeya.",
    "أجبت كثيرًا في هذه الجلسة! للمزيد، تواصل مع كارتيكيا مباشرة عبر صفحة التواصل."
  ),
  privacyNote: L(
    "Chats are not stored with your identity. Don't share passwords or payment details.",
    "चैट आपकी पहचान के साथ सेव नहीं होती। पासवर्ड या पेमेंट डिटेल साझा न करें।",
    "Los chats no se guardan con tu identidad. No compartas contraseñas ni datos de pago.",
    "Les conversations ne sont pas liées à votre identité. Ne partagez ni mot de passe ni données de paiement.",
    "Chats werden nicht mit deiner Identität gespeichert. Teile keine Passwörter oder Zahlungsdaten.",
    "Os chats não ficam ligados à sua identidade. Não compartilhe senhas nem dados de pagamento.",
    "لا تُحفظ المحادثات مع هويتك. لا تشارك كلمات المرور أو بيانات الدفع."
  ),
};

export const chips: { label: T; intent: string }[] = [
  { label: linkCalc.label, intent: "cost" },
  { label: flowInvite.label, intent: "invite" },
  { label: linkWork.label, intent: "hire" },
  { label: L("What can you do?", "आप क्या कर सकते हैं?", "¿Qué puedes hacer?", "Que sais-tu faire ?", "Was kannst du?", "O que você faz?", "ماذا تستطيع؟"), intent: "help" },
];

const normalize = (s: string) =>
  ` ${s.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim()} `;

/** Keyword scoring. Whole-word for short ASCII keywords, substring for phrases and non-Latin scripts. */
export function matchIntent(text: string): Intent | null {
  const n = normalize(text);
  let best: { intent: Intent; score: number } | null = null;
  for (const intent of intents) {
    let score = 0;
    for (const kw of intent.keywords) {
      const k = normalize(kw).trim();
      if (!k) continue;
      const ascii = /^[a-z0-9 ]+$/.test(k);
      const hit = ascii ? n.includes(` ${k} `) : n.includes(k);
      if (hit) score += k.includes(" ") ? 3 : 2;
    }
    score *= intent.weight ?? 1;
    // Greetings only win when nothing more specific matched.
    if (intent.id === "greet") score = Math.min(score, 1);
    if (score > 0 && (!best || score > best.score)) best = { intent, score };
  }
  return best?.intent ?? null;
}

/** Best-guess language from script, used to answer in the visitor's language. */
export function detectLang(text: string, fallback: Lang): Lang {
  if (/[ऀ-ॿ]/.test(text)) return "hi";
  if (/[؀-ۿ]/.test(text)) return "ar";
  return fallback;
}
