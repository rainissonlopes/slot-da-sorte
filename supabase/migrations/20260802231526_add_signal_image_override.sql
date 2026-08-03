alter table public.sinais
  add column if not exists imagem_personalizada boolean;

update public.sinais
set imagem_personalizada = false
where imagem_personalizada is null;

alter table public.sinais
  alter column imagem_personalizada set default false,
  alter column imagem_personalizada set not null;

comment on column public.sinais.imagem_personalizada is
  'Indica que imagem_url foi definida manualmente para este sinal e deve sobrescrever a midia do catalogo na V2.';
