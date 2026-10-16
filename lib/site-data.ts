export type NavLink = {
  href: string;
  label: string;
};

export type ContentCard = {
  title: string;
  text: string;
};

export type Program = {
  name: string;
  level: string;
  description: string;
};

export type FeePlan = {
  name: string;
  monthly: string;
  annual: string;
};

export type TeamMember = {
  name: string;
  role: string;
  bio: string;
};

export const navLinks: NavLink[] = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/faculty", label: "Faculty" },
  { href: "/offered-programs", label: "Academics" },
  { href: "/apply", label: "Admissions" },
  { href: "/community", label: "Community" },
  { href: "/events", label: "Events" },
  { href: "/contact", label: "Contact" },
];

export const quickStats = [
  { label: "Students", value: "1,200+" },
  { label: "Teachers", value: "70+" },
  { label: "Programs", value: "18" },
  { label: "Graduates", value: "96%" },
];

export const values: ContentCard[] = [
  {
    title: "Excellence",
    text: "We set ambitious standards and support students to meet them with confidence and discipline.",
  },
  {
    title: "Integrity",
    text: "We model honesty, responsibility, and respect in every interaction and decision.",
  },
  {
    title: "Compassion",
    text: "We build a caring community where every learner feels seen, valued, and supported.",
  },
  {
    title: "Innovation",
    text: "We embrace creative, practical learning that prepares students for a changing world.",
  },
];

export const programs: Program[] = [
  {
    name: "Early Years",
    level: "Nursery - Primary",
    description: "A nurturing foundation that develops literacy, curiosity, and essential life skills.",
  },
  {
    name: "Junior School",
    level: "Grades 4 - 8",
    description: "A broad academic pathway that strengthens critical thinking, creativity, and discipline.",
  },
  {
    name: "Senior School",
    level: "Grades 9 - 12",
    description: "A focused academic model preparing learners for higher education, leadership, and work.",
  },
  {
    name: "STEM Lab",
    level: "Specialist track",
    description: "Hands-on learning in science, technology, engineering, and digital problem-solving.",
  },
  {
    name: "Arts & Design",
    level: "Creative stream",
    description: "Opportunities in visual arts, media, performance, and innovative expression.",
  },
  {
    name: "Leadership Academy",
    level: "Co-curricular",
    description: "Student leadership, service learning, and entrepreneurship experiences that build confidence.",
  },
];

export const feePlans: FeePlan[] = [
  { name: "Nursery", monthly: "GHS 420", annual: "GHS 4,620" },
  { name: "Primary", monthly: "GHS 560", annual: "GHS 6,160" },
  { name: "Junior High", monthly: "GHS 760", annual: "GHS 8,360" },
  { name: "Senior High", monthly: "GHS 980", annual: "GHS 10,780" },
];

export const privacyPoints = [
  "We collect only the information needed to support enrollment, communication, and student learning.",
  "Student data is protected using secure systems, role-based access, and careful handling procedures.",
  "We do not sell personal information and only share it when required by law or for school operations.",
  "Families may request updates or confirmation regarding the personal information stored for their child.",
  "We review our privacy practices regularly to keep information safe and aligned with school needs.",
];

export const termsSections = [
  {
    title: "Respectful conduct",
    text: "All students, families, and visitors are expected to treat one another with courtesy, respect, and dignity in school spaces and communications.",
  },
  {
    title: "Academic honesty",
    text: "Students must uphold honesty in their work, assessments, and research, and must avoid dishonest or deceptive academic practices.",
  },
  {
    title: "School communication",
    text: "Families and students agree to keep contact information current and engage respectfully with the school through official communication channels.",
  },
  {
    title: "Policy updates",
    text: "The school may amend policies and terms as needed to support a safe, effective, and supportive educational environment.",
  },
];

export const teamMembers: TeamMember[] = [
  {
    name: "Mrs. Abena Boateng",
    role: "Head of Primary",
    bio: "A patient educator who creates joyful, confident learners through warm and engaging classroom leadership.",
  },
  {
    name: "Mr. Kofi Mensah",
    role: "Director of Academics",
    bio: "Passionate about academic excellence and student growth through strong systems, mentorship, and structure.",
  },
  {
    name: "Ms. Evelyn Nkrumah",
    role: "Student Support Lead",
    bio: "Focuses on inclusive guidance, student well-being, and creating supportive pathways for every learner.",
  },
  {
    name: "Mr. Daniel Owusu",
    role: "STEM Coordinator",
    bio: "Encourages curiosity, problem-solving, and practical innovation through engaging project-based learning.",
  },
];
