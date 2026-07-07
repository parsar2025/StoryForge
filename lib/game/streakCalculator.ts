/**
 * Streak Calculator
 * 
 * Computes consecutive days with at least one logged time entry.
 * Rewards the daily-logging habit rather than only completion days.
 * 
 * Phase 1: Uses calendar days (midnight UTC boundary).
 * Phase 5: Will migrate to 02:30 UTC game-day boundary per PRD Section 8.
 * 
 * Per Requirements 18.1-18.5
 */

import { prisma } from '@/lib/prisma';

/**
 * Compute current streak for a character.
 * 
 * Streak = consecutive days (counting backward from today) where the character
 * logged at least one time entry (ActivityLog record).
 * 
 * Returns 0 if no entry logged for current day.
 * 
 * Algorithm:
 * 1. Group all activity logs by workedOn date (distinct dates)
 * 2. Start from current day (today)
 * 3. Count backward until finding a day with no logged entry
 * 
 * @param characterId - Character ID to compute streak for
 * @returns Number of consecutive days with logged time entries (0 if no entry today)
 * 
 * @example
 * // Character logged entries on: Jan 1, Jan 2, Jan 3, (skip Jan 4), Jan 5
 * // Today is Jan 5
 * await computeStreak('char123'); // returns 1 (only Jan 5, broken streak on Jan 4)
 * 
 * @example
 * // Character logged entries on: Jan 1, Jan 2, Jan 3, Jan 4, Jan 5
 * // Today is Jan 5
 * await computeStreak('char123'); // returns 5
 */
export async function computeStreak(characterId: string): Promise<number> {
  // Fetch all distinct dates where character logged time entries
  const logs = await prisma.activityLog.findMany({
    where: { characterId },
    select: { workedOn: true },
    orderBy: { workedOn: 'desc' }
  });
  
  if (logs.length === 0) {
    return 0;
  }
  
  // Get distinct dates (workedOn is stored as date, but comes back as DateTime)
  const distinctDates = Array.from(
    new Set(logs.map(log => log.workedOn.toISOString().split('T')[0]))
  ).sort().reverse(); // Most recent first
  
  if (distinctDates.length === 0) {
    return 0;
  }
  
  // Get today's date string in UTC (YYYY-MM-DD)
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  
  // If no entry for today, streak is 0
  if (distinctDates[0] !== todayStr) {
    return 0;
  }
  
  // Count consecutive days backward from today
  let streak = 1;
  let currentDate = new Date(todayStr);
  
  for (let i = 1; i < distinctDates.length; i++) {
    // Move to previous day
    currentDate.setUTCDate(currentDate.getUTCDate() - 1);
    const expectedDateStr = currentDate.toISOString().split('T')[0];
    
    // Check if this date has an entry
    if (distinctDates[i] === expectedDateStr) {
      streak++;
    } else {
      // Gap found - streak broken
      break;
    }
  }
  
  return streak;
}

/**
 * Update cached streak value on Character record.
 * 
 * Called when:
 * - New time entry is created
 * - Quest is completed (to ensure fresh streak for XP calculation)
 * 
 * @param characterId - Character ID to update
 * @returns Updated streak value
 */
export async function updateCachedStreak(characterId: string): Promise<number> {
  const streak = await computeStreak(characterId);
  
  await prisma.character.update({
    where: { id: characterId },
    data: { streakDays: streak }
  });
  
  return streak;
}

/**
 * Get cached streak value from Character record.
 * Faster than recomputing, but may be stale if not updated recently.
 * 
 * @param characterId - Character ID to get streak for
 * @returns Cached streak value
 */
export async function getCachedStreak(characterId: string): Promise<number> {
  const character = await prisma.character.findUnique({
    where: { id: characterId },
    select: { streakDays: true }
  });
  
  return character?.streakDays ?? 0;
}
