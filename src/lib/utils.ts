import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function normalizeText(text: string): string {
  return text.replace(/œu/gi, 'oeu');
}

export function parseQuantity(quantity: string): number {
  if (!quantity) return 0;
  
  // Handle fractions like "1/2", "3/4"
  const fractionMatch = quantity.match(/^(\d+)\/(\d+)$/);
  if (fractionMatch) {
    return parseFloat(fractionMatch[1]) / parseFloat(fractionMatch[2]);
  }
  
  // Handle mixed numbers like "1 1/2", "2 3/4"
  const mixedMatch = quantity.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixedMatch) {
    return parseFloat(mixedMatch[1]) + (parseFloat(mixedMatch[2]) / parseFloat(mixedMatch[3]));
  }
  
  // Handle decimals and integers
  const numMatch = quantity.match(/[\d.]+/);
  return numMatch ? parseFloat(numMatch[0]) : 0;
}

export function formatQuantity(value: number): string {
  // Round to 2 decimal places and remove trailing zeros
  const rounded = Math.round(value * 100) / 100;
  return rounded.toString().replace(/\.00$/, '');
}

export function adjustIngredientQuantity(ingredient: string, ratio: number): string {
  const [name, quantity, unit] = ingredient.split('|');
  
  if (!quantity) {
    return ingredient;
  }
  
  const numericQuantity = parseQuantity(quantity);
  if (numericQuantity === 0) {
    return ingredient;
  }
  
  const adjustedQuantity = numericQuantity * ratio;
  const formattedQuantity = formatQuantity(adjustedQuantity);
  
  return [name, formattedQuantity, unit].filter(Boolean).join('|');
}
