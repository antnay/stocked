-- Convert items.website from the `website` enum to plain text, so adding a new
-- store in the future requires no DB migration (just app code). Safe to run once.
alter table items alter column website type text using website::text;
drop type if exists website;
