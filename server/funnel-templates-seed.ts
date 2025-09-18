import { db } from "./db";
import { funnelTemplates } from "@shared/schema";
import { eq } from "drizzle-orm";

export async function seedFunnelTemplates() {
  console.log("🎨 Seeding funnel templates...");

  const templates = [
    {
      name: "E-commerce Clássico",
      description: "Template otimizado para produtos físicos com foco em conversão",
      category: "ecommerce",
      templateConfig: {
        sections: ["hero", "benefits", "testimonials", "faq", "cta"],
        colorScheme: "modern",
        layout: "single_page",
        conversionGoal: "purchase"
      },
      aiPrompts: {
        heroPrompt: "Crie um hero impactante focado no produto físico, destacando a oferta especial e criando urgência",
        benefitsPrompt: "Liste 4-5 benefícios tangíveis do produto, focando em resultados e transformações",
        testimonialsPrompt: "Crie depoimentos realistas de clientes brasileiros que compraram produtos similares",
        ctaPrompt: "Crie um CTA final persuasivo com urgência e garantia",
        faqPrompt: "Responda objeções comuns sobre preço, qualidade, entrega e garantia"
      },
      previewImage: "/templates/ecommerce-classic.jpg",
      isActive: true
    },
    {
      name: "Geração de Leads",
      description: "Captura de emails e telefones para nutrição posterior",
      category: "lead_gen",
      templateConfig: {
        sections: ["hero", "benefits", "cta", "faq"],
        colorScheme: "vibrant",
        layout: "single_page",
        conversionGoal: "email"
      },
      aiPrompts: {
        heroPrompt: "Foque na promessa de valor gratuito, como ebook, curso ou consultoria grátis",
        benefitsPrompt: "Destaque o que a pessoa vai aprender ou ganhar com o material gratuito",
        testimonialsPrompt: "Depoimentos sobre o valor do conteúdo gratuito oferecido",
        ctaPrompt: "CTA focado em 'Baixar Grátis', 'Acessar Agora' com poucos campos no formulário",
        faqPrompt: "Esclareça dúvidas sobre o material gratuito e processo de entrega"
      },
      previewImage: "/templates/lead-gen.jpg", 
      isActive: true
    },
    {
      name: "Webinar de Vendas",
      description: "Landing page para inscrições em webinars e eventos online",
      category: "webinar",
      templateConfig: {
        sections: ["hero", "benefits", "testimonials", "cta"],
        colorScheme: "dark",
        layout: "video_first",
        conversionGoal: "email"
      },
      aiPrompts: {
        heroPrompt: "Destaque o tema do webinar, o especialista e o que será revelado ao vivo",
        benefitsPrompt: "Liste o que os participantes vão aprender durante o evento",
        testimonialsPrompt: "Depoimentos de participantes de webinars anteriores do mesmo especialista",
        ctaPrompt: "CTA para 'Garantir Minha Vaga Grátis' com horário específico",
        faqPrompt: "Informações sobre duração, horário, gravação e como participar"
      },
      previewImage: "/templates/webinar.jpg",
      isActive: true
    },
    {
      name: "App Mobile",
      description: "Promoção de aplicativos móveis com download direto",
      category: "app",
      templateConfig: {
        sections: ["hero", "benefits", "testimonials", "cta"],
        colorScheme: "minimal",
        layout: "single_page",
        conversionGoal: "download"
      },
      aiPrompts: {
        heroPrompt: "Foque nos problemas que o app resolve e sua facilidade de uso",
        benefitsPrompt: "Destaque funcionalidades únicas e como facilitam a vida do usuário",
        testimonialsPrompt: "Reviews de usuários reais com ratings da app store",
        ctaPrompt: "Botões de download direto para App Store e Google Play",
        faqPrompt: "Compatibilidade, tamanho do download, funciona offline, etc"
      },
      previewImage: "/templates/app-mobile.jpg",
      isActive: true
    },
    {
      name: "Serviços Profissionais",
      description: "Para consultores, advogados, dentistas e outros profissionais",
      category: "service",
      templateConfig: {
        sections: ["hero", "benefits", "testimonials", "faq", "cta"],
        colorScheme: "modern",
        layout: "multi_section",
        conversionGoal: "appointment"
      },
      aiPrompts: {
        heroPrompt: "Destaque a expertise profissional e resultados obtidos para clientes",
        benefitsPrompt: "Benefícios únicos do serviço e diferenciais da concorrência",
        testimonialsPrompt: "Casos de sucesso e depoimentos de clientes satisfeitos",
        ctaPrompt: "CTA para agendar consulta gratuita ou primeira avaliação",
        faqPrompt: "Processo de trabalho, valores, tempo de atendimento e garantias"
      },
      previewImage: "/templates/services.jpg",
      isActive: true
    }
  ];

  // Insert templates if they don't exist
  for (const template of templates) {
    try {
      // Check if template already exists
      const existing = await db
        .select()
        .from(funnelTemplates)
        .where(eq(funnelTemplates.name, template.name))
        .limit(1);

      if (existing.length === 0) {
        await db.insert(funnelTemplates).values(template);
        console.log(`✅ Template criado: ${template.name}`);
      } else {
        console.log(`ℹ️  Template já existe: ${template.name}`);
      }
    } catch (error) {
      console.error(`❌ Erro ao criar template ${template.name}:`, error);
    }
  }

  console.log("🎨 Funnel templates seeded successfully!");
}

// Call this in your main seed file or manually
// seedFunnelTemplates().catch(console.error);