import React, { useEffect } from "react";
import scrollToComponent from "react-scroll-to-component";
import { About } from "../components/About";
import { Contact } from "../components/Contact";
import { Experience } from "../components/Experience";
import { Me } from "../components/Me";
import { Projects } from "../components/Projects";
import { Skills } from "../components/Skills";
import { MENU } from "../data";
import "../styles/Landing.css";

export const Landing = () => {
  let MeSection: HTMLElement;
  let AboutSection: HTMLElement;
  let ExperienceSection: HTMLElement;
  let SkillsSection: HTMLElement;
  let ProjectsSection: HTMLElement;
  let ContactSection: HTMLElement;

  useEffect(() => {
    let body: HTMLBodyElement;
    let menu: any;
    let menuItems: NodeListOf<Element>;

    const applyListeners = () => {
      menu.addEventListener("click", function() {
        return toggleClass(body, "nav-active");
      });
      menuItems.forEach(menuItem => {
        menuItem.addEventListener("click", () => {
          return toggleClass(body, "nav-active");
        });
      });
    };

    const toggleClass = (element: HTMLElement, stringClass: string) => {
      if (element.classList.contains(stringClass)) {
        element.classList.remove(stringClass);
        const ele = document.querySelector(".nav__content") as HTMLElement;
        ele.style.pointerEvents = "none";
      } else {
        element.classList.add(stringClass);
        const ele = document.querySelector(".nav__content") as HTMLElement;
        ele.style.pointerEvents = "visible";
      }
    };

    const init = () => {
      body = document.querySelector("body")!;
      menu = document.querySelector(".menu-icon");
      menuItems = document.querySelectorAll(".nav__list-item");
      const ele = document.querySelector(".nav__content") as HTMLElement;
      ele.style.pointerEvents = "none";
      applyListeners();
    };

    init();
  });

  return (
    <div>
      <div className="menu-icon">
        <span className="menu-icon__line menu-icon__line-left"></span>
        <span className="menu-icon__line"></span>
        <span className="menu-icon__line menu-icon__line-right"></span>
      </div>

      <div className="nav">
        <div className="nav__content">
          <ul className="nav__list">
            <li
              className="nav__list-item"
              onClick={() => scrollToComponent(MeSection)}
            >
              {MENU.me}
            </li>
            <li
              className="nav__list-item"
              onClick={() => scrollToComponent(AboutSection)}
            >
              {MENU.about}
            </li>
            <li
              className="nav__list-item"
              onClick={() => scrollToComponent(ExperienceSection)}
            >
              {MENU.exp}
            </li>
            <li
              className="nav__list-item"
              onClick={() => scrollToComponent(SkillsSection)}
            >
              {MENU.skills}
            </li>
            <li
              className="nav__list-item"
              onClick={() => scrollToComponent(ProjectsSection)}
            >
              {MENU.projects}
            </li>
            <li
              className="nav__list-item"
              onClick={() => scrollToComponent(ContactSection)}
            >
              {MENU.contact}
            </li>
          </ul>
        </div>
      </div>
      <section
        className="me"
        ref={section => {
          MeSection = section!;
        }}
      >
        <Me />
      </section>
      <section
        className="about"
        ref={section => {
          AboutSection = section!;
        }}
      >
        <About />
      </section>
      <section
        className="experience"
        ref={section => {
          ExperienceSection = section!;
        }}
      >
        <Experience />
      </section>
      <section
        className="skills"
        ref={section => {
          SkillsSection = section!;
        }}
      >
        <Skills />
      </section>
      <section
        className="projects"
        ref={section => {
          ProjectsSection = section!;
        }}
      >
        <Projects />
      </section>
      <section
        className="contact"
        ref={section => {
          ContactSection = section!;
        }}
      >
        <Contact />
      </section>
      <div style={{ color: "white", textAlign: "center" }}>
        Yufeng Li © 2019
      </div>
    </div>
  );
};
