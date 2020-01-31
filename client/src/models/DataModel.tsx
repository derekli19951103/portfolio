export interface MenuOptions {
  me: string;
  about: string;
  exp: string;
  skills: string;
  projects: string;
  contact: string;
}

export interface Brief {
  header: string;
  desc: string;
}

export interface ExperienceSection {
  header: string;
  event: ExpEvent[];
}

export interface ExpEvent {
  date_start: Date;
  date_end: Date;
  title: string;
  color: string;
}

export interface ProjectSection {
  header: string;
  projects: Project[];
}

export interface Project {
  picture: string;
  toptitle: string;
  midtitle: string;
  lowtitle: string;
  desc: string;
  href: string;
  details: { desc: string; pic: string }[];
}

export interface Contact {
  tel: string;
  email: string;
}
