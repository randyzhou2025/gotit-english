CREATE TABLE IF NOT EXISTS learning_reminders (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT false,
  reminder_time varchar(5) NOT NULL DEFAULT '19:00',
  timezone varchar(64) NOT NULL DEFAULT 'Asia/Shanghai',
  last_attempt_date date,
  last_sent_date date,
  last_delivery_status varchar(16),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT learning_reminders_time_format CHECK (reminder_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$')
);
