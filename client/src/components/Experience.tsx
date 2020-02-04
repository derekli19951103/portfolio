import React from "react";
import ReactLifeTimeline from "react-life-timeline";
import { EXP } from "../data";
import { useLanguage } from "../hooks/language";
import "../styles/Experience.css";

const Experience = () => {
  const EVENTS = EXP.event;
  const lang = useLanguage();

  const generate_block = (color: string) => {
    return (
      <div
        style={{
          width: "15px",
          height: "15px",
          background: color,
          marginTop: "10px",
          display: window.innerWidth < 767 ? "" : "inline-block",
          marginRight: "10px"
        }}
      ></div>
    );
  };

  return (
    <div id={"Experience"}>
      <span>
        <div id={"lifetime_header"}>
          <h1>{EXP.header}</h1>
        </div>
        <ReactLifeTimeline
          subject_name="Yufeng Li"
          birthday={new Date("1995/11/04")}
          get_events={(cb: Function) => cb(EVENTS)}
        />
        <div id={"indicators"}>
          {EVENTS.map(e => (
            <div key={e.color}>
              {generate_block(e.color)}
              <p
                style={{
                  display: "inline-block",
                  paddingTop: window.innerWidth < 767 ? "5px" : "0px"
                }}
              >
                {e.title}
              </p>
            </div>
          ))}
          <div>
            {generate_block("rgb(139,91,51)")}
            <p
              style={{
                display: "inline-block",
                paddingTop: window.innerWidth < 767 ? "5px" : "0px"
              }}
            >
              {lang === "en" ? "Birthday" : "生日"}
            </p>
          </div>
        </div>
      </span>
    </div>
  );
};

export default Experience;
