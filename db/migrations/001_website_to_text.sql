-- Convert items.website from the `website` enum to plain text, so adding a new
-- store in the future requires no DB migration (just app code). Safe to run once.
alter table items alter column website type text using website::text;
drop type if exists website;

-- Widen url/name/size so long URLs, product titles, and variant names fit.
alter table items alter column url type text;
alter table items alter column name type text;
alter table items alter column size type text;
