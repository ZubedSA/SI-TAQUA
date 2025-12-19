-- Check if usernames exist
SELECT email, username, role FROM user_profiles ORDER BY created_at DESC;

-- Check exact match for a username (replace 'test' with the username you are trying)
-- SELECT * FROM user_profiles WHERE username = 'test';
