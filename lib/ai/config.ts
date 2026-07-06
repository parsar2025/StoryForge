/**
 * AI Configuration
 * 
 * Centralized configuration for AI model settings.
 * Used by all four AI roles in Phase 3+:
 * - Daily Briefing
 * - Historian (milestone excerpts)
 * - Dungeon Master (quest generation)
 * - Mentor (chat)
 */

export const AI_CONFIG = {
  model: 'gpt-4o', // Default model, can be changed
  temperature: 0.7,
  maxTokens: 2000,
} as const;
