/**
 * Default Application Settings
 *
 * Provides default configuration values for the voice assistant receptionist.
 * Used when settings haven't been saved to the database yet.
 * Can be merged with database settings to fill in missing values.
 */

export const DEFAULT_SETTINGS = {
  /**
   * Agent configuration
   * Controls AI model, voice, and system prompt behavior
   */
  agent_config: {
    // AI model selection: supported by Vapi
    model: 'gemini-1.5-flash',
    
    // Voice selection: Azure Neural voices
    voiceName: 'en-US-Neural-F',
    
    // Speech rate (0.5 to 2.0, 1.0 = normal)
    speechRate: 1.0,
    
    // Speech pitch (0.5 to 2.0, 1.0 = normal)
    speechPitch: 1.0,
    
    // System prompt: defines AI behavior and personality
    systemPrompt: `You are a helpful, professional receptionist for VoiceAI Hub. Your job is to answer customer 
questions about pricing, features, and schedules. If a customer wants a pricing details page 
or custom developer APIs, instruct them that it requires a Pro tier and note down their details. 
If they ask about database storage, confirm we support PostgreSQL connection overrides in the hub 
configuration. Always maintain a polite tone and keep responses concise.`,
  },

  /**
   * Frequently Asked Questions with matching rules
   * Used to provide consistent answers to common questions
   */
  faqs: [
    {
      id: 'faq-1',
      category: 'Hours',
      question: 'What are your business hours?',
      answer: 'Our standard office hours are Monday through Friday, 9:00 AM to 6:00 PM Pacific Standard Time.',
      matchRule: 'semantic', // Semantic matching - understands meaning
    },
    {
      id: 'faq-2',
      category: 'Pricing',
      question: 'Do you offer a discount for annual billing?',
      answer: 'Yes, we offer a 20% discount on all plans if you choose to pay annually instead of monthly.',
      matchRule: 'semantic',
    },
    {
      id: 'faq-3',
      category: 'Integrations',
      question: 'Can I connect my PostgreSQL database?',
      answer: 'Yes, you can configure your own custom PostgreSQL database connection overrides directly in the Agent configuration page.',
      matchRule: 'exact', // Exact matching - looks for specific keywords
    },
    {
      id: 'faq-4',
      category: 'Support',
      question: 'How can I escalate an urgent voice assistant failure?',
      answer: 'Please request to speak to an operator or email critical-support@voiceai.com for immediate engineering attention.',
      matchRule: 'fallback', // Fallback - used when no other match
    },
  ],
};
