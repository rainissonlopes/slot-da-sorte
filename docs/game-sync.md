# Sincronização do catálogo de jogos

## Arquitetura

O Rei dos Slots é uma fonte temporária e pública. O fluxo definitivo é:

`Rei dos Slots → coletor/normalizador → Supabase Database + Storage → Slot da Sorte`

O frontend não deve depender das imagens externas depois que um jogo for importado. O catálogo próprio continua disponível caso a origem seja desligada. A sincronização não altera sinais, ordem, destaque, visibilidade, links comerciais ou personalizações White Label.

## Comandos

- `npm run sync:games:preview`: coleta, valida, audita Supabase em leitura, verifica imagens e cria um plano. Não escreve remotamente.
- `npm run sync:games:apply -- --confirm`: refaz toda a coleta e só escreve se o preview tiver menos de duas horas, o fingerprint for idêntico, não houver ambiguidades, a branch estiver correta e uma credencial administrativa estiver disponível.
- `npm run sync:games:verify`: valida todos os registros e todos os objetos referenciados do Storage, sem modificar dados.
- `npm run test:sync-games`: executa testes unitários sem chamadas externas.

Relatórios ficam em `.tmp/sync-games/` e são ignorados pelo Git.

## Variáveis de ambiente

O preview/verify usa `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`. O apply exige ainda `SUPABASE_SECRET_KEY` ou `SUPABASE_SERVICE_ROLE_KEY`, exclusivamente no processo local/servidor. Nenhuma chave é impressa ou gravada nos relatórios.

## Descoberta e coleta

O coletor baixa o HTML público, extrai `initialGames` do payload Flight e examina os bundles referenciados para localizar exatamente uma `createServerReference(..., "getGames")`. A referência é validada por POST público `text/x-component`. Nenhum hash é fixado no código. Mudança de protocolo, ambiguidade, página parcial, loop ou ausência de `hasMore=false` interrompe a execução.

A baseline inicial é 304 jogos: PG 168, PP 49, TADA 61 e WG 26. Mudanças falham por padrão. `--accept-baseline` aceita a diferença somente naquela execução para inspeção; a baseline versionada deve ser atualizada manualmente após revisão dos jogos adicionados/ausentes. Registros ausentes nunca são excluídos ou desativados automaticamente.

## Segurança de imagens

URLs de `/_next/image` são decodificadas para o arquivo original. Apenas HTTP(S) e hosts públicos explicitamente permitidos são aceitos. DNS, redirects, timeout, tamanho máximo, status, Content-Type e assinatura binária são verificados. O SHA-256 permite deduplicação. HTML disfarçado, loopback, redes privadas e link-local são rejeitados.

Os paths são determinísticos: `{provider}/{external_id}/cover.{ext}` e `{provider}/{external_id}/icon.{ext}` no bucket `games`, usando a extensão correspondente ao conteúdo real validado. O banco só recebe a URL após o upload ser confirmado. Falha isolada mantém a imagem anterior; não há remoção de arquivos nesta fase.

## Banco, RLS e migration aplicada

O schema público contém `sinais`, que mistura métricas e apresentação, e `games`, que mantém identidade e mídia sem refatorar a V2. A migration versionada em `docs/game-sync-migration.sql` cria essa estrutura e o bucket público `games`. A chave é `(source, provider_normalized, external_id)`. O fallback `(provider_normalized, name_normalized)` só é usado quando o ID externo não corresponde também ao nome normalizado e nunca resolve ambiguidades.

A migration foi aplicada manualmente após auditoria do schema. A tabela usa RLS com leitura pública limitada às colunas consumidas pela V2; operações administrativas continuam restritas à credencial de servidor. O bucket `games` é público apenas para leitura, com limite de 5 MB e tipos JPEG, PNG, WebP e AVIF. O apply recusa prosseguir se tabela/bucket não existirem e não aplica DDL automaticamente.

Campos técnicos autorizados em `games`: identidade da fonte, nome de origem, URLs originais, paths/URLs do Storage, hashes, payload mínimo e timestamps. Campos de `sinais` protegidos: métricas, apostas, favorito, destaque, ordem, visibilidade, links e textos. A sincronização atualizou somente `imagem_url` dos sinais compatíveis; sinais sem correspondência inequívoca preservam sua identidade e recebem placeholder quando a referência numérica antiga é inválida.

## Falhas, recuperação e idempotência

Storage e Database não formam uma transação única. Uploads usam paths determinísticos e upsert; depois são confirmados antes dos lotes de banco. Reexecutar é seguro. Falhas isoladas de imagem são registradas; falhas sistêmicas interrompem o processo. Nunca há exclusão automática.

## Automação futura e desligamento da fonte

Depois de aprovar manualmente o fluxo, ele pode rodar diariamente por GitHub Actions, Vercel Cron ou backend seguro. Isso requer autorização separada e segredo armazenado no cofre da plataforma, nunca no Git. Para desligar o Rei dos Slots, desative o agendamento; os registros e assets próprios permanecem intactos. A evolução recomendada é `games` (identidade/mídia), `signals` (métricas) e `white_label_games` (ordem, visibilidade, destaque, links e customizações).
