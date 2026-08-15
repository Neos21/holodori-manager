# ADR-001 : 単一テーブル CRUD と複合 Read Model を分離する

- 状態 : 採用


## Context (背景・課題)

画面表示や候補選定では複数テーブルの `JOIN` と集約が必要になる。一方、Repository に画面都合の `JOIN` を追加すると、特定テーブルの永続化を抽象化する責務と、ユースケース固有の Read Model 構築が混在する。


## Decision (意思決定)

- `server/repositories/` はテーブル別の単一テーブル CRUD を扱う
- 複数テーブルを横断する Read Model は、用途名を持つ `server/services/` の Service が直接構築する
- 複数 Repository を組み合わせる不可分な操作も Service が扱う
- DB 取得直後のサーバ内部表現と、集約・計算済みの公開モデルを分離する


## Consequences (結果・影響)

- Repository の公開 API をテーブル操作として理解しやすく保てる
- 画面ごとの取得・集約理由を Service 名と実装から追跡できる
- 同じテーブルを含む複数の Read Model が別 Service に存在しうるため、業務計算は共有 Service に切り出して重複を防ぐ
- DB の行と公開モデルとの間に変換処理が必要になる


## Rejected Alternatives (却下した選択肢)

- Repository に画面用の大きな `JOIN` を置く
    - テーブル CRUD と画面固有取得の責務が混在するため採用しない
- クライアントで複数 API の結果を突合する
    - 通信とクライアント State が増え、サーバ側で保証すべき区分や集約が分散するため採用しない
