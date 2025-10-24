-- Migration: Add transfer_in and transfer_out transaction types
-- This migration updates the CHECK constraint on the transactions table
-- to allow 'transfer_in' and 'transfer_out' in addition to 'credit' and 'debit'

-- Step 1: Drop the existing CHECK constraint
ALTER TABLE transactions 
DROP CONSTRAINT IF EXISTS transactions_type_check;

-- Step 2: Add the new CHECK constraint with all four transaction types
ALTER TABLE transactions 
ADD CONSTRAINT transactions_type_check 
CHECK (type IN ('credit', 'debit', 'transfer_in', 'transfer_out'));

-- Verify the change 
-- SELECT constraint_name, check_clause 
-- FROM information_schema.check_constraints 
-- WHERE constraint_name = 'transactions_type_check';

