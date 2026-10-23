import { publicPageMetadata } from "@/lib/site-seo";

export const metadata = publicPageMetadata(
  "/faculty",
  "Faculty and Ministry Instructors",
  "Meet the instructors and ministry leaders who teach and equip students at Rhema Zambia.",
);

export default function FacultyLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
