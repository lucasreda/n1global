export interface PromptTemplate {
  name: string;
  prompt: string;
  variables: string[];
}

export class PromptLibrary {
  getHeroPrompt(industry: string, framework: string): PromptTemplate {
    return {
      name: 'hero_section',
      prompt: `Create a compelling hero section for a ${industry} product using the ${framework} framework.`,
      variables: ['productName', 'mainBenefit', 'targetAudience']
    };
  }

  getBenefitsPrompt(industry: string): PromptTemplate {
    return {
      name: 'benefits_section',
      prompt: `Generate 3-5 key benefits for a ${industry} product that convert visitors into customers.`,
      variables: ['productFeatures', 'customerProblems', 'uniqueValue']
    };
  }

  getTestimonialsPrompt(industry: string): PromptTemplate {
    return {
      name: 'testimonials_section', 
      prompt: `Create realistic customer testimonials for a ${industry} product.`,
      variables: ['productName', 'customerSegment', 'results']
    };
  }
}