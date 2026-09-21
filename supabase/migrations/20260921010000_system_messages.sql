begin;
create table if not exists public.system_messages (
 id uuid primary key default gen_random_uuid(),
 title text not null check (char_length(title) between 1 and 160),
 body text not null check (char_length(body) between 1 and 12000),
 platform text not null default 'all' check (platform in ('all','android','browser')),
 min_build integer not null default 243 check (min_build >= 0),
 published_at timestamptz not null default now(),
 expires_at timestamptz,
 enabled boolean not null default true,
 check (expires_at is null or expires_at > published_at)
);
alter table public.system_messages enable row level security;
revoke all on public.system_messages from anon, authenticated;
grant select on public.system_messages to anon, authenticated;
drop policy if exists "Read active system messages" on public.system_messages;
create policy "Read active system messages" on public.system_messages for select to anon, authenticated
 using (enabled and published_at <= now() and (expires_at is null or expires_at > now()));
insert into public.system_messages(id,title,body) values (
 '3f81a6ab-7d6a-4e57-95ca-e82264000243',
 'Thank you for building this with me',
 $message$Saturday Dynasty Football is made by one solo developer, and having you here means more than you know.

Every season you play, bug you report, and idea you share helps make this game better. Thank you for giving a small independent game a chance—and for your patience while I keep improving it.

There is more football ahead. I’m grateful you’re part of it.

— Corey$message$) on conflict(id) do nothing;
commit;
select id, title, platform, enabled from public.system_messages;

update public.system_messages set title=$title$Thank You for Playing Saturday Dynasty Football ❤️$title$, body=$body$I just wanted to take a moment to personally thank every single person who has downloaded and played **Saturday Dynasty Football**.

This game is being built by **one developer**, and what started as an idea for the kind of college football dynasty and recruiting game I wanted to play has grown into something much bigger than I ever expected.

There have been countless hours of designing, coding, testing, rebuilding systems, fixing bugs, adding features, and trying to make every part of the game better. And there is still a LOT more I want to do.

If you're playing right now, you're not just playing the finished product — **you're part of building it.**

Your feedback, bug reports, suggestions, crazy feature ideas, and even the things you don't like genuinely help decide where the game goes next. Some of the best improvements already made to Saturday Dynasty Football have come directly from players telling me what they wanted to see changed or added.

I hope you'll stick with the game as it continues to grow. There will be bugs. There will be things that need balancing. There will probably be features I completely rebuild because I realize they can be better.

But I'm committed to continuing to improve it.

My goal is to build a deep college football dynasty experience with recruiting, coaching, roster management, player development, stats, records, game planning, facilities, the transfer portal, championships, and all the little decisions that make building a program feel like **your dynasty**.

And we're nowhere near done.

So please keep sending feedback. Tell me what you love, what annoys you, what's broken, and what you'd love to see added someday. I read it, and I want the community to have a real voice in how this game develops.

Whether you've played one season or built a dynasty that's been running for decades, **thank you for giving my game a chance.**

Every download, every dynasty started, every review, and every piece of feedback means more to a solo developer than you probably realize.

We're building this thing together.

**Thank you for being here from the beginning. 🏈**

— Corey
Solo Developer, Saturday Dynasty Football$body$ where id='3f81a6ab-7d6a-4e57-95ca-e82264000243';
select id, title, length(body) as characters from public.system_messages where id='3f81a6ab-7d6a-4e57-95ca-e82264000243';
