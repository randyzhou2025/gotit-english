BEGIN;

ALTER TABLE feedbacks ADD COLUMN IF NOT EXISTS user_last_read_at timestamptz;
ALTER TABLE feedbacks ADD COLUMN IF NOT EXISTS admin_last_read_at timestamptz;
ALTER TABLE feedbacks ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
UPDATE feedbacks SET user_last_read_at = created_at WHERE user_last_read_at IS NULL;
UPDATE feedbacks SET updated_at = created_at WHERE updated_at IS NULL;

CREATE TABLE IF NOT EXISTS feedback_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feedback_id uuid NOT NULL REFERENCES feedbacks(id) ON DELETE CASCADE,
  sender varchar(16) NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS feedback_replies_feedback_id_idx ON feedback_replies (feedback_id, created_at);

COMMIT;
