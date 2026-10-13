-- Grant administrator rights to an EXISTING Supabase Auth user.
--
-- 1. Create the user first: Supabase Dashboard → Authentication → Users → "Add user"
--    → "Create new user" (email + strong password, tick "Auto Confirm User").
-- 2. Replace the email below and run this script in Dashboard → SQL Editor.
--    The SQL editor runs as a trusted role; no API client can do this.

insert into public.admin_users (user_id, note)
select id, 'Provisioned via SQL editor'
from auth.users
where email = lower('admin@example.com')   -- ← replace with the administrator's email
on conflict (user_id) do nothing
returning user_id;

-- Expect exactly one row. Zero rows means no Auth user has that email.

-- To list administrators:
--   select au.user_id, u.email, au.created_at
--   from public.admin_users au join auth.users u on u.id = au.user_id;
--
-- To revoke administrator rights (the user keeps their login but loses all admin access):
--   delete from public.admin_users
--   where user_id = (select id from auth.users where email = lower('admin@example.com'));
