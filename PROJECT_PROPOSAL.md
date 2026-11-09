# Rhema Learning Management System

## Project overview and presentation brief

- **Prepared for:** School leadership, staff and stakeholders
- **Project:** Rhema Learning Management System (LMS)
- **Document purpose:** Present the LMS vision, strengths, current capabilities and recommended next steps

> **A connected learning journey—from course access and teaching to assessment, feedback and progress.**

---

## 1. Executive summary

The Rhema Learning Management System is the academic heart of a connected digital school platform. It brings students, lecturers and academic teams into one web-based learning environment where courses, schedules, learning resources, assessments, submissions, attendance and grades can work together around the student learning journey.

Students have a dedicated portal to find their courses, follow class schedules and learning activity, access course materials, complete supported assessments, submit assignments and review results. Lecturers have a separate teaching workspace to manage assigned courses, set and review learning activities, assess submissions, record marks and provide structured feedback. Academic administrators can oversee courses, schedules, resources and related school processes through protected, role-appropriate tools.

What distinguishes the project is its joined-up approach. Teaching and learning are connected to the operational services that support them: attendance and follow-up, student records, notifications, billing and eligible payments, admissions, library resources and school administration. A shared application programming interface (API) and central database support these workflows, while separate student, lecturer and administrator workspaces keep each experience focused on its audience.

The platform is designed to give the school a strong foundation for a high-quality LMS: practical for everyday teaching, clear for students, useful for lecturers and extensible as academic needs evolve. Moodle-related integrations provide an additional connection point where configured, while the Rhema portal provides a unified experience for the school’s own learning and administrative services.

### Why the Rhema LMS stands out

- **Learning-centred design:** courses, resources, class sessions, attendance, assessment and results are connected around the student’s academic experience.
- **A complete teaching and assessment cycle:** lecturers can create and manage supported assignments and assessments, review submissions, record marks and return meaningful feedback.
- **Visible learning activity:** students can follow course progress, schedules, upcoming assessment activity, attendance and results from their own portal.
- **Feedback that supports improvement:** assignment review includes lecturer comments and saved text annotations; automated writing checks and AI-assisted reviews are advisory, not substitutes for academic judgement.
- **Connected academic operations:** course delivery is supported by student records, academic schedules, attendance workflows, notifications, library resources and administrative tools.
- **Purpose-built access:** students, lecturers and administrators work in separate, role-appropriate spaces, with protected APIs enforcing access to sensitive operations.
- **A platform that can grow:** a central API, database and modular service structure give the school a foundation for extending learning workflows and integrations.

## 2. The opportunity

High-quality learning depends on more than delivering course content. Students need a reliable way to find what to learn, understand when learning activities take place, complete and submit work, receive feedback and see their progress. Lecturers need practical tools to organize courses, assess learning and communicate outcomes. Academic teams need a dependable view of the records and processes that support teaching.

When these activities are scattered across disconnected tools, the learning experience becomes harder to follow and academic administration can become repetitive. Rhema addresses this by connecting core teaching-and-learning workflows in one LMS, then linking them to the student, attendance, communication and administrative services that support the wider school.

The ambition is not simply to put existing forms online. It is to give the school a coherent digital learning environment that can support consistent course delivery, timely feedback and clearer academic engagement—while remaining practical to administer and ready to develop further.

## 3. Project objectives

The LMS and its supporting platform aim to:

1. Provide students with a clear digital home for courses, learning resources, schedules, assignments, assessments, attendance and results.
2. Equip lecturers to organize assigned teaching, create learning activities, review submissions, assess student work and provide useful feedback.
3. Connect the academic journey—from enrolment and course participation through assessment and progress review.
4. Support consistent academic processes with shared records, notifications and role-appropriate administrative oversight.
5. Reduce avoidable fragmentation between learning activities and the student services that support them.
6. Protect student and academic information through separate workspaces and server-side role and access checks.
7. Build an adaptable foundation for future learning features, integrations and improvements informed by students, lecturers and school leadership.

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

1. Approve a phased pilot of the Rhema Learning Management System and its supporting school-platform services.
2. Confirm the authorized school sponsor and department leads.
3. Approve the proposed role and department mappings.
4. Confirm policies for shared reports, data confidentiality, and account management.
5. Confirm hosting, payment, email, backup and support responsibilities.
6. Nominate staff and student representatives for testing and feedback.
7. Agree on pilot dates, success measures and the process for approving a wider launch.

## 13. Conclusion

The Rhema Learning Management System puts teaching and learning at the centre of a connected digital school experience. It brings course delivery, resources, assessments, submissions, feedback and academic progress into one environment, supported by services for student records, attendance, communication and school administration. This gives Rhema a practical foundation for a more coherent learning journey today and a platform it can continue to improve with input from students, lecturers and school leadership.

The recommended next step is a school-led readiness review followed by a controlled pilot. This allows Rhema to validate the platform against real operating practices, confirm data and security requirements, and make an informed decision about wider adoption.

**Prepared for discussion with school leadership.**
