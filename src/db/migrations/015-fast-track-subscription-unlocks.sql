-- Link monthly Family & Women's Health Pass unlocks to their Stripe subscription
-- so access can be removed when the subscription is cancelled or stops being paid.
-- One-off passes leave this column NULL and never expire.
ALTER TABLE fast_track_unlocks ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
CREATE INDEX IF NOT EXISTS idx_fast_track_unlocks_subscription ON fast_track_unlocks (stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;
