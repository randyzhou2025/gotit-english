BEGIN;

ALTER TABLE daily_learning_power_stats
  ADD COLUMN IF NOT EXISTS wordlist_export_score integer NOT NULL DEFAULT 0;

ALTER TABLE daily_learning_power_stats
  DROP CONSTRAINT IF EXISTS daily_learning_power_caps;

ALTER TABLE daily_learning_power_stats
  ADD CONSTRAINT daily_learning_power_caps CHECK (
    dictation_word_score BETWEEN 0 AND 20
    AND valid_dictation_score BETWEEN 0 AND 20
    AND daily_bonus_score BETWEEN 0 AND 10
    AND streak_score BETWEEN 0 AND 5
    AND mistake_review_score BETWEEN 0 AND 20
    AND wordlist_export_score BETWEEN 0 AND 20
    AND total_score BETWEEN 0 AND 95
  );

COMMIT;
