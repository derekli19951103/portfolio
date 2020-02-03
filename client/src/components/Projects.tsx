import React, { useState } from "react";
import { Carousel } from "react-responsive-carousel";
import { PROJECTS } from "../data";
import "../styles/carousel.css";
import "../styles/Projects.css";
import { Card } from "./Card";
import Detail from "./Detail";
import { useLanguage } from "../hooks/language";

export const Projects = () => {
  const learn_more = { en: "Learn More", zh: "了解更多" };
  const [selected, setSelected] = useState(PROJECTS.projects[0]);
  const [clicked, setClicked] = useState(false);
  const [currentPos, setCurrentPos] = useState(0);
  const lang = useLanguage();

  const handleClick = (position: number) => {
    setSelected(PROJECTS.projects[position]);
    setClicked(!clicked);
  };

  const handleChange = (position: number) => {
    setSelected(PROJECTS.projects[position]);
    setCurrentPos(position);
  };

  const handleArrowClick = () => {
    setClicked(!clicked);
  };

  return (
    <div>
      <div id={"Projects"}>
        <div id={"projects_header"}>
          <h1>{PROJECTS.header}</h1>
        </div>
        <Carousel
          showThumbs={false}
          showArrows={false}
          showIndicators={true}
          showStatus={false}
          infiniteLoop={true}
          autoPlay={false}
          swipeable={true}
          emulateTouch={true}
          stopOnHover={true}
          interval={5000}
          onClickItem={handleClick}
          selectedItem={currentPos}
          onChange={handleChange}
        >
          {PROJECTS.projects.map((d, i) => (
            <div key={d.picture}>
              <Card
                mask={`mask${i}`}
                picture={d.picture}
                toptitle={d.toptitle}
                midtitle={d.midtitle}
                lowtitle={d.lowtitle}
                desc={d.desc}
                href={d.href}
              />
            </div>
          ))}
        </Carousel>
      </div>
      <div className={"ProjectDetail" + (clicked ? "block" : "")}>
        <Detail details={selected.details} />
        <div className="btn-cont">
          <a className="btn" href={selected.href}>
            {learn_more[lang]}
            <span className="line-1"></span>
            <span className="line-2"></span>
            <span className="line-3"></span>
            <span className="line-4"></span>
          </a>
        </div>
      </div>
      <a
        className={clicked ? "open arrow-icon" : "arrow-icon"}
        onClick={handleArrowClick}
      >
        <span className="left-bar"></span>
        <span className="right-bar"></span>
      </a>
    </div>
  );
};
