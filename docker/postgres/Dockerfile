# PostgreSQL 16 (the same Alpine image as before, so existing data volumes and their collations stay valid) with pgvector built in.
# pgvector stores the embeddings for long-term AI memory (db/migrations/20261122100000_conversation_memories.sql).
FROM postgres:16-alpine
ARG PGVECTOR_VERSION=0.8.1
# with_llvm=no: skip the JIT bitcode, which would need a clang matching the server's LLVM build.
RUN apk add --no-cache --virtual .build-deps build-base git \
  && git clone --branch "v${PGVECTOR_VERSION}" --depth 1 https://github.com/pgvector/pgvector.git /tmp/pgvector \
  && make -C /tmp/pgvector with_llvm=no OPTFLAGS="" \
  && make -C /tmp/pgvector with_llvm=no install \
  && rm -rf /tmp/pgvector \
  && apk del .build-deps
