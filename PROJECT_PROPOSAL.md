# Rhema Digital School Platform

## Project overview and presentation brief

**Prepared for:** School leadership, staff and stakeholders  
**Project:** Rhema Student, Academic and School Operations Portal  
**Document purpose:** Introduce the platform, its benefits, current capabilities and recommended next steps

---

## 1. Executive summary

The Rhema Digital School Platform is a connected web-based environment for student services, academic activity, school administration, payments and community engagement. It brings important school workflows into one branded portal, supported by a shared application programming interface (API) and central database.

Students can access relevant learning information, resources, attendance, billing, events and purchases through a student portal. Lecturers have a separate workspace for course activity, assignments, submissions and grading. Administrators use a protected workspace with access determined by their role and department.

The administrative dashboards are separated by department: Director, Accounts, Student Affairs, Academic Dean, Media & IT, and Operations. Each department sees its own dashboard and appropriate modules. A separate Shared Reports area allows an authorized administrator to send a view-only report to one or more selected departments. Recipients receive an in-app notification and can open only reports shared with them.

The platform is designed to reduce fragmented record-keeping, improve service to students and staff, strengthen operational visibility and provide a foundation for the school’s continued digital development.

### The platform’s strongest capabilities

- **One connected digital campus:** public school information, student and lecturer services, and administration work together through one portal and central records.
- **Purpose-built workspaces:** students, lecturers and six administrator departments see tools relevant to their responsibilities.
- **Live operational insight:** dashboards summarize available live records with statistics and charts, rather than relying on invented sample figures.
- **End-to-end transactions:** supported payment workflows connect checkout, server-side verification, transaction records and branded PDF receipts.
- **Controlled collaboration:** administrators can share a view-only report with several selected departments, with in-app notifications and server-side access checks.
- **Room to grow:** the portal is built as a connected web application with an API and database, allowing the school to improve and extend workflows over time.

## 2. The opportunity

Schools rely on timely, accurate information and clear processes. When records and activities are spread across forms, spreadsheets, messages and manual follow-up, staff may need to enter the same information repeatedly, students may be unsure where to find services, and leadership may not have a current view of school operations.

The platform provides a unified digital environment where selected activities can be recorded and managed consistently. It connects people and workflows without giving every administrator unrestricted access to every department’s workspace.

> **One school platform. Department-specific workspaces. Reports shared with purpose.**

## 3. Project objectives

The project aims to:

1. Give students, lecturers and administrators clear, role-appropriate online workspaces.
2. Bring core student, academic, payment, attendance, event and store records into a connected system.
3. Reduce avoidable manual administration and repeated data entry.
4. Improve the visibility and traceability of school transactions and operational activity.
5. Provide leadership and departments with useful dashboards and reports based on available system data.
6. Enable secure collaboration by sharing reports with selected departments.
7. Establish a maintainable foundation for future school services and integrations.

## 4. Platform users and workspaces

### Students

The student portal provides access to available student services, including:

- Profile and course information.
- Class schedules, attendance information and relevant follow-up activity.
- Grades, assignments and other course assessment activity supported by the system.
- Library and course learning resources.
- Audio resources where access has been granted or purchased.
- Billing, payment history and eligible receipts.
- Events, registrations, store purchases and account notifications.

The information shown depends on the student’s account and the relevant data available in the system.

### Lecturers

The lecturer workspace supports teaching-related activity, including:

- Assigned courses and course materials.
- Assignment creation and student submissions.
- Assessment marking, grades, feedback and saved annotations.
- Course resources, schedule information and lecturer profile settings.

Assignment review tools support lecturer comments and text annotations. Automated writing checks and AI-assisted review are advisory tools; they do not replace professional academic judgement or independently establish academic misconduct.

### Administrators and school leadership

Administrators access the protected administration workspace using an assigned role. The department dashboards are:

| Dashboard | Main focus |
|---|---|
| **Director** | Organization-wide summaries and access to leadership and department workspaces. |
| **Accounts** | Student payment records, receipts, store purchases and financial administration. |
| **Student Affairs** | Student records, attendance, admissions-related processes, follow-ups and events. |
| **Academic Dean** | Courses, assessments, schedules, learning resources and academic activity. |
| **Media & IT** | Help desk, communications, website enquiries and digital content. |
| **Operations** | Operational tasks, events and available schedules. |

Each dashboard presents live summaries and charts from the data sources configured for that role. Departmental users do not gain access to another department’s dashboard simply because they can share or receive a report. Operations reporting is limited to functions present in the system; the platform does not currently claim to manage facilities or physical assets.

## 5. Shared reports and cross-department collaboration

Shared Reports is a distinct area for distributing written reports without combining department dashboards.

An administrator can:

1. Create a report with a title and report details.
2. Select one or multiple recipient departments.
3. Share the report with the selected departments.

Active administrators in each selected department receive an in-app notification with a link to the report. Reports are view-only to recipients and are available only to the author and the selected recipient departments. This provides a controlled way to communicate findings while maintaining department boundaries.

Reports should contain information appropriate for the selected audience and should follow the school’s data-protection and confidentiality practices.

## 6. Current platform capabilities

The platform’s value comes from the way its abilities connect. A student can use the same account to access learning services, complete supported transactions and receive relevant updates; staff can manage the associated records in role-appropriate workspaces.

### A connected academic journey

- **Manage the student record:** maintain student and cohort information in a central system.
- **Organize teaching:** manage courses, sessions, schedules and course resources.
- **Capture attendance:** use the check-in desk to record student arrival, link check-ins to available sessions, record check-outs and review attendance activity.
- **Support assessments:** publish and manage configured assignments, quizzes and examinations; record grades and give students access to their results and relevant work.
- **Strengthen lecturer feedback:** lecturers can review submissions, add highlights and comments, record marks, and return feedback to students.
- **Support academic decisions:** use available student, course, attendance and assessment data in departmental dashboards and reports.

### A complete payment and receipt journey

1. A student or customer selects an eligible fee, resource, event or store item.
2. The portal initiates checkout using the configured payment provider, or records an eligible offline payment for administrative review.
3. Online payment is verified by the server before the transaction is treated as confirmed.
4. The system records the payment against its corresponding transaction or student finance record.
5. A branded PDF receipt is generated for a confirmed eligible payment and made available through the relevant transaction or account workflow.
6. Receipt metadata and file locations are stored so that authorized users can retrieve the relevant receipt.

The receipt experience supports student finance, store orders, audio purchases and paid event registrations. Pending, failed, free or unverified transactions are not presented as completed paid receipts. Payment-provider accounts, keys and currencies must be configured and tested before production checkout is enabled.

### Learning resources and audio

- Organize library materials and course-linked resources for learning.
- Provide audio resources through configured access entitlements or completed purchases.
- Give eligible students access to playback and downloads where the resource and permissions allow them.
- Link student-facing resource access to the relevant portal account rather than relying solely on disconnected request forms.

### Public engagement, events and commerce

- Publish school events with details such as dates, locations, descriptions, speakers and images.
- Support free or paid registrations and allow staff to review registration and payment records.
- Present a product catalogue with supported variants, pricing, purchase records and stock-related administration.
- Manage store promotions and review purchase histories.
- Provide branded receipts for eligible confirmed purchases and registrations.

### Department leadership and operational control

- Give the Director an organization-wide overview and each department a separate, role-appropriate dashboard.
- Present available operational counts and charts using data returned by the connected APIs.
- Provide department links to the systems and administrative tools relevant to each role.
- Apply role and department checks in both the interface and protected API endpoints.
- Assign and track administrative tasks using the task workspace.
- Keep cross-department sharing separate from dashboard access.

### Notifications and communication

- Deliver in-app notifications that link to relevant portal activities where those notification workflows are configured.
- Support administrative communications and help desk workflows.
- Notify selected departments when a report is shared and provide a direct link to open it.
- Support optional email delivery when the school’s hosting and email settings are configured.

### Reporting and collaboration

- Show role-specific live dashboard statistics and charts based on available system records.
- Provide manual and periodic dashboard refresh.
- Allow a report author to choose one or multiple departments as recipients.
- Give selected recipients a view-only report and a notification while protecting the report from other departments.
- Support existing module-specific report and export formats where implemented.

Together, these capabilities let the school move from an individual activity to a complete service journey: a student checks in for class, accesses learning materials, submits work, receives lecturer feedback, pays an eligible fee when required, and retrieves a confirmed receipt—all through connected, role-appropriate services. Staff can then review relevant activity in their own workspace or share a view-only report with selected departments. The accuracy of results depends on complete school records, correctly assigned permissions and reliable production configuration.

## 7. Benefits for the school

### A clearer experience for students and staff

Users have a recognizable online destination for the school services available to them. Relevant notifications and links can reduce uncertainty about where to find an update or complete a task.

### Better departmental focus

Role-scoped access helps departments concentrate on their responsibilities while preserving a separate leadership view and a controlled mechanism for sharing reports.

### Improved operational visibility

Dashboards can make selected live records easier to review. Timely data can support planning, follow-up and management discussions.

### More structured financial processes

Payment records and receipts are connected to the relevant transaction workflows. Server verification and payment-status controls help distinguish confirmed payments from pending or unsuccessful attempts.

### Reduced fragmentation

Centralized records can reduce duplicate tracking across disconnected tools, provided that the school adopts the system consistently and maintains accurate data.

### Stronger school identity

A unified, branded platform can give students, families, staff and event participants a more consistent digital experience.

## 8. Security, privacy and responsible use

The platform includes separate student, lecturer and administrator authentication flows. Administrative areas and protected APIs enforce role-based access, and the shared-report API checks whether the user is the report author or belongs to a selected recipient department.

School leadership should establish operating policies for:

- Who may create, suspend and administer accounts.
- Password distribution, reset and change procedures.
- Which information may be included in shared reports.
- Student-data access, retention and correction.
- Payment-provider configuration and financial reconciliation.
- Staff training, incident reporting and account deactivation when roles change.

The school should use HTTPS in production, keep API and payment secrets out of browser code and source control, and restrict access to database backups and uploaded documents.

## 9. Implementation and readiness

The platform is an active software project with multiple existing student, lecturer and administrative workflows. A school-wide launch should still be treated as a managed implementation rather than assumed to be complete merely because features exist in the codebase.

Recommended readiness activities include:

1. **Confirm ownership and scope.** Name a school sponsor, operational leads and department administrators.
2. **Review and prepare data.** Verify student, staff, course, cohort, fee, event, product and resource records before production use.
3. **Configure infrastructure.** Confirm the portal domain, PHP API hosting, database, backups, HTTPS, email delivery and payment-provider settings.
4. **Validate role assignments.** Confirm each administrator’s department and role, including the intended Director and department accounts.
5. **Test end-to-end workflows.** Test representative student, lecturer and administrative scenarios, including access restrictions, payment verification, receipt retrieval, shared-report visibility and notifications.
6. **Train users.** Provide practical onboarding for administrators, lecturers and students.
7. **Pilot before full rollout.** Begin with a controlled group, capture feedback, resolve issues and then expand.
8. **Monitor and maintain.** Assign responsibility for support, software updates, backups, account reviews and data-quality checks.

## 10. Proposed rollout

### Stage 1 — School readiness

Approve the project scope, confirm school branding and policies, nominate department owners, and prepare clean data and secure hosting.

### Stage 2 — Internal administration pilot

Validate role access, department dashboards, live statistics, shared reports, notifications and core administrative processes with a small staff group.

### Stage 3 — Lecturer and student pilot

Test course, resource, assessment, attendance, billing, payment and receipt experiences with representative lecturers and students.

### Stage 4 — Wider launch

Expand access in planned cohorts, provide user guidance and offer a clear route for reporting issues.

### Stage 5 — Review and improvement

Review adoption, data completeness, support requests and agreed success measures. Prioritize improvements with school leadership.

## 11. Suggested success measures

The school can review progress using measures such as:

- Percentage of active students and staff successfully onboarded.
- Completion rate for key online workflows.
- Accuracy and completeness of student, course and payment records.
- Number of eligible payments with a retrievable receipt.
- Time required to locate operational information or complete administrative follow-up.
- Number of reports shared with the intended departments and successfully opened.
- Notification delivery and user response rates.
- Attendance-data completeness and report usage.
- User feedback, support requests and issue-resolution time.

Targets should be agreed by the school after establishing a baseline during the pilot.

## 12. Decisions requested from school leadership

To proceed responsibly, the school is asked to:

1. Approve a phased pilot of the Rhema Digital School Platform.
2. Confirm the authorized school sponsor and department leads.
3. Approve the proposed role and department mappings.
4. Confirm policies for shared reports, data confidentiality, and account management.
5. Confirm hosting, payment, email, backup and support responsibilities.
6. Nominate staff and student representatives for testing and feedback.
7. Agree on pilot dates, success measures and the process for approving a wider launch.

## 13. Conclusion

The Rhema Digital School Platform offers the school a practical foundation for connecting student services, academic work and administration. Its department-specific dashboards support focused work; its Shared Reports feature provides a controlled way to communicate across departments; and its connected workflows can improve the handling of payments, receipts, learning resources, attendance, events and communication.

The recommended next step is a school-led readiness review followed by a controlled pilot. This allows Rhema to validate the platform against real operating practices, confirm data and security requirements, and make an informed decision about wider adoption.

**Prepared for discussion with school leadership.**
