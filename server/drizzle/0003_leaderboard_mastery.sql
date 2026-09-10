BEGIN;

CREATE TABLE IF NOT EXISTS user_word_mastery (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  word_id text NOT NULL,
  first_mastered_at timestamptz,
  PRIMARY KEY (user_id, word_id)
);
CREATE INDEX IF NOT EXISTS user_word_mastery_time_idx
  ON user_word_mastery (first_mastered_at, user_id);

-- 旧进度只有掌握状态，没有逐词时间；保留未知时间，绝不灌入上线周。
INSERT INTO user_word_mastery (user_id, word_id, first_mastered_at)
SELECT p.user_id, word_id, NULL
FROM user_progress p
CROSS JOIN LATERAL jsonb_array_elements_text(p.mastered_word_ids) AS words(word_id)
WHERE word_id <> ''
ON CONFLICT (user_id, word_id) DO NOTHING;

COMMIT;
