/**
 * AI Client Module
 * 
 * Placeholder for Phase 3+
 * 
 * All AI calls (Daily Briefing, Historian, Dungeon Master, Mentor)
 * will go through this shared module.
 * 
 * The three non-conversational roles return only JSON matching a Zod schema
 * (via OpenAI's response_format: json_schema).
 * 
 * Mentor streams plain text for real-time chat responses.
 * 
 * See PRD Section 6 for details on the four AI roles.
 */

import { AI_CONFIG } from './config';

// Export OpenAI client setup here in Phase 3
// import OpenAI from 'openai';
// export const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export { AI_CONFIG };
