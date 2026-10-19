This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Environment configuration

The portal reads local Next.js settings from `.env.local`; start with `.env.example`. `NEXT_PUBLIC_API_URL` selects the PHP API origin. Optional Moodle settings are server-side only; keep `MOODLE_TOKEN` private and never prefix it with `NEXT_PUBLIC_`.

The PHP API reads its settings from the PHP hosting environment, not from a `.env` file. Use `../php-api/.env.example` as the variable checklist and configure values in PHP-FPM, Apache, or the deployment platform. Do not commit production credentials.

## Chat and account notifications

The portal's role-scoped message center supports admin-to-admin, admin-to-lecturer, and Student Affairs admin-to-student conversations. It stores messages and unread state in `communications_*`; server-side participant checks apply to every request. In-app account notifications use the existing `rhema_notifications` table and link to relevant course, assessment, attendance, and event pages. Assignment submission and grading, quiz results, enrolment, published assessments, class schedule changes, attendance follow-ups, lecturer account changes, and registered event updates generate relevant notifications.

The PHP database initializer creates the required tables automatically. If the PHP host is configured not to run the application initializer, import `../php-api/communications/createTables.sql` into the same database before deploying communications endpoints. Email delivery uses PHP outbound `mail()` and is enabled unless `NOTIFICATION_EMAIL_ENABLED=false`; configure `NOTIFICATION_EMAIL_FROM` (or reuse `PAYMENT_RECEIPT_FROM`) with a valid sender address and set `PORTAL_BASE_URL` for action links. Email delivery is best effort: a mail transport failure is logged and does not undo the in-app notification or the underlying operation.

## Attendance absence follow-ups

Before enabling missed-session notifications, import `../php-api/attendance/createFollowupsTable.sql` into the school database. The PHP API stores sick-note attachments in the repository-level `private/attendance-notes` directory and serves them only through its authenticated admin download endpoint; keep that directory outside any public upload/static-file mapping.

## Student affairs check-in desk

The Student Affairs dashboard links to `/checkin`, a standalone check-in desk in the `(check-in-out)` route group rather than the admin dashboard shell. The previous `/admin/student-affairs/check-in` URL redirects to the new route. Staff can type a student name or ID, or scan a card using a handheld scanner. Scheduled sessions are optional: auto-match links a check-in to the student's sole session that day or the only session currently in progress; staff can explicitly choose a session or record a general check-in without one. A linked check-in creates the existing course attendance record when one is not already present. Check-out updates the check-in record without changing the original attendance time. Reports include scheduled class absences and general check-ins, and can be downloaded as CSV.

The API initializes `rhema_student_checkins` with the other application tables. For deployments that apply database changes manually, run `../php-api/attendance/createStudentCheckInsTable.sql` before using the check-in desk.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Course assessment reopen access

The admin course assessment pages use `course_activity_overrides` to grant individual students an additional quiz, exam, or assignment attempt through a selected deadline. The PHP database initializer creates this table automatically; for manual schema deployments, import `../php-api/courses/createActivityOverrides.sql`.

## Lecturer assignment marking

Lecturers can select submission text to add saved highlights and comments, run local spelling/grammar/punctuation and Arial 14 pt format checks, and request an advisory AI review. The review includes a heuristic AI-likeness signal and confidence indicator; it cannot verify AI use or originality and must not be used alone to make academic-integrity decisions. The AI review sends the assignment brief, rubric, and selected student submission to OpenAI only when the lecturer presses the review button. It does not assign or save a grade. Configure `OPENAI_API_KEY` and, optionally, `OPENAI_MODEL` in the PHP server environment; never put the key in a `NEXT_PUBLIC_` variable or commit it. New assignment submissions default to Arial 14 pt, and students can choose a typeface and size in the editor.

## Social media and content calendar

The admin Social Media & Content panel stores calendar items and review states in `social_media_posts`. The PHP database initializer creates this table and adds the `media_paths` field automatically; deployments that apply schema changes manually can import `../php-api/social-media/createTables.sql`. Posts support multiple images or one video, with uploads stored under `php-api/uploads/social-media` (maximum 100 MB per file). Meta publishing is not active until a Meta Graph API app and authorized Facebook/Instagram business accounts are configured.

The public website chatbot stores keyword responses, anonymous session-level conversation analytics, page-action clicks, and submitted contact leads in `chatbot_responses`, `chatbot_interactions`, `chatbot_leads`, and `chatbot_settings`. The PHP database initializer creates these tables and seeds starter responses; manually initialized databases should import `../php-api/chatbot/createTables.sql`. Manage the chatbot from `/admin/chatbot`. Add the public website origin to `CORS_ALLOWED_ORIGINS` if it is not already allowed. The location card only appears after an administrator configures the school address and its Google Maps share URL. Chat questions and voluntarily submitted lead details are visible to administrators.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
