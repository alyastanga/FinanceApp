/**
 * Calculates a 'Smart' increment for a goal's Quick Add button based on its target scale.
 * This provides a premium, zero-config experience that scales with the goal.
 */
export const calculateSmartIncrement = (targetAmount: number): number => {
  if (!targetAmount || targetAmount <= 0) return 50;
  
  // Logic based on Order of Magnitude
  if (targetAmount <= 5000) return 100;
  if (targetAmount <= 25000) return 500;
  if (targetAmount <= 100000) return 1000;
  if (targetAmount <= 500000) return 5000;
  if (targetAmount <= 2500000) return 10000;
  
  return 25000; // For multi-million goals
};
