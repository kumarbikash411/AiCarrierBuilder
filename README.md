# AiCarrierBuilder

A mobile app for building resumes and managing job application materials with AI assistance.

## Account recovery and resume import

- Password recovery sends a 6-digit code to the account email. Configure `RESEND_API_KEY` and `RESET_EMAIL_FROM` on the backend; the sender domain must be verified with Resend. Reset codes expire after 10 minutes.
- SMS sign-in continues to use the existing MSG91 settings.
- Resume import accepts text-based PDF and Word `.docx` files up to 10 MB. The backend extracts the text, sends it to the configured Groq model for scoring and structuring, then saves an editable resume. Scanned image PDFs are not supported because OCR is not configured.
- Configure `GROQ_API_KEY` on the backend for import scoring. Deploy the backend so the new Prisma migration runs, then create a new Android production build to include the document picker and recovery screen.

## Project structure

- backend/ - API services and business logic
- mobile/ - React Native + Expo app
