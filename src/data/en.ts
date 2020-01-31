import antialiasing from "../samples/antialiasing.jpg";
import cardocr from "../samples/card.jpg";
import cel from "../samples/cel.jpg";
import cropped from "../samples/cropped.jpg";
import deskewed from "../samples/deskewed.jpg";
import DOF from "../samples/DOF.jpg";
import environmentmap from "../samples/environmentmap.jpg";
import glossy from "../samples/glossy.jpg";
import gouraud from "../samples/gouraud.jpg";
import origin from "../samples/origin.jpg";
import output from "../samples/output.jpg";
import phong from "../samples/phong.jpg";
import processed from "../samples/processed.jpg";
import ray from "../samples/raytrace.jpeg";
import reflection from "../samples/reflection.jpg";
import softshadow from "../samples/softshadow.jpg";
import texture from "../samples/texture.jpg";
import triangular from "../samples/triangular.jpg";
import webgl from "../samples/WebGL.jpg";
import wise from "../samples/WISE.jpg";
import wiseanimated from "../samples/wiseanimated.gif";
import wisedownload from "../samples/wisedownload.jpg";
import wisemobile from "../samples/wisemobile.jpg";

import {
  MenuOptions,
  Brief,
  ExperienceSection,
  ProjectSection,
  Contact
} from "../models/DataModel";

export const MENU: MenuOptions = {
  me: "Yufeng Li",
  about: "About",
  exp: "Experience",
  skills: "Skills",
  projects: "Projects",
  contact: "Contact"
};

export const BRIEF: Brief = {
  header: "Yufeng Li",
  desc: "Fullstack Developer"
};

export const ABOUT: string[] = [
  "Graduated from University of Toronto as a Computer Specialist.",
  "Besides a fullstack developer, I have also focused on computer graphics and machine learning.",
  "Value the art of algorithms and problem solving.",
  "Currently have been solving problems on Leetcode."
];

export const EXP: ExperienceSection = {
  header: "Experience",
  event: [
    {
      date_start: new Date("2014/09/01"),
      date_end: new Date("2015/04/30"),
      title: "University of Toronto: Learning the basic with python",
      color: "#98dbc6"
    },
    {
      date_start: new Date("2015/09/01"),
      date_end: new Date("2016/04/30"),
      title: "University of Toronto: Hardware and C, Java",
      color: "#4cb5f5"
    },
    {
      date_start: new Date("2016/09/01"),
      date_end: new Date("2017/04/30"),
      title:
        "University of Toronto: Web, Database, UX, funtional programming, Matlab, AI",
      color: "#e6d72a"
    },
    {
      date_start: new Date("2017/09/01"),
      date_end: new Date("2018/04/30"),
      title: "University of Toronto: Computer graphics and machine learning",
      color: "#f18d9e"
    },
    {
      date_start: new Date("2018/05/01"),
      date_end: new Date("2018/08/30"),
      title: "Work in RepeatLink Inc.",
      color: "#b3c100"
    },
    {
      date_start: new Date("2018/09/01"),
      date_end: new Date("2018/12/30"),
      title: "University of Toronto: UX, algorithms",
      color: "#8d230f"
    },
    {
      date_start: new Date("2019/02/01"),
      date_end: new Date("2019/02/27"),
      title:
        "Working on freelance project for a summer board school called Wise Education",
      color: "#c99e10"
    },
    {
      date_start: new Date("2019/08/19"),
      date_end: new Date(),
      title: "Working at Ventmere Inc.",
      color: "#caf1de"
    }
  ]
};

export const PROJECTS: ProjectSection = {
  header: "Projects",
  projects: [
    {
      picture: `url(${wise})`,
      toptitle: "WISE",
      midtitle: "EDU",
      lowtitle: "",
      desc:
        "A website using pure React and built with babel/webpack to support LESS/CSS3/SCSS. This is a landing page for a freelancer summer aboard school.",
      href: "http://www.wiseedc.com",
      details: [
        { desc: "Wise Education Website", pic: wise },
        {
          pic: wisemobile,
          desc: "Fully responsive design for mobile experience"
        },
        { pic: wisedownload, desc: "Downloadable content sent from server" },
        { pic: wiseanimated, desc: "Hover and scroll animations" }
      ]
    },
    {
      picture: `url(${cardocr})`,
      toptitle: "CARD",
      midtitle: "OCR",
      lowtitle: "",
      desc:
        "Card Optical Character Recognition done by python(used Opencv) and trained pretrained Google Teserract to recognize Japanese Character.",
      href: "https://github.com/derekli19951103/Card_OCR",
      details: [
        { pic: origin, desc: "Original noisy skewed image" },
        { pic: deskewed, desc: "Deskewed image" },
        { pic: cropped, desc: "Cropped image" },
        { pic: processed, desc: "Image passed into Teserract" },
        { pic: output, desc: "Text extracted" }
      ]
    },
    {
      picture: `url(${webgl})`,
      toptitle: "LIGHTING",
      midtitle: "SHADERS",
      lowtitle: "WEBGL",
      desc:
        "Using phong lighting models and written in python, js and glsl. This website can provide multiple shaders to render different objects.",
      href: "https://github.com/derekli19951103/LightingWebGL",
      details: [
        { pic: gouraud, desc: "Gourand shader" },
        { pic: phong, desc: "Phong shader" },
        { pic: cel, desc: "Cel shader" },
        { pic: texture, desc: "Texture shader" }
      ]
    },
    {
      picture: `url(${ray})`,
      toptitle: "RAY",
      midtitle: "TRACING",
      lowtitle: "",
      desc: "Raytracing done by C++",
      href: "https://github.com/derekli19951103/raytrace",
      details: [
        { pic: softshadow, desc: "Soft shadow vfx" },
        { pic: antialiasing, desc: "Antialiasing" },
        { pic: DOF, desc: "Depth of field" },
        { pic: environmentmap, desc: "Environment Cubic Map" },
        { pic: glossy, desc: "Glossy reflection" },
        { pic: reflection, desc: "Secondary reflection" }
      ]
    },
    {
      picture: `url(${triangular})`,
      toptitle: "TRI",
      midtitle: "ANGULAR",
      lowtitle: "MATTING",
      desc: "Triangulation Matting Using python",
      href: "https://github.com/derekli19951103/image_composing",
      details: [{ pic: triangular, desc: "Triangulation Mapping" }]
    }
  ]
};

export const CONTACT: Contact = {
  tel: "+16479493090",
  email: "derekli19951103@gmail.com"
};
