-- Migration: Kalender Akademik
-- Table for storing academic events, holidays, and exams

create table if not exists kalender_akademik (
  id uuid primary key default uuid_generate_v4(),
  judul varchar(255) not null,
  deskripsi text,
  tanggal_mulai date not null,
  tanggal_selesai date not null,
  jenis varchar(50) not null check (jenis in ('Libur', 'Ujian', 'Kegiatan', 'Rapat', 'Lainnya')),
  warna varchar(20) default 'blue', -- blue, red, green, yellow, etc.
  created_at timestamptz default now(),
  created_by uuid references auth.users(id),
  updated_at timestamptz default now()
);

-- Index for querying events by date range
create index if not exists idx_kalender_tanggal on kalender_akademik(tanggal_mulai, tanggal_selesai);

-- RLS
alter table kalender_akademik enable row level security;

-- Policies
create policy "Kalender viewable by authenticated" on kalender_akademik for select using (auth.role() = 'authenticated');
create policy "Kalender editable by admin" on kalender_akademik for all using (
  auth.uid() in (select id from auth.users where raw_user_meta_data->>'role' = 'admin')
);
create policy "Kalender editable by guru/pengurus" on kalender_akademik for insert with check (
   auth.uid() in (select id from auth.users where raw_user_meta_data->>'role' in ('admin', 'guru', 'pengurus'))
);
create policy "Kalender specific edit" on kalender_akademik for update using (
   auth.uid() = created_by or 
   auth.uid() in (select id from auth.users where raw_user_meta_data->>'role' = 'admin')
);
