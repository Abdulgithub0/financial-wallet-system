-- Migration: Add NOT NULL constraint to full_name column
-- This migration updates existing NULL values and adds the NOT NULL constraint

-- Step 1: Update existing NULL values with a default value gotting the first part of the email before the @ symbol
UPDATE users 
SET full_name = 'User ' || SUBSTRING(email FROM 1 FOR POSITION('@' IN email) - 1)
WHERE full_name IS NULL OR full_name = '';

-- Step 2: Add NOT NULL constraint
ALTER TABLE users 
ALTER COLUMN full_name SET NOT NULL;

-- Verify the change
-- SELECT COUNT(*) as null_count FROM users WHERE full_name IS NULL;

