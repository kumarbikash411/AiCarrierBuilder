ALTER TABLE "OtpCode"
  ALTER COLUMN "phone" DROP NOT NULL,
  ADD COLUMN "email" TEXT,
  ADD COLUMN "purpose" TEXT NOT NULL DEFAULT 'LOGIN';

CREATE INDEX "OtpCode_email_purpose_idx" ON "OtpCode"("email", "purpose");
