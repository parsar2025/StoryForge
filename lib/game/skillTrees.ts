/**
 * Skill Tree Configuration - Single Source of Truth
 * 
 * Defines the 11 leveled skill trees (8 CORE + 3 SUPPORT) that are seeded
 * for every character at creation time. Each tree has a fixed set of sub-skill
 * tags used for analytics and filtering, but only the trees themselves level up.
 * 
 * Per PRD Section 5: This is configuration, not database content.
 */

export interface SkillTreeConfig {
  readonly key: string;
  readonly displayName: string;
  readonly emoji: string;
  readonly category: 'CORE' | 'SUPPORT';
  readonly subSkillTags: readonly string[];
}

/**
 * The 11 skill trees - this array defines what gets seeded at character creation.
 * Order within category doesn't matter (client sorts as needed), but the list
 * is exhaustive: exactly these 11 trees, no more, no less.
 */
export const SKILL_TREES: readonly SkillTreeConfig[] = [
  // CORE Trees (8)
  {
    key: 'OPPORTUNITY_HUNTER',
    displayName: 'Opportunity Hunter',
    emoji: '🔍',
    category: 'CORE',
    subSkillTags: [
      'Problem discovery',
      'Customer interviews',
      'Observation',
      'Trend spotting',
      'Market research',
      'First-principles thinking',
      'Systems thinking',
      'Idea generation',
      'Validation',
      'Niche discovery'
    ] as const
  },
  {
    key: 'BUILDER',
    displayName: 'Builder',
    emoji: '⚒️',
    category: 'CORE',
    subSkillTags: [
      'MVP building',
      'AI tools',
      'Programming',
      'Web development',
      'Automation',
      'Product design',
      'UX',
      'Rapid prototyping',
      'Shipping quickly'
    ] as const
  },
  {
    key: 'SALES',
    displayName: 'Sales',
    emoji: '⚔️',
    category: 'CORE',
    subSkillTags: [
      'Prospecting',
      'Cold outreach',
      'Discovery calls',
      'Objection handling',
      'Closing',
      'Follow-up',
      'CRM',
      'Copywriting',
      'Lead qualification'
    ] as const
  },
  {
    key: 'MARKETING',
    displayName: 'Marketing',
    emoji: '📣',
    category: 'CORE',
    subSkillTags: [
      'Positioning',
      'Branding',
      'Storytelling',
      'Content marketing',
      'SEO',
      'Paid ads',
      'Social media',
      'Community building',
      'Analytics',
      'Email marketing'
    ] as const
  },
  {
    key: 'NEGOTIATION_INFLUENCE',
    displayName: 'Negotiation & Influence',
    emoji: '🤝',
    category: 'CORE',
    subSkillTags: [
      'Negotiation',
      'Persuasion',
      'Active listening',
      'Emotional intelligence',
      'Networking',
      'Public speaking',
      'Conflict resolution',
      'Leadership',
      'Hiring'
    ] as const
  },
  {
    key: 'STRATEGY',
    displayName: 'Strategy',
    emoji: '♟️',
    category: 'CORE',
    subSkillTags: [
      'Business models',
      'Competitive advantage',
      'Pricing',
      'Decision making',
      'Risk management',
      'Long-term planning',
      'Prioritization',
      'Execution'
    ] as const
  },
  {
    key: 'FINANCE',
    displayName: 'Finance',
    emoji: '💰',
    category: 'CORE',
    subSkillTags: [
      'Accounting',
      'Cash flow',
      'Budgeting',
      'Investing',
      'Unit economics',
      'Profitability',
      'Valuation',
      'Taxes'
    ] as const
  },
  {
    key: 'PERSONAL_MASTERY',
    displayName: 'Personal Mastery',
    emoji: '🧠',
    category: 'CORE',
    subSkillTags: [
      'Discipline',
      'Focus',
      'Time management',
      'Deep work',
      'Stress management',
      'Emotional regulation',
      'Learning',
      'Decision making',
      'Writing',
      'Reflection'
    ] as const
  },

  // SUPPORT Trees (3)
  {
    key: 'HEALTH',
    displayName: 'Health',
    emoji: '❤️',
    category: 'SUPPORT',
    subSkillTags: [
      'Strength',
      'Cardio',
      'Nutrition',
      'Mobility',
      'Recovery',
      'Energy'
    ] as const
  },
  {
    key: 'RELATIONSHIPS',
    displayName: 'Relationships',
    emoji: '🌱',
    category: 'SUPPORT',
    subSkillTags: [
      'Family',
      'Friends',
      'Mentors',
      'Business network'
    ] as const
  },
  {
    key: 'WISDOM',
    displayName: 'Wisdom',
    emoji: '📚',
    category: 'SUPPORT',
    subSkillTags: [
      'Psychology',
      'Economics',
      'History',
      'Philosophy',
      'Technology',
      'Communication'
    ] as const
  }
] as const;

/**
 * Helper: Get sub-skill tags for a specific tree by key.
 * Returns undefined if tree key doesn't exist (caller should handle gracefully).
 */
export function getSubSkillTagsForTree(treeKey: string): readonly string[] | undefined {
  return SKILL_TREES.find(t => t.key === treeKey)?.subSkillTags;
}

/**
 * Helper: Check if a sub-skill tag is valid for at least one of the given tree keys.
 * Used during quest/resource creation validation.
 * 
 * @param tag - The sub-skill tag to validate
 * @param treeKeys - Array of tree keys that the quest/resource is tagged to
 * @returns true if the tag exists in at least one of the related trees
 */
export function isValidSubSkillTag(tag: string, treeKeys: string[]): boolean {
  return treeKeys.some(key => {
    const tags = getSubSkillTagsForTree(key);
    return tags?.includes(tag);
  });
}

/**
 * Helper: Get all sub-skill tags across multiple trees (for validation error messages).
 * Returns a deduplicated Set of all tags from the specified trees.
 */
export function getAllSubSkillTagsForTrees(treeKeys: string[]): Set<string> {
  const allTags = new Set<string>();
  for (const key of treeKeys) {
    const tags = getSubSkillTagsForTree(key);
    if (tags) {
      tags.forEach(tag => allTags.add(tag));
    }
  }
  return allTags;
}
