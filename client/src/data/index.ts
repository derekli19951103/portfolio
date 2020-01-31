import { useLanguage } from "../hooks/language";
import * as EN from "./en";
import * as ZH from "./zh";

const lang = useLanguage();
let { MENU, BRIEF, ABOUT, EXP, PROJECTS, CONTACT } = EN;
switch (lang) {
  case "en":
    break;
  case "zh":
    MENU = ZH.MENU;
    BRIEF = ZH.BRIEF;
    ABOUT = ZH.ABOUT;
    EXP = ZH.EXP;
    PROJECTS = ZH.PROJECTS;
    CONTACT = ZH.CONTACT;
    break;
}

export { MENU, BRIEF, ABOUT, EXP, PROJECTS, CONTACT };
