import React from "react";
import { Image } from "semantic-ui-react";
import head from "../samples/profilepic.jpg";
import { ABOUT } from "../data";
import "../styles/About.css";

const About = () => {
  return (
    <div id={"About"}>
      <span>
        <Image src={head} size="small" centered circular />
        {ABOUT.map(line => (
          <h4 key={line}>{line}</h4>
        ))}
      </span>
    </div>
  );
};

export default About;
