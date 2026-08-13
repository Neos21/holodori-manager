-- テーブルの新規作成

CREATE TABLE holomems (  -- ホロメン
  id          INTEGER  PRIMARY KEY  AUTOINCREMENT,                      -- ID
  sort_order  INTEGER  NOT NULL  DEFAULT 0,                             -- ゲーム内表示順を再現するための手動調整可能な表示順
  group_name  TEXT     NOT NULL,                                        -- グループ
  name        TEXT     NOT NULL,                                        -- タレント名
  note        TEXT,                                                     -- 自由記入欄
  is_active   INTEGER  NOT NULL  DEFAULT 1 CHECK (is_active IN (0, 1))  -- 卒業等による無効化・物理削除はしない
);

CREATE TABLE cards (  -- カード
  id           INTEGER  PRIMARY KEY  AUTOINCREMENT,                        -- ID
  holomems_id  INTEGER  NOT NULL,                                          -- FK → holomems.id
  rarity       INTEGER  NOT NULL  CHECK (rarity IN (3, 4, 5)),             -- レア度・3・4・5 のいずれかが入る
  name         TEXT     NOT NULL,                                          -- カード名称 (通常版・イベント限定版などの識別に使用する)
  is_owned     INTEGER  NOT NULL  DEFAULT 0 CHECK (is_owned IN (0, 1)),    -- 所有しているか否か
  level        INTEGER  NOT NULL,                                          -- レベル
  bloom        INTEGER  NOT NULL  DEFAULT 0 CHECK (bloom BETWEEN 0 AND 5)  -- 開花度 (0〜5)
);

CREATE TABLE board_nodes (  -- ホロメンボードのマス
  id             INTEGER  PRIMARY KEY  AUTOINCREMENT,                                                                     -- ID
  holomems_id    INTEGER  NOT NULL,                                                                                       -- FK → holomems.id
  category       TEXT     NOT NULL  CHECK (category IN ('yellow', 'green', 'red', 'blue')),                               -- カテゴリ・この4値のみ許容する
  yellow_target  TEXT               CHECK (yellow_target IS NULL OR yellow_target IN ('lesson_pt', 'cube', 'training')),  -- category が `yellow` の時のみホロワーク報酬アップ対象アイテムを示す・その他の場合は Null とする
  description    TEXT     NOT NULL,                                                                                       -- マス効果の内容 (自由記述。例 : 「キューブ獲得量アップ」「リーダー時スコア +50」)
  is_unlocked    INTEGER  NOT NULL  DEFAULT 0 CHECK (is_unlocked IN (0, 1)),                                              -- 対象のマスを解放済か否か
  amount         REAL     NOT NULL,                                                                                       -- マス自体の基礎効果量 (% の場合もあれば固定値の場合もあるため単位非依存の数値として保持する)
  connect_rate   REAL                                                                                                     -- コネクトマスによる増幅率 (%)。未設定なら Null とする
);

CREATE TABLE holowork_achievements (  -- ホロワーク達成状況
  id             INTEGER  PRIMARY KEY  AUTOINCREMENT,  -- ID
  holomems_id    INTEGER  NOT NULL  UNIQUE,            -- FK → holomems.id・ユニーク
  current_count  INTEGER  NOT NULL  DEFAULT 0,         -- ホロワーク完了回数
  note           TEXT                                  -- 自由記入欄
);

CREATE TABLE holoworks (  -- ホロワークの枠
  id    INTEGER  PRIMARY KEY  AUTOINCREMENT,  -- ID
  name  TEXT     NOT NULL                     -- 枠の名前 (例 : 「歌配信」「ゲーム配信」「雑談配信」「収録」)
);

CREATE TABLE active_holowork_members (  -- ホロワーク活動中のホロメン
  id            INTEGER  PRIMARY KEY  AUTOINCREMENT,  -- ID
  holoworks_id  INTEGER  NOT NULL,                    -- FK → holoworks.id
  holomems_id   INTEGER  NOT NULL  UNIQUE             -- FK → holomems.id・ユニーク (1人が同時に複数枠で活動できないのでそれを防ぐ)
);

CREATE TABLE memo (  -- 自由メモ : 現状は単一レコード運用を想定している
  id      INTEGER  PRIMARY KEY  AUTOINCREMENT,  -- ID
  content TEXT                                  -- 自由メモ
);
