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
  me: "李雨峰",
  about: "关于我",
  exp: "经历",
  skills: "技能",
  projects: "作品",
  contact: "联系方式"
};

export const BRIEF: Brief = { header: "李雨峰", desc: "初级全栈工程师" };

export const ABOUT: string[] = [
  "本科毕业于多伦多大学计算机系",
  "不仅是一个初级全栈工程师，大学期间也学习过计算机视觉和机器学习",
  "系统的学习过算法知识和复杂度理论",
  "最近正在刷Leetcode"
];

export const EXP: ExperienceSection = {
  header: "经历经验",
  event: [
    {
      date_start: new Date("2014-09-01"),
      date_end: new Date("2015-04-30"),
      title: "多伦多大学：python入门编程",
      color: "#98dbc6"
    },
    {
      date_start: new Date("2015-09-01"),
      date_end: new Date("2016-04-30"),
      title: "多伦多大学：硬件编程，C，Java",
      color: "#4cb5f5"
    },
    {
      date_start: new Date("2016-09-01"),
      date_end: new Date("2017-04-30"),
      title: "多伦多大学: 网页, 数据库, 用户体验, Lisp, Matlab, AI",
      color: "#e6d72a"
    },
    {
      date_start: new Date("2017-09-01"),
      date_end: new Date("2018-04-30"),
      title: "多伦多大学: 计算机视觉和机器学习",
      color: "#f18d9e"
    },
    {
      date_start: new Date("2018-05-01"),
      date_end: new Date("2018-08-30"),
      title: "RepeatLink Inc.实习",
      color: "#b3c100"
    },
    {
      date_start: new Date("2018-09-01"),
      date_end: new Date("2018-12-30"),
      title: "多伦多大学: 用户体验研究，算法",
      color: "#8d230f"
    },
    {
      date_start: new Date("2019-02-01"),
      date_end: new Date("2019-02-27"),
      title: "为WISE教育制作网站",
      color: "#c99e10"
    },
    {
      date_start: new Date("2019-08-19"),
      date_end: new Date(),
      title: "在Ventmere Inc.工作",
      color: "#caf1de"
    }
  ]
};

export const PROJECTS: ProjectSection = {
  header: "作品",
  projects: [
    {
      picture: `url(${wise})`,
      toptitle: "WISE",
      midtitle: "官网",
      lowtitle: "",
      desc: "网站使用React并且用babel/webpack打包并使用了LESS/CSS3/SCSS.",
      href: "http://www.wiseedc.com",
      details: [
        { desc: "Wise Education 网站", pic: wise },
        { pic: wisemobile, desc: "为移动端优化阅读" },
        { pic: wisedownload, desc: "从服务器发回文件" },
        { pic: wiseanimated, desc: "悬停，滚动动画" }
      ]
    },
    {
      picture: `url(${cardocr})`,
      toptitle: "卡片",
      midtitle: "识别",
      lowtitle: "",
      desc: "识别日本保健卡中的光学字体",
      href: "https://github.com/derekli19951103/Card_OCR",
      details: [
        { pic: origin, desc: "原图片" },
        { pic: deskewed, desc: "修正角度" },
        { pic: cropped, desc: "定位卡片" },
        { pic: processed, desc: "使用Teserract识别" },
        { pic: output, desc: "导出字符" }
      ]
    },
    {
      picture: `url(${webgl})`,
      toptitle: "光学",
      midtitle: "模型",
      lowtitle: "WEBGL",
      desc: "Webgl实现光影模型",
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
      toptitle: "光线",
      midtitle: "追踪",
      lowtitle: "",
      desc: "光线追踪算法(c++)",
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
      toptitle: "三角",
      midtitle: "定位",
      lowtitle: "抠图",
      desc: "三角定位抠图(python)",
      href: "https://github.com/derekli19951103/image_composing",
      details: [{ pic: triangular, desc: "三角定位抠图" }]
    }
  ]
};

export const CONTACT: Contact = {
  tel: "+8615008181043",
  email: "derekli19951103@gmail.com"
};
