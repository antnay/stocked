create type status as enum ('in_stock', 'out_of_stock', 'error');
create type website as enum ('target', 'vibram', 'amazon', 'rhode');

create table if not exists items (
    id int primary key generated always as identity,
    url varchar(255) not null,
    name varchar(255) not null,
    website website not null,
    size varchar(10),
    last_status status default 'out_of_stock' not null,
    check_interval_seconds int default 300 not null,
    last_checked_at timestamp,
    created_at timestamp default current_timestamp
);

create table if not exists "user" (
    id int primary key generated always as identity,
    email varchar(255) not null
);

create table if not exists user_items (
    user_id int not null,
    item_id int not null,
    checkout bool default false,
    foreign key (user_id) references "user"(id) on delete cascade,
    foreign key (item_id) references items(id) on delete cascade
);

create table if not exists config (
    interval int default 60,
    resend_api_key varchar(255),
    from_email varchar(255)
);