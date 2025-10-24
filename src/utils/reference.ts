import { randomBytes } from 'crypto';

let counter = 0;

export const generateTransactionReference = (): string => {
  const timestamp = Date.now();
  const randomPart = randomBytes(3).toString("hex"); 
  counter = (counter + 1) % 1000; 
  const counterPart = counter.toString().padStart(3, "0"); 
  return `TXN-${timestamp}-${counterPart}-${randomPart}`.toUpperCase();
};

