# Rhema Student and School Operations Portal

## Project Proposal and Institutional Pitch

**Prepared for:** Rhema / Godfrey Academy

**Project:** Unified Student, Academic, Commerce, Events, and School Operations Portal

**Technology foundation:** Next.js student portal connected to the Rhema PHP API and MySQL database

## 1. Executive Summary

The Rhema Student and School Operations Portal is a unified digital platform designed to improve how the school manages students, academic activity, attendance, learning resources, events, merchandise, payments, and communication.

At present, several important school processes are separated across informal channels, spreadsheets, manual records, and Jotform forms. This creates duplicated work, limited visibility, slow follow-up, and a weak connection between school records and the people who need to use them.

The proposed portal brings these services into one secure, branded system. Students and families get one place to access academic information, resources, events, purchases, receipts, and support. Administrators gain one operational workspace for managing records, attendance, courses, store inventory, promotions, event registrations, and reports.

The result is a more professional school experience, stronger operational control, better data accuracy, and a foundation for future digital services.

## 2. The Pitch

Rhema should not have to manage modern school operations through disconnected forms and manual follow-up.

This portal turns the school website into a working digital campus: a single system where a student can find a course resource, request or purchase an audio recording, register for an event, buy school items, receive a receipt, and access their academic information. At the same time, staff can manage the underlying records from a central database instead of tracking activities across separate tools.

**One school. One connected system. Better service for students, families, lecturers, and administrators.**

## 3. Problems the Project Solves

### 3.1 Audio requests depend on Jotform

Students who miss a class or need an audio recording currently have to submit requests through Jotform. This creates several problems:

- Requests are separated from the student, course, attendance, and payment records.
- Staff must manually review forms and follow up with students.
- It is difficult to see which recordings have been requested, paid for, or delivered.
- Students have no clear self-service view of what they have purchased or what they can access.
- Reporting and audit trails are limited.

### 3.2 Jotform is being used to sell school items

Using Jotform as a sales tool is not a complete store solution. It does not naturally provide:

- A live product catalogue.
- Product images and variants such as colour and size.
- Stock quantities and low-stock visibility.
- Server-side stock validation.
- Purchase history linked to inventory.
- Branded receipts that can be printed or downloaded.
- A staff dashboard for managing products, purchases, and promotions.

This increases the risk of duplicate orders, inaccurate stock records, manual reconciliation, and poor customer experience.

### 3.3 There is no proper event management system

Events are valuable opportunities for community engagement, recruitment, fundraising, and school visibility. Without a dedicated event system, the school must manage:

- Event creation and publication.
- Event images and speaker profiles.
- Event pricing and free events.
- Registration details.
- Payment status.
- Dietary or menu preferences.
- Attendance and registration reporting.

through disconnected tools or manual processes.

### 3.4 School information is fragmented

Students, lecturers, administrators, and families may need to use different channels for courses, schedules, attendance, grades, resources, messages, payments, events, and store purchases. Fragmentation makes it harder to provide a consistent service and harder for management to see what is happening across the institution.

### 3.5 Limited operational visibility

When information is spread across forms, messages, and independent files, management cannot easily answer basic questions:

- Which students are active and properly registered?
- Which students have attendance concerns?
- Which courses and sessions are scheduled?
- Which resources are being used or purchased?
- Which products are in stock?
- Which events are attracting registrations?
- Which payments are pending or complete?

The portal addresses these gaps with centralized database records and role-specific workspaces.

## 4. Proposed Solution

The portal provides a connected digital environment with the following core areas.

### 4.1 Student portal

Students can access:

- Student dashboard and profile information.
- Courses and course-specific pages.
- Class schedules and sessions.
- Attendance-related information.
- Grades and academic progress.
- Assignments, quizzes, examinations, and learning resources.
- Notifications and messages.
- Library and audio learning resources.
- School events and event registration.
- Store products, shopping cart, checkout, and receipts.
- Billing and payment-related information.

### 4.2 Administrator workspace

Administrators can manage:

- Student records and status.
- Courses, cohorts, sessions, and enrolments.
- Attendance records and reports.
- Academic terms and school configuration.
- Store products, variants, pricing, images, and stock.
- Store purchases and printable/downloadable receipts.
- Store promotions displayed on the public website.
- Events, prices, event images, speaker profiles, and registrations.
- Alerts, logs, communications, and operational reporting.

### 4.3 Lecturer workspace

Lecturers receive a dedicated workspace for:

- Courses and course configuration.
- Assignments and submissions.
- Grades and assessment management.
- Course resources and lesson materials.
- Student and course-related workflows.
- Lecturer profile and settings.

### 4.4 Central PHP API and database

The portal uses the Rhema PHP API as the central connection layer. Database-backed records include:

- Students.
- Courses and sessions.
- Attendance.
- Academic terms.
- Store products and variants.
- Store purchases and purchase line items.
- Store promotions.
- Events and event registrations.
- Event speakers and speaker avatar paths.

This gives the school one consistent source of truth instead of multiple disconnected form submissions.

## 5. Direct Replacement of the Current Jotform Workflows

### Audio request workflow

**Current:** Student submits a Jotform request, staff manually reviews it, payment and delivery are tracked separately.

**Proposed:**

1. Attendance or course context identifies the relevant audio resource.
2. Student sees available audio resources in the portal.
3. Student selects and purchases the required recording or bundle.
4. The system records the purchase and payment status.
5. Access is linked to the student's account.
6. Staff can review audio resources and transactions from the administrative workspace.

### School item sales workflow

**Current:** Student completes a Jotform order, staff manually reconciles items and stock.

**Proposed:**

1. Student browses the live school store.
2. Student selects product variants such as colour and size.
3. The system validates stock using the database.
4. The purchase is recorded with customer and delivery details.
5. Inventory is reduced transactionally.
6. The student receives a purchase reference.
7. Staff can view, print, and download a branded receipt.
8. Administrators can manage products, variants, stock, and promotions.

### Event workflow

**Current:** Event details, registrations, payment, images, and speaker information are managed through disconnected processes.

**Proposed:**

1. Administrator creates an event in the portal.
2. Administrator uploads event artwork and speaker avatars to the school API storage.
3. Administrator sets the event description, date, location, speakers, and optional price.
4. The event appears on the public school events page when published.
5. Students, families, or guests register through the event page.
6. Registration details and payment status are stored in the database.
7. Administrators can review registration records from the event workspace.

## 6. Key Features

### Academic operations

- Student registry.
- Course and cohort management.
- Session and timetable management.
- Attendance capture and reporting.
- Academic term configuration.
- Grades, assessments, assignments, quizzes, and examinations.

### Digital learning

- Learning resource library.
- Audio resource catalogue.
- Course-linked resources.
- Student access to purchased or assigned learning content.
- Future support for Moodle integration.

### Events and community engagement

- Public events catalogue.
- Event detail pages.
- Optional event pricing, including free events.
- Speaker profiles with uploaded avatars.
- Event cover images stored in the PHP API uploads folder.
- Registration and payment status records.
- Dietary and menu preference support.

### School store

- Database-backed product catalogue.
- Product variants, colours, sizes, batches, and prices.
- Inventory quantities and stock indicators.
- Public promotions managed by administrators.
- Shopping cart and checkout.
- Transactional stock deduction.
- Purchase history.
- Branded receipts that can be printed or downloaded.

### Communication and administration

- Notifications and alerts.
- Messages and support workflows.
- Administrative logs.
- Reports and dashboards.
- Configurable school terms, cohorts, and pricing.

## 7. Benefits to the School

### Better student experience

Students receive one professional portal instead of being sent between forms, messages, and separate pages. This reduces confusion and makes school services easier to find and use.

### Lower administrative workload

Automated records, stock deduction, registration capture, receipt generation, and centralized management reduce repetitive manual work.

### Improved data accuracy

The same database records can support the student portal, admin dashboards, reports, store transactions, event registrations, and academic operations.

### Better financial control

Purchases, event fees, audio sales, product prices, payment statuses, and receipts can be reviewed in a more structured way.

### Stronger school brand

A unified and branded portal gives students, families, and partners a more credible experience than a collection of disconnected forms.

### Better decision-making

Management can use centralized records to understand enrolment, attendance, event interest, stock movement, and service demand.

### Scalable foundation

The portal can grow to support online payments, role-based permissions, automated notifications, Moodle synchronization, richer reporting, and mobile access.

## 8. Proposed User Groups

### Students and families

Access learning, events, purchases, receipts, notices, and support from one account.

### Lecturers

Manage teaching resources, assignments, grades, sessions, and learner activity.

### Administrators

Manage school operations, student records, events, inventory, purchases, promotions, and reports.

### School leadership

Review dashboards, trends, operational summaries, and financial activity for informed planning.

## 9. Implementation Approach

### Phase 1: Core platform and database connection

- Deploy the Next.js student portal.
- Configure the PHP API and database environment.
- Confirm database tables and API connectivity.
- Configure image storage under the PHP API uploads folder.
- Establish user roles and administrative access.

### Phase 2: Academic and student operations

- Confirm student records.
- Configure courses, cohorts, terms, sessions, and attendance.
- Validate lecturer and student workflows.
- Connect academic reports to live database data.

### Phase 3: Audio and learning resources

- Convert audio request workflows from Jotform to portal-based resource requests or purchases.
- Link resources to courses and attendance context.
- Configure purchase records, payment status, and student access.

### Phase 4: Store and receipts

- Load the real school product catalogue.
- Configure variants, prices, images, stock, and batch codes.
- Test purchases and transactional stock deduction.
- Confirm branded receipt printing and downloads.

### Phase 5: Events and promotions

- Load upcoming events.
- Upload event artwork and speaker avatars.
- Configure event prices or mark events as free.
- Test public registration and admin registration reports.
- Create and schedule promotional hero campaigns.

### Phase 6: Training, launch, and continuous improvement

- Train administrators and lecturers.
- Provide student onboarding instructions.
- Run a controlled pilot.
- Review feedback and improve workflows.
- Establish a support and maintenance process.

## 10. Success Measures

The project can be evaluated using measurable outcomes such as:

- Reduction in Jotform submissions for audio requests and item sales.
- Reduction in manual order and registration reconciliation.
- Percentage of store purchases recorded with complete receipts.
- Accuracy of available stock compared with physical stock.
- Number of events managed entirely through the portal.
- Student and staff adoption rates.
- Average response time for audio and event requests.
- Reduction in duplicate or incomplete records.
- Availability of current operational reports for management.

## 11. Institutional Investment Requested

To move the portal into full school operation, the project requires:

- Formal approval of the unified portal approach.
- Confirmation of the school brand, content, pricing, and event policies.
- Appointment of administrators responsible for data and content management.
- Verification of the production PHP hosting and MySQL environment.
- Confirmation of payment provider requirements.
- Staff training and a phased launch plan.
- Ongoing technical maintenance and data governance.

## 12. Conclusion

The Rhema Student and School Operations Portal is a practical response to the school's current operational challenges. It directly addresses the dependence on Jotform for audio requests and item sales, introduces a proper event management system, and creates a foundation for connected academic and administrative services.

The value of the project is not only in replacing individual forms. Its value is in connecting the school records behind those services so that students receive a better experience and staff gain better control.

By adopting the portal, Rhema can move from fragmented digital processes to a unified school platform that is easier to manage, easier to scale, and more aligned with the school's identity and future.

**Recommended decision:** Approve the portal as the school's unified digital operations platform and proceed with a phased production rollout beginning with student records, events, store operations, audio resources, and attendance-connected services.
