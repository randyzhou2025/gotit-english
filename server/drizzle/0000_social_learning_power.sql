CREATE TABLE IF NOT EXISTS share_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token varchar(64) NOT NULL UNIQUE,
  inviter_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  publisher_id varchar(64) NOT NULL,
  book_id varchar(128) NOT NULL,
  unit_id varchar(128) NOT NULL,
  unit_name varchar(128) NOT NULL,
  share_type varchar(32) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS share_invites_inviter_idx ON share_invites (inviter_user_id, created_at);

CREATE TABLE IF NOT EXISTS classmate_relations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_b_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source varchar(32) NOT NULL,
  source_share_id uuid REFERENCES share_invites(id) ON DELETE SET NULL,
  status varchar(16) NOT NULL DEFAULT 'ACTIVE',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT classmate_relations_pair_uidx UNIQUE (user_a_id, user_b_id),
  CONSTRAINT classmate_relations_distinct_users CHECK (user_a_id <> user_b_id),
  CONSTRAINT classmate_relations_sorted_pair CHECK (user_a_id::text < user_b_id::text)
);
CREATE INDEX IF NOT EXISTS classmate_relations_user_b_idx ON classmate_relations (user_b_id, status);

CREATE TABLE IF NOT EXISTS dictation_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id varchar(128) NOT NULL,
  unit_id varchar(128) NOT NULL,
  completed_word_count integer NOT NULL,
  is_valid boolean NOT NULL,
  completed_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT dictation_submissions_user_session_uidx UNIQUE (user_id, session_id)
);

CREATE TABLE IF NOT EXISTS weekly_word_learning (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  word_id varchar(160) NOT NULL,
  week_key varchar(16) NOT NULL,
  first_learned_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, word_id, week_key)
);

CREATE TABLE IF NOT EXISTS user_weak_word_history (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  word_id varchar(160) NOT NULL,
  first_marked_weak_at timestamptz NOT NULL DEFAULT now(),
  last_marked_weak_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, word_id)
);

CREATE TABLE IF NOT EXISTS learning_power_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  week_key varchar(16) NOT NULL,
  event_date date NOT NULL,
  event_type varchar(32) NOT NULL,
  score integer NOT NULL,
  word_id varchar(160),
  unit_id varchar(128),
  dictation_session_id varchar(128),
  unique_key varchar(320) NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS learning_power_events_user_week_idx ON learning_power_events (user_id, week_key, event_type);
CREATE INDEX IF NOT EXISTS learning_power_events_created_at_idx ON learning_power_events (created_at);

CREATE TABLE IF NOT EXISTS daily_learning_power_stats (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stat_date date NOT NULL,
  dictation_word_score integer NOT NULL DEFAULT 0,
  valid_dictation_score integer NOT NULL DEFAULT 0,
  daily_bonus_score integer NOT NULL DEFAULT 0,
  streak_score integer NOT NULL DEFAULT 0,
  mistake_review_score integer NOT NULL DEFAULT 0,
  total_score integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, stat_date),
  CONSTRAINT daily_learning_power_caps CHECK (
    dictation_word_score BETWEEN 0 AND 20
    AND valid_dictation_score BETWEEN 0 AND 20
    AND daily_bonus_score BETWEEN 0 AND 10
    AND streak_score BETWEEN 0 AND 5
    AND mistake_review_score BETWEEN 0 AND 20
    AND total_score BETWEEN 0 AND 75
  )
);

CREATE TABLE IF NOT EXISTS weekly_learning_power (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  week_key varchar(16) NOT NULL,
  learning_power integer NOT NULL DEFAULT 0,
  valid_dictation_count integer NOT NULL DEFAULT 0,
  active_study_days integer NOT NULL DEFAULT 0,
  last_score_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, week_key)
);
CREATE INDEX IF NOT EXISTS weekly_learning_power_rank_idx ON weekly_learning_power (
  week_key,
  learning_power,
  valid_dictation_count,
  active_study_days,
  last_score_at
);

CREATE TABLE IF NOT EXISTS learning_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  activity_type varchar(32) NOT NULL,
  unit_id varchar(128),
  unit_name varchar(128),
  count_value integer,
  rank_value integer,
  unique_key varchar(256) NOT NULL UNIQUE,
  occurred_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS learning_activities_user_time_idx ON learning_activities (user_id, occurred_at);

CREATE TABLE IF NOT EXISTS feed_cheers (
  feed_id uuid NOT NULL REFERENCES learning_activities(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (feed_id, user_id)
);

INSERT INTO app_config (key, value)
VALUES (
  'leaderboard_config',
  '{"displayLimit":10,"maxLimit":100,"topSpecialCount":3,"timezone":"Asia/Shanghai","weekStartDay":"MONDAY"}'
)
ON CONFLICT (key) DO NOTHING;
