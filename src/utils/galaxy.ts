import type { HistoryDream } from '../types';
import { MIN_STAR_DISTANCE, MAX_POSITION_ATTEMPTS, GALAXY_RADIUS } from '../constants';

export const generateNonOverlappingPosition = (existingDreams: HistoryDream[]): { x: number; y: number } => {
  let attempts = 0;
  
  while (attempts < MAX_POSITION_ATTEMPTS) {
    const u = Math.random();
    const v = Math.random();
    const radius = Math.sqrt(u) * GALAXY_RADIUS;
    const theta = v * 2 * Math.PI;
    const x = 50 + radius * Math.cos(theta);
    const y = 50 + radius * Math.sin(theta);
    
    let hasOverlap = false;
    for (const dream of existingDreams) {
      const distance = Math.sqrt(Math.pow(x - dream.x, 2) + Math.pow(y - dream.y, 2));
      if (distance < MIN_STAR_DISTANCE) {
        hasOverlap = true;
        break;
      }
    }
    
    if (!hasOverlap) {
      return { x, y };
    }
    attempts++;
  }
  
  const u = Math.random();
  const v = Math.random();
  const radius = Math.sqrt(u) * GALAXY_RADIUS;
  const theta = v * 2 * Math.PI;
  return { x: 50 + radius * Math.cos(theta), y: 50 + radius * Math.sin(theta) };
};
